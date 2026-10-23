const fetch = require('node-fetch');

async function testBatchAPI() {
  try {
    console.log('Testing batch API endpoint...\n');
    
    const response = await fetch('http://localhost:3001/api/admin/batches', {
      headers: {
        'x-user-role': 'admin'
      }
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`\n✅ Found ${data.data.length} batches`);
      data.data.forEach(batch => {
        console.log(`  - ${batch.batch_name} (${batch.department}) - ${batch.status}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBatchAPI();
