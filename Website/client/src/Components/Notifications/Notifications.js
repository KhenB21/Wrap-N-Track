import React from 'react';
import './Notifications.css';

export default function Notifications({ isOpen, onClose, notifications = [] }) {
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
              <div key={index} className="notification-item" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {notification.image_data ? (
                  <img 
                    src={`data:image/jpeg;base64,${notification.image_data}`} 
                    alt={notification.name} 
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                    onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/40'; }}
                  />
                ) : (
                  <div style={{ width: 40, height: 40, background: '#eee', borderRadius: 4 }} />
                )}
                <div className="notification-content">
                  <p className="notification-message"><b>Low stocks Name:</b> {notification.name}</p>
                  <p className="notification-message">Stock: {notification.quantity}</p>
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