-- Migration 020: Add notification deduplication constraints
-- This migration adds constraints to prevent duplicate notifications

-- Add a function to clean up old duplicate notifications
CREATE OR REPLACE FUNCTION cleanup_duplicate_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete duplicate notifications keeping only the most recent one
    WITH duplicate_notifications AS (
        SELECT id, 
               ROW_NUMBER() OVER (
                 PARTITION BY user_id, type, title, DATE(created_at) 
                 ORDER BY created_at DESC
               ) as rn
        FROM notifications
        WHERE created_at > NOW() - INTERVAL '24 hours'
    )
    DELETE FROM notifications 
    WHERE id IN (
        SELECT id FROM duplicate_notifications WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add a function to check for existing similar notifications
CREATE OR REPLACE FUNCTION check_similar_notification(
    p_user_id INTEGER,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_hours_back INTEGER DEFAULT 2
)
RETURNS BOOLEAN AS $$
DECLARE
    exists_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO exists_count
    FROM notifications 
    WHERE user_id = p_user_id 
    AND type = p_type 
    AND title = p_title 
    AND created_at > NOW() - INTERVAL '1 hour' * p_hours_back;
    
    RETURN exists_count > 0;
END;
$$ LANGUAGE plpgsql;
