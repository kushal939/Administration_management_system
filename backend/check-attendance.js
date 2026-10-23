const db = require('./database');
db.all(`SELECT studentId, COUNT(*) as total,
  SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
  ROUND(SUM(CASE WHEN status='present' THEN 1 ELSE 0 END)*100.0/COUNT(*),1) as pct
  FROM attendance GROUP BY studentId ORDER BY pct`, [], (e, rows) => {
  rows.forEach(r => console.log(r.studentId, r.total + ' classes', r.pct + '%'));
  process.exit(0);
});
