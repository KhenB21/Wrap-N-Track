import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css"; // We'll create this next
import { useAuth } from "../../Context/AuthContext";

const Sidebar = () => {
  const [reportsOpen, setReportsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login-employee-pensee');
  };

  const role = user ? user.role : null;

  // Check if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check if reports section should be active
  const isReportsActive = location.pathname.startsWith('/reports/');

  // Define permissions for each role
  const rolePermissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    admin: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    director: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true,
    },
    business_developer: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false,
    },
    creatives: {
      dashboard: true, inventory: true, orders: false, reports: true, customers: false, suppliers: false, orderHistory: false, accountManagement: false,
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
    },
    assistant_sales: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: false, orderHistory: false, accountManagement: false,
    },
    packer: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: false, suppliers: false, orderHistory: true, accountManagement: false,
      readOnly: true, // Mark as read-only
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false,
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
              <Link to="/employee-dashboard" className={isActive('/employee-dashboard') ? 'active' : ''}>
                <span className="icon">📊</span>
                <span className="text">Dashboard</span>
              </Link>
            </li>
          )}
          {permissions.inventory && (
            <li>
              <Link to="/inventory" className={isActive('/inventory') ? 'active' : ''}>
                <span className="icon">📦</span>
                <span className="text">Inventory</span>
              </Link>
            </li>
          )}
          {permissions.inventory && (
            <li>
              <Link to="/archive-products" className={isActive('/archive-products') ? 'active' : ''}>
                <span className="icon">🗂️</span>
                <span className="text">Archive Products</span>
              </Link>
            </li>
          )}
          {permissions.orders && (
            <li>
              <Link to="/orders" className={isActive('/orders') ? 'active' : ''}>
                <span className="icon">💰</span>
                <span className="text">Orders</span>
              </Link>
            </li>
          )}
          {permissions.reports && (
            <li className={`dropdown ${reportsOpen || isReportsActive ? "open" : ""}`}>
              <div
                className={`dropdown-header ${isReportsActive ? 'active' : ''}`}
                onClick={() => setReportsOpen(!reportsOpen)}
              >
                <span className="icon">📈</span>
                <span className="text">Reports</span>
                <span className="arrow">▶</span>
              </div>
              <ul className="dropdown-menu">
                <li><Link to="/reports/sales" className={isActive('/reports/sales') ? 'active' : ''}>Sales Reports</Link></li>
                <li><Link to="/reports/inventory" className={isActive('/reports/inventory') ? 'active' : ''}>Inventory Reports</Link></li>
              </ul>
            </li>
          )}
          {permissions.customers && (
            <li>
              <Link to="/customers" className={isActive('/customers') ? 'active' : ''}>
                <span className="icon">👥</span>
                <span className="text">Customers</span>
              </Link>
            </li>
          )}
          {permissions.suppliers && (
            <li>
              <Link to="/supplier-details" className={isActive('/supplier-details') ? 'active' : ''}>
                <span className="icon">🏭</span>
                <span className="text">Suppliers</span>
              </Link>
            </li>
          )}
          {permissions.orderHistory && (
            <li>
              <Link to="/order-history" className={`${isActive('/order-history') ? 'active' : ''}`}>
                <span className="icon">📅</span>
                <span className="text">Order History</span>
              </Link>
            </li>
          )}
          {permissions.accountManagement && (
            <li>
              <Link to="/account-management" className={isActive('/account-management') ? 'active' : ''}>
                <span className="icon">👤</span>
                <span className="text">Account Management</span>
              </Link>
            </li>
          )}
          <li>
            <Link to="/customer-home" className={isActive('/customer-home') ? 'active' : ''}>
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
