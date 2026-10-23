/**
 * Migration: enforce one attendance record per student per course per day.
 * 1. Deletes duplicate rows (keeps the most recent one)
 * 2. Creates a UNIQUE index so the DB rejects future duplicates
 */
const db = require('./database');

console.log('Starting attendance deduplication migration...');

db.serialize(() => {
  // Step 1: Delete duplicates — keep only the row with the highest id for each (studentId, course, date)
  db.run(`
    DELETE FROM attendance
    WHERE id NOT IN (
      SELECT MAX(id)
      FROM attendance
      GROUP BY studentId, course, date
    )
  `, function(err) {
    if (err) {
      console.error('Error deleting duplicates:', err.message);
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} duplicate attendance record(s).`);

    // Step 2: Create unique index (will fail gracefully if already exists)
    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
      ON attendance(studentId, course, date)
    `, function(err) {
      if (err) {
        console.error('Error creating unique index:', err.message);
        process.exit(1);
      }
      console.log('Unique index created on attendance(studentId, course, date).');
      console.log('Migration complete. One attendance per student per course per day is now enforced.');
      process.exit(0);
    });
  });
});
