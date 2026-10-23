const express = require('express');
const router = express.Router();
const {
  getPrincipalBatchStats
} = require('../controllers/batchController');

// Middleware to check principal role
const requirePrincipal = (req, res, next) => {
  const userRole = req.headers['x-user-role'] || req.session?.user?.role;
  
  if (userRole !== 'principal') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Principal privileges required.'
    });
  }
  next();
};

// Principal Batch Routes
router.get('/batch-stats', requirePrincipal, getPrincipalBatchStats);

// GET /api/principal/progression-stats — pass/fail rates per batch
router.get('/progression-stats', requirePrincipal, (req, res) => {
  const db = require('../database');
  db.all(`
    SELECT b.id, b.batch_name, b.department, b.status,
      COUNT(DISTINCT bss.student_id) as total_students,
      SUM(CASE WHEN bss.result = 'passed'  THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN bss.result = 'failed'  THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN bss.result = 'ongoing' THEN 1 ELSE 0 END) as ongoing,
      ROUND(
        SUM(CASE WHEN bss.result = 'passed' THEN 1.0 ELSE 0 END) /
        NULLIF(SUM(CASE WHEN bss.result IN ('passed','failed') THEN 1 ELSE 0 END), 0) * 100
      , 1) as pass_rate
    FROM batches b
    LEFT JOIN batch_semester_students bss ON bss.batch_id = b.id
    GROUP BY b.id
    ORDER BY b.department, b.start_year DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

module.exports = router;
