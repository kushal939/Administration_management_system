const express = require('express');
const router = express.Router();
const db = require('../database');
const { 
  getAllStudents, 
  addStudent, 
  findStudentByEmailOrId, 
  getStudentById, 
  addFee, 
  getCoursesByTeacherId,
  getCoursesByDepartment,
  getDepartmentByName,
  enrollStudentInCourse,
  updateStudent,
  deleteStudent
} = require('../dbHelpers');

// GET /api/students/:id/dashboard — all dashboard widgets in one call
router.get('/:id/dashboard', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM students WHERE id = ? OR studentId = ?', [id, id], (e, r) => e ? reject(e) : resolve(r));
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Current semester enrollment
    const currentEnrollment = await new Promise(resolve => {
      db.get(`
        SELECT bss.semester_number, bss.gpa, bss.result, bs.name as semester_name,
               b.batch_name, b.department
        FROM batch_semester_students bss
        JOIN batch_semesters bs ON bs.id = bss.semester_id
        JOIN batches b ON b.id = bss.batch_id
        WHERE bss.student_id = ? AND bss.result = 'ongoing'
        ORDER BY bss.semester_number DESC LIMIT 1
      `, [student.id], (e, r) => resolve(r || null));
    });

    const currentSem = currentEnrollment?.semester_number || student.current_semester || 1;
    const batchId = student.batch_id;

    // Attendance last 30 days — scoped to current semester's courses
    const attTrend = await new Promise(resolve => {
      db.all(`
        SELECT a.date,
               COUNT(*) as total,
               SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present
        FROM attendance a
        WHERE a.studentId = ? AND a.date >= date('now', '-30 days')
          AND (? IS NULL OR a.course IN (
            SELECT c.name FROM semester_courses sc
            JOIN courses c ON c.id = sc.course_id
            WHERE sc.batch_id = ? AND sc.semester_number = ?
          ))
        GROUP BY a.date ORDER BY a.date ASC
      `, [student.studentId, batchId, batchId, currentSem], (e, r) => resolve(r || []));
    });

    // Overall attendance rate for current semester
    const attOverall = await new Promise(resolve => {
      db.get(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present
        FROM attendance a
        WHERE a.studentId = ?
          AND (? IS NULL OR a.course IN (
            SELECT c.name FROM semester_courses sc
            JOIN courses c ON c.id = sc.course_id
            WHERE sc.batch_id = ? AND sc.semester_number = ?
          ))
      `, [student.studentId, batchId, batchId, currentSem], (e, r) => resolve(r || {}));
    });

    // Upcoming assignments for current semester's courses
    const upcomingAssignments = await new Promise(resolve => {
      db.all(`
        SELECT a.id, a.title, a.course, a.due_date, a.total_marks,
               sub.status as submission_status, sub.marks_obtained, sub.grade
        FROM assignments a
        LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
        WHERE a.due_date >= date('now') AND a.due_date <= date('now', '+14 days')
          AND (? IS NULL OR a.course IN (
            SELECT c.name FROM semester_courses sc
            JOIN courses c ON c.id = sc.course_id
            WHERE sc.batch_id = ? AND sc.semester_number = ?
          ))
        ORDER BY a.due_date ASC LIMIT 5
      `, [student.id, batchId, batchId, currentSem], (e, r) => resolve(r || []));
    });

    // Pending fees
    const pendingFees = await new Promise(resolve => {
      db.all(`SELECT id, amount, amount_paid, description, category, due_date
              FROM fees WHERE studentId = ? AND paid = 0
              ORDER BY due_date ASC LIMIT 5`, [student.studentId], (e, r) => resolve(r || []));
    });

    // Current semester GPA from batch_semester_students
    const semesterGPA = currentEnrollment;

    // CGPA
    const cgpaRow = await new Promise(resolve => {
      db.get(`SELECT ROUND(AVG(gpa), 2) as cgpa FROM batch_semester_students
              WHERE student_id = ? AND gpa IS NOT NULL`, [student.id], (e, r) => resolve(r || {}));
    });

    res.json({
      success: true,
      data: {
        student,
        currentSemester: currentSem,
        currentEnrollment,
        attTrend,
        attOverall: {
          total: attOverall.total || 0,
          present: attOverall.present || 0,
          rate: attOverall.total > 0 ? ((attOverall.present / attOverall.total) * 100).toFixed(1) : 0
        },
        upcomingAssignments,
        pendingFees,
        currentSemesterGPA: semesterGPA,
        cgpa: cgpaRow.cgpa || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/:id/progression — full academic journey for a student
router.get('/:id/progression', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM students WHERE id = ? OR studentId = ?', [id, id], (err, student) => {
    if (err || !student) return res.status(404).json({ success: false, message: 'Student not found' });

    db.all(`
      SELECT bss.semester_number, bss.result, bss.gpa, bss.promoted_at,
             bs.name as semester_name, bs.status as semester_status,
             b.batch_name, b.department, b.start_year
      FROM batch_semester_students bss
      JOIN batch_semesters bs ON bs.id = bss.semester_id
      JOIN batches b ON b.id = bss.batch_id
      WHERE bss.student_id = ?
      ORDER BY bss.batch_id, bss.semester_number
    `, [student.id], (err2, rows) => {
      if (err2) return res.status(500).json({ success: false, message: err2.message });

      const semesters = rows || [];
      const passed = semesters.filter(s => s.result === 'passed').length;
      const failed = semesters.filter(s => s.result === 'failed').length;
      const ongoing = semesters.find(s => s.result === 'ongoing');
      const gpas = semesters.filter(s => s.gpa).map(s => parseFloat(s.gpa));
      const cgpa = gpas.length > 0
        ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2)
        : null;

      res.json({
        success: true,
        data: {
          student,
          semesters,
          summary: {
            totalSemesters: semesters.length,
            passed, failed,
            currentSemester: ongoing?.semester_number || null,
            cgpa
          }
        }
      });
    });
  });
});

// GET /api/students/generate-id?departmentCode=CS&year=2024
// Auto-generates the next available student ID for a given dept + year
router.get('/generate-id', (req, res) => {
  const { departmentCode, year } = req.query;
  if (!departmentCode || !year) {
    return res.status(400).json({ success: false, message: 'departmentCode and year are required' });
  }

  const code = departmentCode.toUpperCase().replace(/\s+/g, '');
  const yr2  = String(year).slice(-2); // last 2 digits of year
  const prefix = `STU${code}${yr2}`;

  // Find the highest existing sequence number for this prefix
  db.all(
    `SELECT studentId FROM students WHERE studentId LIKE ? ORDER BY studentId DESC`,
    [`${prefix}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });

      let nextSeq = 1;
      if (rows && rows.length > 0) {
        // Extract numeric suffix from the last ID
        const last = rows[0].studentId; // e.g. STUCS24007
        const suffix = parseInt(last.slice(prefix.length), 10);
        if (!isNaN(suffix)) nextSeq = suffix + 1;
      }

      const newId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
      res.json({ success: true, studentId: newId, prefix, sequence: nextSeq });
    }
  );
});

// GET /api/students - Get all students
router.get('/', async (req, res) => {
  try {
    const teacherId = req.query.teacherId ? Number(req.query.teacherId) : null;
    
    if (!teacherId) {
      // Get all students with their department
      const sql = `
        SELECT s.*
        FROM students s
        ORDER BY s.created_at DESC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error fetching students:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        }
        res.json({ success: true, data: rows, count: rows.length });
      });
      return;
    }

    // When teacherId provided, only return students in teacher's courses
    const sql = `SELECT * FROM students WHERE course IN (SELECT course FROM teacher_courses WHERE teacherId = ? ) ORDER BY created_at DESC`;
    db.all(sql, [teacherId], (err, rows) => {
      if (err) {
        console.error('Error fetching teacher students:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      res.json({ success: true, data: rows, count: rows.length });
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/students/:id/enroll - enroll a student to a course
router.post('/:id/enroll', async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    const { course, teacherId, transport } = req.body; // transport: true/false

    if (!studentId || !course) return res.status(400).json({ success: false, message: 'student id and course are required' });

    // If teacherId provided, ensure teacher is assigned to that course
    if (teacherId) {
      const teacherCourses = await getCoursesByTeacherId(Number(teacherId));
      if (!teacherCourses.includes(course)) {
        return res.status(403).json({ success: false, message: 'Teacher is not assigned to this course' });
      }
    }

    db.run('UPDATE students SET course = ? WHERE id = ?', [course, studentId], function(err) {
      if (err) {
        console.error('Error enrolling student:', err);
        return res.status(500).json({ success: false, message: 'Failed to enroll student' });
      }
      // If transport chosen, add a bus fee record for the student (use student's studentId field)
      (async () => {
        try {
          if (transport) {
            const student = await getStudentById(studentId);
            if (student && student.studentId) {
              // Default bus fee amount (Rs.)
              const BUS_FEE_AMOUNT = 500.00;
              await addFee({ studentId: student.studentId, amount: BUS_FEE_AMOUNT, description: 'Bus Fee (assigned on enrollment)', category: 'bus' });
            }
          }
        } catch (e) {
          console.warn('Failed to create transport fee:', e && e.message);
        }
      })();

      res.json({ success: true, message: 'Student enrolled successfully' });
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/students - Add a new student
router.post('/', async (req, res) => {
  try {
    const { name, email, studentId, course, year, department } = req.body;

    // Validate required fields
    if (!name || !email || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and studentId are required'
      });
    }

    // Check if student with same email or studentId already exists
    const existingStudent = await findStudentByEmailOrId(email, studentId);

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'Student with this email or studentId already exists'
      });
    }

    // Add student to database
    const newStudent = await addStudent({ name, email, studentId, course, year, department });

    let enrollmentCount = 0;
    
    // Auto-enroll student in all department courses if department is provided
    if (department) {
      try {
        const dept = await getDepartmentByName(department);
        if (dept) {
          const courses = await getCoursesByDepartment(department);
          
          // Enroll student in all courses of the department
          for (const courseItem of courses) {
            await enrollStudentInCourse(newStudent.id, courseItem.id, dept.id);
            enrollmentCount++;
          }
          
          console.log(`Auto-enrolled student ${studentId} in ${courses.length} courses of ${department}`);
        }
      } catch (enrollError) {
        console.error('Error auto-enrolling student:', enrollError);
        // Don't fail the request, just log the error
      }
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: department 
        ? `Student added successfully and enrolled in ${enrollmentCount} ${enrollmentCount === 1 ? 'course' : 'courses'} under ${department}`
        : 'Student added successfully',
      data: { ...newStudent, enrollmentCount, department }
    });

  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/students/:id - Update a student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, studentId, course, year, department } = req.body;

    if (!name || !email || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and studentId are required'
      });
    }

    // Check if student exists
    const existingStudent = await getStudentById(Number(id));
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update student
    const updatedStudent = await updateStudent(Number(id), { name, email, studentId, course, year, department });

    let enrollmentCount = 0;
    
    // If department is provided and changed, re-enroll student
    if (department) {
      try {
        // Delete existing enrollments
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM enrollments WHERE student_id = ?', [Number(id)], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Get new department and enroll in all its courses
        const dept = await getDepartmentByName(department);
        if (dept) {
          const courses = await getCoursesByDepartment(department);
          
          // Enroll student in all courses of the new department
          for (const courseItem of courses) {
            await enrollStudentInCourse(Number(id), courseItem.id, dept.id);
            enrollmentCount++;
          }
          
          console.log(`Re-enrolled student ${studentId} in ${courses.length} courses of ${department}`);
        }
      } catch (enrollError) {
        console.error('Error re-enrolling student:', enrollError);
        // Don't fail the request, just log the error
      }
    }

    res.json({
      success: true,
      message: department 
        ? `Student updated and re-enrolled in ${enrollmentCount} ${enrollmentCount === 1 ? 'course' : 'courses'} under ${department}`
        : 'Student updated successfully',
      data: { ...updatedStudent, enrollmentCount, department }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/students/:id - Delete a student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const existingStudent = await getStudentById(Number(id));
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Delete related enrollments first (cascade)
    db.run('DELETE FROM enrollments WHERE student_id = ?', [Number(id)], async (err) => {
      if (err) {
        console.error('Error deleting enrollments:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete student enrollments' });
      }

      try {
        // Delete student
        const result = await deleteStudent(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Student deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Student not found'
          });
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;


// POST /api/students/bulk-delete - Delete multiple students
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of student IDs'
      });
    }

    let deletedCount = 0;
    const errors = [];

    for (const id of ids) {
      try {
        // Get student details
        const student = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM students WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (!student) {
          errors.push(`Student with ID ${id} not found`);
          continue;
        }

        // Delete related records
        await new Promise((resolve, reject) => {
          db.serialize(() => {
            // Delete attendance
            db.run('DELETE FROM attendance WHERE studentId = ?', [student.studentId]);
            
            // Delete marks
            db.run('DELETE FROM marks WHERE studentId = ?', [student.studentId]);
            
            // Delete fees
            db.run('DELETE FROM fees WHERE studentId = ?', [student.studentId]);
            
            // Delete enrollments
            db.run('DELETE FROM enrollments WHERE student_id = ?', [student.id]);
            
            // Delete student record
            db.run('DELETE FROM students WHERE id = ?', [student.id]);
            
            // Delete user account if exists
            db.run('DELETE FROM users WHERE email = ?', [student.email], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });

        deletedCount++;
      } catch (error) {
        console.error(`Error deleting student ${id}:`, error);
        errors.push(`Failed to delete student ${id}`);
      }
    }

    if (deletedCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete any students',
        errors
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} student(s)`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete students'
    });
  }
});
