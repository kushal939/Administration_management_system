const db = require('./database');
const bcrypt = require('bcryptjs');

/**
 * Seed comprehensive enrollment data for testing
 * This creates departments, courses, students, teachers, and enrollments
 */
async function seedEnrollmentData() {
  console.log('🌱 Starting enrollment data seeding...');

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Step 1: Clear existing data (optional - comment out if you want to keep existing data)
      console.log('📝 Clearing existing enrollment data...');
      db.run('DELETE FROM enrollments');
      db.run('DELETE FROM teacher_courses');
      
      // Step 2: Ensure departments exist
      console.log('🏢 Creating departments...');
      const departments = [
        { name: 'Computer Science', code: 'CS' },
        { name: 'Mathematics', code: 'MATH' },
        { name: 'Physics', code: 'PHYS' },
        { name: 'Chemistry', code: 'CHEM' },
        { name: 'English', code: 'ENG' }
      ];

      const deptStmt = db.prepare('INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)');
      departments.forEach(d => deptStmt.run(d.name, d.code));
      deptStmt.finalize();

      // Step 3: Ensure courses exist with proper departments
      console.log('📚 Creating courses...');
      const courses = [
        // Computer Science Department
        { name: 'Introduction to Programming', code: 'CS101', department: 'Computer Science', credits: 4 },
        { name: 'Data Structures', code: 'CS201', department: 'Computer Science', credits: 4 },
        { name: 'Database Systems', code: 'CS301', department: 'Computer Science', credits: 3 },
        
        // Mathematics Department
        { name: 'Calculus I', code: 'MATH101', department: 'Mathematics', credits: 4 },
        { name: 'Linear Algebra', code: 'MATH201', department: 'Mathematics', credits: 3 },
        { name: 'Statistics', code: 'MATH301', department: 'Mathematics', credits: 3 },
        
        // Physics Department
        { name: 'Physics I', code: 'PHYS101', department: 'Physics', credits: 4 },
        { name: 'Mechanics', code: 'PHYS201', department: 'Physics', credits: 3 },
        
        // Chemistry Department
        { name: 'General Chemistry', code: 'CHEM101', department: 'Chemistry', credits: 4 },
        { name: 'Organic Chemistry', code: 'CHEM201', department: 'Chemistry', credits: 4 },
        
        // English Department
        { name: 'English Composition', code: 'ENG101', department: 'English', credits: 3 },
        { name: 'Literature', code: 'ENG201', department: 'English', credits: 3 }
      ];

      const courseStmt = db.prepare('INSERT OR IGNORE INTO courses (name, code, department, credits) VALUES (?, ?, ?, ?)');
      courses.forEach(c => courseStmt.run(c.name, c.code, c.department, c.credits));
      courseStmt.finalize();

      // Step 4: Ensure teachers exist
      console.log('👨‍🏫 Creating teachers...');
      db.get('SELECT id FROM users WHERE email = ?', ['teacher@school.com'], (err, teacher1) => {
        if (!teacher1) {
          const hashedPassword = bcrypt.hashSync('teacher123', 10);
          db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
            ['teacher@school.com', hashedPassword, 'teacher']);
        }
      });

      db.get('SELECT id FROM users WHERE email = ?', ['teacher2@school.com'], (err, teacher2) => {
        if (!teacher2) {
          const hashedPassword = bcrypt.hashSync('teacher123', 10);
          db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
            ['teacher2@school.com', hashedPassword, 'teacher']);
        }
      });

      // Wait a bit for users to be created
      setTimeout(() => {
        // Step 5: Assign teachers to courses
        console.log('🔗 Assigning teachers to courses...');
        
        db.get('SELECT id FROM users WHERE email = ?', ['teacher@school.com'], (err, teacher1) => {
          if (teacher1) {
            const teacherCourses1 = [
              'Introduction to Programming',
              'Data Structures',
              'Calculus I'
            ];
            const tcStmt1 = db.prepare('INSERT OR IGNORE INTO teacher_courses (teacherId, course) VALUES (?, ?)');
            teacherCourses1.forEach(course => tcStmt1.run(teacher1.id, course));
            tcStmt1.finalize();
            console.log(`✅ Assigned ${teacherCourses1.length} courses to teacher@school.com (ID: ${teacher1.id})`);
          }
        });

        db.get('SELECT id FROM users WHERE email = ?', ['teacher2@school.com'], (err, teacher2) => {
          if (teacher2) {
            const teacherCourses2 = [
              'Physics I',
              'General Chemistry',
              'English Composition'
            ];
            const tcStmt2 = db.prepare('INSERT OR IGNORE INTO teacher_courses (teacherId, course) VALUES (?, ?)');
            teacherCourses2.forEach(course => tcStmt2.run(teacher2.id, course));
            tcStmt2.finalize();
            console.log(`✅ Assigned ${teacherCourses2.length} courses to teacher2@school.com (ID: ${teacher2.id})`);
          }
        });

        // Step 6: Create students with departments
        console.log('👨‍🎓 Creating students...');
        const students = [
          // Computer Science students
          { name: 'John Doe', email: 'john.doe@school.com', studentId: 'CS2024001', department: 'Computer Science', year: '1' },
          { name: 'Jane Smith', email: 'jane.smith@school.com', studentId: 'CS2024002', department: 'Computer Science', year: '1' },
          { name: 'Mike Johnson', email: 'mike.johnson@school.com', studentId: 'CS2024003', department: 'Computer Science', year: '2' },
          
          // Mathematics students
          { name: 'Sarah Williams', email: 'sarah.williams@school.com', studentId: 'MATH2024001', department: 'Mathematics', year: '1' },
          { name: 'David Brown', email: 'david.brown@school.com', studentId: 'MATH2024002', department: 'Mathematics', year: '2' },
          
          // Physics students
          { name: 'Emily Davis', email: 'emily.davis@school.com', studentId: 'PHYS2024001', department: 'Physics', year: '1' },
          { name: 'Chris Wilson', email: 'chris.wilson@school.com', studentId: 'PHYS2024002', department: 'Physics', year: '1' },
          
          // Chemistry students
          { name: 'Lisa Martinez', email: 'lisa.martinez@school.com', studentId: 'CHEM2024001', department: 'Chemistry', year: '1' },
          
          // English students
          { name: 'Tom Anderson', email: 'tom.anderson@school.com', studentId: 'ENG2024001', department: 'English', year: '1' },
          { name: 'Amy Taylor', email: 'amy.taylor@school.com', studentId: 'ENG2024002', department: 'English', year: '2' }
        ];

        const studentStmt = db.prepare('INSERT OR IGNORE INTO students (name, email, studentId, year) VALUES (?, ?, ?, ?)');
        students.forEach(s => studentStmt.run(s.name, s.email, s.studentId, s.year));
        studentStmt.finalize();

        // Step 7: Create enrollments (auto-enroll students in their department courses)
        setTimeout(() => {
          console.log('📝 Creating enrollments...');
          
          students.forEach(student => {
            // Get department ID
            db.get('SELECT id FROM departments WHERE name = ?', [student.department], (err, dept) => {
              if (err || !dept) {
                console.error(`❌ Department not found: ${student.department}`);
                return;
              }

              // Get student ID
              db.get('SELECT id FROM students WHERE studentId = ?', [student.studentId], (err, studentRecord) => {
                if (err || !studentRecord) {
                  console.error(`❌ Student not found: ${student.studentId}`);
                  return;
                }

                // Get all courses in this department
                db.all('SELECT id, name FROM courses WHERE department = ?', [student.department], (err, deptCourses) => {
                  if (err || !deptCourses || deptCourses.length === 0) {
                    console.error(`❌ No courses found for department: ${student.department}`);
                    return;
                  }

                  // Enroll student in all department courses
                  const enrollStmt = db.prepare('INSERT OR IGNORE INTO enrollments (student_id, course_id, department_id) VALUES (?, ?, ?)');
                  deptCourses.forEach(course => {
                    enrollStmt.run(studentRecord.id, course.id, dept.id);
                  });
                  enrollStmt.finalize();
                  
                  console.log(`✅ Enrolled ${student.name} (${student.studentId}) in ${deptCourses.length} ${student.department} courses`);
                });
              });
            });
          });

          // Step 8: Add some attendance records
          setTimeout(() => {
            console.log('📅 Creating sample attendance records...');
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            const attendanceRecords = [
              { studentId: 'CS2024001', course: 'Introduction to Programming', date: today, status: 'present' },
              { studentId: 'CS2024002', course: 'Introduction to Programming', date: today, status: 'present' },
              { studentId: 'CS2024003', course: 'Data Structures', date: today, status: 'absent' },
              { studentId: 'MATH2024001', course: 'Calculus I', date: today, status: 'present' },
              { studentId: 'MATH2024002', course: 'Linear Algebra', date: today, status: 'late' },
              { studentId: 'PHYS2024001', course: 'Physics I', date: yesterday, status: 'present' },
              { studentId: 'CHEM2024001', course: 'General Chemistry', date: yesterday, status: 'present' },
              { studentId: 'ENG2024001', course: 'English Composition', date: yesterday, status: 'excused' }
            ];

            const attStmt = db.prepare('INSERT OR IGNORE INTO attendance (studentId, course, date, status) VALUES (?, ?, ?, ?)');
            attendanceRecords.forEach(a => attStmt.run(a.studentId, a.course, a.date, a.status));
            attStmt.finalize();

            console.log('✅ Created sample attendance records');

            // Final summary
            setTimeout(() => {
              db.get('SELECT COUNT(*) as count FROM enrollments', (err, result) => {
                console.log('\n🎉 Enrollment data seeding complete!');
                console.log('📊 Summary:');
                console.log(`   - Departments: ${departments.length}`);
                console.log(`   - Courses: ${courses.length}`);
                console.log(`   - Students: ${students.length}`);
                console.log(`   - Enrollments: ${result ? result.count : 'N/A'}`);
                console.log(`   - Teachers: 2`);
                console.log(`   - Attendance Records: ${attendanceRecords.length}`);
                console.log('\n✅ You can now test the enrollment system!');
                console.log('   - Login as teacher@school.com (password: teacher123)');
                console.log('   - Go to Attendance page');
                console.log('   - Select a department and course');
                console.log('   - Students will auto-load based on enrollments\n');
                
                resolve();
              });
            }, 1000);
          }, 2000);
        }, 1000);
      }, 500);
    });
  });
}

// Run if called directly
if (require.main === module) {
  seedEnrollmentData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedEnrollmentData };
