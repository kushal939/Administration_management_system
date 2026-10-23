const { initDatabase } = require('./initDatabase');

console.log('Initializing database with assignments table...\n');

initDatabase()
  .then(() => {
    console.log('✅ Database initialized successfully!');
    console.log('\nAssignments table has been created.');
    console.log('\nYou can now:');
    console.log('1. Run test-assignments.js to verify');
    console.log('2. Start the server with: npm start');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  });
