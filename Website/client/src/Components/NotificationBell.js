import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const { 
    unreadCount, 
    isOpen, 
    toggleNotificationPanel, 
    playNotificationSound 
  } = useNotifications();

  const handleClick = () => {
    toggleNotificationPanel();
    if (unreadCount > 0) {
      playNotificationSound();
    }
  };

  return (
    <div className="notification-bell-container">
      <button 
        className="notification-bell" 
        onClick={handleClick}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="bell-icon"
        >
          <path 
            d="M12 2C13.1 2 14 2.9 14 4C14 4.74 13.6 5.39 13 5.73V7H14C15.1 7 16 7.9 16 9V16L18 18V19H6V18L8 16V9C8 7.9 8.9 7 10 7H11V5.73C10.4 5.39 10 4.74 10 4C10 2.9 10.9 2 12 2ZM12 6C11.45 6 11 6.45 11 7H13C13 6.45 12.55 6 12 6ZM6 19H18V20H6V19Z" 
            fill="currentColor"
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBell;
