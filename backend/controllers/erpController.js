const db = require('../database');

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureSemesters(batchId, totalSemesters, cb) {
  // Create semester rows 1..totalSemesters if they don't exist
  let done = 0;
  for (let i = 1; i <= totalSemesters; i++) {
    db.run(
      `INSERT OR IGNORE INTO batch_semesters (batch_id, semester_number, name, status)
       VALUES (?, ?, ?, ?)`,
      [batchId, i, `Semester ${i}`, i === 1 ? 'active' : 'upcoming'],
      () => { if (++done === totalSemesters) cb(); }
    );
  }
}

// ── GET /api/admin/erp/batches/:id/overview ───────────────────────────────────
const getBatchOverview = (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT b.*, COUNT(DISTINCT s.id) as student_count
     FROM batches b
     LEFT JOIN students s ON s.batch_id = b.id
     WHERE b.id = ?
     GROUP BY b.id`,
    [id],
    (err, batch) => {
      if (err || !batch) return res.status(404).json({ success: false, message: 'Batch not found' });

      // Calculate total semesters — use stored value if set, else derive from duration
      const duration = (batch.end_year || batch.start_year + 4) - batch.start_year;
      const totalSemesters = batch.total_semesters || (duration * 2) || 8;

      ensureSemesters(id, totalSemesters, () => {
        db.all(
          `SELECT bs.*,
            COUNT(DISTINCT bss.student_id) as student_count,
            SUM(CASE WHEN bss.result = 'passed' THEN 1 ELSE 0 END) as passed_count,
            SUM(CASE WHEN bss.result = 'failed' THEN 1 ELSE 0 END) as failed_count,
            SUM(CASE WHEN bss.result = 'ongoing' THEN 1 ELSE 0 END) as ongoing_count
           FROM batch_semesters bs
           LEFT JOIN batch_semester_students bss ON bss.semester_id = bs.id AND bss.batch_id = bs.batch_id
           WHERE bs.batch_id = ?
           GROUP BY bs.id
           ORDER BY bs.semester_number`,
          [id],
          (err2, semesters) => {
            if (err2) return res.status(500).json({ success: false, message: 'Failed to fetch semesters' });
            res.json({ success: true, data: { batch, semesters, totalSemesters } });
          }
        );
      });
    }
  );
};

// ── GET /api/admin/erp/batches/:id/students ───────────────────────────────────
const getBatchStudentsERP = (req, res) => {
  const { id } = req.params;
  const { semester, unenrolled } = req.query;

  // Return students NOT yet enrolled in a given semester
  if (unenrolled && semester) {
    const sql = `
      SELECT s.id, s.name, s.email, s.studentId, s.roll_number, s.department, s.current_semester
      FROM students s
      WHERE s.batch_id = ?
        AND s.id NOT IN (
          SELECT bss.student_id FROM batch_semester_students bss
          JOIN batch_semesters bs ON bs.id = bss.semester_id
          WHERE bss.batch_id = ? AND bss.semester_number = ?
        )
      ORDER BY s.name`;
    return db.all(sql, [id, id, semester], (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
    });
  }

  let sql, params;

  if (semester) {
    sql = `
      SELECT s.id, s.name, s.email, s.studentId, s.roll_number, s.department,
             s.current_semester, s.enrollment_status,
             bss.result, bss.gpa, bss.semester_number,
             bs.name as semester_name, bs.status as semester_status
      FROM students s
      JOIN batch_semester_students bss ON bss.student_id = s.id AND bss.batch_id = ?
      JOIN batch_semesters bs ON bs.id = bss.semester_id
      WHERE s.batch_id = ? AND bss.semester_number = ?
      ORDER BY s.name`;
    params = [id, id, semester];
  } else {
    sql = `
      SELECT s.id, s.name, s.email, s.studentId, s.roll_number, s.department,
             s.current_semester, s.enrollment_status
      FROM students s
      WHERE s.batch_id = ?
      ORDER BY s.name`;
    params = [id];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to fetch students' });
    res.json({ success: true, data: rows || [], count: rows ? rows.length : 0 });
  });
};

// ── POST /api/admin/erp/batches/:id/enroll-semester ──────────────────────────
// Enroll all OR specific batch students into a specific semester
const enrollInSemester = (req, res) => {
  const { id } = req.params;
  const { semester_number, student_ids } = req.body;
  // student_ids: optional array — if omitted, enroll ALL batch students

  if (!semester_number) return res.status(400).json({ success: false, message: 'semester_number required' });

  db.get(
    'SELECT * FROM batch_semesters WHERE batch_id = ? AND semester_number = ?',
    [id, semester_number],
    (err, sem) => {
      if (err || !sem) return res.status(404).json({ success: false, message: 'Semester not found' });

      const fetchSql = student_ids && student_ids.length
        ? `SELECT id FROM students WHERE batch_id = ? AND id IN (${student_ids.map(() => '?').join(',')})`
        : 'SELECT id FROM students WHERE batch_id = ?';
      const fetchParams = student_ids && student_ids.length
        ? [id, ...student_ids]
        : [id];

      db.all(fetchSql, fetchParams, (err2, students) => {
        if (err2) return res.status(500).json({ success: false, message: 'Failed to fetch students' });
        if (!students.length) return res.json({ success: true, message: 'No matching students found', enrolled: 0 });

        let done = 0;
        students.forEach(s => {
          db.run(
            `INSERT OR IGNORE INTO batch_semester_students
             (batch_id, semester_id, student_id, semester_number, result)
             VALUES (?, ?, ?, ?, 'ongoing')`,
            [id, sem.id, s.id, semester_number],
            () => { if (++done === students.length) {
              res.json({ success: true, message: `${students.length} student(s) enrolled in Semester ${semester_number}`, enrolled: students.length });
            }}
          );
        });
      });
    }
  );
};

// ── POST /api/admin/erp/batches/:id/promote ───────────────────────────────────
// Promote passed students from current semester to next
const promoteStudents = (req, res) => {
  const { id } = req.params;
  const { from_semester, student_results } = req.body;
  // student_results: [{ student_id, result: 'passed'|'failed', gpa }]

  if (!from_semester || !student_results) {
    return res.status(400).json({ success: false, message: 'from_semester and student_results required' });
  }

  const to_semester = from_semester + 1;

  // Get semester rows
  db.get('SELECT * FROM batch_semesters WHERE batch_id = ? AND semester_number = ?', [id, from_semester], (err, fromSem) => {
    if (err || !fromSem) return res.status(404).json({ success: false, message: 'From-semester not found' });

    db.get('SELECT * FROM batch_semesters WHERE batch_id = ? AND semester_number = ?', [id, to_semester], (err2, toSem) => {
      if (err2 || !toSem) return res.status(404).json({ success: false, message: `Semester ${to_semester} not found. This may be the final semester.` });

      let processed = 0;
      let promotedCount = 0;
      let failedCount = 0;
      const total = student_results.length;

      if (total === 0) return res.json({ success: true, promoted: 0, failed: 0 });

      student_results.forEach(({ student_id, result, gpa }) => {
        // Skip students still marked ongoing — don't touch them
        if (result === 'ongoing') {
          if (++processed === total) finalize();
          return;
        }

        // Update result in from_semester
        db.run(
          `UPDATE batch_semester_students SET result = ?, gpa = ?, promoted_at = CURRENT_TIMESTAMP
           WHERE student_id = ? AND batch_id = ? AND semester_number = ?`,
          [result, gpa || null, student_id, id, from_semester],
          () => {
            if (result === 'passed') {
              promotedCount++;
              // Enroll ONLY passed students in next semester
              db.run(
                `INSERT OR IGNORE INTO batch_semester_students
                 (batch_id, semester_id, student_id, semester_number, result)
                 VALUES (?, ?, ?, ?, 'ongoing')`,
                [id, toSem.id, student_id, to_semester],
                () => {
                  db.run('UPDATE students SET current_semester = ? WHERE id = ?', [to_semester, student_id]);
                }
              );
            } else {
              // failed — mark result only, do NOT re-enroll (they stay in current sem record)
              failedCount++;
            }

            if (++processed === total) finalize();
          }
        );
      });

      function finalize() {
        // Only mark from_semester completed if no students are still ongoing
        db.get(
          `SELECT COUNT(*) as cnt FROM batch_semester_students
           WHERE batch_id = ? AND semester_number = ? AND result = 'ongoing'`,
          [id, from_semester],
          (err, row) => {
            if (!err && row.cnt === 0) {
              db.run('UPDATE batch_semesters SET status = ? WHERE id = ?', ['completed', fromSem.id]);
            }
            // Activate next semester if any students were promoted
            if (promotedCount > 0) {
              db.run('UPDATE batch_semesters SET status = ? WHERE id = ?', ['active', toSem.id]);
            }

            db.run(
              `INSERT INTO batch_promotions (batch_id, from_semester, to_semester, promoted_count, failed_count)
               VALUES (?, ?, ?, ?, ?)`,
              [id, from_semester, to_semester, promotedCount, failedCount]
            );

            res.json({
              success: true,
              message: `Promotion complete: ${promotedCount} promoted, ${failedCount} held back`,
              promoted: promotedCount,
              failed: failedCount
            });
          }
        );
      }
    });
  });
};

// ── GET /api/admin/erp/students/:studentId/timeline ──────────────────────────
const getStudentTimeline = (req, res) => {
  const { studentId } = req.params;

  db.get('SELECT * FROM students WHERE id = ? OR studentId = ?', [studentId, studentId], (err, student) => {
    if (err || !student) return res.status(404).json({ success: false, message: 'Student not found' });

    db.all(
      `SELECT bss.*, bs.name as semester_name, b.batch_name, b.department, b.start_year, b.end_year
       FROM batch_semester_students bss
       JOIN batch_semesters bs ON bs.id = bss.semester_id
       JOIN batches b ON b.id = bss.batch_id
       WHERE bss.student_id = ?
       ORDER BY bss.batch_id, bss.semester_number`,
      [student.id],
      (err2, timeline) => {
        if (err2) return res.status(500).json({ success: false, message: 'Failed to fetch timeline' });
        res.json({ success: true, data: { student, timeline } });
      }
    );
  });
};

// ── PATCH /api/admin/erp/batches/:id/students/:studentId/semester-result ──────
// Edit result + GPA for a student in any semester (even completed ones)
const updateStudentSemesterResult = (req, res) => {
  const { id, studentId } = req.params;
  const { semester_number, result, gpa } = req.body;

  const valid = ['ongoing', 'passed', 'failed'];
  if (!semester_number) return res.status(400).json({ success: false, message: 'semester_number required' });
  if (result && !valid.includes(result)) return res.status(400).json({ success: false, message: 'Invalid result' });

  db.run(
    `UPDATE batch_semester_students
     SET result = COALESCE(?, result),
         gpa    = COALESCE(?, gpa)
     WHERE student_id = ? AND batch_id = ? AND semester_number = ?`,
    [result || null, gpa !== undefined ? gpa : null, studentId, id, semester_number],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to update' });
      if (this.changes === 0) return res.status(404).json({ success: false, message: 'Record not found' });

      // Also sync student's current_semester if result changed to passed
      if (result === 'passed') {
        db.run('UPDATE students SET current_semester = ? WHERE id = ?', [semester_number, studentId]);
      }

      res.json({ success: true, message: 'Result updated successfully' });
    }
  );
};
const updateSemesterStatus = (req, res) => {
  const { id, semId } = req.params;
  const { status } = req.body;
  const valid = ['upcoming', 'active', 'completed'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  db.run('UPDATE batch_semesters SET status = ? WHERE id = ? AND batch_id = ?', [status, semId, id], function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Failed to update' });
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'Semester not found' });
    res.json({ success: true, message: 'Semester status updated' });
  });
};

// ── GET /api/admin/erp/batches/:id/promotions ─────────────────────────────────
const getPromotionHistory = (req, res) => {
  const { id } = req.params;
  db.all(
    'SELECT * FROM batch_promotions WHERE batch_id = ? ORDER BY promoted_at ASC',
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch' });
      res.json({ success: true, data: rows || [] });
    }
  );
};

module.exports = {
  getBatchOverview,
  getBatchStudentsERP,
  enrollInSemester,
  promoteStudents,
  getStudentTimeline,
  updateSemesterStatus,
  updateStudentSemesterResult,
  getPromotionHistory
};
