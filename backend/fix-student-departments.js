const db = require('./database');

console.log('Fixing Student Departments...\n');

// Get all students without department
db.all('SELECT * FROM students WHERE department IS NULL OR department = ""', (err, students) => {
  if (err) {
    console.error('Error fetching students:', err);
    db.close();
    return;
  }
  
  console.log(`Found ${students.length} students without department\n`);
  
  if (students.length === 0) {
    console.log('All students already have departments assigned!');
    db.close();
    return;
  }
  
  let processed = 0;
  
  students.forEach(student => {
    // Get the department from their first enrollment
    db.get(`
      SELECT d.name as department_name
      FROM enrollments e
      JOIN departments d ON d.id = e.department_id
      WHERE e.student_id = ?
      LIMIT 1
    `, [student.id], (err, enrollment) => {
      if (err) {
        console.error(`Error fetching enrollment for ${student.name}:`, err);
        processed++;
        return;
      }
      
      if (enrollment && enrollment.department_name) {
        // Update student with department
        db.run('UPDATE students SET department = ? WHERE id = ?', 
          [enrollment.department_name, student.id], 
          (err) => {
            if (err) {
              console.error(`Error updating ${student.name}:`, err);
            } else {
              console.log(`✓ Updated ${student.name} (${student.studentId}) -> ${enrollment.department_name}`);
            }
            processed++;
            
            if (processed === students.length) {
              console.log(`\nCompleted! Updated ${students.length} students.`);
              db.close();
            }
          }
        );
      } else {
        console.log(`⚠ ${student.name} (${student.studentId}) has no enrollments, skipping...`);
        processed++;
        
        if (processed === students.length) {
          console.log(`\nCompleted! Updated ${students.length} students.`);
          db.close();
        }
      }
    });
  });
});
