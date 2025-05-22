import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Notifications from "./Notifications/Notifications";
import "./TopBar.css";

export default function TopBar({ searchPlaceholder = "Search", avatarUrl }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();
  const navigate = useNavigate();

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
      <input className="dashboard-search" type="text" placeholder={searchPlaceholder} />
      <div className="dashboard-topbar-icons">
        <span 
          className="dashboard-bell" 
          role="img" 
          aria-label="Notifications"
          onClick={handleNotificationsClick}
          style={{ cursor: 'pointer' }}
        >
          🔔
        </span>
        <span 
          className="dashboard-settings" 
          role="img" 
          aria-label="Settings"
          onClick={handleSettingsClick}
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
              <button onClick={handleSettingsClick}>Settings</button>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          )}
        </span>
      </div>
      <Notifications 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </div>
  );
} 