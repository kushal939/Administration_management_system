const db = require('./database');
const bcrypt = require('bcryptjs');

// Initialize database schema and seed data
function initDatabase() {
  return new Promise((resolve, reject) => {
    let hasError = false;

    // Create tables
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating users table:', err.message);
          reject(err);
          return;
        }
      });

      // Students table
      db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        studentId TEXT UNIQUE NOT NULL,
        course TEXT,
        year TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating students table:', err.message);
          reject(err);
          return;
        }
      });

      // Courses table
      db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        credits INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating courses table:', err.message);
          reject(err);
          return;
        }
      });

      // Departments table
      db.run(`CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating departments table:', err.message);
          reject(err);
          return;
        }
      });

      // Attendance table
      db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        course TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(studentId, course, date)
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating attendance table:', err.message);
          reject(err);
          return;
        }
        // Add unique index on existing table if it doesn't exist yet (migration)
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
                ON attendance(studentId, course, date)`, () => {});
      });

      // Marks table
      db.run(`CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        course TEXT NOT NULL,
        marks REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating marks table:', err.message);
          reject(err);
          return;
        }
      });

      // Notices table
      db.run(`CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT,
        type TEXT DEFAULT 'general',
        priority TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Error creating notices table:', err.message);
          reject(err);
          return;
        }

        if (hasError) return;

        // Teacher-Courses mapping table
        db.run(`CREATE TABLE IF NOT EXISTS teacher_courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          teacherId INTEGER NOT NULL,
          course TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating teacher_courses table:', err.message);
            reject(err);
            return;
          }
        });

        // Fees table
        db.run(`CREATE TABLE IF NOT EXISTS fees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          studentId TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          paid INTEGER DEFAULT 0,
          due_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating fees table:', err.message);
            reject(err);
            return;
          }
        });

        // Enrollments table - maps students to courses
        db.run(`CREATE TABLE IF NOT EXISTS enrollments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          course_id INTEGER NOT NULL,
          department_id INTEGER NOT NULL,
          enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, course_id)
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating enrollments table:', err.message);
            reject(err);
            return;
          }
        });

        // Student Requests table - for teacher-initiated student creation requests
        db.run(`CREATE TABLE IF NOT EXISTS student_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          studentId TEXT NOT NULL,
          department TEXT NOT NULL,
          batchYear TEXT,
          requested_by INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          rejection_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating student_requests table:', err.message);
            reject(err);
            return;
          }
        });

        // Payment History table - tracks all payments
        db.run(`CREATE TABLE IF NOT EXISTS payment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fee_id INTEGER NOT NULL,
          student_id TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT DEFAULT 'cash',
          transaction_id TEXT,
          payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating payment_history table:', err.message);
            reject(err);
            return;
          }
        });

        // Fee Templates table - reusable fee templates
        db.run(`CREATE TABLE IF NOT EXISTS fee_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'general',
          default_due_days INTEGER DEFAULT 30,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating fee_templates table:', err.message);
            reject(err);
            return;
          }
        });

        // Assignments table - teachers assign work to students
        db.run(`CREATE TABLE IF NOT EXISTS assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          course TEXT NOT NULL,
          teacher_id INTEGER NOT NULL,
          due_date TEXT,
          total_marks INTEGER DEFAULT 100,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error('Error creating assignments table:', err.message);
            reject(err);
            return;
          }
        });

        // Migration: ensure `category` column exists for older DBs
        db.all("PRAGMA table_info('fees')", (err, cols) => {
          if (err) return;
          const hasCategory = Array.isArray(cols) && cols.some(c => c.name === 'category');
          if (!hasCategory) {
            db.run("ALTER TABLE fees ADD COLUMN category TEXT DEFAULT 'general'", (aErr) => {
              if (aErr) console.warn('Could not add category column to fees table:', aErr.message);
            });
          }
        });

        // Migration: ensure `department` column exists in students table
        db.all("PRAGMA table_info('students')", (err, cols) => {
          if (err) return;
          const hasDepartment = Array.isArray(cols) && cols.some(c => c.name === 'department');
          if (!hasDepartment) {
            db.run("ALTER TABLE students ADD COLUMN department TEXT", (aErr) => {
              if (aErr) console.warn('Could not add department column to students table:', aErr.message);
              else console.log('Added department column to students table');
            });
          }
        });

        // Check if dummy data already exists
        db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
          if (err) {
            if (!hasError) {
              hasError = true;
              reject(err);
            }
            return;
          }

          if (row.count === 0) {
            // Insert dummy data
            const dummyUsers = [
              { email: 'admin@school.com', password: 'admin123', role: 'admin' },
              { email: 'teacher@school.com', password: 'teacher123', role: 'teacher' },
              { email: 'student@school.com', password: 'student123', role: 'student' },
              { email: 'teacher2@school.com', password: 'teacher123', role: 'teacher' },
              { email: 'student2@school.com', password: 'student123', role: 'student' }
            ];

            const stmt = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
            
            dummyUsers.forEach(user => {
              const hashedPassword = bcrypt.hashSync(user.password, 10);
              stmt.run(user.email, hashedPassword, user.role);
            });

            stmt.finalize((err) => {
              if (err) {
                if (!hasError) {
                  hasError = true;
                  reject(err);
                }
                return;
              }
              console.log('Dummy data inserted successfully');
              
              // Seed courses
              db.all('SELECT COUNT(*) as count FROM courses', (err, row) => {
                if (err) {
                  resolve();
                  return;
                }
                const count = row.count || 0;
                if (count < 5) {
                  const defaultCourses = [
                    { name: 'Mathematics 101', code: 'MATH101', department: 'Mathematics', credits: 3 },
                    { name: 'Physics 101', code: 'PHYS101', department: 'Physics', credits: 3 },
                    { name: 'Chemistry 101', code: 'CHEM101', department: 'Chemistry', credits: 3 },
                    { name: 'English 101', code: 'ENG101', department: 'Humanities', credits: 2 },
                    { name: 'Computer Science 101', code: 'CS101', department: 'Computer Science', credits: 4 }
                  ];
                  const cstmt = db.prepare('INSERT OR IGNORE INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)');
                  defaultCourses.forEach(c => cstmt.run(c.name, c.code, c.department, c.credits));
                  cstmt.finalize((err) => {
                    if (err) console.error('Error seeding default courses:', err);
                    
                    // Seed students
                    db.all('SELECT COUNT(*) as sCount FROM students', (se, srow) => {
                      const sCount = (srow && srow.sCount) ? srow.sCount : 0;
                      if (sCount < 5) {
                        const sampleStudents = [
                          { name: 'Alice Johnson', email: 'alice.johnson@school.com', studentId: 'S1001', course: 'Mathematics 101', year: '1' },
                          { name: 'Bob Smith', email: 'bob.smith@school.com', studentId: 'S1002', course: 'Physics 101', year: '1' },
                          { name: 'Carla Gomez', email: 'carla.gomez@school.com', studentId: 'S1003', course: 'Chemistry 101', year: '1' },
                          { name: 'Daniel Lee', email: 'dan.lee@school.com', studentId: 'S1004', course: 'Computer Science 101', year: '2' },
                          { name: 'Eva Zhang', email: 'eva.zhang@school.com', studentId: 'S1005', course: 'English 101', year: '2' }
                        ];
                        const sstmt = db.prepare('INSERT OR IGNORE INTO students (name,email,studentId,course,year) VALUES (?, ?, ?, ?, ?)');
                        sampleStudents.forEach(s => sstmt.run(s.name, s.email, s.studentId, s.course, s.year));
                        sstmt.finalize((err) => {
                          if (err) console.error('Error seeding students:', err);
                          
                          // Seed fees
                          db.all('SELECT COUNT(*) as fCount FROM fees', (fe, frow) => {
                            const fCount = (frow && frow.fCount) ? frow.fCount : 0;
                            if (fCount < 5) {
                              const sampleFees = [
                                { studentId: 'S1001', amount: 150.00, description: 'Tuition - Term 1', category: 'tuition', paid: 0, due_date: null },
                                { studentId: 'S1002', amount: 120.00, description: 'Bus Fee - Route A', category: 'bus', paid: 1, due_date: null },
                                { studentId: 'S1003', amount: 200.00, description: 'Tuition - Term 1', category: 'tuition', paid: 0, due_date: null },
                                { studentId: 'S1004', amount: 100.00, description: 'Library Fee', category: 'library', paid: 1, due_date: null },
                                { studentId: 'S1005', amount: 180.00, description: 'Bus Fee - Route B', category: 'bus', paid: 0, due_date: null }
                              ];
                              const fstmt = db.prepare('INSERT OR IGNORE INTO fees (studentId, amount, description, category, paid, due_date) VALUES (?, ?, ?, ?, ?, ?)');
                              sampleFees.forEach(f => fstmt.run(f.studentId, f.amount, f.description, f.category, f.paid, f.due_date));
                              fstmt.finalize((err) => {
                                if (err) console.error('Error seeding fees:', err);
                                
                                // Seed attendance
                                db.all('SELECT COUNT(*) as aCount FROM attendance', (ae, arow) => {
                                  const aCount = (arow && arow.aCount) ? arow.aCount : 0;
                                  if (aCount < 10) {
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
                                    const twoDay = new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0];
                                    const sampleAttendance = [
                                      { studentId: 'S1001', course: 'Mathematics 101', date: todayStr, status: 'present' },
                                      { studentId: 'S1002', course: 'Physics 101', date: todayStr, status: 'absent' },
                                      { studentId: 'S1003', course: 'Chemistry 101', date: todayStr, status: 'late' },
                                      { studentId: 'S1004', course: 'Computer Science 101', date: todayStr, status: 'present' },
                                      { studentId: 'S1005', course: 'English 101', date: todayStr, status: 'excused' },
                                      { studentId: 'S1001', course: 'Mathematics 101', date: yesterday, status: 'present' },
                                      { studentId: 'S1002', course: 'Physics 101', date: yesterday, status: 'present' },
                                      { studentId: 'S1003', course: 'Chemistry 101', date: yesterday, status: 'absent' },
                                      { studentId: 'S1004', course: 'Computer Science 101', date: twoDay, status: 'present' },
                                      { studentId: 'S1005', course: 'English 101', date: twoDay, status: 'present' }
                                    ];
                                    const astmt = db.prepare('INSERT OR IGNORE INTO attendance (studentId, course, date, status) VALUES (?, ?, ?, ?)');
                                    sampleAttendance.forEach(a => astmt.run(a.studentId, a.course, a.date, a.status));
                                    astmt.finalize((err) => {
                                      if (err) console.error('Error seeding attendance:', err);
                                      resolve();
                                    });
                                  } else resolve();
                                });
                              });
                            } else resolve();
                          });
                        });
                      } else resolve();
                    });
                  });
                } else {
                  resolve();
                }
              });
            });
          } else {
            console.log('Database already contains data');
            // Ensure courses exist even when users exist
            db.all('SELECT COUNT(*) as count FROM courses', (err, row) => {
              if (err) {
                resolve();
                return;
              }
              const count = row.count || 0;
              if (count < 5) {
                const defaultCourses = [
                  { name: 'Mathematics 101', code: 'MATH101', department: 'Mathematics', credits: 3 },
                  { name: 'Physics 101', code: 'PHYS101', department: 'Physics', credits: 3 },
                  { name: 'Chemistry 101', code: 'CHEM101', department: 'Chemistry', credits: 3 },
                  { name: 'English 101', code: 'ENG101', department: 'Humanities', credits: 2 },
                  { name: 'Computer Science 101', code: 'CS101', department: 'Computer Science', credits: 4 }
                ];
                const cstmt = db.prepare('INSERT OR IGNORE INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)');
                defaultCourses.forEach(c => cstmt.run(c.name, c.code, c.department, c.credits));
                cstmt.finalize((err) => {
                  if (err) console.error('Error seeding default courses:', err);
                  resolve();
                });
              } else {
                resolve();
              }
            });
          }
        });
      });
    });
  });
}

module.exports = { initDatabase };
