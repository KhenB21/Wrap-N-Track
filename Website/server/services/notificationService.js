const pool = require('../config/db');

class NotificationService {
  // Create a new notification
  static async createNotification(notificationData) {
    const {
      userId,
      title,
      message,
      type,
      priority = 'normal',
      category,
      metadata = {}
    } = notificationData;

    try {
      // Check if similar notification exists for this user within the last 2 hours
      const similarExists = await pool.query(`
        SELECT check_similar_notification($1, $2, $3, 2) as exists
      `, [userId, type, title]);

      if (similarExists.rows[0].exists) {
        console.log(`Skipping duplicate notification for user ${userId}: ${title}`);
        return null;
      }

      const result = await pool.query(`
        INSERT INTO notifications (user_id, title, message, type, priority, category, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [userId, title, message, type, priority, category, JSON.stringify(metadata)]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notifications for multiple users (excluding customers)
  static async createBulkNotification(notificationData, excludeCustomers = true) {
    try {
      // Get all users except customers
      let userQuery = 'SELECT user_id FROM users WHERE role != $1';
      const queryParams = ['customer'];

      if (excludeCustomers) {
        // Already excluding customers
      }

      const users = await pool.query(userQuery, queryParams);
      
      const notifications = [];
      
      for (const user of users.rows) {
        const notification = await this.createNotification({
          ...notificationData,
          userId: user.user_id
        });
        
        // Only add non-null notifications (null means duplicate was skipped)
        if (notification) {
          notifications.push(notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const result = await pool.query(`
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Ensure metadata is properly parsed
      const notifications = result.rows.map(notification => {
        try {
          if (notification.metadata && typeof notification.metadata === 'string') {
            notification.metadata = JSON.parse(notification.metadata);
          }
        } catch (error) {
          console.warn('Error parsing notification metadata:', error);
          notification.metadata = {};
        }
        return notification;
      });

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW() 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [notificationId, userId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      // First get the count of unread notifications
      const countResult = await pool.query(`
        SELECT COUNT(*) as count FROM notifications 
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      // Then update them
      const updateResult = await pool.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW() 
        WHERE user_id = $1 AND is_read = false
      `, [userId]);

      return {
        count: parseInt(countResult.rows[0].count),
        updated: updateResult.rowCount
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete old notifications (cleanup)
  static async deleteOldNotifications(daysOld = 30) {
    try {
      const result = await pool.query(`
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND is_read = true
      `);

      return result.rowCount;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }

  // Clean up duplicate notifications
  static async cleanupDuplicateNotifications() {
    try {
      const result = await pool.query('SELECT cleanup_duplicate_notifications() as deleted_count');
      return result.rows[0].deleted_count;
    } catch (error) {
      console.error('Error cleaning up duplicate notifications:', error);
      throw error;
    }
  }

  // Check stock levels and create alerts
  static async checkStockLevels() {
    try {
      // Get products with stock below 100
      const result = await pool.query(`
        SELECT inventory_items.sku, inventory_items.name, inventory_items.quantity, suppliers.name as supplier_name
        FROM inventory_items 
        LEFT JOIN suppliers ON inventory_items.supplier_id = suppliers.supplier_id
        WHERE inventory_items.quantity < 100 AND inventory_items.is_active = true
      `);

      if (result.rows.length > 0) {
        // Create a single notification for all low stock products to avoid spam
        const productList = result.rows.map(p => `${p.name} (${p.sku}): ${p.quantity} units`).join(', ');
        
        // Use a more specific title to prevent duplicates
        const title = `⚠️ Low Stock Alert - ${result.rows.length} Products`;
        
        await this.createBulkNotification({
          title: title,
          message: `${result.rows.length} product(s) are below 100 units: ${productList}`,
          type: 'stock_alert',
          priority: 'urgent',
          category: 'low_stock',
          metadata: {
            product_count: result.rows.length,
            products: result.rows.map(p => ({
              sku: p.sku,
              name: p.name,
              quantity: p.quantity,
              supplier_name: p.supplier_name
            }))
          }
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Error checking stock levels:', error);
      throw error;
    }
  }

  // Check expiration dates and create alerts
  static async checkExpirationDates() {
    try {
      // Get products expiring within 7 days
      const result = await pool.query(`
        SELECT inventory_items.sku, inventory_items.name, inventory_items.expiration, suppliers.name as supplier_name
        FROM inventory_items 
        LEFT JOIN suppliers ON inventory_items.supplier_id = suppliers.supplier_id
        WHERE inventory_items.expirable = true 
        AND inventory_items.expiration IS NOT NULL 
        AND inventory_items.expiration <= NOW() + INTERVAL '7 days'
        AND inventory_items.expiration > NOW()
        AND inventory_items.is_active = true
      `);

      if (result.rows.length > 0) {
        // Group products by days until expiry
        const groupedProducts = {};
        result.rows.forEach(product => {
          const daysUntilExpiry = Math.ceil((new Date(product.expiration) - new Date()) / (1000 * 60 * 60 * 24));
          if (!groupedProducts[daysUntilExpiry]) {
            groupedProducts[daysUntilExpiry] = [];
          }
          groupedProducts[daysUntilExpiry].push(product);
        });

        // Create notifications for each group
        for (const [days, products] of Object.entries(groupedProducts)) {
          const productList = products.map(p => `${p.name} (${p.sku})`).join(', ');
          
          await this.createBulkNotification({
            title: '⏰ Expiration Alert',
            message: `${products.length} product(s) expire in ${days} day(s): ${productList}`,
            type: 'expiration_alert',
            priority: 'urgent',
            category: 'expiration',
            metadata: {
              days_until_expiry: parseInt(days),
              product_count: products.length,
              products: products.map(p => ({
                sku: p.sku,
                name: p.name,
                expiration_date: p.expiration,
                supplier_name: p.supplier_name
              }))
            }
          });
        }
      }

      return result.rows;
    } catch (error) {
      console.error('Error checking expiration dates:', error);
      throw error;
    }
  }

  // Check fast-moving products
  static async checkFastMovingProducts() {
    try {
      // First, update the fast_moving status based on sales data
      await pool.query('SELECT update_fast_moving_status()');
      
      // Get ONLY fast-moving products with stock below 200
      const result = await pool.query(`
        SELECT inventory_items.sku, inventory_items.name, inventory_items.quantity, 
               suppliers.name as supplier_name, inventory_items.sales_count_30_days
        FROM inventory_items 
        LEFT JOIN suppliers ON inventory_items.supplier_id = suppliers.supplier_id
        WHERE inventory_items.fast_moving = true 
        AND inventory_items.quantity < 200 
        AND inventory_items.is_active = true
      `);

      if (result.rows.length > 0) {
        // Create a single notification for all fast-moving products to avoid spam
        const productList = result.rows.map(p => 
          `"${p.name}" (${p.sku}): ${p.quantity} units (Sold ${p.sales_count_30_days} units in 30 days)`
        ).join(', ');
        
        // Use a more specific title to prevent duplicates
        const title = `🚨 URGENT: Fast-Moving Product Low Stock - ${result.rows.length} Products`;
        
        await this.createBulkNotification({
          title: title,
          message: `${result.rows.length} fast-moving product(s) are below 200 units: ${productList}`,
          type: 'fast_moving_alert',
          priority: 'critical',
          category: 'urgent',
          metadata: {
            product_count: result.rows.length,
            products: result.rows.map(p => ({
              sku: p.sku,
              name: p.name,
              current_stock: p.quantity,
              supplier_name: p.supplier_name,
              sales_count_30_days: p.sales_count_30_days
            }))
          }
        });
      }

      return result.rows;
    } catch (error) {
      console.error('Error checking fast-moving products:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
