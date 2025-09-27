const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const NotificationService = require('../services/notificationService');
const verifyJwt = require('../middleware/verifyJwt')();

// GET /api/notifications - Get user notifications
router.get('/', verifyJwt, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const notifications = await NotificationService.getUserNotifications(req.user.user_id, limit, offset);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', verifyJwt, async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user.user_id);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', verifyJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, req.user.user_id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', verifyJwt, async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user.user_id);
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: result.count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// POST /api/notifications/test - Test notification (admin only)
router.post('/test', verifyJwt, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { title, message, type = 'test', priority = 'normal', category = 'test' } = req.body;
    
    const notification = await NotificationService.createNotification({
      userId: req.user.user_id,
      title: title || '🧪 Test Notification',
      message: message || 'This is a test notification',
      type,
      priority,
      category,
      metadata: { test: true }
    });
    
    res.json({
      success: true,
      message: 'Test notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification'
    });
  }
});

// POST /api/notifications/check-alerts - Manually trigger alert checks (admin only)
router.post('/check-alerts', verifyJwt, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const results = {
      stockAlerts: [],
      expirationAlerts: [],
      fastMovingAlerts: []
    };

    // Check stock levels
    try {
      results.stockAlerts = await NotificationService.checkStockLevels();
    } catch (error) {
      console.error('Error checking stock levels:', error);
    }

    // Check expiration dates
    try {
      results.expirationAlerts = await NotificationService.checkExpirationDates();
    } catch (error) {
      console.error('Error checking expiration dates:', error);
    }

    // Check fast-moving products
    try {
      results.fastMovingAlerts = await NotificationService.checkFastMovingProducts();
    } catch (error) {
      console.error('Error checking fast-moving products:', error);
    }

    res.json({
      success: true,
      message: 'Alert checks completed',
      results
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check alerts'
    });
  }
});

// POST /api/notifications/cleanup-duplicates - Clean up duplicate notifications (admin only)
router.post('/cleanup-duplicates', verifyJwt, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const deletedCount = await NotificationService.cleanupDuplicateNotifications();
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} duplicate notifications`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up duplicates'
    });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', verifyJwt, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.user_id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// GET /api/notifications/settings - Get notification settings
router.get('/settings', verifyJwt, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM notification_settings 
      WHERE user_id = $1
    `, [req.user.user_id]);
    
    if (result.rows.length === 0) {
      // Create default settings if none exist
      const defaultSettings = await pool.query(`
        INSERT INTO notification_settings (user_id)
        VALUES ($1)
        RETURNING *
      `, [req.user.user_id]);
      
      return res.json({
        success: true,
        settings: defaultSettings.rows[0]
      });
    }
    
    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings'
    });
  }
});

// PUT /api/notifications/settings - Update notification settings
router.put('/settings', verifyJwt, async (req, res) => {
  try {
    const {
      stock_alerts,
      expiration_alerts,
      fast_moving_alerts,
      order_alerts,
      sound_enabled,
      email_notifications
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO notification_settings (user_id, stock_alerts, expiration_alerts, fast_moving_alerts, order_alerts, sound_enabled, email_notifications)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        stock_alerts = EXCLUDED.stock_alerts,
        expiration_alerts = EXCLUDED.expiration_alerts,
        fast_moving_alerts = EXCLUDED.fast_moving_alerts,
        order_alerts = EXCLUDED.order_alerts,
        sound_enabled = EXCLUDED.sound_enabled,
        email_notifications = EXCLUDED.email_notifications,
        updated_at = NOW()
      RETURNING *
    `, [
      req.user.user_id,
      stock_alerts,
      expiration_alerts,
      fast_moving_alerts,
      order_alerts,
      sound_enabled,
      email_notifications
    ]);
    
    res.json({
      success: true,
      message: 'Notification settings updated',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
});

module.exports = router;