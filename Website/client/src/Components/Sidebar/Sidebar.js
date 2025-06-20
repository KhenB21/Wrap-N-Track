import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css"; // We'll create this next
import config from '../../config';

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
    if (!user) return "/placeholder-profile.png";
    
    // If we have base64 data, use that
    if (user.profile_picture_data) {
      return `data:image/jpeg;base64,${user.profile_picture_data}`;
    }
    
    // If we have a path, use that
    if (user.profile_picture_path) {
      if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
      return `${config.API_URL}${user.profile_picture_path}`;
    }
    
    return "/placeholder-profile.png";
  };

  // Get user role from localStorage
  const getUserRole = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user ? user.role : null;
  };

  const user = JSON.parse(localStorage.getItem('user'));
  const role = user ? user.role : null;

  // Define permissions for each role
  const rolePermissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers:true, orderHistory: true, accountManagement: false,
    },
    social_media_manager: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false,
    },

    default: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    }
  };

  const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};


  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Wrap N' Track</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {permissions.dashboard && (
            <li>
              <Link to="/">
                <span className="icon">📊</span>
                <span className="text">Dashboard</span>
              </Link>
            </li>
          )}
          {permissions.inventory && (
            <li>
              <Link to="/inventory">
                <span className="icon">📦</span>
                <span className="text">Inventory</span>
              </Link>
            </li>
          )}
          {permissions.orders && (
            <li>
              <Link to="/orders">
                <span className="icon">💰</span>
                <span className="text">Orders</span>
              </Link>
            </li>
          )}
          {permissions.reports && (
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
                <li><Link to="/reports/sales">Sales Reports</Link></li>
                <li><Link to="/reports/inventory">Inventory Reports</Link></li>
                <li><Link to="/reports/financial">Financial Reports</Link></li>
              </ul>
            </li>
          )}
          {permissions.customers && (
            <li>
              <Link to="/customer-details">
                <span className="icon">👥</span>
                <span className="text">Customers</span>
              </Link>
            </li>
          )}
          {permissions.suppliers && (
            <li>
              <Link to="/supplier-details">
                <span className="icon">🏭</span>
                <span className="text">Suppliers</span>
              </Link>
            </li>
          )}
          {permissions.orderHistory && (
            <li>
              <Link to="/order-history" className="sidebar-link">
                <i className="fas fa-history"></i>
                <span className="icon">📅</span>
                <span className="text">Order History</span>
              </Link>
            </li>
          )}
          {permissions.accountManagement && (
            <li>
              <Link to="/user-management">
                <span className="icon">👤</span>
                <span className="text">Account Management</span>
              </Link>
            </li>
          )}
          <li>
            <Link to="/customer-home">
              <span className="icon">💍</span>
              <span className="text">Go to website</span>
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
