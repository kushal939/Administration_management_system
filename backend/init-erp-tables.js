/**
 * ERP Tables Migration
 * Run once: node init-erp-tables.js
 * Adds: batch_semesters, batch_semester_students, batch_promotions
 */
const db = require('./database');

db.serialize(() => {
  // Ensure batch_id column exists on students
  db.all("PRAGMA table_info('students')", (err, cols) => {
    if (err) return console.error(err);
    const hasBatchId = cols.some(c => c.name === 'batch_id');
    const hasSemester = cols.some(c => c.name === 'current_semester');
    const hasEnrollStatus = cols.some(c => c.name === 'enrollment_status');
    const hasRollNo = cols.some(c => c.name === 'roll_number');

    if (!hasBatchId)      db.run("ALTER TABLE students ADD COLUMN batch_id INTEGER", e => e && console.warn('batch_id:', e.message));
    if (!hasSemester)     db.run("ALTER TABLE students ADD COLUMN current_semester INTEGER DEFAULT 1", e => e && console.warn('current_semester:', e.message));
    if (!hasEnrollStatus) db.run("ALTER TABLE students ADD COLUMN enrollment_status TEXT DEFAULT 'active'", e => e && console.warn('enrollment_status:', e.message));
    if (!hasRollNo)       db.run("ALTER TABLE students ADD COLUMN roll_number TEXT", e => e && console.warn('roll_number:', e.message));
  });

  // Semesters per batch
  db.run(`CREATE TABLE IF NOT EXISTS batch_semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, semester_number),
    FOREIGN KEY(batch_id) REFERENCES batches(id)
  )`, e => e ? console.error('batch_semesters:', e.message) : console.log('batch_semesters OK'));

  // Student-semester mapping (tracks result per semester)
  db.run(`CREATE TABLE IF NOT EXISTS batch_semester_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    semester_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    semester_number INTEGER NOT NULL,
    result TEXT DEFAULT 'ongoing',
    gpa REAL,
    promoted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, batch_id, semester_number),
    FOREIGN KEY(batch_id) REFERENCES batches(id),
    FOREIGN KEY(semester_id) REFERENCES batch_semesters(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  )`, e => e ? console.error('batch_semester_students:', e.message) : console.log('batch_semester_students OK'));

  // Promotion log
  db.run(`CREATE TABLE IF NOT EXISTS batch_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    from_semester INTEGER NOT NULL,
    to_semester INTEGER NOT NULL,
    promoted_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    promoted_by TEXT DEFAULT 'admin',
    promoted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(batch_id) REFERENCES batches(id)
  )`, e => e ? console.error('batch_promotions:', e.message) : console.log('batch_promotions OK'));

  // Ensure teacher_count view / column on batches (via migration)
  db.all("PRAGMA table_info('batches')", (err, cols) => {
    if (err) return;
    const hasTeacherCount = cols.some(c => c.name === 'teacher_count');
    if (!hasTeacherCount) db.run("ALTER TABLE batches ADD COLUMN teacher_count INTEGER DEFAULT 0", e => e && console.warn('teacher_count:', e.message));
  });

  setTimeout(() => {
    console.log('ERP migration complete.');
    db.close();
  }, 1000);
});
