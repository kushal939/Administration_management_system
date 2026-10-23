const db = require('./database');

// Generate dates for the last 3 months (Mon-Fri only)
function getWorkingDays(monthsBack) {
  const dates = [];
  const now = new Date();
  for (let m = monthsBack; m >= 0; m--) {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    const d = new Date(year, month, 1);
    while (d.getMonth() === ((now.getMonth() - m + 12) % 12)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
  }
  return dates;
}

const dates = getWorkingDays(2); // last 3 months

// Students with their attendance rates (some below 75%)
const studentProfiles = [
  { studentId: 'STUCS24001', courses: ['Programming in C', 'Data Structures', 'Database Management'], rate: 0.90 },
  { studentId: 'STUCS24002', courses: ['Programming in C', 'Data Structures', 'Computer Networks'],   rate: 0.65 }, // below 75%
  { studentId: 'STUCS25001', courses: ['Programming in C', 'Operating Systems', 'Database Management'], rate: 0.80 },
  { studentId: 'STUCS25002', courses: ['Data Structures', 'Computer Networks', 'Operating Systems'],  rate: 0.55 }, // below 75%
  { studentId: 'STUCS25003', courses: ['Programming in C', 'Data Structures', 'Database Management'], rate: 0.95 },
  { studentId: 'STUCS25004', courses: ['Computer Networks', 'Operating Systems', 'Database Management'], rate: 0.70 }, // below 75%
  { studentId: 'STUCS25005', courses: ['Programming in C', 'Data Structures', 'Operating Systems'],   rate: 0.85 },
  { studentId: 'STUBBA24001', courses: ['Principles of Management', 'Business Mathematics', 'Financial Accounting'], rate: 0.88 },
  { studentId: 'STUBBA24002', courses: ['Principles of Management', 'Marketing Management', 'Business Communication'], rate: 0.60 }, // below 75%
  { studentId: 'STUBBA24003', courses: ['Business Mathematics', 'Financial Accounting', 'Marketing Management'], rate: 0.78 },
];

// Use only every 3rd working day per course (so ~20 classes per course over 3 months)
const classDates = dates.filter((_, i) => i % 3 === 0);

const statuses = ['present', 'absent', 'late'];

function pickStatus(rate) {
  const r = Math.random();
  if (r < rate) return 'present';
  if (r < rate + 0.05) return 'late';
  return 'absent';
}

// Clear existing attendance first
db.run('DELETE FROM attendance', [], (err) => {
  if (err) { console.error('Clear error:', err); return; }
  console.log('Cleared existing attendance');

  let inserted = 0;
  let total = 0;

  for (const sp of studentProfiles) {
    for (const course of sp.courses) {
      for (const date of classDates) {
        total++;
        const status = pickStatus(sp.rate);
        db.run(
          `INSERT OR REPLACE INTO attendance (studentId, course, date, status, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [sp.studentId, course, date, status],
          (err) => {
            if (err) console.error(err);
            else inserted++;
            if (inserted === total) {
              console.log(`Done! Inserted ${inserted} attendance records`);
              console.log('Students below 75%: STUCS24002 (65%), STUCS25002 (55%), STUCS25004 (70%), STUBBA24002 (60%)');
              process.exit(0);
            }
          }
        );
      }
    }
  }
});
