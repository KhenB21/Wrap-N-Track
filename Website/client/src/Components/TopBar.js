import React from "react";
import "./TopBar.css";

export default function TopBar({ searchPlaceholder = "Search", avatarUrl = "https://randomuser.me/api/portraits/men/1.jpg" }) {
  return (
    <div className="dashboard-topbar">
      <input className="dashboard-search" type="text" placeholder={searchPlaceholder} />
      <div className="dashboard-topbar-icons">
        <span className="dashboard-bell" role="img" aria-label="Notifications">🔔</span>
        <span className="dashboard-settings" role="img" aria-label="Settings">⚙️</span>
        <span className="dashboard-avatar">
          <img src={avatarUrl} alt="User" />
        </span>
      </div>
    </div>
  );
} 