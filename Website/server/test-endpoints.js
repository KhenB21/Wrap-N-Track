const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMiwibmFtZSI6IlJlaSIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoicm9zc2lhbnNhcm1pZW50b0BnbWFpbC5jb20iLCJpYXQiOjE3NTc5NDI5NTksImV4cCI6MTc1ODAyOTM1OX0.B6v7eEBPjWil6PmPs3sBOSBRUsP6Aum7NpFkzAkUmk8';

function testEndpoint(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
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
  console.log('🧪 Testing test data endpoints...\n');

  try {
    // Test insert test data
    console.log('1. Testing insert test data...');
    const insertResult = await testEndpoint('/api/inventory-reports/test-data/insert', 'POST');
    console.log(`   Status: ${insertResult.status}`);
    if (insertResult.status === 200) {
      console.log('   ✅ Success!');
      console.log(`   Message: ${insertResult.data.message}`);
      console.log(`   Data: ${JSON.stringify(insertResult.data.data)}`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(insertResult.data)}`);
    }

    // Test movement analysis after insert
    console.log('\n2. Testing movement analysis after insert...');
    const movementResult = await testEndpoint('/api/inventory-reports/movement-analysis');
    console.log(`   Status: ${movementResult.status}`);
    if (movementResult.status === 200) {
      console.log('   ✅ Success!');
      const data = movementResult.data.data || [];
      console.log(`   Total items: ${data.length}`);
      
      // Count by category
      const fastMoving = data.filter(item => item.movement_category === 'FAST_MOVING').length;
      const moderateMoving = data.filter(item => item.movement_category === 'MODERATE_MOVING').length;
      const slowMoving = data.filter(item => item.movement_category === 'SLOW_MOVING').length;
      const deadStock = data.filter(item => item.movement_category === 'DEAD_STOCK').length;
      
      console.log(`   Fast Moving: ${fastMoving}`);
      console.log(`   Moderate Moving: ${moderateMoving}`);
      console.log(`   Slow Moving: ${slowMoving}`);
      console.log(`   Dead Stock: ${deadStock}`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(movementResult.data)}`);
    }

    // Test clear test data
    console.log('\n3. Testing clear test data...');
    const clearResult = await testEndpoint('/api/inventory-reports/test-data/clear', 'POST');
    console.log(`   Status: ${clearResult.status}`);
    if (clearResult.status === 200) {
      console.log('   ✅ Success!');
      console.log(`   Message: ${clearResult.data.message}`);
    } else {
      console.log('   ❌ Failed');
      console.log(`   Error: ${JSON.stringify(clearResult.data)}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

runTests();
