const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Administration Management System Backend...\n');

// Check if assignments route file exists
const assignmentsRoutePath = path.join(__dirname, 'routes', 'assignments.js');
if (fs.existsSync(assignmentsRoutePath)) {
  console.log('✅ assignments.js route file found');
} else {
  console.error('❌ assignments.js route file NOT found!');
  console.error('   Expected location:', assignmentsRoutePath);
  process.exit(1);
}

// Check if server.js imports assignments
const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

if (serverContent.includes("require('./routes/assignments')")) {
  console.log('✅ server.js imports assignments route');
} else {
  console.error('❌ server.js does NOT import assignments route!');
  process.exit(1);
}

if (serverContent.includes("app.use('/api/assignments'")) {
  console.log('✅ server.js registers /api/assignments route');
} else {
  console.error('❌ server.js does NOT register /api/assignments route!');
  process.exit(1);
}

// Check database file
const dbPath = path.join(__dirname, 'database.sqlite');
if (fs.existsSync(dbPath)) {
  console.log('✅ database.sqlite file found');
} else {
  console.log('⚠️  database.sqlite not found (will be created on first run)');
}

console.log('\n✅ All pre-flight checks passed!');
console.log('\nStarting server...\n');
console.log('═'.repeat(50));

// Start the actual server
require('./server');
