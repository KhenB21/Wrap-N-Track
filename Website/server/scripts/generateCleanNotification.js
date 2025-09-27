const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

async function generateCleanNotification() {
  try {
    console.log('🎨 Generating a clean notification for testing...');
    
    // Get a test user
    const userResult = await pool.query(`
      SELECT user_id, name, role 
      FROM users 
      WHERE role IN ('admin', 'employee', 'manager') 
      ORDER BY user_id 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }
    
    const testUser = userResult.rows[0];
    console.log(`👤 Generating notification for: ${testUser.name}`);
    
    // Clear all existing notifications first
    await pool.query('DELETE FROM notifications');
    console.log('🧹 Cleared all existing notifications');
    
    // Generate a single, clean low stock notification
    const result = await NotificationService.checkStockLevels();
    
    if (result.length > 0) {
      console.log(`✅ Generated clean low stock notification for ${result.length} products`);
    } else {
      // Create a sample notification if no low stock products
      await NotificationService.createBulkNotification({
        title: '⚠️ Low Stock Alert - 2 Products',
        message: '2 product(s) are below 100 units: Sample Product A (SAMPLE001): 45 units, Sample Product B (SAMPLE002): 78 units',
        type: 'stock_alert',
        priority: 'urgent',
        category: 'low_stock',
        metadata: {
          product_count: 2,
          products: [
            { sku: 'SAMPLE001', name: 'Sample Product A', quantity: 45, supplier_name: 'Test Supplier' },
            { sku: 'SAMPLE002', name: 'Sample Product B', quantity: 78, supplier_name: 'Test Supplier' }
          ]
        }
      });
      console.log('✅ Generated sample notification');
    }
    
    // Show current notification count
    const count = await pool.query('SELECT COUNT(*) as total FROM notifications');
    console.log(`📊 Total notifications: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error generating clean notification:', error);
  } finally {
    await pool.end();
  }
}

generateCleanNotification();
