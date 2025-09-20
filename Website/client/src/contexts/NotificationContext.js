import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { playNotificationSound } from '../Components/NotificationSound';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/notifications');
      const notifications = response.data.notifications || [];
      
      // Ensure all notifications have proper metadata
      const safeNotifications = notifications.map(notification => {
        try {
          if (notification.metadata && typeof notification.metadata === 'string') {
            notification.metadata = JSON.parse(notification.metadata);
          } else if (!notification.metadata) {
            notification.metadata = {};
          }
        } catch (error) {
          console.warn('Error parsing notification metadata:', error);
          notification.metadata = {};
        }
        return notification;
      });
      
      setNotifications(safeNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/api/notifications/mark-all-read');
      
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString()
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Add new notification (for real-time updates)
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    playNotificationSound();
  }, []);

  // Toggle notification panel
  const toggleNotificationPanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Close notification panel
  const closeNotificationPanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Set up polling for new notifications (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    playNotificationSound: playSound,
    toggleNotificationPanel,
    closeNotificationPanel
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
