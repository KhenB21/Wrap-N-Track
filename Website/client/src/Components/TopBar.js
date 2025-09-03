import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Notifications from "./Notifications/Notifications";
import "./TopBar.css";
import api from '../api'; // Unified axios instance

export default function TopBar({ searchPlaceholder = "Search", avatarUrl, lowStockProducts, searchValue = "", onSearchChange = () => {} }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const dropdownRef = useRef();
  const navigate = useNavigate();
  const [lowStockNotifications, setLowStockNotifications] = useState([]);

  // If lowStockProducts is provided as a prop, use it for notifications
  useEffect(() => {
    if (Array.isArray(lowStockProducts)) {
      setLowStockNotifications(lowStockProducts);
    }
  }, [lowStockProducts]);

  const handleNotificationsClick = () => {
    setIsNotificationsOpen(true);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setDropdownOpen(false);
  };

  const handleAvatarClick = () => {
    setDropdownOpen((open) => !open);
  };

  const handleViewProfile = () => {
    navigate('/user-details');
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    setDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    // Apply theme to body
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Only fetch from backend if lowStockProducts is not provided
    if (typeof lowStockProducts === 'undefined') {
      const fetchLowStockNotifications = async () => {
        try {
          const response = await api.get('/api/notifications/low-stock');
          setLowStockNotifications(response.data);
        } catch (error) {
          console.error('Error fetching low stock notifications:', error);
        }
      };
      fetchLowStockNotifications();
      const interval = setInterval(fetchLowStockNotifications, 60000); // Fetch every 60 seconds
      return () => clearInterval(interval);
    }
  }, [lowStockProducts]);

  const getProfilePictureUrl = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return "/placeholder-profile.png";
    
    // If we have base64 data, use that
    if (user.profile_picture_data) {
      return `data:image/jpeg;base64,${user.profile_picture_data}`;
    }
    
    return "/placeholder-profile.png";
  };

  return (
    <div className="dashboard-topbar">
      <input
        className="dashboard-search"
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={onSearchChange}
      />
      <div className="dashboard-topbar-icons">
        <span 
          className="dashboard-bell" 
          role="img" 
          aria-label="Notifications"
          onClick={handleNotificationsClick}
          style={{ cursor: 'pointer' }}
        >
          🔔
          {lowStockNotifications.length > 0 && (
            <span className="notification-count">{lowStockNotifications.length}</span>
          )}
        </span>
        <span 
          className="dashboard-settings" 
          role="img" 
          aria-label="Settings"
          onClick={toggleDropdown}
          style={{ cursor: 'pointer' }}
        >
          ⚙️
        </span>
        <span 
          className="dashboard-avatar"
          onClick={handleAvatarClick}
          style={{ cursor: 'pointer', position: 'relative' }}
          ref={dropdownRef}
        >
          <img 
            src={avatarUrl || getProfilePictureUrl()} 
            alt="User" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-profile.png';
            }}
          />
          {dropdownOpen && (
            <div className="avatar-dropdown">
              <button onClick={handleViewProfile}>View Profile</button>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          )}
        </span>
      </div>
      <Notifications 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        notifications={lowStockNotifications}
      />
      {showDropdown && (
        <div className="settings-dropdown">
          <button 
            className="theme-btn"
            onClick={() => handleThemeChange('light')}
            style={{ 
              backgroundColor: theme === 'light' ? '#e6f0ff' : 'transparent',
              color: theme === 'light' ? '#007bff' : '#666'
            }}
          >
            <span role="img" aria-label="Light Mode">☀️</span>
            Light Mode
          </button>
          <button 
            className="theme-btn"
            onClick={() => handleThemeChange('dark')}
            style={{ 
              backgroundColor: theme === 'dark' ? '#2c2c2c' : 'transparent',
              color: theme === 'dark' ? '#fff' : '#666'
            }}
          >
            <span role="img" aria-label="Dark Mode">🌙</span>
            Dark Mode
          </button>
        </div>
      )}
    </div>
  );
} 