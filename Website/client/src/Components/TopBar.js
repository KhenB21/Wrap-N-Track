import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationContainer from "./NotificationContainer";
import "./TopBar.css";
import api from '../api'; // Unified axios instance
import { useAuth } from "../Context/AuthContext";

export default function TopBar({ searchPlaceholder = "Search", avatarUrl, lowStockProducts, searchValue = "", onSearchChange = () => {} }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const dropdownRef = useRef();
  const navigate = useNavigate();
  const { user, logout } = useAuth();


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
    logout();
    navigate('/login-employee-pensee');
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


  const getProfilePictureUrl = () => {
    if (!user) return null;
    
    // If we have base64 data, use that
    if (user.profile_picture_data) {
      return `data:image/jpeg;base64,${user.profile_picture_data}`;
    }
    
    return null;
  };

  const getInitials = () => {
    if (!user) return 'U';
    const displayName = user.name || user.username || '';
    if (!displayName) return 'U';
    const parts = displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
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
        <NotificationContainer />
        <span 
          className="dashboard-settings" 
          role="img" 
          aria-label="Settings"
          onClick={toggleDropdown}
          style={{ cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" fill="currentColor"/>
          </svg>
        </span>
        <span 
          className="dashboard-avatar"
          onClick={handleAvatarClick}
          style={{ cursor: 'pointer', position: 'relative' }}
          ref={dropdownRef}
        >
          {getProfilePictureUrl() ? (
            <img 
              src={avatarUrl || getProfilePictureUrl()} 
              alt="User" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="avatar-initials" 
            style={{ 
              display: getProfilePictureUrl() ? 'none' : 'flex',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#007bff',
              color: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {getInitials()}
          </div>
          {dropdownOpen && (
            <div className="avatar-dropdown">
              <button onClick={handleViewProfile}>View Profile</button>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          )}
        </span>
      </div>
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