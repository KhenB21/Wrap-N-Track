const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMiwibmFtZSI6IlJlaSIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoicm9zc2lhbnNhcm1pZW50b0BnbWFpbC5jb20iLCJpYXQiOjE3NTc5NDI5NTksImV4cCI6MTc1ODAyOTM1OX0.B6v7eEBPjWil6PmPs3sBOSBRUsP6Aum7NpFkzAkUmk8';

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test replenishment suggestions
    console.log('1. Testing replenishment suggestions...');
    const replenishment = await testEndpoint('/api/inventory-reports/replenishment-suggestions');
    console.log(`   Status: ${replenishment.status}`);
    if (replenishment.status === 200) {
      console.log('   ✅ Success!');
      console.log(`   Data: ${JSON.stringify(replenishment.data).substring(0, 100)}...`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(replenishment.data)}`);
    }

    // Test movement analysis
    console.log('\n2. Testing movement analysis...');
    const movement = await testEndpoint('/api/inventory-reports/movement-analysis');
    console.log(`   Status: ${movement.status}`);
    if (movement.status === 200) {
      console.log('   ✅ Success!');
      console.log(`   Data: ${JSON.stringify(movement.data).substring(0, 100)}...`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(movement.data)}`);
    }

    // Test advanced analytics
    console.log('\n3. Testing advanced analytics...');
    const analytics = await testEndpoint('/api/inventory-reports/advanced-analytics');
    console.log(`   Status: ${analytics.status}`);
    if (analytics.status === 200) {
      console.log('   ✅ Success!');
      console.log(`   Data: ${JSON.stringify(analytics.data).substring(0, 100)}...`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(analytics.data)}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

runTests();
