const express = require('express');
const router = express.Router();
const {
  getBatchOverview,
  getBatchStudentsERP,
  enrollInSemester,
  promoteStudents,
  getStudentTimeline,
  updateSemesterStatus,
  updateStudentSemesterResult,
  getPromotionHistory
} = require('../controllers/erpController');

const requireAdmin = (req, res, next) => {
  const role = req.headers['x-user-role'] || req.body.adminRole;
  if (role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  next();
};

// Batch ERP
router.get('/batches/:id/overview',        requireAdmin, getBatchOverview);
router.get('/batches/:id/students',        requireAdmin, getBatchStudentsERP);
router.post('/batches/:id/enroll-semester', requireAdmin, enrollInSemester);
router.post('/batches/:id/promote',        requireAdmin, promoteStudents);
router.get('/batches/:id/promotions',      requireAdmin, getPromotionHistory);
router.patch('/batches/:id/semesters/:semId/status', requireAdmin, updateSemesterStatus);

// Student timeline
router.get('/students/:studentId/timeline', requireAdmin, getStudentTimeline);

// Edit student semester result
router.patch('/batches/:id/students/:studentId/semester-result', requireAdmin, updateStudentSemesterResult);

// Batch summary: attendance + marks
router.get('/batches/:id/summary', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = require('../database');

  // Get all students in the batch
  db.all('SELECT id, studentId, name FROM students WHERE batch_id = ?', [id], (err, students) => {
    if (err || !students.length) return res.json({ success: true, data: { students: [], totals: {} } });

    const studentIds = students.map(s => s.studentId);
    const placeholders = studentIds.map(() => '?').join(',');

    // Attendance summary per student
    db.all(
      `SELECT studentId,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) as absent
       FROM attendance WHERE studentId IN (${placeholders})
       GROUP BY studentId`,
      studentIds,
      (err2, attRows) => {
        const attMap = {};
        (attRows || []).forEach(r => { attMap[r.studentId] = r; });

        // Marks summary per student
        db.all(
          `SELECT studentId, ROUND(AVG(marks), 1) as avg_marks, COUNT(*) as subjects
           FROM marks WHERE studentId IN (${placeholders})
           GROUP BY studentId`,
          studentIds,
          (err3, markRows) => {
            const markMap = {};
            (markRows || []).forEach(r => { markMap[r.studentId] = r; });

            const result = students.map(s => {
              const att = attMap[s.studentId] || { total: 0, present: 0, absent: 0 };
              const mk = markMap[s.studentId] || { avg_marks: null, subjects: 0 };
              const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : null;
              return {
                id: s.id,
                studentId: s.studentId,
                name: s.name,
                attendance_total: att.total,
                attendance_present: att.present,
                attendance_pct: attPct,
                avg_marks: mk.avg_marks,
                subjects: mk.subjects
              };
            });

            // Batch-level totals
            const withAtt = result.filter(r => r.attendance_total > 0);
            const withMarks = result.filter(r => r.avg_marks !== null);
            const totals = {
              avg_attendance: withAtt.length
                ? Math.round(withAtt.reduce((s, r) => s + r.attendance_pct, 0) / withAtt.length)
                : null,
              avg_marks: withMarks.length
                ? Math.round(withMarks.reduce((s, r) => s + parseFloat(r.avg_marks), 0) / withMarks.length * 10) / 10
                : null,
              low_attendance: result.filter(r => r.attendance_pct !== null && r.attendance_pct < 75).length,
              no_data: result.filter(r => r.attendance_total === 0 && r.avg_marks === null).length
            };

            res.json({ success: true, data: { students: result, totals } });
          }
        );
      }
    );
  });
});

// ── Semester-Course Assignment ────────────────────────────────────────────────

// GET /api/admin/erp/batches/:id/semesters/:semNum/courses
router.get('/batches/:id/semesters/:semNum/courses', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  // Ensure table exists
  db.run(`CREATE TABLE IF NOT EXISTS semester_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number, course_id)
  )`, () => {
    db.all(`
      SELECT sc.id, sc.course_id, sc.semester_number, c.name, c.code, c.department, c.credits
      FROM semester_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.batch_id = ? AND sc.semester_number = ?
      ORDER BY c.name
    `, [id, semNum], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    });
  });
});

// POST /api/admin/erp/batches/:id/semesters/:semNum/courses
router.post('/batches/:id/semesters/:semNum/courses', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  const { courseIds } = req.body;
  if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0)
    return res.status(400).json({ success: false, message: 'courseIds array required' });

  db.run(`CREATE TABLE IF NOT EXISTS semester_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number, course_id)
  )`, () => {
    let done = 0;
    courseIds.forEach(cid => {
      db.run(`INSERT OR IGNORE INTO semester_courses (batch_id, semester_number, course_id) VALUES (?, ?, ?)`,
        [id, semNum, cid], () => { if (++done === courseIds.length) res.json({ success: true, message: `${courseIds.length} course(s) assigned` }); });
    });
  });
});

// DELETE /api/admin/erp/batches/:id/semesters/:semNum/courses/:courseId
router.delete('/batches/:id/semesters/:semNum/courses/:courseId', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum, courseId } = req.params;
  db.run(`DELETE FROM semester_courses WHERE batch_id = ? AND semester_number = ? AND course_id = ?`,
    [id, semNum, courseId], function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to remove' });
      res.json({ success: true, message: 'Course removed from semester' });
    });
});

// ── Semester-Teacher Assignment ───────────────────────────────────────────────

// GET /api/admin/erp/batches/:id/semesters/:semNum/teachers
router.get('/batches/:id/semesters/:semNum/teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  db.run(`CREATE TABLE IF NOT EXISTS semester_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number, teacher_id)
  )`, () => {
    db.all(`
      SELECT st.id, st.teacher_id, st.semester_number, u.email as teacher_email, u.email as teacher_name
      FROM semester_teachers st
      JOIN users u ON u.id = st.teacher_id
      WHERE st.batch_id = ? AND st.semester_number = ?
      ORDER BY u.email
    `, [id, semNum], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    });
  });
});

// POST /api/admin/erp/batches/:id/semesters/:semNum/teachers
router.post('/batches/:id/semesters/:semNum/teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  const { teacherIds } = req.body;
  if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0)
    return res.status(400).json({ success: false, message: 'teacherIds array required' });

  db.run(`CREATE TABLE IF NOT EXISTS semester_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number, teacher_id)
  )`, () => {
    let done = 0;
    teacherIds.forEach(tid => {
      db.run(`INSERT OR IGNORE INTO semester_teachers (batch_id, semester_number, teacher_id) VALUES (?, ?, ?)`,
        [id, semNum, tid], () => { if (++done === teacherIds.length) res.json({ success: true, message: `${teacherIds.length} teacher(s) assigned` }); });
    });
  });
});

// DELETE /api/admin/erp/batches/:id/semesters/:semNum/teachers/:teacherId
router.delete('/batches/:id/semesters/:semNum/teachers/:teacherId', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum, teacherId } = req.params;
  db.run(`DELETE FROM semester_teachers WHERE batch_id = ? AND semester_number = ? AND teacher_id = ?`,
    [id, semNum, teacherId], function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to remove' });
      res.json({ success: true, message: 'Teacher removed from semester' });
    });
});

// GET available teachers not yet in this semester
router.get('/batches/:id/semesters/:semNum/available-teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  db.all(`
    SELECT u.id, u.email, u.email as name
    FROM users u
    WHERE LOWER(u.role) = 'teacher'
    AND u.id NOT IN (
      SELECT teacher_id FROM semester_teachers WHERE batch_id = ? AND semester_number = ?
    )
    ORDER BY u.email
  `, [id, semNum], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
    res.json({ success: true, data: rows || [] });
  });
});

// GET available courses not yet in this semester (filtered by batch department)
router.get('/batches/:id/semesters/:semNum/available-courses', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  db.get('SELECT department FROM batches WHERE id = ?', [id], (err, batch) => {
    if (err || !batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    db.all(`
      SELECT c.id, c.name, c.code, c.credits, c.department
      FROM courses c
      WHERE c.department = ?
      AND c.id NOT IN (
        SELECT course_id FROM semester_courses WHERE batch_id = ? AND semester_number = ?
      )
      ORDER BY c.name
    `, [batch.department, id, semNum], (err2, rows) => {
      if (err2) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    });
  });
});

// ── Semester-Teacher-Course Assignment ───────────────────────────────────────
// Assigns a specific teacher to a specific course within a semester

const ensureTeacherCourseTable = (db, cb) => {
  db.run(`CREATE TABLE IF NOT EXISTS semester_teacher_courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number, teacher_id, course_id)
  )`, cb);
};

// GET /api/admin/erp/batches/:id/semesters/:semNum/teacher-courses
// Returns all teacher→course assignments for this semester
router.get('/batches/:id/semesters/:semNum/teacher-courses', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  ensureTeacherCourseTable(db, () => {
    db.all(`
      SELECT stc.id, stc.teacher_id, stc.course_id, stc.assigned_at,
             u.email as teacher_email,
             c.name as course_name, c.code as course_code
      FROM semester_teacher_courses stc
      JOIN users u ON u.id = stc.teacher_id
      JOIN courses c ON c.id = stc.course_id
      WHERE stc.batch_id = ? AND stc.semester_number = ?
      ORDER BY u.email, c.name
    `, [id, semNum], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    });
  });
});

// POST /api/admin/erp/batches/:id/semesters/:semNum/teacher-courses
// Assign a teacher to a course in this semester
router.post('/batches/:id/semesters/:semNum/teacher-courses', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, semNum } = req.params;
  const { teacherId, courseId } = req.body;
  if (!teacherId || !courseId)
    return res.status(400).json({ success: false, message: 'teacherId and courseId required' });

  ensureTeacherCourseTable(db, () => {
    // Also ensure teacher is in semester_teachers
    db.run(`INSERT OR IGNORE INTO semester_teachers (batch_id, semester_number, teacher_id) VALUES (?, ?, ?)`,
      [id, semNum, teacherId], () => {
        db.run(`INSERT OR IGNORE INTO semester_teacher_courses (batch_id, semester_number, teacher_id, course_id) VALUES (?, ?, ?, ?)`,
          [id, semNum, teacherId, courseId], function(err) {
            if (err) return res.status(500).json({ success: false, message: 'Failed to assign' });
            res.json({ success: true, message: 'Teacher assigned to course' });
          });
      });
  });
});

// DELETE /api/admin/erp/batches/:id/semesters/:semNum/teacher-courses/:assignId
router.delete('/batches/:id/semesters/:semNum/teacher-courses/:assignId', requireAdmin, (req, res) => {
  const db = require('../database');
  const { assignId } = req.params;
  db.run(`DELETE FROM semester_teacher_courses WHERE id = ?`, [assignId], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to remove' });
    res.json({ success: true, message: 'Assignment removed' });
  });
});

module.exports = router;
