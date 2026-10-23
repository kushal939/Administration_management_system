const db = require('./database');

console.log('Adding student record for aarav.sharma@cs.edu...\n');

const addStudent = async () => {
  try {
    // Check if student already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM students WHERE email = ?', ['aarav.sharma@cs.edu'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('✓ Student already exists:', existing);
      return existing;
    }

    // Get CS batch
    const batch = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM batches WHERE department = ? AND status = ? ORDER BY start_year DESC LIMIT 1', 
        ['Computer Science', 'active'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!batch) {
      console.log('⚠ No active CS batch found. Creating one...');
      const year = new Date().getFullYear();
      const batchResult = await new Promise((resolve, reject) => {
        db.run('INSERT INTO batches (batch_name, department, start_year, end_year, status) VALUES (?, ?, ?, ?, ?)',
          [`CS ${year}`, 'Computer Science', year, year + 4, 'active'], function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        });
      });
      batch = { id: batchResult.id };
    }

    // Add student
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO students (studentId, name, email, course, year, department, batch_id, current_semester) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['STUCS24001', 'Aarav Sharma', 'aarav.sharma@cs.edu', 'Data Structures', 1, 'Computer Science', batch.id, 1],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    console.log('✓ Student created successfully!');
    console.log('  ID:', result.id);
    console.log('  Student ID: STUCS24001');
    console.log('  Name: Aarav Sharma');
    console.log('  Email: aarav.sharma@cs.edu');
    console.log('  Department: Computer Science');
    console.log('  Batch ID:', batch.id);

    // Enroll in semester 1
    const semester = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM batch_semesters WHERE batch_id = ? AND semester_number = 1', [batch.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (semester) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT OR IGNORE INTO batch_semester_students (batch_id, semester_id, student_id, semester_number, result) VALUES (?, ?, ?, ?, ?)',
          [batch.id, semester.id, result.id, 1, 'ongoing'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log('✓ Enrolled in Semester 1');
    }

    // Add some sample attendance
    const courses = ['Data Structures', 'Database Management', 'Web Development'];
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const status = Math.random() > 0.2 ? 'present' : 'absent';
      
      for (const course of courses) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO attendance (studentId, course, date, status) VALUES (?, ?, ?, ?)',
            ['STUCS24001', course, date.toISOString().split('T')[0], status],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }
    console.log('✓ Added sample attendance records');

    console.log('\n✅ All done! Student dashboard should now work.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
};

addStudent();
