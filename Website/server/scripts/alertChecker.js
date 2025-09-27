const NotificationService = require('../services/notificationService');
const pool = require('../config/db');

class AlertChecker {
  static async checkAllAlerts() {
    console.log('🔔 Starting alert check...');
    
    try {
      // Check stock levels
      console.log('📦 Checking stock levels...');
      const stockAlerts = await NotificationService.checkStockLevels();
      console.log(`Found ${stockAlerts.length} low stock alerts`);

      // Check expiration dates
      console.log('⏰ Checking expiration dates...');
      const expirationAlerts = await NotificationService.checkExpirationDates();
      console.log(`Found ${expirationAlerts.length} expiration alerts`);

      // Check fast-moving products
      console.log('🚨 Checking fast-moving products...');
      const fastMovingAlerts = await NotificationService.checkFastMovingProducts();
      console.log(`Found ${fastMovingAlerts.length} fast-moving alerts`);

      console.log('✅ Alert check completed successfully');
      
      return {
        stockAlerts: stockAlerts.length,
        expirationAlerts: expirationAlerts.length,
        fastMovingAlerts: fastMovingAlerts.length
      };
    } catch (error) {
      console.error('❌ Error during alert check:', error);
      throw error;
    }
  }

  static async cleanupOldNotifications() {
    try {
      console.log('🧹 Cleaning up old notifications...');
      const deletedCount = await NotificationService.deleteOldNotifications(30);
      console.log(`Deleted ${deletedCount} old notifications`);
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  }
}

// If running directly, execute the check
if (require.main === module) {
  AlertChecker.checkAllAlerts()
    .then((results) => {
      console.log('Alert check results:', results);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Alert check failed:', error);
      process.exit(1);
    });
}

module.exports = AlertChecker;
