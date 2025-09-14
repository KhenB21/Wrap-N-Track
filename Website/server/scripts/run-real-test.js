#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🎁 Real Gift Wrapping Inventory Analytics Test Runner');
console.log('=====================================================\n');

// Function to run a command and return a promise
function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`⏳ ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`⚠️  Warning: ${stderr}`);
      }
      console.log(`✅ ${description} completed`);
      resolve(stdout);
    });
  });
}

async function runRealTest() {
  try {
    // Step 1: Run the real inventory test data setup
    console.log('Step 1: Setting up realistic test data with your gift wrapping products...');
    await runCommand(
      'node test-real-inventory-analytics.js',
      'Generating realistic sales data for your gift wrapping products'
    );
    
    // Step 2: Verify the setup
    console.log('\nStep 2: Verifying the analytics setup...');
    await runCommand(
      'node verify-real-analytics.js',
      'Verifying analytics with your real products'
    );
    
    console.log('\nStep 3: Frontend testing instructions...');
    console.log(`
🌐 Frontend Testing Steps:

1. Start your React development server:
   cd Website/client
   npm start

2. Navigate to the Inventory Reports page

3. Test the following features with your REAL products:
   ✅ Overview tab - Should show your gift wrapping products
   ✅ Movement Analysis tab - Should categorize your products by sales performance
   ✅ Replenishment tab - Should suggest reorders for your products
   ✅ Advanced Analytics tab - Should show performance metrics for your products

4. Expected Results with Your Products:
   📦 Fast Moving: Basic Gift Wrap, Standard Bow, Gift Tag, Small Gift Box
   📦 Moderate Moving: Premium Gift Wrap, Premium Bow, Medium Gift Box  
   📦 Slow Moving: Large Gift Box
   📦 Dead Stock: Any products with no recent sales

5. Test date range filtering:
   - Change the date range to see different analytics
   - Try 30 days, 60 days, 90 days

6. Test export functionality:
   - Export PDF - Should include your product data
   - Export Excel - Should have multiple sheets with your products

7. Verify data accuracy:
   - Check that your actual product names and prices are shown
   - Verify that sales patterns make sense for gift wrapping business
   - Confirm that reorder suggestions are realistic
    `);
    
    console.log('\n🎯 What You\'ll See:');
    console.log(`
📊 Movement Analysis with Your Products:
  - Fast Moving: Basic Gift Wrap (WRAP001), Standard Bow (BOW001), Gift Tag (TAG001), Small Gift Box (BOX001)
  - Moderate Moving: Premium Gift Wrap (WRAP002), Premium Bow (BOW002), Medium Gift Box (BOX002)
  - Slow Moving: Large Gift Box (BOX003)
  - Dead Stock: Any products with zero sales

🔄 Replenishment Suggestions:
  - URGENT: Products at or below reorder level
  - SOON: Products approaching reorder level
  - PLAN: Products with predicted stockouts based on demand
  - ADEQUATE: Products with sufficient stock

📈 Advanced Analytics:
  - Profit margins for your gift wrapping products
  - Turnover ratios showing inventory velocity
  - Stock level classifications (LOW/MEDIUM/HIGH)
  - Daily velocity calculations based on actual sales
    `);
    
    console.log('\n🎁 Business Insights You\'ll Get:');
    console.log(`
  - Which gift wrapping products are your best sellers
  - Which products need immediate reordering
  - Seasonal patterns in your gift wrapping business
  - Profitability analysis for each product category
  - Optimal inventory levels for your business
  - Supplier performance and lead time analysis
    `);
    
    console.log('\n✅ Real inventory analytics test completed!');
    console.log('🎉 You can now test the analytics with your actual gift wrapping products!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
runRealTest();
