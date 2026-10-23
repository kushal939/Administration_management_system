const db = require('./database');

console.log('🔍 Checking for orphan user accounts...\n');

// Check for students in users table without student records
db.all(`
  SELECT u.id, u.email, u.role 
  FROM users u 
  LEFT JOIN students s ON u.email = s.email 
  WHERE u.role = 'student' AND s.id IS NULL
`, [], (err, orphanStudents) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log(`Found ${orphanStudents.length} student users without student records:\n`);
  orphanStudents.forEach(user => {
    console.log(`  - ID: ${user.id}, Email: ${user.email}`);
  });

  console.log('\n📊 Summary:');
  console.log('These users exist in the users table but have no corresponding student record.');
  console.log('The delete function fails because it tries to find the student record first.\n');
  
  console.log('✅ Solution: Update the delete logic to handle users without student records.');
  
  process.exit(0);
});
