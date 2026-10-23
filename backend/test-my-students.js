const db = require('./database');

/**
 * Test the my-students endpoint logic
 */
async function testMyStudents() {
  console.log('🧪 Testing My Students Endpoint Logic\n');

  // Get teacher ID for teacher@school.com
  db.get('SELECT id FROM users WHERE email = ?', ['teacher@school.com'], (err, teacher) => {
    if (err || !teacher) {
      console.error('❌ Teacher not found');
      db.close();
      return;
    }

    console.log(`✅ Found teacher@school.com with ID: ${teacher.id}\n`);

    // Test the query that the endpoint uses
    const teacherId = teacher.id;
    const query = `
      SELECT DISTINCT 
        s.id,
        s.studentId,
        s.name,
        s.email,
        s.year,
        s.department,
        GROUP_CONCAT(DISTINCT c.name) as courses
      FROM students s
      INNER JOIN enrollments e ON s.id = e.student_id
      INNER JOIN courses c ON e.course_id = c.id
      INNER JOIN teacher_courses tc ON tc.course = c.name
      WHERE tc.teacherId = ?
      GROUP BY s.id
      ORDER BY s.name
    `;

    db.all(query, [teacherId], (err, students) => {
      if (err) {
        console.error('❌ Query error:', err);
        db.close();
        return;
      }

      console.log(`📊 Found ${students.length} students enrolled in teacher's courses:\n`);
      
      students.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.studentId})`);
        console.log(`   Email: ${student.email}`);
        console.log(`   Department: ${student.department || 'N/A'}`);
        console.log(`   Year: ${student.year || 'N/A'}`);
        console.log(`   Courses: ${student.courses || 'None'}`);
        console.log('');
      });

      // Test with filters
      console.log('\n🔍 Testing with course filter (Introduction to Programming):\n');
      
      const filteredQuery = `
        SELECT DISTINCT 
          s.id,
          s.studentId,
          s.name,
          s.email,
          s.year,
          s.department,
          GROUP_CONCAT(DISTINCT c.name) as courses
        FROM students s
        INNER JOIN enrollments e ON s.id = e.student_id
        INNER JOIN courses c ON e.course_id = c.id
        INNER JOIN teacher_courses tc ON tc.course = c.name
        WHERE tc.teacherId = ? AND c.name = ?
        GROUP BY s.id
        ORDER BY s.name
      `;

      db.all(filteredQuery, [teacherId, 'Introduction to Programming'], (err, filtered) => {
        if (err) {
          console.error('❌ Filtered query error:', err);
        } else {
          console.log(`📊 Found ${filtered.length} students in Introduction to Programming:\n`);
          filtered.forEach((student, index) => {
            console.log(`${index + 1}. ${student.name} (${student.studentId})`);
          });
        }

        console.log('\n✅ Test complete!');
        db.close();
      });
    });
  });
}

// Run test
testMyStudents();
