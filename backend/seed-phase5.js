const db = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  const hash = await bcrypt.hash('kushal123', 10);

  // Upsert teacher accounts
  const teachers = [
    { email: 'teacher.cs@school.com',  role: 'teacher' },
    { email: 'teacher.bba@school.com', role: 'teacher' },
  ];

  for (const t of teachers) {
    await new Promise(r => db.run(
      `INSERT OR IGNORE INTO users (email, password, role) VALUES (?,?,?)`,
      [t.email, hash, t.role], r
    ));
  }

  // Get teacher IDs
  const tcs  = await new Promise(r => db.get(`SELECT id FROM users WHERE email='teacher.cs@school.com'`,  [], (e,row)=>r(row)));
  const tbba = await new Promise(r => db.get(`SELECT id FROM users WHERE email='teacher.bba@school.com'`, [], (e,row)=>r(row)));

  // Get student IDs (first 6 CS students)
  const students = await new Promise(r => db.all(`SELECT id, name, studentId FROM students WHERE batch_id IN (1,2) LIMIT 6`, [], (e,rows)=>r(rows)));

  // Clear old assignments & submissions for clean seed
  await new Promise(r => db.run(`DELETE FROM assignments`, r));
  await new Promise(r => db.run(`DELETE FROM assignment_submissions`, r));

  // Create 4 assignments
  const today = new Date();
  const future = d => { const x = new Date(today); x.setDate(x.getDate()+d); return x.toISOString().split('T')[0]; };
  const past   = d => { const x = new Date(today); x.setDate(x.getDate()-d); return x.toISOString().split('T')[0]; };

  const assignments = [
    { title: 'Lab Report: Sorting Algorithms',    description: 'Implement bubble sort, merge sort, and quick sort. Analyze time complexity with test cases.', course: 'Data Structures',      teacher_id: tcs.id,  due_date: future(7),  total_marks: 50 },
    { title: 'Database ER Diagram Assignment',     description: 'Design an ER diagram for a hospital management system. Include all entities and relationships.', course: 'Database Management', teacher_id: tcs.id,  due_date: past(2),    total_marks: 30 },
    { title: 'Marketing Plan — Product Launch',   description: 'Prepare a full marketing plan for a new product of your choice. Include SWOT analysis.', course: 'Marketing Management',  teacher_id: tbba.id, due_date: future(10), total_marks: 100 },
    { title: 'Financial Ratio Analysis',          description: 'Analyze the financial statements of any listed company. Calculate liquidity, profitability, and leverage ratios.', course: 'Financial Accounting', teacher_id: tbba.id, due_date: past(5), total_marks: 40 },
  ];

  const aIds = [];
  for (const a of assignments) {
    const id = await new Promise(r => db.run(
      `INSERT INTO assignments (title, description, course, teacher_id, due_date, total_marks) VALUES (?,?,?,?,?,?)`,
      [a.title, a.description, a.course, a.teacher_id, a.due_date, a.total_marks],
      function(e) { r(this.lastID); }
    ));
    aIds.push(id);
  }

  console.log('Assignments created:', aIds);

  // Seed submissions — students 1-4 submit assignment 1 (sorting algorithms)
  const subs1 = [
    { sid: students[0], content: 'I implemented all three sorting algorithms in Python. Bubble sort O(n²), merge sort O(n log n), quick sort O(n log n) average case. Test results attached.', marks: 45, feedback: 'Excellent work! Great analysis of time complexity.' },
    { sid: students[1], content: 'Implemented bubble sort and merge sort. Quick sort implementation has a bug in the partition function — needs fixing.', marks: 32, feedback: 'Good effort but quick sort implementation is incorrect. Please review the partition logic.' },
    { sid: students[2], content: 'All three algorithms implemented. Used arrays of size 100, 1000, 10000 for testing. Merge sort was consistently fastest.', marks: 47, feedback: 'Very thorough testing. Well done.' },
    { sid: students[3], content: 'Only completed bubble sort and merge sort due to time constraints.', marks: null, feedback: null }, // not graded yet
  ];

  for (const s of subs1) {
    await new Promise(r => db.run(
      `INSERT INTO assignment_submissions (assignment_id, student_id, content, status, marks_obtained, feedback, graded_at)
       VALUES (?,?,?,?,?,?,?)`,
      [aIds[0], s.sid.id, s.content,
       s.marks !== null ? 'graded' : 'submitted',
       s.marks, s.feedback,
       s.marks !== null ? new Date().toISOString() : null], r
    ));
  }

  // Students 1 & 2 submit assignment 2 (ER diagram — overdue)
  const subs2 = [
    { sid: students[0], content: 'ER diagram for hospital system: Entities — Patient, Doctor, Nurse, Ward, Appointment, Prescription. Relationships defined with cardinality.', marks: 28, feedback: 'Good diagram. Missing the Billing entity.' },
    { sid: students[1], content: 'Designed ER diagram with 5 entities. Used crow\'s foot notation.', marks: null, feedback: null },
  ];

  for (const s of subs2) {
    await new Promise(r => db.run(
      `INSERT INTO assignment_submissions (assignment_id, student_id, content, status, marks_obtained, feedback, graded_at)
       VALUES (?,?,?,?,?,?,?)`,
      [aIds[1], s.sid.id, s.content,
       s.marks !== null ? 'graded' : 'submitted',
       s.marks, s.feedback,
       s.marks !== null ? new Date().toISOString() : null], r
    ));
  }

  console.log('Submissions seeded');

  // Verify
  const total = await new Promise(r => db.get(`SELECT COUNT(*) as c FROM assignment_submissions`, [], (e,row)=>r(row)));
  console.log('Total submissions:', total.c);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
