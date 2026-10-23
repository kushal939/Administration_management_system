const db = require('./database');

// Seed semester results for CS Batch 2024 (batch_id=1) — students 1 & 2
// 4 semesters, 5 courses each, published

const CS_COURSES = [
  ['Programming Fundamentals', 'CS101'],
  ['Mathematics I', 'MATH101'],
  ['English Communication', 'ENG101'],
  ['Computer Organization', 'CS102'],
  ['Digital Logic', 'CS103'],
];

const CS_COURSES_SEM2 = [
  ['Data Structures', 'CS201'],
  ['Mathematics II', 'MATH201'],
  ['Object Oriented Programming', 'CS202'],
  ['Database Systems', 'CS203'],
  ['Discrete Mathematics', 'CS204'],
];

const CS_COURSES_SEM3 = [
  ['Algorithms', 'CS301'],
  ['Operating Systems', 'CS302'],
  ['Computer Networks', 'CS303'],
  ['Software Engineering', 'CS304'],
  ['Statistics', 'MATH301'],
];

const CS_COURSES_SEM4 = [
  ['Artificial Intelligence', 'CS401'],
  ['Web Technologies', 'CS402'],
  ['Compiler Design', 'CS403'],
  ['Information Security', 'CS404'],
  ['Project Management', 'CS405'],
];

const semCourses = [CS_COURSES, CS_COURSES_SEM2, CS_COURSES_SEM3, CS_COURSES_SEM4];

// Marks for student 1 (Aarav Sharma) — good student
const marksS1 = [
  // sem1
  [[78,20],[82,22],[75,18],[80,21],[85,23]],
  // sem2
  [[72,19],[88,24],[76,20],[83,22],[79,21]],
  // sem3
  [[90,25],[85,23],[78,21],[82,22],[88,24]],
  // sem4
  [[86,23],[91,25],[80,22],[77,20],[84,23]],
];

// Marks for student 2 (Bibek Thapa) — average student with one fail
const marksS2 = [
  // sem1
  [[65,17],[70,19],[60,16],[55,15],[72,20]],
  // sem2
  [[58,15],[75,20],[62,17],[68,18],[30,8]], // last subject fail
  // sem3
  [[70,19],[65,17],[72,20],[68,18],[75,20]],
  // sem4
  [[78,21],[80,22],[74,20],[71,19],[76,20]],
];

const MAX_INTERNAL = 100;
const MAX_EXTERNAL = 50;

db.serialize(() => {
  // Clear existing results for batch 1
  db.run(`DELETE FROM semester_results WHERE batch_id = 1`);

  const stmt = db.prepare(`
    INSERT INTO semester_results
      (batch_id, semester_number, student_id, subject, internal_marks, external_marks, max_internal, max_external, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `);

  for (let semIdx = 0; semIdx < 4; semIdx++) {
    const semNum = semIdx + 1;
    const courses = semCourses[semIdx];

    courses.forEach((course, cIdx) => {
      // Student 1
      const [int1, ext1] = marksS1[semIdx][cIdx];
      stmt.run(1, semNum, 1, course[0], int1, ext1, MAX_INTERNAL, MAX_EXTERNAL);

      // Student 2
      const [int2, ext2] = marksS2[semIdx][cIdx];
      stmt.run(1, semNum, 2, course[0], int2, ext2, MAX_INTERNAL, MAX_EXTERNAL);
    });
  }

  stmt.finalize(() => {
    db.all(`SELECT semester_number, student_id, COUNT(*) as cnt FROM semester_results WHERE batch_id=1 GROUP BY semester_number, student_id`, [], (e, rows) => {
      console.log('Seeded results:', JSON.stringify(rows));
      process.exit(0);
    });
  });
});
