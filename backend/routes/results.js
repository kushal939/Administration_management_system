const express = require('express');
const router = express.Router();
const db = require('../database');

// ── Init tables on first load ─────────────────────────────────────────────────
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS semester_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    internal_marks REAL DEFAULT 0,
    external_marks REAL DEFAULT 0,
    total_marks REAL GENERATED ALWAYS AS (internal_marks + external_marks) VIRTUAL,
    max_internal INTEGER DEFAULT 40,
    max_external INTEGER DEFAULT 60,
    status TEXT DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS result_publish_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    action TEXT NOT NULL,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ensure unique index exists at startup so ON CONFLICT works
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_results_unique
    ON semester_results(batch_id, semester_number, student_id, subject)`);
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcGrade(total, maxTotal) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  if (pct >= 90) return { grade: 'A+', gpa: 4.0 };
  if (pct >= 80) return { grade: 'A',  gpa: 3.7 };
  if (pct >= 70) return { grade: 'B+', gpa: 3.3 };
  if (pct >= 60) return { grade: 'B',  gpa: 3.0 };
  if (pct >= 50) return { grade: 'C+', gpa: 2.5 };
  if (pct >= 40) return { grade: 'C',  gpa: 2.0 };
  if (pct >= 33) return { grade: 'D',  gpa: 1.0 };
  return { grade: 'F', gpa: 0.0 };
}

// ── GET /api/results?batch_id=&semester_number=&student_id=&role= ─────────────
router.get('/', (req, res) => {
  const { batch_id, semester_number, student_id, role } = req.query;
  const isAdmin = role === 'admin' || role === 'principal';
  const isTeacher = role === 'teacher';

  let sql = `
    SELECT sr.*, s.name as student_name, s.studentId as student_code,
           b.batch_name, b.department
    FROM semester_results sr
    JOIN students s ON s.id = sr.student_id
    JOIN batches b ON b.id = sr.batch_id
  `;

  // When filtering by batch+semester, only include students enrolled in that semester via ERP
  // AND only subjects assigned to that semester via semester_courses
  if (batch_id && semester_number) {
    sql += `
    JOIN batch_semester_students bss ON bss.student_id = sr.student_id
      AND bss.batch_id = sr.batch_id
      AND bss.semester_number = sr.semester_number
    WHERE 1=1
    AND sr.subject IN (
      SELECT c.name FROM semester_courses sc
      JOIN courses c ON c.id = sc.course_id
      WHERE sc.batch_id = ${Number(batch_id)} AND sc.semester_number = ${Number(semester_number)}
    )
    `;
  } else {
    sql += ' WHERE 1=1';
  }

  const params = [];

  if (batch_id)       { sql += ' AND sr.batch_id = ?';        params.push(batch_id); }
  if (semester_number){ sql += ' AND sr.semester_number = ?'; params.push(semester_number); }
  if (student_id)     { sql += ' AND sr.student_id = ?';      params.push(student_id); }
  if (!isAdmin && !isTeacher) { sql += " AND sr.status = 'published'"; }

  sql += ' ORDER BY s.name, sr.subject';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows || [] });
  });
});

// ── GET /api/results/summary?batch_id=&semester_number=&role= ─────────────────
router.get('/summary', (req, res) => {
  const { batch_id, semester_number, role } = req.query;
  const isAdmin = role === 'admin' || role === 'principal';
  const isTeacher = role === 'teacher';

  if (!batch_id || !semester_number) {
    return res.status(400).json({ success: false, message: 'batch_id and semester_number required' });
  }

  // Admin and teacher see all results (draft+published); students only see published
  const statusFilter = (isAdmin || isTeacher) ? '' : "AND sr.status = 'published'";

  // Only show students who are actually enrolled in this semester via ERP
  // AND only count subjects that are actually assigned to this semester via semester_courses
  const sql = `
    SELECT sr.student_id, s.name as student_name, s.studentId as student_code,
           COUNT(sr.id) as subject_count,
           SUM(sr.internal_marks + sr.external_marks) as total_obtained,
           SUM(sr.max_internal + sr.max_external) as total_max,
           MIN(sr.status) as status,
           GROUP_CONCAT(sr.subject || ':' || (sr.internal_marks + sr.external_marks) || '/' || (sr.max_internal + sr.max_external)) as subject_breakdown
    FROM semester_results sr
    JOIN students s ON s.id = sr.student_id
    JOIN batch_semester_students bss ON bss.student_id = sr.student_id
      AND bss.batch_id = sr.batch_id
      AND bss.semester_number = sr.semester_number
    WHERE sr.batch_id = ? AND sr.semester_number = ? ${statusFilter}
      AND sr.subject IN (
        SELECT c.name FROM semester_courses sc
        JOIN courses c ON c.id = sc.course_id
        WHERE sc.batch_id = ? AND sc.semester_number = ?
      )
    GROUP BY sr.student_id
    ORDER BY total_obtained DESC
  `;

  db.all(sql, [batch_id, semester_number, batch_id, semester_number], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const enriched = (rows || []).map((r, idx) => {
      const { grade, gpa } = calcGrade(r.total_obtained, r.total_max);
      const pct = r.total_max > 0 ? ((r.total_obtained / r.total_max) * 100).toFixed(1) : '0.0';
      return {
        ...r,
        rank: idx + 1,
        percentage: pct,
        grade,
        sgpa: gpa.toFixed(2),
        pass: grade !== 'F',
      };
    });

    const published = enriched.filter(r => r.status === 'published');
    const passCount = enriched.filter(r => r.pass).length;
    const passPercent = enriched.length > 0 ? ((passCount / enriched.length) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: enriched,
      stats: {
        total: enriched.length,
        passed: passCount,
        failed: enriched.length - passCount,
        passPercent,
        published: published.length,
        draft: enriched.length - published.length,
      }
    });
  });
});

// ── POST /api/results/bulk-save ───────────────────────────────────────────────
// Body: { batch_id, semester_number, entries: [{ student_id, subject, internal_marks, external_marks, max_internal, max_external }] }
router.post('/bulk-save', (req, res) => {
  const { batch_id, semester_number, entries, status = 'draft' } = req.body;
  if (!batch_id || !semester_number || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, message: 'batch_id, semester_number, and entries[] required' });
  }

  // Use INSERT OR REPLACE — works reliably with the unique index created at startup
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO semester_results
      (id, batch_id, semester_number, student_id, subject, internal_marks, external_marks, max_internal, max_external, status, created_at, updated_at)
    VALUES (
      (SELECT id FROM semester_results WHERE batch_id=? AND semester_number=? AND student_id=? AND subject=?),
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      COALESCE((SELECT created_at FROM semester_results WHERE batch_id=? AND semester_number=? AND student_id=? AND subject=?), CURRENT_TIMESTAMP),
      CURRENT_TIMESTAMP
    )
  `);

  let done = 0;
  let hasError = false;

  entries.forEach(e => {
    const bi = batch_id, sn = semester_number, si = e.student_id, sub = e.subject;
    stmt.run(
      bi, sn, si, sub,
      bi, sn, si, sub,
      e.internal_marks || 0, e.external_marks || 0,
      e.max_internal || 40, e.max_external || 60,
      status,
      bi, sn, si, sub,
      function(err) {
        if (err && !hasError) { hasError = true; stmt.finalize(); return res.status(500).json({ success: false, message: err.message }); }
        if (++done === entries.length) { stmt.finalize(); if (!hasError) res.json({ success: true, saved: done }); }
      }
    );
  });
});

// ── POST /api/results/publish ─────────────────────────────────────────────────
router.post('/publish', (req, res) => {
  const { batch_id, semester_number } = req.body;
  if (!batch_id || !semester_number) return res.status(400).json({ success: false, message: 'batch_id and semester_number required' });

  db.run(
    `UPDATE semester_results SET status='published', updated_at=CURRENT_TIMESTAMP WHERE batch_id=? AND semester_number=?`,
    [batch_id, semester_number],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      db.run(`INSERT INTO result_publish_log (batch_id, semester_number, action) VALUES (?, ?, 'published')`, [batch_id, semester_number]);

      // Notify all students in this batch
      const { createNotification } = require('../utils/notificationHelper');
      db.get('SELECT batch_name FROM batches WHERE id = ?', [batch_id], (e, batch) => {
        db.all('SELECT studentId FROM students WHERE batch_id = ?', [batch_id], (e2, students) => {
          (students || []).forEach(s => {
            createNotification({
              title: '🎓 Results Published',
              message: `Your Semester ${semester_number} results for ${batch?.batch_name || 'your batch'} are now available.`,
              type: 'results',
              recipient_id: s.studentId,
              related_entity: 'results',
              related_id: String(batch_id)
            }).catch(() => {});
          });
        });
      });

      res.json({ success: true, updated: this.changes });
    }
  );
});

// ── POST /api/results/unpublish ───────────────────────────────────────────────
router.post('/unpublish', (req, res) => {
  const { batch_id, semester_number } = req.body;
  if (!batch_id || !semester_number) return res.status(400).json({ success: false, message: 'batch_id and semester_number required' });

  db.run(
    `UPDATE semester_results SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE batch_id=? AND semester_number=?`,
    [batch_id, semester_number],
    function(err) {
      if (err) return res.status(500).json({ success: false, message: err.message });
      db.run(`INSERT INTO result_publish_log (batch_id, semester_number, action) VALUES (?, ?, 'unpublished')`, [batch_id, semester_number]);
      res.json({ success: true, updated: this.changes });
    }
  );
});

// ── GET /api/results/publish-status?batch_id=&semester_number= ───────────────
router.get('/publish-status', (req, res) => {
  const { batch_id, semester_number } = req.query;
  db.get(
    `SELECT COUNT(*) as total, SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) as published
     FROM semester_results WHERE batch_id=? AND semester_number=?`,
    [batch_id, semester_number],
    (err, row) => {
      if (err) return res.status(500).json({ success: false });
      const isPublished = row && row.total > 0 && row.total === row.published;
      res.json({ success: true, published: isPublished, total: row?.total || 0, publishedCount: row?.published || 0 });
    }
  );
});

// ── GET /api/results/student/:studentId ──────────────────────────────────────
router.get('/student/:studentId', (req, res) => {
  const { role } = req.query;
  const isAdmin = role === 'admin' || role === 'principal';
  const statusFilter = isAdmin ? '' : "AND sr.status = 'published'";
  const param = req.params.studentId;

  const isNumeric = /^\d+$/.test(param);
  const whereClause = isNumeric ? `(s.studentId = ? OR s.id = ?)` : `s.studentId = ?`;
  const queryParams = isNumeric ? [param, param] : [param];

  db.all(
    `SELECT sr.*, b.batch_name, b.department
     FROM semester_results sr
     JOIN students s ON s.id = sr.student_id
     JOIN batches b ON b.id = sr.batch_id
     -- Only include subjects that are actually assigned to this batch+semester via semester_courses
     WHERE ${whereClause} ${statusFilter}
       AND sr.subject IN (
         SELECT c.name FROM semester_courses sc
         JOIN courses c ON c.id = sc.course_id
         WHERE sc.batch_id = sr.batch_id AND sc.semester_number = sr.semester_number
       )
     ORDER BY sr.semester_number, sr.subject`,
    queryParams,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, data: rows || [] });
    }
  );
});

// ── GET /api/results/transcript/:studentId ────────────────────────────────────
// Returns full academic transcript: per-semester SGPA + cumulative CGPA + pass/fail history
router.get('/transcript/:studentId', (req, res) => {
  const { role } = req.query;
  const isAdmin = role === 'admin' || role === 'principal';
  const statusFilter = isAdmin ? '' : "AND sr.status = 'published'";

  // Get student info
  db.get('SELECT s.*, b.batch_name, b.department FROM students s LEFT JOIN batches b ON b.id = s.batch_id WHERE s.studentId = ?',
    [req.params.studentId], (err, student) => {
      if (err || !student) return res.status(404).json({ success: false, message: 'Student not found' });

      db.all(
        `SELECT sr.semester_number, sr.subject,
                sr.internal_marks, sr.external_marks,
                sr.max_internal, sr.max_external,
                sr.status, b.batch_name, b.department
         FROM semester_results sr
         JOIN students s ON s.id = sr.student_id
         JOIN batches b ON b.id = sr.batch_id
         WHERE s.studentId = ? ${statusFilter}
           AND sr.subject IN (
             SELECT c.name FROM semester_courses sc
             JOIN courses c ON c.id = sc.course_id
             WHERE sc.batch_id = sr.batch_id AND sc.semester_number = sr.semester_number
           )
         ORDER BY sr.semester_number, sr.subject`,
        [req.params.studentId],
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, message: err2.message });

          // Group by semester
          const semMap = {};
          for (const r of rows) {
            const sn = r.semester_number;
            if (!semMap[sn]) semMap[sn] = { semester_number: sn, batch_name: r.batch_name, department: r.department, subjects: [] };
            const total = r.internal_marks + r.external_marks;
            const maxTotal = r.max_internal + r.max_external;
            const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            let grade, gpa;
            if (pct >= 90) { grade = 'A+'; gpa = 4.0; }
            else if (pct >= 80) { grade = 'A'; gpa = 3.7; }
            else if (pct >= 70) { grade = 'B+'; gpa = 3.3; }
            else if (pct >= 60) { grade = 'B'; gpa = 3.0; }
            else if (pct >= 50) { grade = 'C+'; gpa = 2.5; }
            else if (pct >= 40) { grade = 'C'; gpa = 2.0; }
            else if (pct >= 33) { grade = 'D'; gpa = 1.0; }
            else { grade = 'F'; gpa = 0.0; }
            semMap[sn].subjects.push({ subject: r.subject, internal: r.internal_marks, external: r.external_marks, total, maxTotal, percentage: pct.toFixed(1), grade, gpa, pass: grade !== 'F' });
          }

          // Compute per-semester SGPA and pass/fail
          const semesters = Object.values(semMap).map(sem => {
            const totalObt = sem.subjects.reduce((s, x) => s + x.total, 0);
            const totalMax = sem.subjects.reduce((s, x) => s + x.maxTotal, 0);
            const sgpa = sem.subjects.length > 0
              ? (sem.subjects.reduce((s, x) => s + x.gpa, 0) / sem.subjects.length).toFixed(2)
              : '0.00';
            const percentage = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : '0.0';
            const passed = sem.subjects.every(x => x.pass);
            const failedSubjects = sem.subjects.filter(x => !x.pass).map(x => x.subject);
            return { ...sem, totalObt, totalMax, sgpa: parseFloat(sgpa), percentage, passed, failedSubjects };
          });

          // CGPA = average of all SGPAs
          const cgpa = semesters.length > 0
            ? (semesters.reduce((s, x) => s + x.sgpa, 0) / semesters.length).toFixed(2)
            : '0.00';

          const totalSemesters = semesters.length;
          const passedSemesters = semesters.filter(s => s.passed).length;

          res.json({
            success: true,
            data: {
              student: { name: student.name, studentId: student.studentId, email: student.email, department: student.department || semesters[0]?.department, batch_name: student.batch_name },
              semesters,
              cgpa: parseFloat(cgpa),
              totalSemesters,
              passedSemesters,
              failedSemesters: totalSemesters - passedSemesters,
            }
          });
        }
      );
    }
  );
});

// ── DELETE /api/results/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.run(`DELETE FROM semester_results WHERE id=?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
