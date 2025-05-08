import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css"; // We'll create this next

const Sidebar = () => {
  const [reportsOpen, setReportsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Optionally clear all localStorage:
    // localStorage.clear();
    navigate('/login');
  };

  const getProfilePictureUrl = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.profile_picture_path) return "/placeholder-profile.png";
    if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
    return `http://localhost:3001${user.profile_picture_path}`;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Wrap N' Track</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/">
              <span className="icon">📊</span>
              <span className="text">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/inventory">
              <span className="icon">📦</span>
              <span className="text">Inventory</span>
            </Link>
          </li>
          <li>
            <Link to="/sales">
              <span className="icon">💰</span>
              <span className="text">Sales</span>
            </Link>
          </li>
          <li className={`dropdown ${reportsOpen ? "open" : ""}`}>
            <div
              className="dropdown-header"
              onClick={() => setReportsOpen(!reportsOpen)}
            >
              <span className="icon">📈</span>
              <span className="text">Reports</span>
              <span className="arrow">{reportsOpen ? "▼" : "▶"}</span>
            </div>
            <ul className="dropdown-menu">
              <li>
                <Link to="/reports/sales">Sales Reports</Link>
              </li>
              <li>
                <Link to="/reports/inventory">Inventory Reports</Link>
              </li>
              <li>
                <Link to="/reports/financial">Financial Reports</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link to="/customer-details">
              <span className="icon">👥</span>
              <span className="text">Customers</span>
            </Link>
          </li>
          <li>
            <Link to="/supplier-details">
              <span className="icon">🏭</span>
              <span className="text">Suppliers</span>
            </Link>
          </li>
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span className="icon">🚪</span>
          <span className="text">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
