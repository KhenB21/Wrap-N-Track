import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    closeNotificationPanel
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeNotificationPanel();
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen) return null;

  // Filter notifications by category
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    return notification.category === filter;
  });

  // Group notifications by category
  const groupedNotifications = {
    low_stock: filteredNotifications.filter(n => n.category === 'low_stock'),
    expiration: filteredNotifications.filter(n => n.category === 'expiration'),
    urgent: filteredNotifications.filter(n => n.category === 'urgent'),
    orders: filteredNotifications.filter(n => n.category === 'orders'),
    other: filteredNotifications.filter(n => !['low_stock', 'expiration', 'urgent', 'orders'].includes(n.category))
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'low_stock': return '⚠️';
      case 'expiration': return '⏰';
      case 'urgent': return '🚨';
      case 'orders': return '🛒';
      default: return '📢';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'critical': return 'critical';
      case 'urgent': return 'urgent';
      default: return 'normal';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const handleDeleteNotification = (e, notificationId) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <div className={`notification-panel-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`notification-panel ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div className="notification-actions">
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
            <button 
              className="close-btn"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="notification-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'low_stock' ? 'active' : ''}`}
            onClick={() => setFilter('low_stock')}
          >
            ⚠️ Stock ({groupedNotifications.low_stock.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'expiration' ? 'active' : ''}`}
            onClick={() => setFilter('expiration')}
          >
            ⏰ Expiry ({groupedNotifications.expiration.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'urgent' ? 'active' : ''}`}
            onClick={() => setFilter('urgent')}
          >
            🚨 Urgent ({groupedNotifications.urgent.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'orders' ? 'active' : ''}`}
            onClick={() => setFilter('orders')}
          >
            🛒 Orders ({groupedNotifications.orders.length})
          </button>
        </div>

        <div className="notification-list">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <p>No notifications</p>
              <span>You're all caught up!</span>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([category, categoryNotifications]) => {
              if (categoryNotifications.length === 0) return null;
              
              return (
                <div key={category} className="notification-category">
                  {filter === 'all' && (
                    <div className="category-header">
                      <span className="category-icon">{getCategoryIcon(category)}</span>
                      <span className="category-title">
                        {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="category-count">({categoryNotifications.length})</span>
                    </div>
                  )}
                  
                  {categoryNotifications.map((notification) => {
                    // Get product count from metadata (now always an object)
                    const metadata = notification.metadata || {};
                    const productCount = metadata.product_count || 1;
                    
                    return (
                      <div
                        key={notification.id}
                        className={`notification-item ${!notification.is_read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-content">
                          <div className="notification-header">
                            <h4 className="notification-title">
                              {notification.title}
                              {productCount > 1 && (
                                <span className="product-count-badge">
                                  {productCount} items
                                </span>
                              )}
                            </h4>
                            <button
                              className="delete-notification-btn"
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                              title="Delete notification"
                            >
                              ×
                            </button>
                          </div>
                          <p className="notification-message">{notification.message}</p>
                          <div className="notification-meta">
                            <span className="notification-time">
                              {formatTimestamp(notification.created_at)}
                            </span>
                            {notification.priority === 'critical' && (
                              <span className="priority-badge critical">CRITICAL</span>
                            )}
                            {notification.priority === 'urgent' && (
                              <span className="priority-badge urgent">URGENT</span>
                            )}
                          </div>
                        </div>
                        {!notification.is_read && <div className="unread-indicator"></div>}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
