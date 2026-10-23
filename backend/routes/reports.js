const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/reports/overview - Comprehensive system overview
router.get('/overview', async (req, res) => {
  try {
    const overview = {};

    // Total counts
    const counts = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM students', [], (err, row) => {
          if (err) reject(err);
          else resolve({ students: row.count });
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM courses', [], (err, row) => {
          if (err) reject(err);
          else resolve({ courses: row.count });
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM departments', [], (err, row) => {
          if (err) reject(err);
          else resolve({ departments: row.count });
        });
      }),
      new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['teacher'], (err, row) => {
          if (err) reject(err);
          else resolve({ teachers: row.count });
        });
      })
    ]);

    overview.totalStudents = counts[0].students;
    overview.totalCourses = counts[1].courses;
    overview.totalDepartments = counts[2].departments;
    overview.totalTeachers = counts[3].teachers;

    // Attendance statistics
    const attendanceStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
        FROM attendance
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    overview.attendance = {
      total: attendanceStats.total || 0,
      present: attendanceStats.present || 0,
      absent: attendanceStats.absent || 0,
      late: attendanceStats.late || 0,
      rate: attendanceStats.total > 0 ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1) : 0
    };

    // Marks statistics from semester_results
    const marksStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT
          ROUND(AVG(internal_marks+external_marks), 2) as avgMarks,
          MAX(internal_marks+external_marks) as maxMarks,
          MIN(internal_marks+external_marks) as minMarks,
          COUNT(*) as totalRecords
        FROM semester_results WHERE status='published'
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    overview.marks = {
      average: marksStats.avgMarks ? Number(marksStats.avgMarks).toFixed(2) : 0,
      highest: marksStats.maxMarks || 0,
      lowest: marksStats.minMarks || 0,
      totalRecords: marksStats.totalRecords || 0
    };

    // Fees statistics
    const feesStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          SUM(amount) as total,
          SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as collected,
          SUM(CASE WHEN paid = 0 THEN amount ELSE 0 END) as pending,
          COUNT(*) as totalRecords
        FROM fees
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    overview.fees = {
      total: feesStats.total || 0,
      collected: feesStats.collected || 0,
      pending: feesStats.pending || 0,
      collectionRate: feesStats.total > 0 ? ((feesStats.collected / feesStats.total) * 100).toFixed(1) : 0,
      totalRecords: feesStats.totalRecords || 0
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reports/students - Student reports
router.get('/students', async (req, res) => {
  try {
    // Students by department
    const byDepartment = await new Promise((resolve, reject) => {
      db.all(`
        SELECT department, COUNT(*) as count
        FROM students
        WHERE department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY count DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Students by year
    const byYear = await new Promise((resolve, reject) => {
      db.all(`
        SELECT year, COUNT(*) as count
        FROM students
        WHERE year IS NOT NULL AND year != ''
        GROUP BY year
        ORDER BY year
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Enrollment statistics
    const enrollmentStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          d.name as department,
          COUNT(DISTINCT e.student_id) as students,
          COUNT(e.id) as enrollments
        FROM departments d
        LEFT JOIN enrollments e ON e.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY students DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        byDepartment,
        byYear,
        enrollmentStats
      }
    });
  } catch (error) {
    console.error('Error fetching student reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reports/attendance - Attendance reports
router.get('/attendance', async (req, res) => {
  try {
    // Attendance by status
    const byStatus = await new Promise((resolve, reject) => {
      db.all(`
        SELECT status, COUNT(*) as count
        FROM attendance
        GROUP BY status
        ORDER BY count DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Attendance by course
    const byCourse = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          course,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
          ROUND(CAST(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as rate
        FROM attendance
        GROUP BY course
        ORDER BY rate DESC
        LIMIT 10
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Attendance trend (last 7 days)
    const trend = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date >= date('now', '-7 days')
        GROUP BY date
        ORDER BY date
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        byStatus,
        byCourse,
        trend
      }
    });
  } catch (error) {
    console.error('Error fetching attendance reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reports/marks - Marks reports from semester_results
router.get('/marks', async (req, res) => {
  try {
    // Distribution by score range (using internal+external to avoid virtual col)
    const distribution = await new Promise((resolve, reject) => {
      db.all(`
        SELECT
          CASE
            WHEN (internal_marks+external_marks) >= 90 THEN '90+'
            WHEN (internal_marks+external_marks) >= 80 THEN '80-89'
            WHEN (internal_marks+external_marks) >= 70 THEN '70-79'
            WHEN (internal_marks+external_marks) >= 60 THEN '60-69'
            WHEN (internal_marks+external_marks) >= 50 THEN '50-59'
            WHEN (internal_marks+external_marks) >= 40 THEN '40-49'
            ELSE '0-39'
          END as range,
          COUNT(*) as count
        FROM semester_results WHERE status='published'
        GROUP BY range ORDER BY range DESC
      `, [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });

    // Average by subject
    const byCourse = await new Promise((resolve, reject) => {
      db.all(`
        SELECT subject as course,
          ROUND(AVG(internal_marks+external_marks), 1) as average,
          COUNT(*) as count
        FROM semester_results WHERE status='published'
        GROUP BY subject ORDER BY average DESC LIMIT 10
      `, [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });

    // Top performers (avg percentage >= 60%, include draft+published)
    const topPerformers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.name, s.studentId, s.department,
          ROUND(AVG(CAST(sr.internal_marks+sr.external_marks AS REAL)/(sr.max_internal+sr.max_external)*100),1) as average
        FROM students s
        JOIN semester_results sr ON sr.student_id = s.id
        GROUP BY s.id HAVING average >= 60
        ORDER BY average DESC LIMIT 10
      `, [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });

    // At-risk (avg percentage < 40%, include draft+published)
    const atRisk = await new Promise((resolve, reject) => {
      db.all(`
        SELECT s.name, s.studentId, s.department,
          ROUND(AVG(CAST(sr.internal_marks+sr.external_marks AS REAL)/(sr.max_internal+sr.max_external)*100),1) as average
        FROM students s
        JOIN semester_results sr ON sr.student_id = s.id
        GROUP BY s.id HAVING average < 40
        ORDER BY average ASC LIMIT 10
      `, [], (err, rows) => { if (err) reject(err); else resolve(rows || []); });
    });

    res.json({ success: true, data: { distribution, byCourse, topPerformers, atRisk } });
  } catch (error) {
    console.error('Error fetching marks reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reports/fees - Fees reports
router.get('/fees', async (req, res) => {
  try {
    // Fees by category
    const byCategory = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          category,
          SUM(amount) as total,
          SUM(CASE WHEN paid = 1 THEN amount ELSE 0 END) as collected,
          COUNT(*) as count
        FROM fees
        GROUP BY category
        ORDER BY total DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Payment status
    const paymentStatus = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          CASE WHEN paid = 1 THEN 'Paid' ELSE 'Unpaid' END as status,
          COUNT(*) as count,
          SUM(amount) as total
        FROM fees
        GROUP BY paid
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Recent payments
    const recentPayments = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          ph.*,
          s.name as student_name
        FROM payment_history ph
        LEFT JOIN students s ON s.studentId = ph.student_id
        ORDER BY ph.payment_date DESC
        LIMIT 10
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: {
        byCategory,
        paymentStatus,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Error fetching fees reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/reports/departments - Department reports
router.get('/departments', async (req, res) => {
  try {
    const departmentStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          d.name,
          d.code,
          COUNT(DISTINCT s.id) as students,
          COUNT(DISTINCT c.id) as courses,
          COUNT(DISTINCT e.id) as enrollments
        FROM departments d
        LEFT JOIN students s ON s.department = d.name
        LEFT JOIN courses c ON c.department = d.name
        LEFT JOIN enrollments e ON e.department_id = d.id
        GROUP BY d.id, d.name, d.code
        ORDER BY students DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      success: true,
      data: departmentStats
    });
  } catch (error) {
    console.error('Error fetching department reports:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
