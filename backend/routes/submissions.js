const express = require('express');
const router = express.Router();
const db = require('../database');

// Init submissions table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    content TEXT,
    file_name TEXT,
    file_data TEXT,
    status TEXT DEFAULT 'submitted',
    marks_obtained REAL,
    feedback TEXT,
    rubric_scores TEXT,
    grade TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    graded_at DATETIME,
    UNIQUE(assignment_id, student_id)
  )`);
  // Add rubric columns if upgrading existing table
  db.run(`ALTER TABLE assignment_submissions ADD COLUMN rubric_scores TEXT`, () => {});
  db.run(`ALTER TABLE assignment_submissions ADD COLUMN grade TEXT`, () => {});
});

// GET /api/submissions/assignment/:assignmentId — teacher/admin sees all submissions for an assignment
router.get('/assignment/:assignmentId', (req, res) => {
  db.all(`
    SELECT sub.*, s.name as student_name, s.studentId as student_code
    FROM assignment_submissions sub
    JOIN students s ON s.id = sub.student_id
    WHERE sub.assignment_id = ?
    ORDER BY sub.submitted_at DESC
  `, [req.params.assignmentId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// GET /api/submissions/student/:studentId — all submissions by a student
router.get('/student/:studentId', (req, res) => {
  db.all(`
    SELECT sub.*, a.title as assignment_title, a.course, a.total_marks, a.due_date
    FROM assignment_submissions sub
    JOIN assignments a ON a.id = sub.assignment_id
    JOIN students s ON s.id = sub.student_id
    WHERE s.studentId = ?
    ORDER BY sub.submitted_at DESC
  `, [req.params.studentId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// GET /api/submissions/check/:assignmentId/:studentId — check if student already submitted
router.get('/check/:assignmentId/:studentId', (req, res) => {
  db.get(`
    SELECT sub.* FROM assignment_submissions sub
    JOIN students s ON s.id = sub.student_id
    WHERE sub.assignment_id = ? AND s.studentId = ?
  `, [req.params.assignmentId, req.params.studentId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: row || null });
  });
});

// POST /api/submissions — student submits
router.post('/', (req, res) => {
  const { assignment_id, student_db_id, content, file_name, file_data } = req.body;
  if (!assignment_id || !student_db_id) {
    return res.status(400).json({ success: false, message: 'assignment_id and student_db_id required' });
  }
  db.run(`
    INSERT OR REPLACE INTO assignment_submissions
      (assignment_id, student_id, content, file_name, file_data, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
  `, [assignment_id, student_db_id, content || null, file_name || null, file_data || null],
  function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// PUT /api/submissions/:id/grade — teacher grades a submission with rubric + feedback
router.put('/:id/grade', (req, res) => {
  const { marks_obtained, feedback, rubric_scores, grade } = req.body;
  // rubric_scores: JSON string of { criterion: score } pairs
  const letterGrade = grade || computeGrade(marks_obtained);
  db.run(`
    UPDATE assignment_submissions
    SET marks_obtained = ?, feedback = ?, rubric_scores = ?, grade = ?,
        status = 'graded', graded_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [marks_obtained, feedback || null, rubric_scores || null, letterGrade, req.params.id],
  function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    // Notify student
    db.get(`
      SELECT sub.student_id, s.studentId, a.title, a.total_marks
      FROM assignment_submissions sub
      JOIN students s ON s.id = sub.student_id
      JOIN assignments a ON a.id = sub.assignment_id
      WHERE sub.id = ?
    `, [req.params.id], (e, row) => {
      if (!e && row) {
        const { createNotification } = require('../utils/notificationHelper');
        createNotification({
          title: '📝 Assignment Graded',
          message: `Your submission for "${row.title}" has been graded: ${marks_obtained}/${row.total_marks} (${letterGrade})`,
          type: 'assignment',
          recipient_id: row.studentId,
          related_entity: 'assignment',
          related_id: String(row.assignment_id || '')
        }).catch(() => {});
      }
    });
    res.json({ success: true, grade: letterGrade });
  });
});

// GET /api/submissions/:id/grade-history — full grade history for a submission
router.get('/:id/grade-history', (req, res) => {
  db.get(`
    SELECT sub.*, s.name as student_name, s.studentId as student_code,
           a.title as assignment_title, a.total_marks, a.course
    FROM assignment_submissions sub
    JOIN students s ON s.id = sub.student_id
    JOIN assignments a ON a.id = sub.assignment_id
    WHERE sub.id = ?
  `, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    if (row.rubric_scores) {
      try { row.rubric_scores = JSON.parse(row.rubric_scores); } catch (e) {}
    }
    res.json({ success: true, data: row });
  });
});

function computeGrade(marks) {
  if (!marks) return 'NG';
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B+';
  if (marks >= 60) return 'B';
  if (marks >= 50) return 'C+';
  if (marks >= 40) return 'C';
  if (marks >= 33) return 'D';
  return 'F';
}

// GET /api/submissions/stats/:assignmentId — submission stats for an assignment
router.get('/stats/:assignmentId', (req, res) => {
  db.get(`
    SELECT
      COUNT(*) as total_submitted,
      SUM(CASE WHEN status='graded' THEN 1 ELSE 0 END) as graded,
      AVG(CASE WHEN marks_obtained IS NOT NULL THEN marks_obtained END) as avg_marks
    FROM assignment_submissions WHERE assignment_id = ?
  `, [req.params.assignmentId], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: row });
  });
});

module.exports = router;
