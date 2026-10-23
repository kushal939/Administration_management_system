const db = require('./database');

console.log('Setting up test data for assignments...\n');

// Get teacher ID
db.get("SELECT id, email FROM users WHERE role='teacher' LIMIT 1", [], (err, teacher) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  if (!teacher) {
    console.log('No teacher found');
    db.close();
    return;
  }
  
  console.log(`Found teacher: ${teacher.email} (ID: ${teacher.id})`);
  
  // Get a course
  db.get("SELECT name FROM courses LIMIT 1", [], (err, course) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }
    
    if (!course) {
      console.log('No courses found');
      db.close();
      return;
    }
    
    console.log(`Found course: ${course.name}`);
    
    // Assign course to teacher
    db.run(
      'INSERT OR IGNORE INTO teacher_courses (teacherId, course) VALUES (?, ?)',
      [teacher.id, course.name],
      function(err) {
        if (err) {
          console.error('Error assigning course:', err);
        } else {
          console.log(`\n✅ Assigned "${course.name}" to ${teacher.email}`);
          console.log('\nYou can now:');
          console.log('1. Run test-assignments.js to create a sample assignment');
          console.log('2. Login as teacher and create assignments');
        }
        db.close();
      }
    );
  });
});
