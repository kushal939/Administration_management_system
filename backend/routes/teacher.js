const express = require('express');
const router = express.Router();
const db = require('../database');
const { findStudentByEmailOrId } = require('../dbHelpers');

/**
 * Teacher Routes
 * Only accessible by users with teacher role
 */

// Simple auth check (in production, use proper JWT/session middleware)
const requireTeacher = (req, res, next) => {
  const userRole = req.body.teacherRole || req.headers['x-user-role'];
  if (userRole !== 'teacher') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher privileges required.'
    });
  }
  next();
};

// POST /api/teacher/request-student - Teacher submits student creation request
router.post('/request-student', requireTeacher, async (req, res) => {
  try {
    const { name, email, studentId, department, batchYear, teacherId } = req.body;

    // Validation
    if (!name || !email || !studentId || !department || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, studentId, department, and teacherId are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if student already exists
    const existingStudent = await findStudentByEmailOrId(email, studentId);
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'Student with this email or studentId already exists'
      });
    }

    // Check if there's already a pending request for this student
    db.get(
      'SELECT * FROM student_requests WHERE (email = ? OR studentId = ?) AND status = ?',
      [email, studentId, 'pending'],
      (err, existingRequest) => {
        if (err) {
          console.error('Error checking existing requests:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to check existing requests'
          });
        }

        if (existingRequest) {
          return res.status(409).json({
            success: false,
            message: 'A pending request already exists for this student'
          });
        }

        // Verify teacher is assigned to courses in this department (new system first, fallback to old)
        db.get(
          `SELECT stc.id FROM semester_teacher_courses stc
           JOIN courses c ON c.id = stc.course_id
           WHERE stc.teacher_id = ? AND c.department = ?
           LIMIT 1`,
          [teacherId, department],
          (err, assignment) => {
            if (err || !assignment) {
              // fallback: check old teacher_courses table
              db.get(
                `SELECT tc.* FROM teacher_courses tc
                 JOIN courses c ON c.name = tc.course
                 WHERE tc.teacherId = ? AND c.department = ?
                 LIMIT 1`,
                [teacherId, department],
                (err2, oldAssignment) => {
                  if (!oldAssignment) {
                    return res.status(403).json({
                      success: false,
                      message: 'You are not assigned to any courses in this department'
                    });
                  }
                  doInsert();
                }
              );
              return;
            }
            doInsert();
          }
        );

        function doInsert() {
            // Create student request
            db.run(
              `INSERT INTO student_requests (name, email, studentId, department, batchYear, requested_by, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [name, email, studentId, department, batchYear || '1', teacherId, 'pending'],
              function(err) {
                if (err) {
                  console.error('Error creating student request:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Failed to create student request'
                  });
                }

                res.json({
                  success: true,
                  message: 'Student request sent to admin for approval',
                  data: {
                    id: this.lastID,
                    name,
                    email,
                    studentId,
                    department,
                    batchYear,
                    status: 'pending'
                  }
                });
              }
            );
        } // end doInsert
      }
    );
  } catch (error) {
    console.error('Error in request-student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/teacher/my-requests/:teacherId - Get teacher's student requests
router.get('/my-requests/:teacherId', requireTeacher, (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status } = req.query;

    let query = 'SELECT * FROM student_requests WHERE requested_by = ?';
    const params = [teacherId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching teacher requests:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch requests'
        });
      }

      res.json({
        success: true,
        data: rows || [],
        count: rows ? rows.length : 0
      });
    });
  } catch (error) {
    console.error('Error in my-requests:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/teacher/departments/:teacherId - Get departments where teacher has course assignments
router.get('/departments/:teacherId', requireTeacher, (req, res) => {
  try {
    const { teacherId } = req.params;

    // Use semester_teacher_courses (new assignment system)
    const query = `
      SELECT DISTINCT c.department
      FROM semester_teacher_courses stc
      JOIN courses c ON c.id = stc.course_id
      WHERE stc.teacher_id = ?
      ORDER BY c.department
    `;

    db.all(query, [teacherId], (err, rows) => {
      if (err) {
        // fallback to old teacher_courses table
        db.all(`
          SELECT DISTINCT c.department
          FROM teacher_courses tc
          JOIN courses c ON c.name = tc.course
          WHERE tc.teacherId = ?
          ORDER BY c.department
        `, [teacherId], (err2, rows2) => {
          if (err2) return res.status(500).json({ success: false, message: 'Failed to fetch departments' });
          res.json({ success: true, data: rows2 || [], count: (rows2 || []).length });
        });
        return;
      }
      res.json({ success: true, data: rows || [], count: (rows || []).length });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/teacher/my-students/:teacherId - Get students enrolled in teacher's courses
router.get('/my-students/:teacherId', (req, res) => {
  try {
    const { teacherId } = req.params;
    const { course, department, search } = req.query;

    // Build query to get students enrolled in courses taught by this teacher
    let query = `
      SELECT DISTINCT 
        s.id,
        s.studentId,
        s.name,
        s.email,
        s.year,
        s.department,
        GROUP_CONCAT(DISTINCT c.name) as courses
      FROM students s
      INNER JOIN enrollments e ON s.id = e.student_id
      INNER JOIN courses c ON e.course_id = c.id
      INNER JOIN teacher_courses tc ON tc.course = c.name
      WHERE tc.teacherId = ?
    `;
    
    const params = [teacherId];

    // Add filters
    if (course) {
      query += ' AND c.name = ?';
      params.push(course);
    }

    if (department) {
      query += ' AND c.department = ?';
      params.push(department);
    }

    if (search) {
      query += ' AND (s.name LIKE ? OR s.studentId LIKE ? OR s.email LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' GROUP BY s.id ORDER BY s.name';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching teacher students:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch students'
        });
      }

      res.json({
        success: true,
        data: rows || [],
        count: rows ? rows.length : 0
      });
    });
  } catch (error) {
    console.error('Error in my-students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/teacher/my-semester-assignments/:teacherId
// Returns all batches/semesters this teacher is assigned to, with their specific courses and students
router.get('/my-semester-assignments/:teacherId', (req, res) => {
  const { teacherId } = req.params;
  const db = require('../database');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS semester_teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      semester_number INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(batch_id, semester_number, teacher_id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS semester_teacher_courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      semester_number INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(batch_id, semester_number, teacher_id, course_id)
    )`);

    // Get all batch+semester combos this teacher has course assignments in
    db.all(`
      SELECT DISTINCT stc.batch_id, stc.semester_number, b.batch_name, b.department, b.start_year, b.end_year
      FROM semester_teacher_courses stc
      JOIN batches b ON b.id = stc.batch_id
      WHERE stc.teacher_id = ?
      ORDER BY b.batch_name, stc.semester_number
    `, [teacherId], (err, assignments) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
      if (!assignments || assignments.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const results = [];
      let pending = assignments.length;

      assignments.forEach(asgn => {
        // Get only courses this teacher is specifically assigned to in this semester
        db.all(`
          SELECT c.id, c.name, c.code, c.department, c.credits
          FROM semester_teacher_courses stc
          JOIN courses c ON c.id = stc.course_id
          WHERE stc.batch_id = ? AND stc.semester_number = ? AND stc.teacher_id = ?
        `, [asgn.batch_id, asgn.semester_number, teacherId], (err2, courses) => {
          // Get students in this batch
          db.all(`
            SELECT s.id, s.studentId, s.name, s.email, s.year, s.department
            FROM students s
            WHERE s.batch_id = ?
            ORDER BY s.name
          `, [asgn.batch_id], (err3, students) => {
            results.push({
              batch_id: asgn.batch_id,
              batch_name: asgn.batch_name,
              department: asgn.department,
              start_year: asgn.start_year,
              end_year: asgn.end_year,
              semester_number: asgn.semester_number,
              courses: courses || [],
              students: students || []
            });
            if (--pending === 0) {
              res.json({ success: true, data: results });
            }
          });
        });
      });
    });
  });
});

module.exports = router;
