const http = require('http');

console.log('Testing Assignments API Endpoint...\n');

// Test if server is running
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/assignments',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Status Message: ${res.statusMessage}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\nResponse:');
      console.log(JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 200 && parsed.success) {
        console.log('\n✅ Assignments API endpoint is working!');
        console.log(`Found ${parsed.data.length} assignments`);
      } else {
        console.log('\n⚠️ API responded but with an error');
      }
    } catch (e) {
      console.log('\nRaw Response:', data);
      console.log('\n❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error connecting to server:');
  console.error(error.message);
  console.log('\nPossible issues:');
  console.log('1. Backend server is not running');
  console.log('2. Server is running on a different port');
  console.log('3. Server failed to start');
  console.log('\nTo fix:');
  console.log('1. Make sure you are in the backend directory');
  console.log('2. Run: npm start');
  console.log('3. Wait for "Server is running on port 3001" message');
  console.log('4. Then run this test again');
});

req.end();
