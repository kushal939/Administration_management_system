// Test concurrent database access
const http = require('http');

const endpoints = [
  '/api/students',
  '/api/courses',
  '/api/attendance',
  '/api/marks',
  '/api/notices',
  '/api/analytics/overview',
  '/api/fees',
  '/api/departments'
];

function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ endpoint, status: res.statusCode, success: json.success });
        } catch (e) {
          resolve({ endpoint, status: res.statusCode, error: 'Parse error' });
        }
      });
    });

    req.on('error', (e) => {
      reject({ endpoint, error: e.message });
    });

    req.end();
  });
}

async function testConcurrent() {
  console.log('🧪 Testing concurrent database access...\n');
  
  // Test 1: Sequential requests
  console.log('Test 1: Sequential requests (baseline)');
  const start1 = Date.now();
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    console.log(`  ✓ ${result.endpoint} - ${result.status} - ${result.success ? 'SUCCESS' : 'FAIL'}`);
  }
  const time1 = Date.now() - start1;
  console.log(`  Time: ${time1}ms\n`);

  // Test 2: Concurrent requests (10 simultaneous)
  console.log('Test 2: Concurrent requests (10 simultaneous)');
  const start2 = Date.now();
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(makeRequest(endpoints[i % endpoints.length]));
  }
  const results = await Promise.all(promises);
  results.forEach(r => {
    console.log(`  ✓ ${r.endpoint} - ${r.status} - ${r.success ? 'SUCCESS' : 'FAIL'}`);
  });
  const time2 = Date.now() - start2;
  console.log(`  Time: ${time2}ms\n`);

  // Test 3: Heavy concurrent load (50 simultaneous)
  console.log('Test 3: Heavy concurrent load (50 simultaneous)');
  const start3 = Date.now();
  const heavyPromises = [];
  for (let i = 0; i < 50; i++) {
    heavyPromises.push(makeRequest(endpoints[i % endpoints.length]));
  }
  const heavyResults = await Promise.all(heavyPromises);
  const successCount = heavyResults.filter(r => r.success).length;
  const failCount = heavyResults.filter(r => !r.success || r.error).length;
  console.log(`  ✓ Success: ${successCount}/50`);
  console.log(`  ✗ Failed: ${failCount}/50`);
  const time3 = Date.now() - start3;
  console.log(`  Time: ${time3}ms\n`);

  // Summary
  console.log('📊 Summary:');
  console.log(`  Sequential: ${time1}ms`);
  console.log(`  10 concurrent: ${time2}ms (${((time1/time2)*10).toFixed(1)}x faster per request)`);
  console.log(`  50 concurrent: ${time3}ms (${successCount === 50 ? '✅ All passed' : '❌ Some failed'})`);
  console.log('\n✅ Database refactor test complete!');
}

testConcurrent().catch(console.error);
