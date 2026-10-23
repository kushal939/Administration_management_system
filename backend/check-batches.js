const db = require('./database');

async function checkBatches() {
  try {
    // Check if table exists
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='batches'"
    );
    console.log('Tables found:', tables);

    // Check batches
    const batches = await db.all('SELECT * FROM batches');
    console.log('\nBatches in database:', batches.length);
    console.log(JSON.stringify(batches, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkBatches();
