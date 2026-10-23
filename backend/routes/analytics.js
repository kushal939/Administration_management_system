const express = require('express');
const router = express.Router();
const db = require('../database');

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// GET /overview - return basic KPIs and small datasets
router.get('/overview', async (req, res) => {
  try {
    const teacherId   = req.query.teacherId   ? Number(req.query.teacherId)   : null;
    const department  = req.query.department  || null;
    const batchId     = req.query.batchId     ? Number(req.query.batchId)     : null;

    // Build scoping WHERE clauses
    // Students scope
    const studentScope = [];
    if (department) studentScope.push(`s.department = '${department.replace(/'/g, "''")}'`);
    if (batchId)    studentScope.push(`s.batch_id = ${batchId}`);
    const studentWhere = studentScope.length ? `WHERE ${studentScope.join(' AND ')}` : '';
    const studentAnd   = studentScope.length ? `AND ${studentScope.join(' AND ')}` : '';

    // Attendance scope
    const attScope = [];
    if (department) attScope.push(`s.department = '${department.replace(/'/g, "''")}'`);
    if (batchId)    attScope.push(`s.batch_id = ${batchId}`);
    if (teacherId)  attScope.push(`a.course IN (SELECT c.name FROM semester_teacher_courses stc JOIN courses c ON c.id = stc.course_id WHERE stc.teacher_id = ${teacherId})`);
    const attJoin  = (department || batchId) ? `JOIN students s ON s.studentId = a.studentId` : '';
    const attWhere = attScope.length ? `WHERE ${attScope.join(' AND ')}` : '';

    // Results scope
    const resScope = [];
    if (batchId)   resScope.push(`sr.batch_id = ${batchId}`);
    if (teacherId) resScope.push(`sr.batch_id IN (SELECT DISTINCT batch_id FROM semester_teacher_courses WHERE teacher_id = ${teacherId})`);
    if (department && !batchId) resScope.push(`sr.batch_id IN (SELECT id FROM batches WHERE department = '${department.replace(/'/g, "''")}')`);
    const resAnd = resScope.length ? `AND ${resScope.join(' AND ')}` : '';

    const totalStudentsRow = await runGet(`SELECT COUNT(*) as count FROM students s ${studentWhere}`);
    const totalCoursesRow  = await runGet('SELECT COUNT(*) as count FROM courses');
    const totalTeachersRow = await runGet("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'teacher'");

    const attendanceRow = await runGet(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END) as present
      FROM attendance a ${attJoin} ${attWhere}
    `);

    const avgMarksRow = await runGet(`
      SELECT ROUND(AVG(sr.internal_marks + sr.external_marks), 2) as avgMarks
      FROM semester_results sr
      WHERE sr.status = 'published' ${resAnd}
    `);

    // Course enrollments — scoped by department/batch
    const enrollScope = [];
    if (department) enrollScope.push(`s.department = '${department.replace(/'/g, "''")}'`);
    if (batchId)    enrollScope.push(`s.batch_id = ${batchId}`);
    const enrollWhere = enrollScope.length
      ? `WHERE e.student_id IN (SELECT id FROM students s WHERE ${enrollScope.join(' AND ')})`
      : '';
    const courseEnrollments = await runQuery(`
      SELECT c.name as course, COUNT(DISTINCT e.student_id) as count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      ${enrollWhere}
      GROUP BY c.name ORDER BY count DESC
    `);

    const marksDistribution = await runQuery(`
      SELECT CAST((sr.internal_marks + sr.external_marks) / 10 AS INTEGER) * 10 as range_start,
             COUNT(*) as count
      FROM semester_results sr
      WHERE sr.status = 'published' ${resAnd}
      GROUP BY range_start ORDER BY range_start
    `);

    // Attendance by department (for department breakdown chart)
    const attendanceByDept = await runQuery(`
      SELECT s.department,
             COUNT(*) as total,
             SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END) as present,
             ROUND(SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as rate
      FROM attendance a
      JOIN students s ON s.studentId = a.studentId
      ${department ? `WHERE s.department = '${department.replace(/'/g, "''")}'` : ''}
      ${batchId ? `${department ? 'AND' : 'WHERE'} s.batch_id = ${batchId}` : ''}
      GROUP BY s.department ORDER BY rate DESC
    `);

    // Attendance by batch (for batch breakdown chart)
    const attendanceByBatch = await runQuery(`
      SELECT b.batch_name, b.id as batch_id,
             COUNT(*) as total,
             SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END) as present,
             ROUND(SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1.0 ELSE 0 END) / COUNT(*) * 100, 1) as rate
      FROM attendance a
      JOIN students s ON s.studentId = a.studentId
      JOIN batches b ON b.id = s.batch_id
      ${department ? `WHERE s.department = '${department.replace(/'/g, "''")}'` : ''}
      ${batchId ? `${department ? 'AND' : 'WHERE'} s.batch_id = ${batchId}` : ''}
      GROUP BY b.id ORDER BY rate DESC
    `);

    const atRiskStudents = await runQuery(`
      SELECT s.id, s.name, s.email, s.studentId, s.department,
             b.batch_name,
             ROUND(AVG(sr.internal_marks + sr.external_marks), 1) as avgMarks,
             ROUND(AVG(CAST(sr.internal_marks + sr.external_marks AS REAL) / (sr.max_internal + sr.max_external) * 100), 1) as avgPct
      FROM students s
      JOIN semester_results sr ON sr.student_id = s.id
      LEFT JOIN batches b ON b.id = s.batch_id
      WHERE (sr.status = 'published' OR sr.status = 'draft') ${resAnd} ${studentAnd}
      GROUP BY s.id HAVING avgPct < 40
      ORDER BY avgPct ASC LIMIT 10
    `);

    const overview = {
      totalStudents: totalStudentsRow?.count || 0,
      totalCourses:  totalCoursesRow?.count  || 0,
      totalTeachers: totalTeachersRow?.count || 0,
      attendance: {
        total:   attendanceRow?.total   || 0,
        present: attendanceRow?.present || 0,
        rate: attendanceRow?.total ? ((attendanceRow.present || 0) / attendanceRow.total) * 100 : 0
      },
      avgMarks: avgMarksRow?.avgMarks ? Number(Number(avgMarksRow.avgMarks).toFixed(2)) : 0,
      courseEnrollments,
      marksDistribution,
      attendanceByDept,
      attendanceByBatch,
      atRiskStudents
    };

    res.json({ success: true, overview });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

module.exports = router;
