const AlertChecker = require('./alertChecker');

class NotificationScheduler {
  constructor() {
    this.intervals = new Map();
  }

  start() {
    console.log('🕐 Starting notification scheduler...');
    
    // Check alerts every 5 minutes
    this.intervals.set('alerts', setInterval(async () => {
      try {
        await AlertChecker.checkAllAlerts();
      } catch (error) {
        console.error('Scheduled alert check failed:', error);
      }
    }, 5 * 60 * 1000)); // 5 minutes

    // Cleanup old notifications every hour
    this.intervals.set('cleanup', setInterval(async () => {
      try {
        await AlertChecker.cleanupOldNotifications();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, 60 * 60 * 1000)); // 1 hour

    console.log('✅ Notification scheduler started');
  }

  stop() {
    console.log('🛑 Stopping notification scheduler...');
    
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Stopped ${name} interval`);
    });
    
    this.intervals.clear();
    console.log('✅ Notification scheduler stopped');
  }

  // Run immediate check
  async runImmediateCheck() {
    console.log('🚀 Running immediate alert check...');
    return await AlertChecker.checkAllAlerts();
  }
}

// Create singleton instance
const scheduler = new NotificationScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down scheduler...');
  scheduler.stop();
  process.exit(0);
});

module.exports = scheduler;
