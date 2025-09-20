const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

async function generateSampleNotifications() {
  try {
    console.log('🎨 Generating sample notifications for UI testing...');
    
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
    console.log(`👤 Generating notifications for: ${testUser.name}`);
    
    // Clear existing test notifications
    await pool.query(`
      DELETE FROM notifications 
      WHERE type = 'test' OR title LIKE '%Test%'
    `);
    
    // Generate different types of notifications
    const notifications = [
      {
        title: '⚠️ Low Stock Alert',
        message: '3 product(s) are below 100 units: Robin (BC648452902509): 1 units, Envelope (BC771541356794): 85 units, Test Product (TEST123): 45 units',
        type: 'stock_alert',
        priority: 'urgent',
        category: 'low_stock'
      },
      {
        title: '⏰ Expiration Alert',
        message: '2 product(s) expire in 3 day(s): Fresh Milk (MILK001), Organic Bread (BREAD002)',
        type: 'expiration_alert',
        priority: 'urgent',
        category: 'expiration'
      },
      {
        title: '🚨 URGENT: Fast-Moving Product Low Stock',
        message: 'Fast-moving product "Popular Item" (POP001) is below 200 units. Current stock: 150 (Sold 75 units in 30 days)',
        type: 'fast_moving_alert',
        priority: 'critical',
        category: 'urgent'
      },
      {
        title: '🛒 New Order Received',
        message: 'Order #12345 from John Doe: 2x Widget A, 1x Widget B - Total: $299.99',
        type: 'order_alert',
        priority: 'normal',
        category: 'orders'
      },
      {
        title: '📊 Weekly Report Ready',
        message: 'Your weekly inventory report is ready for review. 15 products need attention.',
        type: 'report_alert',
        priority: 'normal',
        category: 'other'
      }
    ];
    
    // Create notifications with different timestamps
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      const minutesAgo = i * 5; // 0, 5, 10, 15, 20 minutes ago
      
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, priority, category, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${minutesAgo} minutes')
      `, [
        testUser.user_id,
        notification.title,
        notification.message,
        notification.type,
        notification.priority,
        notification.category,
        JSON.stringify({ sample: true, generated_at: new Date().toISOString() })
      ]);
    }
    
    console.log(`✅ Generated ${notifications.length} sample notifications`);
    console.log('🎯 Check the notification panel in the UI to see the improved design!');
    
  } catch (error) {
    console.error('❌ Error generating sample notifications:', error);
  } finally {
    await pool.end();
  }
}

generateSampleNotifications();
