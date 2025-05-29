import React, { useState, useEffect } from 'react';
import './Notifications.css';

export default function Notifications({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API call to fetch low-stock products
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications/low-stock');
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="notifications-overlay" onClick={onClose}>
      <div className="notifications-popup" onClick={e => e.stopPropagation()}>
        <div className="notifications-header">
          <h3>Notifications</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="notifications-list">
          {notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div key={index} className="notification-item">
                <div className="notification-content">
                  <p className="notification-message">Product: {notification.name}, Stock: {notification.quantity}</p>
                  <span className="notification-time">
                    {new Date(notification.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-notifications">No new notifications</p>
          )}
        </div>
      </div>
    </div>
  );
} 