const db = require('./database');
const { 
  getDepartmentByName, 
  getCoursesByDepartment, 
  enrollStudentInCourse,
  addStudent
} = require('./dbHelpers');

async function testEnrollment() {
  console.log('=== Testing Enrollment System ===\n');

  try {
    // 1. Check departments
    console.log('1. Checking departments...');
    db.all('SELECT * FROM departments', [], (err, depts) => {
      if (err) {
        console.error('Error fetching departments:', err);
        return;
      }
      console.log(`Found ${depts.length} departments:`);
      depts.forEach(d => console.log(`   - ${d.name} (${d.code})`));
      console.log('');

      // 2. Check courses
      console.log('2. Checking courses...');
      db.all('SELECT * FROM courses', [], (err, courses) => {
        if (err) {
          console.error('Error fetching courses:', err);
          return;
        }
        console.log(`Found ${courses.length} courses:`);
        
        // Group by department
        const byDept = {};
        courses.forEach(c => {
          if (!byDept[c.department]) byDept[c.department] = [];
          byDept[c.department].push(c);
        });
        
        Object.keys(byDept).forEach(dept => {
          console.log(`   ${dept}:`);
          byDept[dept].forEach(c => console.log(`      - ${c.name} (${c.code})`));
        });
        console.log('');

        // 3. Test enrollment for a specific department
        const testDept = depts.length > 0 ? depts[0].name : null;
        if (testDept) {
          console.log(`3. Testing enrollment for department: ${testDept}`);
          
          getDepartmentByName(testDept)
            .then(dept => {
              console.log(`   Department found: ${dept.name} (ID: ${dept.id})`);
              
              return getCoursesByDepartment(testDept);
            })
            .then(deptCourses => {
              console.log(`   Courses in ${testDept}: ${deptCourses.length}`);
              deptCourses.forEach(c => console.log(`      - ${c.name}`));
              console.log('');
              
              console.log('4. Checking existing enrollments...');
              db.all('SELECT * FROM enrollments', [], (err, enrollments) => {
                if (err) {
                  console.error('Error fetching enrollments:', err);
                  return;
                }
                console.log(`   Found ${enrollments.length} existing enrollments`);
                console.log('');
                
                console.log('=== Test Complete ===');
                console.log('\nTo test enrollment:');
                console.log('1. Add a student via the frontend');
                console.log('2. Select a department');
                console.log('3. Check the backend console for enrollment logs');
                console.log('4. Verify enrollments in the database');
                
                process.exit(0);
              });
            })
            .catch(err => {
              console.error('Error during test:', err);
              process.exit(1);
            });
        } else {
          console.log('No departments found. Please add departments first.');
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testEnrollment();
