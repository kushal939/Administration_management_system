const express = require('express');
const router = express.Router();
const { 
  getAllAttendance, 
  addAttendance, 
  updateAttendance,
  getEnrolledStudentsByCourse,
  getCourseById,
  deleteAttendance
} = require('../dbHelpers');
const db = require('../database');
const { notifyAttendanceMarked } = require('../utils/notificationHelper');

// GET /api/attendance/students?courseId=X - Get enrolled students for a course
router.get('/students', async (req, res) => {
  try {
    const { courseId, teacherId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'courseId is required'
      });
    }

    // If teacherId provided, verify teacher is assigned to this course
    if (teacherId) {
      const course = await getCourseById(Number(courseId));
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if teacher is assigned to this course
      const checkQuery = 'SELECT * FROM teacher_courses WHERE teacherId = ? AND course = ?';
      db.get(checkQuery, [Number(teacherId), course.name], (err, row) => {
        if (err) {
          console.error('Error checking teacher assignment:', err);
          return res.status(500).json({ success: false, message: 'Internal server error' });
        }

        if (!row) {
          return res.status(403).json({
            success: false,
            message: 'You are not assigned to teach this course'
          });
        }

        // Teacher is authorized, fetch enrolled students
        getEnrolledStudentsByCourse(Number(courseId))
          .then(students => {
            res.json({
              success: true,
              data: students,
              count: students.length
            });
          })
          .catch(error => {
            console.error('Error fetching enrolled students:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
          });
      });
    } else {
      // No teacher verification, just return enrolled students
      const students = await getEnrolledStudentsByCourse(Number(courseId));
      res.json({
        success: true,
        data: students,
        count: students.length
      });
    }
  } catch (error) {
    console.error('Error fetching enrolled students:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/attendance - Mark attendance
router.post('/', async (req, res) => {
  try {
    const { studentId, course, date, status, teacherId, courseId } = req.body;

    // Validate required fields
    if (!studentId || !course || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'studentId, course, date, and status are required'
      });
    }

    // Validate status value
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // If teacherId and courseId provided, verify teacher is assigned to this specific course in a semester
    if (teacherId && courseId) {
      const authorized = await new Promise((resolve, reject) => {
        db.get(`
          SELECT id FROM semester_teacher_courses
          WHERE teacher_id = ? AND course_id = ?
          LIMIT 1
        `, [Number(teacherId), Number(courseId)], (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        });
      });

      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to mark attendance for this course'
        });
      }
    }

    // Atomic upsert: if a record exists for this student+course+date, update it.
    // Otherwise insert. This is race-condition safe.
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO attendance (studentId, course, date, status, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(studentId, course, date)
         DO UPDATE SET status = excluded.status, created_at = CURRENT_TIMESTAMP`,
        [studentId, course, date, status.toLowerCase()],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });

    // Send notification to student (fire and forget)
    try {
      const studentQuery = 'SELECT name FROM students WHERE studentId = ?';
      const teacherQuery = 'SELECT email FROM users WHERE id = ?';
      db.get(studentQuery, [studentId], (err, student) => {
        if (!err && student) {
          let teacherName = 'Teacher';
          if (teacherId) {
            db.get(teacherQuery, [teacherId], (err, teacher) => {
              if (!err && teacher) teacherName = teacher.email.split('@')[0];
              notifyAttendanceMarked(studentId, student.name, course, status, teacherName);
            });
          } else {
            notifyAttendanceMarked(studentId, student.name, course, status, teacherName);
          }
        }
      });
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: { studentId, course, date, status: status.toLowerCase() }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/attendance/:id - Update attendance status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'id and status are required'
      });
    }

    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await updateAttendance(id, status.toLowerCase());
    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/attendance - Get all attendance records
router.get('/', async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { studentId, course, date, studentName, department, batchId, teacherId } = req.query;

    // Build dynamic SQL query based on filters
    let query = `
      SELECT a.*, s.name as studentName, s.department, s.batch_id
      FROM attendance a
      LEFT JOIN students s ON a.studentId = s.studentId
      WHERE 1=1
    `;
    const params = [];

    if (studentId) {
      query += ' AND a.studentId = ?';
      params.push(studentId);
    }

    if (course) {
      query += ' AND a.course LIKE ?';
      params.push(`%${course}%`);
    }

    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }

    if (studentName) {
      query += ' AND s.name LIKE ?';
      params.push(`%${studentName}%`);
    }

    if (department) {
      query += ' AND s.department = ?';
      params.push(department);
    }

    if (batchId) {
      query += ' AND s.batch_id = ?';
      params.push(batchId);
    }

    // Filter records to only students in batches/semesters this teacher is assigned to (via course assignments)
    if (teacherId) {
      query += ` AND s.batch_id IN (
        SELECT DISTINCT batch_id FROM semester_teacher_courses WHERE teacher_id = ?
      ) AND a.course IN (
        SELECT c.name FROM semester_teacher_courses stc
        JOIN courses c ON c.id = stc.course_id
        WHERE stc.teacher_id = ?
      )`;
      params.push(teacherId);
      params.push(teacherId);
    }

    query += ' ORDER BY a.date DESC, a.created_at DESC';

    // Execute query
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching attendance records:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      res.json({
        success: true,
        data: rows || [],
        count: rows ? rows.length : 0
      });
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/attendance/summary/:studentId - Student attendance summary
// Optional query param: course (to get summary for a specific subject)
router.get('/summary/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { course } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }

    // Fetch attendance records for the student (and optionally for a specific course)
    const filters = { studentId };
    if (course) filters.course = course;

    const records = await getAllAttendance(filters);

    // Compute overall stats
    const total = records.length;
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const excusedCount = records.filter(r => r.status === 'excused').length;

    const percentage = total === 0 ? 0 : Math.round((presentCount / total) * 10000) / 100; // two decimals

    // Compute per-course breakdown (if course not specified, group by course)
    let perCourse = [];
    if (course) {
      perCourse.push({
        course,
        total,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount,
        percentage
      });
    } else {
      const byCourseMap = {};
      records.forEach(r => {
        if (!byCourseMap[r.course]) byCourseMap[r.course] = [];
        byCourseMap[r.course].push(r);
      });

      perCourse = Object.keys(byCourseMap).map(c => {
        const recs = byCourseMap[c];
        const t = recs.length;
        const p = recs.filter(r => r.status === 'present').length;
        const a = recs.filter(r => r.status === 'absent').length;
        const l = recs.filter(r => r.status === 'late').length;
        const e = recs.filter(r => r.status === 'excused').length;
        const pct = t === 0 ? 0 : Math.round((p / t) * 10000) / 100;
        // Also collect attended and absent dates for the course
        const attendedDates = recs.filter(r => r.status === 'present').map(r => r.date);
        const absentDates = recs.filter(r => r.status === 'absent').map(r => r.date);
        return {
          course: c,
          total: t,
          present: p,
          absent: a,
          late: l,
          excused: e,
          percentage: pct,
          attendedDates,
          absentDates
        };
      });
    }

    res.json({
      success: true,
      data: {
        studentId,
        overall: {
          total,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          excused: excusedCount,
          percentage
        },
        perCourse
      }
    });
  } catch (error) {
    console.error('Error computing attendance summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/attendance/monthly/:studentId - Monthly attendance breakdown
router.get('/monthly/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT strftime('%Y-%m', date) as month,
                COUNT(*) as total,
                SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
         FROM attendance WHERE studentId = ?
         GROUP BY month ORDER BY month DESC`,
        [studentId], (err, r) => err ? reject(err) : resolve(r || [])
      );
    });
    const data = rows.map(r => ({
      month: r.month,
      total: r.total,
      present: r.present,
      absent: r.absent,
      late: r.late,
      percentage: r.total === 0 ? 0 : Math.round((r.present / r.total) * 10000) / 100
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/attendance/batch-report?batchId=&department= - Full batch attendance report
router.get('/batch-report', async (req, res) => {
  try {
    const { batchId, department } = req.query;
    if (!batchId && !department) {
      return res.status(400).json({ success: false, message: 'batchId or department required' });
    }

    // Get students in batch/department
    let studentQuery = 'SELECT id, studentId, name, email, department FROM students WHERE 1=1';
    const params = [];
    if (batchId) { studentQuery += ' AND batch_id = ?'; params.push(batchId); }
    else if (department) { studentQuery += ' AND department = ?'; params.push(department); }

    const students = await new Promise((resolve, reject) => {
      db.all(studentQuery, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });

    // For each student get attendance summary
    const report = await Promise.all(students.map(async (s) => {
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT status, COUNT(*) as cnt FROM attendance WHERE studentId = ? GROUP BY status`,
          [s.studentId], (err, r) => err ? reject(err) : resolve(r || [])
        );
      });
      const total = rows.reduce((sum, r) => sum + r.cnt, 0);
      const present = (rows.find(r => r.status === 'present')?.cnt || 0);
      const absent = (rows.find(r => r.status === 'absent')?.cnt || 0);
      const late = (rows.find(r => r.status === 'late')?.cnt || 0);
      const percentage = total === 0 ? 0 : Math.round((present / total) * 10000) / 100;
      return { ...s, total, present, absent, late, percentage, belowThreshold: percentage < 75 && total > 0 };
    }));

    const belowCount = report.filter(s => s.belowThreshold).length;
    res.json({ success: true, data: { students: report, belowCount, total: report.length } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/attendance/low-attendance?threshold=75 - Students below threshold
router.get('/low-attendance', async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold || 75);
    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.studentId, s.name, s.email, s.department, s.batch_id,
                COUNT(a.id) as total,
                SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present
         FROM students s
         LEFT JOIN attendance a ON a.studentId = s.studentId
         GROUP BY s.studentId
         HAVING total > 0`,
        [], (err, r) => err ? reject(err) : resolve(r || [])
      );
    });
    const data = rows
      .map(r => ({ ...r, percentage: Math.round((r.present / r.total) * 10000) / 100 }))
      .filter(r => r.percentage < threshold)
      .sort((a, b) => a.percentage - b.percentage);
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/attendance/export — CSV export (teacher scoped or admin full)
router.get('/export', async (req, res) => {
  const { teacherId, course, batchId, department, startDate, endDate } = req.query;

  let query = `
    SELECT a.studentId, s.name as studentName, a.course, a.date, a.status, s.department, b.batch_name
    FROM attendance a
    LEFT JOIN students s ON s.studentId = a.studentId
    LEFT JOIN batches b ON b.id = s.batch_id
    WHERE 1=1
  `;
  const params = [];

  if (teacherId) {
    query += ` AND a.course IN (SELECT c.name FROM semester_teacher_courses stc JOIN courses c ON c.id = stc.course_id WHERE stc.teacher_id = ?)`;
    params.push(teacherId);
  }
  if (course)     { query += ' AND a.course LIKE ?'; params.push(`%${course}%`); }
  if (batchId)    { query += ' AND s.batch_id = ?'; params.push(batchId); }
  if (department) { query += ' AND s.department = ?'; params.push(department); }
  if (startDate)  { query += ' AND a.date >= ?'; params.push(startDate); }
  if (endDate)    { query += ' AND a.date <= ?'; params.push(endDate); }
  query += ' ORDER BY a.date DESC, s.name';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    // Build CSV
    const header = 'Student ID,Student Name,Course,Date,Status,Department,Batch\n';
    const csvRows = (rows || []).map(r =>
      `"${r.studentId}","${r.studentName || ''}","${r.course}","${r.date}","${r.status}","${r.department || ''}","${r.batch_name || ''}"`
    ).join('\n');
    const csv = header + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${Date.now()}.csv`);
    res.send(csv);
  });
});

// DELETE /api/attendance/bulk - Delete multiple attendance records
router.delete('/bulk', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required and must not be empty'
      });
    }

    // Delete all records in a transaction
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM attendance WHERE id IN (${placeholders})`;

    db.run(query, ids, function(err) {
      if (err) {
        console.error('Error deleting attendance records:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      res.json({
        success: true,
        message: `Successfully deleted ${this.changes} attendance record(s)`,
        deletedCount: this.changes
      });
    });
  } catch (error) {
    console.error('Error bulk deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if attendance record exists
    db.get('SELECT * FROM attendance WHERE id = ?', [Number(id)], async (err, attendance) => {
      if (err) {
        console.error('Error fetching attendance:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      try {
        // Delete attendance
        const result = await deleteAttendance(Number(id));

        if (result.deleted) {
          res.json({
            success: true,
            message: 'Attendance deleted successfully'
          });
        } else {
          res.status(404).json({
            success: false,
            message: 'Attendance record not found'
          });
        }
      } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
