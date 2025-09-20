-- Migration 018: Create notifications table
-- This migration creates the notifications system tables

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'stock_alert', 'expiration_alert', 'fast_moving_alert', 'order_alert'
    priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'urgent', 'critical'
    category VARCHAR(50) NOT NULL, -- 'low_stock', 'expiration', 'urgent', 'orders'
    is_read BOOLEAN DEFAULT false,
    metadata JSONB, -- Store additional data like product_id, order_id, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Create notification settings table for user preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    stock_alerts BOOLEAN DEFAULT true,
    expiration_alerts BOOLEAN DEFAULT true,
    fast_moving_alerts BOOLEAN DEFAULT true,
    order_alerts BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index to ensure one settings record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Add comments
COMMENT ON TABLE notifications IS 'Stores all system notifications for users';
COMMENT ON COLUMN notifications.type IS 'Type of notification: stock_alert, expiration_alert, fast_moving_alert, order_alert';
COMMENT ON COLUMN notifications.priority IS 'Priority level: normal, urgent, critical';
COMMENT ON COLUMN notifications.category IS 'Category for UI grouping: low_stock, expiration, urgent, orders';
COMMENT ON COLUMN notifications.metadata IS 'Additional data stored as JSON (product_id, order_id, etc.)';
COMMENT ON TABLE notification_settings IS 'User preferences for notification types and delivery methods';
