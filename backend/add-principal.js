const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('Adding Principal User...\n');

const principalEmail = 'principal@school.com';
const principalPassword = 'principal123';

// Check if principal already exists
db.get('SELECT * FROM users WHERE email = ?', [principalEmail], (err, user) => {
  if (err) {
    console.error('Error checking for principal:', err);
    db.close();
    return;
  }

  if (user) {
    console.log('✓ Principal user already exists!');
    console.log(`  Email: ${principalEmail}`);
    console.log(`  Role: ${user.role}`);
    
    // Update role to principal if it's not already
    if (user.role !== 'principal') {
      db.run('UPDATE users SET role = ? WHERE email = ?', ['principal', principalEmail], (err) => {
        if (err) {
          console.error('Error updating role:', err);
        } else {
          console.log('✓ Updated role to principal');
        }
        db.close();
      });
    } else {
      db.close();
    }
    return;
  }

  // Create principal user
  const hashedPassword = bcrypt.hashSync(principalPassword, 10);
  
  db.run(
    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
    [principalEmail, hashedPassword, 'principal'],
    function(err) {
      if (err) {
        console.error('Error creating principal:', err);
        db.close();
        return;
      }

      console.log('✓ Principal user created successfully!');
      console.log('');
      console.log('Login Credentials:');
      console.log(`  Email: ${principalEmail}`);
      console.log(`  Password: ${principalPassword}`);
      console.log('');
      console.log('Principal has FULL access to:');
      console.log('  ✓ View all student data');
      console.log('  ✓ View all teacher data');
      console.log('  ✓ Create/Edit/Delete students');
      console.log('  ✓ Create/Edit/Delete courses');
      console.log('  ✓ Mark attendance');
      console.log('  ✓ Enter/Edit marks');
      console.log('  ✓ Manage fees (create, edit, delete, record payments)');
      console.log('  ✓ View analytics with charts and graphs');
      console.log('  ✓ View comprehensive reports');
      console.log('  ✓ Manage notices');
      console.log('');
      console.log('Principal CANNOT:');
      console.log('  ✗ Manage users (create teachers/admins)');
      console.log('  ✗ Assign teachers to courses');
      console.log('');
      console.log('Principal is essentially a super-admin with oversight capabilities!');
      console.log('');
      
      db.close();
    }
  );
});
