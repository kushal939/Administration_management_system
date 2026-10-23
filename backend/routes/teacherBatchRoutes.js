const express = require('express');
const router = express.Router();
const { getTeacherBatches, getBatchesByDepartment, getStudentsByBatch } = require('../controllers/batchController');

const requireTeacher = (req, res, next) => {
  const userRole = req.headers['x-user-role'] || req.session?.user?.role;
  if (userRole !== 'teacher') {
    return res.status(403).json({ success: false, message: 'Access denied. Teacher privileges required.' });
  }
  next();
};

// My assigned batches (by teacher id)
router.get('/batches', requireTeacher, getTeacherBatches);
router.get('/batches/by-department', requireTeacher, getBatchesByDepartment);
router.get('/batches/students', requireTeacher, getStudentsByBatch);

// Students in a specific batch (teacher view)
router.get('/batches/:id/students', requireTeacher, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  db.all(`
    SELECT s.id, s.studentId, s.name, s.email, s.department, s.year, b.batch_name
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.batch_id = ?
    ORDER BY s.name
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch students' });
    res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
  });
});

// GET /api/teacher/batches/:id/progression?semester_number= — teacher view of student progression
router.get('/batches/:id/progression', requireTeacher, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  const { semester_number } = req.query;

  let sql = `
    SELECT s.id, s.name, s.studentId, s.department,
           bss.semester_number, bss.result, bss.gpa,
           bs.name as semester_name
    FROM batch_semester_students bss
    JOIN students s ON s.id = bss.student_id
    JOIN batch_semesters bs ON bs.id = bss.semester_id
    WHERE bss.batch_id = ?
  `;
  const params = [id];
  if (semester_number) { sql += ' AND bss.semester_number = ?'; params.push(semester_number); }
  sql += ' ORDER BY s.name, bss.semester_number';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

module.exports = router;
