const db = require('./database');

console.log('Testing Assignments System...\n');

// Test 1: Check if assignments table exists
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='assignments'", [], (err, rows) => {
  if (err) {
    console.error('Error checking table:', err);
    return;
  }
  
  if (rows.length > 0) {
    console.log('✓ Assignments table exists');
    
    // Test 2: Check table structure
    db.all("PRAGMA table_info('assignments')", [], (err, cols) => {
      if (err) {
        console.error('Error checking columns:', err);
        return;
      }
      
      console.log('\n✓ Table structure:');
      cols.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      
      // Test 3: Count existing assignments
      db.get('SELECT COUNT(*) as count FROM assignments', [], (err, row) => {
        if (err) {
          console.error('Error counting assignments:', err);
          return;
        }
        
        console.log(`\n✓ Current assignments count: ${row.count}`);
        
        // Test 4: Get teacher info for testing
        db.all("SELECT id, email, role FROM users WHERE role='teacher' LIMIT 1", [], (err, teachers) => {
          if (err) {
            console.error('Error fetching teachers:', err);
            return;
          }
          
          if (teachers.length > 0) {
            const teacher = teachers[0];
            console.log(`\n✓ Found teacher: ${teacher.email} (ID: ${teacher.id})`);
            
            // Test 5: Get teacher's courses
            db.all('SELECT course FROM teacher_courses WHERE teacherId = ?', [teacher.id], (err, courses) => {
              if (err) {
                console.error('Error fetching teacher courses:', err);
                return;
              }
              
              console.log(`\n✓ Teacher's courses: ${courses.length > 0 ? courses.map(c => c.course).join(', ') : 'None assigned'}`);
              
              // Test 6: Sample assignment creation (if teacher has courses)
              if (courses.length > 0) {
                const sampleCourse = courses[0].course;
                const stmt = db.prepare(`
                  INSERT INTO assignments (title, description, course, teacher_id, due_date, total_marks)
                  VALUES (?, ?, ?, ?, ?, ?)
                `);
                
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);
                const dueDateStr = dueDate.toISOString().split('T')[0];
                
                stmt.run(
                  'Sample Assignment - Test',
                  'This is a test assignment created by the test script',
                  sampleCourse,
                  teacher.id,
                  dueDateStr,
                  100,
                  function(err) {
                    if (err) {
                      console.error('Error creating sample assignment:', err);
                    } else {
                      console.log(`\n✓ Created sample assignment (ID: ${this.lastID})`);
                      console.log(`  Title: Sample Assignment - Test`);
                      console.log(`  Course: ${sampleCourse}`);
                      console.log(`  Due Date: ${dueDateStr}`);
                      console.log(`  Total Marks: 100`);
                      
                      // Test 7: Verify assignment was created
                      db.get('SELECT * FROM assignments WHERE id = ?', [this.lastID], (err, assignment) => {
                        if (err) {
                          console.error('Error verifying assignment:', err);
                        } else if (assignment) {
                          console.log('\n✓ Assignment verified in database');
                          
                          // Test 8: Get students enrolled in this course
                          db.all(`
                            SELECT DISTINCT s.studentId, s.name, s.email
                            FROM students s
                            JOIN enrollments e ON s.id = e.student_id
                            JOIN courses c ON e.course_id = c.id
                            WHERE c.name = ?
                          `, [sampleCourse], (err, students) => {
                            if (err) {
                              console.error('Error fetching enrolled students:', err);
                            } else {
                              console.log(`\n✓ Students enrolled in ${sampleCourse}: ${students.length}`);
                              if (students.length > 0) {
                                students.forEach(s => {
                                  console.log(`  - ${s.name} (${s.studentId})`);
                                });
                              }
                              
                              console.log('\n✅ All tests completed successfully!');
                              console.log('\nAssignments system is ready to use.');
                              console.log('\nNext steps:');
                              console.log('1. Start the backend server: npm start');
                              console.log('2. Start the frontend: npm run dev');
                              console.log('3. Login as teacher and navigate to Assignments');
                              console.log('4. Create assignments for your courses');
                              console.log('5. Students will see assignments for their enrolled courses');
                              
                              db.close();
                            }
                          });
                        }
                      });
                    }
                  }
                );
                
                stmt.finalize();
              } else {
                console.log('\n⚠ No courses assigned to teacher. Assign courses first to test assignments.');
                db.close();
              }
            });
          } else {
            console.log('\n⚠ No teachers found in database');
            db.close();
          }
        });
      });
    });
  } else {
    console.log('✗ Assignments table does not exist');
    console.log('Run the server once to initialize the database');
    db.close();
  }
});
