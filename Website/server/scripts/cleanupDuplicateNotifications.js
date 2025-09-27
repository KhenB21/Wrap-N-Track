const pool = require('../config/db');

async function cleanupDuplicateNotifications() {
  try {
    console.log('🧹 Cleaning up duplicate notifications...');
    
    // Find and remove duplicate notifications based on title and type
    const duplicates = await pool.query(`
      WITH duplicate_notifications AS (
        SELECT id, 
               ROW_NUMBER() OVER (
                 PARTITION BY title, type, user_id 
                 ORDER BY created_at DESC
               ) as rn
        FROM notifications
        WHERE created_at > NOW() - INTERVAL '24 hours'
      )
      SELECT id FROM duplicate_notifications WHERE rn > 1
    `);
    
    if (duplicates.rows.length > 0) {
      const duplicateIds = duplicates.rows.map(row => row.id);
      
      await pool.query(`
        DELETE FROM notifications 
        WHERE id = ANY($1)
      `, [duplicateIds]);
      
      console.log(`✅ Removed ${duplicateIds.length} duplicate notifications`);
    } else {
      console.log('✅ No duplicate notifications found');
    }
    
    // Also clean up old test notifications
    const testCleanup = await pool.query(`
      DELETE FROM notifications 
      WHERE type = 'test' OR title LIKE '%Test%' OR title LIKE '%Sample%'
    `);
    
    console.log(`✅ Removed ${testCleanup.rowCount} test notifications`);
    
    // Show current notification count
    const count = await pool.query(`
      SELECT COUNT(*) as total FROM notifications
    `);
    
    console.log(`📊 Total notifications remaining: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error);
  } finally {
    await pool.end();
  }
}

cleanupDuplicateNotifications();
