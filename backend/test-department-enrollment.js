const db = require('./database');

console.log('Testing Department-Based Enrollment System\n');
console.log('===========================================\n');

// Test 1: Check if department column exists in students table
db.all("PRAGMA table_info('students')", (err, cols) => {
  if (err) {
    console.error('Error checking students table:', err);
    return;
  }
  
  console.log('1. Students table columns:');
  cols.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
  
  const hasDepartment = cols.some(c => c.name === 'department');
  console.log(`   ✓ Department column exists: ${hasDepartment ? 'YES' : 'NO'}\n`);
  
  // Test 2: Check departments
  db.all('SELECT * FROM departments', (err, depts) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return;
    }
    
    console.log('2. Available Departments:');
    depts.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code})`);
    });
    console.log('');
    
    // Test 3: Check courses per department
    console.log('3. Courses per Department:');
    depts.forEach(dept => {
      db.all('SELECT * FROM courses WHERE department = ?', [dept.name], (err, courses) => {
        if (err) {
          console.error(`Error fetching courses for ${dept.name}:`, err);
          return;
        }
        console.log(`   ${dept.name}: ${courses.length} courses`);
        courses.forEach(course => {
          console.log(`      - ${course.name} (${course.code})`);
        });
      });
    });
    
    // Test 4: Check students and their enrollments
    setTimeout(() => {
      console.log('\n4. Students and their Enrollments:');
      db.all('SELECT * FROM students LIMIT 5', (err, students) => {
        if (err) {
          console.error('Error fetching students:', err);
          return;
        }
        
        students.forEach(student => {
          console.log(`   Student: ${student.name} (${student.studentId})`);
          console.log(`   Department: ${student.department || 'NOT SET'}`);
          
          db.all(`
            SELECT c.name as course_name, c.code, d.name as dept_name
            FROM enrollments e
            JOIN courses c ON c.id = e.course_id
            JOIN departments d ON d.id = e.department_id
            WHERE e.student_id = ?
          `, [student.id], (err, enrollments) => {
            if (err) {
              console.error(`Error fetching enrollments for ${student.name}:`, err);
              return;
            }
            
            console.log(`   Enrolled in ${enrollments.length} courses:`);
            enrollments.forEach(e => {
              console.log(`      - ${e.course_name} (${e.code}) - ${e.dept_name}`);
            });
            console.log('');
          });
        });
        
        // Close database after all queries
        setTimeout(() => {
          console.log('\n===========================================');
          console.log('Test Complete!');
          db.close();
        }, 2000);
      });
    }, 1000);
  });
});
