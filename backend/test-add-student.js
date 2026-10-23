const http = require('http');

async function testAddStudent() {
  console.log('Testing Add Student with Department-Based Enrollment\n');
  console.log('====================================================\n');
  
  const testStudent = {
    name: 'Test Student',
    email: 'test.student@school.com',
    studentId: 'TEST001',
    department: 'BCom',
    year: '1'
  };
  
  console.log('Adding student:', testStudent);
  console.log('');
  
  const postData = JSON.stringify(testStudent);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/students',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (result.success) {
          console.log('✓ Student added successfully!');
          console.log(`  Message: ${result.message}`);
          console.log(`  Student ID: ${result.data.id}`);
          console.log(`  Enrollment Count: ${result.data.enrollmentCount}`);
          console.log(`  Department: ${result.data.department}`);
          console.log('');
          
          // Verify enrollments
          console.log('Verifying enrollments...');
          const db = require('./database');
          
          db.all(`
            SELECT c.name as course_name, c.code, d.name as dept_name
            FROM enrollments e
            JOIN courses c ON c.id = e.course_id
            JOIN departments d ON d.id = e.department_id
            WHERE e.student_id = ?
          `, [result.data.id], (err, enrollments) => {
            if (err) {
              console.error('Error fetching enrollments:', err);
              db.close();
              return;
            }
            
            console.log(`✓ Student enrolled in ${enrollments.length} courses:`);
            enrollments.forEach(e => {
              console.log(`  - ${e.course_name} (${e.code}) - ${e.dept_name}`);
            });
            
            // Clean up - delete test student
            console.log('\nCleaning up test data...');
            db.run('DELETE FROM enrollments WHERE student_id = ?', [result.data.id], (err) => {
              if (err) console.error('Error deleting enrollments:', err);
              
              db.run('DELETE FROM students WHERE id = ?', [result.data.id], (err) => {
                if (err) console.error('Error deleting student:', err);
                else console.log('✓ Test student deleted');
                
                console.log('\n====================================================');
                console.log('Test Complete!');
                db.close();
              });
            });
          });
        } else {
          console.error('✗ Failed to add student');
          console.error(`  Error: ${result.message}`);
        }
      } catch (error) {
        console.error('✗ Error parsing response:', error.message);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('✗ Network error:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testAddStudent();
