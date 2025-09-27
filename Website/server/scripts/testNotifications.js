const NotificationService = require('../services/notificationService');
const pool = require('../config/db');

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...');
    
    // Get a test user (first admin or employee)
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
    console.log(`👤 Testing with user: ${testUser.name} (${testUser.role})`);
    
    // Test 1: Create a single notification
    console.log('\n📝 Test 1: Creating single notification...');
    const singleNotification = await NotificationService.createNotification({
      userId: testUser.user_id,
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system is working.',
      type: 'test',
      priority: 'normal',
      category: 'test',
      metadata: { test: true, timestamp: new Date().toISOString() }
    });
    console.log('✅ Single notification created:', singleNotification.id);
    
    // Test 2: Create bulk notifications
    console.log('\n📝 Test 2: Creating bulk notifications...');
    const bulkNotifications = await NotificationService.createBulkNotification({
      title: '🚨 System Test Alert',
      message: 'This is a bulk test notification sent to all users.',
      type: 'test',
      priority: 'urgent',
      category: 'test',
      metadata: { test: true, bulk: true, timestamp: new Date().toISOString() }
    });
    console.log(`✅ Bulk notifications created: ${bulkNotifications.length} notifications`);
    
    // Test 3: Get user notifications
    console.log('\n📝 Test 3: Fetching user notifications...');
    const userNotifications = await NotificationService.getUserNotifications(testUser.user_id, 10);
    console.log(`✅ Found ${userNotifications.length} notifications for user`);
    
    // Test 4: Get unread count
    console.log('\n📝 Test 4: Getting unread count...');
    const unreadCount = await NotificationService.getUnreadCount(testUser.user_id);
    console.log(`✅ Unread count: ${unreadCount}`);
    
    // Test 5: Mark as read
    if (userNotifications.length > 0) {
      console.log('\n📝 Test 5: Marking notification as read...');
      const firstNotification = userNotifications[0];
      const markedNotification = await NotificationService.markAsRead(firstNotification.id, testUser.user_id);
      console.log('✅ Notification marked as read:', markedNotification ? 'Success' : 'Failed');
    }
    
    // Test 6: Check alerts
    console.log('\n📝 Test 6: Checking system alerts...');
    const alertResults = await NotificationService.checkStockLevels();
    console.log(`✅ Stock level check completed: ${alertResults.length} alerts found`);
    
    console.log('\n🎉 All notification tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testNotifications();
