const express = require('express');
const router = express.Router();
const {
  createBatch,
  getAllBatches,
  updateBatch,
  getBatchStudents,
  getBatchesByDepartment,
  deleteBatch,
  assignStudentsToBatch,
  removeStudentsFromBatch,
  getUnassignedStudents,
  getAllStudentsWithBatch,
  updateBatchStatus,
  cloneBatch,
  exportAllBatches,
  exportBatchStudents
} = require('../controllers/batchController');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  const userRole = req.body.adminRole || req.headers['x-user-role'] || req.session?.user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Admin Batch Routes
router.post('/batches', requireAdmin, createBatch);
router.get('/batches', requireAdmin, getAllBatches);
router.get('/batches/by-department', requireAdmin, getBatchesByDepartment);
router.get('/batches/unassigned-students', requireAdmin, getUnassignedStudents);
router.get('/batches/all-students', requireAdmin, getAllStudentsWithBatch);
router.get('/batches/orphaned-students', requireAdmin, (req, res) => {
  const db = require('../database');
  db.all(`
    SELECT s.id, s.studentId, s.name, s.email, s.department, s.year, s.batch_id,
           b.batch_name
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.batch_id IS NULL OR b.id IS NULL
    ORDER BY s.name
  `, [], (err, rows) => {
    if (err) {
      console.error('orphaned-students error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch orphaned students' });
    }
    res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
  });
});
router.get('/batches/:id/transferable-students', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  db.all(`
    SELECT s.id, s.studentId, s.name, s.email, s.department, s.year, s.batch_id,
           b.batch_name as current_batch_name
    FROM students s
    LEFT JOIN batches b ON s.batch_id = b.id
    WHERE s.batch_id != ? OR s.batch_id IS NULL
    ORDER BY s.name
  `, [id], (err, rows) => {
    if (err) {
      console.error('transferable-students error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch transferable students' });
    }
    res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
  });
});

// Bulk delete route - MUST be before /:id routes
router.post('/batches/bulk-delete', requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide an array of batch IDs' });
  }
  const db = require('../database');
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM batches WHERE id IN (${placeholders})`, ids, function(err) {
    if (err) {
      console.error('Bulk delete error:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete batches' });
    }
    res.json({ success: true, message: `${ids.length} batch(es) deleted successfully`, deletedCount: this.changes });
  });
});

// Phase 1: Student Management Routes
router.post('/batches/:id/assign-students', requireAdmin, assignStudentsToBatch);
router.post('/batches/:id/remove-students', requireAdmin, removeStudentsFromBatch);

// Phase 2: Lifecycle Management Routes
router.patch('/batches/:id/status', requireAdmin, updateBatchStatus);
router.post('/batches/:id/clone', requireAdmin, cloneBatch);

// Phase 3: Export Routes
router.get('/batches/export', requireAdmin, exportAllBatches);
router.get('/batches/:id/export-students', requireAdmin, exportBatchStudents);

// Batch-Teacher Assignment Routes
router.get('/batches/:id/teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  // Ensure table exists
  db.run(`CREATE TABLE IF NOT EXISTS batch_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, teacher_id),
    FOREIGN KEY(batch_id) REFERENCES batches(id),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  )`, () => {
    db.all(`
      SELECT bt.id, bt.teacher_id, u.email as teacher_email, bt.assigned_at
      FROM batch_teachers bt
      JOIN users u ON u.id = bt.teacher_id
      WHERE bt.batch_id = ?
      ORDER BY u.email
    `, [id], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    });
  });
});

router.post('/batches/:id/assign-teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  const { teacherIds } = req.body;
  if (!teacherIds || !Array.isArray(teacherIds) || teacherIds.length === 0)
    return res.status(400).json({ success: false, message: 'teacherIds array required' });

  db.run(`CREATE TABLE IF NOT EXISTS batch_teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, teacher_id),
    FOREIGN KEY(batch_id) REFERENCES batches(id),
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  )`, () => {
    let done = 0;
    teacherIds.forEach(tid => {
      db.run(`INSERT OR IGNORE INTO batch_teachers (batch_id, teacher_id) VALUES (?, ?)`,
        [id, tid], () => {
          if (++done === teacherIds.length) {
            // Update teacher_count on batch
            db.run(`UPDATE batches SET teacher_count = (SELECT COUNT(*) FROM batch_teachers WHERE batch_id = ?) WHERE id = ?`, [id, id]);
            res.json({ success: true, message: `${teacherIds.length} teacher(s) assigned` });
          }
        });
    });
  });
});

router.delete('/batches/:id/teachers/:teacherId', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id, teacherId } = req.params;
  db.run(`DELETE FROM batch_teachers WHERE batch_id = ? AND teacher_id = ?`, [id, teacherId], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to remove' });
    db.run(`UPDATE batches SET teacher_count = (SELECT COUNT(*) FROM batch_teachers WHERE batch_id = ?) WHERE id = ?`, [id, id]);
    res.json({ success: true, message: 'Teacher removed from batch' });
  });
});

// Get all teachers not yet in a batch (for assignment dropdown)
router.get('/batches/:id/available-teachers', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  db.all(`
    SELECT u.id, u.email
    FROM users u
    WHERE u.role = 'teacher'
    AND u.id NOT IN (SELECT teacher_id FROM batch_teachers WHERE batch_id = ?)
    ORDER BY u.email
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
    res.json({ success: true, data: rows || [] });
  });
});

router.put('/batches/:id', requireAdmin, updateBatch);
router.delete('/batches/:id', requireAdmin, deleteBatch);
router.get('/batches/:id/students', requireAdmin, getBatchStudents);

// ── Student Progression ───────────────────────────────────────────────────────

// GET /api/admin/batches/:id/progression?semester_number=
router.get('/batches/:id/progression', requireAdmin, (req, res) => {
  const db = require('../database');
  const { id } = req.params;
  const { semester_number } = req.query;

  let sql = `
    SELECT s.id, s.name, s.studentId, s.email, s.department,
           bss.semester_number, bss.result, bss.gpa, bss.promoted_at,
           bs.name as semester_name, bs.status as semester_status
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

    // Group by student
    const studentMap = {};
    (rows || []).forEach(r => {
      if (!studentMap[r.id]) {
        studentMap[r.id] = {
          id: r.id, name: r.name, studentId: r.studentId,
          email: r.email, department: r.department, semesters: []
        };
      }
      studentMap[r.id].semesters.push({
        semester_number: r.semester_number,
        semester_name: r.semester_name,
        result: r.result,
        gpa: r.gpa,
        promoted_at: r.promoted_at,
        remarks: r.remarks
      });
    });

    const students = Object.values(studentMap).map(s => ({
      ...s,
      currentSemester: s.semesters.find(x => x.result === 'ongoing')?.semester_number
        || Math.max(...s.semesters.map(x => x.semester_number)),
      currentStatus: s.semesters.find(x => x.result === 'ongoing')?.result
        || s.semesters[s.semesters.length - 1]?.result
    }));

    // Stats
    const ongoing = students.filter(s => s.currentStatus === 'ongoing').length;
    const passed  = students.filter(s => s.currentStatus === 'passed').length;
    const failed  = students.filter(s => s.currentStatus === 'failed').length;
    const passRate = students.length > 0
      ? Math.round(((passed) / (passed + failed || 1)) * 100) : 0;

    res.json({ success: true, data: students, stats: { total: students.length, ongoing, passed, failed, passRate } });
  });
});

// Auto-assign unassigned students to matching active batch by department
router.post('/batches/auto-assign', requireAdmin, (req, res) => {
  const db = require('../database');
  // Find all unassigned students
  db.all(`SELECT id, department FROM students WHERE batch_id IS NULL`, [], (err, students) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch students' });
    if (students.length === 0) return res.json({ success: true, assigned: 0, message: 'No unassigned students' });

    let assigned = 0;
    let done = 0;
    const total = students.length;

    students.forEach(student => {
      // Find the most recent active batch for this department
      db.get(`SELECT id FROM batches WHERE department = ? AND status = 'active' ORDER BY start_year DESC LIMIT 1`,
        [student.department], (err, batch) => {
          if (!err && batch) {
            db.run(`UPDATE students SET batch_id = ? WHERE id = ?`, [batch.id, student.id], () => {
              assigned++;
              if (++done === total) res.json({ success: true, assigned, message: `${assigned} student(s) auto-assigned` });
            });
          } else {
            if (++done === total) res.json({ success: true, assigned, message: `${assigned} student(s) auto-assigned` });
          }
        });
    });
  });
});

module.exports = router;
