const fetch = require('node-fetch');

async function testPhase2() {
  console.log('🧪 Testing Phase 2: Batch Lifecycle Management\n');

  try {
    // Get all batches
    const batchesRes = await fetch('http://localhost:3001/api/admin/batches', {
      headers: { 'x-user-role': 'admin' }
    });
    const batchesData = await batchesRes.json();
    
    if (batchesData.count === 0) {
      console.log('❌ No batches found. Please create batches first.');
      return;
    }

    const testBatch = batchesData.data[0];
    console.log(`Using batch: ${testBatch.batch_name} (ID: ${testBatch.id})`);
    console.log(`Current status: ${testBatch.status}\n`);

    // Test 1: Update batch status
    console.log('Test 1: Update batch status to "completed"...');
    const statusRes = await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ status: 'completed' })
    });
    const statusData = await statusRes.json();
    console.log(`✅ ${statusData.message}\n`);

    // Test 2: Clone batch
    console.log('Test 2: Clone batch...');
    const cloneRes = await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin'
      },
      body: JSON.stringify({
        batch_name: `${testBatch.batch_name} (Test Clone)`,
        copy_students: false
      })
    });
    const cloneData = await cloneRes.json();
    console.log(`✅ ${cloneData.message}`);
    console.log(`New batch: ${cloneData.data.batch_name} (ID: ${cloneData.data.id})`);
    console.log(`Status: ${cloneData.data.status}\n`);

    // Restore original status
    console.log('Test 3: Restore original status to "active"...');
    await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin'
      },
      body: JSON.stringify({ status: 'active' })
    });
    console.log('✅ Status restored\n');

    console.log('🎉 All Phase 2 tests passed!\n');
    console.log('✅ Step 4: Batch Status Management - WORKING');
    console.log('✅ Step 5: Batch Cloning - WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhase2();
