const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

async function testFastMovingAlert() {
  try {
    console.log('🧪 Testing fast-moving product alert...');
    
    // Reduce stock of a fast-moving product to below 200
    const result = await pool.query(`
      UPDATE inventory_items 
      SET quantity = 150 
      WHERE sku = 'BC7247486312457' AND fast_moving = true
      RETURNING sku, name, quantity, fast_moving, sales_count_30_days
    `);
    
    if (result.rows.length > 0) {
      const product = result.rows[0];
      console.log(`✅ Reduced stock for: ${product.name} (${product.sku}) to ${product.quantity} units`);
      console.log(`   Fast-moving: ${product.fast_moving}, Sales (30 days): ${product.sales_count_30_days}`);
      
      // Now test the fast-moving alert
      console.log('\n🔍 Checking for fast-moving alerts...');
      const alerts = await NotificationService.checkFastMovingProducts();
      
      if (alerts.length > 0) {
        console.log(`✅ Generated ${alerts.length} fast-moving alert(s)`);
      } else {
        console.log('ℹ️ No fast-moving alerts generated (this is expected if notification was sent recently)');
      }
    } else {
      console.log('❌ No fast-moving product found to test with');
    }
    
  } catch (error) {
    console.error('❌ Error testing fast-moving alert:', error);
  } finally {
    await pool.end();
  }
}

testFastMovingAlert();
