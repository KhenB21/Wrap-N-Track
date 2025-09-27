const NotificationService = require('../services/notificationService');

async function cleanupNotifications() {
  try {
    console.log('🧹 Starting notification cleanup...');
    
    // Clean up duplicate notifications
    const duplicateCount = await NotificationService.cleanupDuplicateNotifications();
    console.log(`✅ Removed ${duplicateCount} duplicate notifications`);
    
    // Clean up old notifications (older than 30 days)
    const oldCount = await NotificationService.deleteOldNotifications(30);
    console.log(`✅ Removed ${oldCount} old notifications`);
    
    console.log('🎉 Notification cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupNotifications();
}

module.exports = cleanupNotifications;
