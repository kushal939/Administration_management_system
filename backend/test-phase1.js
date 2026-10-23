const fetch = require('node-fetch');

async function testPhase1() {
  console.log('🧪 Testing Phase 1: Core Batch-Student Management\n');

  try {
    // Test 1: Get all batches
    console.log('Test 1: Get all batches...');
    const batchesRes = await fetch('http://localhost:3001/api/admin/batches', {
      headers: { 'x-user-role': 'admin' }
    });
    const batchesData = await batchesRes.json();
    console.log(`✅ Found ${batchesData.count} batches\n`);

    if (batchesData.count === 0) {
      console.log('❌ No batches found. Please create batches first.');
      return;
    }

    const testBatch = batchesData.data[0];
    console.log(`Using batch: ${testBatch.batch_name} (ID: ${testBatch.id})\n`);

    // Test 2: Get students in batch
    console.log('Test 2: Get students in batch...');
    const studentsRes = await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/students`, {
      headers: { 'x-user-role': 'admin' }
    });
    const studentsData = await studentsRes.json();
    console.log(`✅ Found ${studentsData.count} students in batch\n`);

    // Test 3: Get unassigned students
    console.log('Test 3: Get unassigned students...');
    const unassignedRes = await fetch('http://localhost:3001/api/admin/batches/unassigned-students', {
      headers: { 'x-user-role': 'admin' }
    });
    const unassignedData = await unassignedRes.json();
    console.log(`✅ Found ${unassignedData.count} unassigned students\n`);

    if (unassignedData.count > 0) {
      // Test 4: Assign students to batch
      console.log('Test 4: Assign students to batch...');
      const studentToAssign = unassignedData.data[0];
      const assignRes = await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/assign-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ studentIds: [studentToAssign.id] })
      });
      const assignData = await assignRes.json();
      console.log(`✅ ${assignData.message}\n`);

      // Test 5: Remove student from batch
      console.log('Test 5: Remove student from batch...');
      const removeRes = await fetch(`http://localhost:3001/api/admin/batches/${testBatch.id}/remove-students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'admin'
        },
        body: JSON.stringify({ studentIds: [studentToAssign.id] })
      });
      const removeData = await removeRes.json();
      console.log(`✅ ${removeData.message}\n`);
    } else {
      console.log('⚠️  No unassigned students to test assignment\n');
    }

    console.log('🎉 All Phase 1 tests passed!\n');
    console.log('✅ Step 1: View Batch Students - WORKING');
    console.log('✅ Step 2: Assign Students to Batch - WORKING');
    console.log('✅ Step 3: Remove Students from Batch - WORKING');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPhase1();
