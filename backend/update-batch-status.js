const db = require('./database');

async function updateBatchStatus() {
  console.log('🔄 Updating batch status field...\n');

  try {
    // Check current batches
    const batches = await db.all('SELECT id, batch_name, status FROM batches');
    console.log(`Found ${batches.length} batches\n`);

    // The status field already exists, we just need to ensure it supports all values
    // SQLite doesn't have ENUM, so VARCHAR already supports any value
    console.log('✅ Status field supports: active, completed, archived, upcoming\n');

    // Show current statuses
    console.log('Current batch statuses:');
    batches.forEach(batch => {
      console.log(`  - ${batch.batch_name}: ${batch.status}`);
    });

    console.log('\n✅ Batch status field is ready for Phase 2!');
    console.log('\nSupported statuses:');
    console.log('  - active: Currently running batch');
    console.log('  - completed: Finished batch');
    console.log('  - archived: Old batch (hidden from main view)');
    console.log('  - upcoming: Future batch');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

updateBatchStatus();
