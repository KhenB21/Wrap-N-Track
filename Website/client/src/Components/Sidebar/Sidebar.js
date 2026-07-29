import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css"; // We'll create this next
import { useAuth } from "../../Context/AuthContext";
import { useMobileNav } from "../../Context/MobileNavContext";

const Sidebar = () => {
  const [reportsOpen, setReportsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isOpen, close } = useMobileNav();

  const handleLogout = () => {
    logout();
    navigate('/login-employee-pensee');
  };

  const role = user ? user.role : null;

  // Define permissions for each role
  const rolePermissions = {
    super_admin: {
      dashboard: true, inventory: true, orders: true, invoices: true, deliveryTracking: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true, showcaseGallery: true,
    },
    admin: {
      dashboard: true, inventory: true, orders: true, invoices: true, deliveryTracking: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true, showcaseGallery: true,
    },
    director: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: true, showcaseGallery: true,
    },
    business_developer: {
      dashboard: true, inventory: false, orders: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false, showcaseGallery: false,
    },
    creatives: {
      dashboard: true, inventory: true, orders: false, reports: true, customers: false, suppliers: false, orderHistory: false, accountManagement: false, showcaseGallery: true,
    },
    sales_manager: {
      dashboard: true, inventory: true, orders: true, invoices: true, deliveryTracking: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false, showcaseGallery: true,
    },
    assistant_sales: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: false, orderHistory: false, accountManagement: false, showcaseGallery: false,
    },
    packer: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: false, suppliers: false, orderHistory: true, accountManagement: false, showcaseGallery: false,
      readOnly: true,
    },
    operations_manager: {
      dashboard: true, inventory: true, orders: true, invoices: true, deliveryTracking: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false, showcaseGallery: false,
    },
    social_media_manager: {
      dashboard: true, inventory: false, orders: true, deliveryTracking: true, reports: true, customers: true, suppliers: false, orderHistory: true, accountManagement: false, showcaseGallery: true,
    },
    default: {
      dashboard: true, inventory: true, orders: true, reports: true, customers: true, suppliers: true, orderHistory: true, accountManagement: false, showcaseGallery: false,
    }
  };

  const permissions = role ? (rolePermissions[role] || rolePermissions.default) : {};


  return (
    <>
      <div
        className={`sidebar-backdrop${isOpen ? ' visible' : ''}`}
        onClick={close}
        aria-hidden="true"
      />
      <div className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <h2>Wrap N' Track</h2>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {permissions.dashboard && (
            <li>
              <Link to="/employee-dashboard">
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
          {permissions.inventory && (
            <li>
              <Link to="/archive-products">
                <span className="icon">🗂️</span>
                <span className="text">Archive Products</span>
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
          {permissions.invoices && (
            <li>
              <Link to="/invoices">
                <span className="icon">INV</span>
                <span className="text">Invoices</span>
              </Link>
            </li>
          )}
          {permissions.deliveryTracking && (
            <li>
              <Link to="/delivery-tracking">
                <span className="icon">DEL</span>
                <span className="text">Delivery Tracking</span>
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
              </ul>
            </li>
          )}
          {permissions.customers && (
            <li>
              <Link to="/customers">
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
              <Link to="/account-management">
                <span className="icon">👤</span>
                <span className="text">Account Management</span>
              </Link>
            </li>
          )}
          {permissions.showcaseGallery && (
            <li>
              <Link to="/showcase-gallery">
                <span className="icon">🖼️</span>
                <span className="text">Showcase Gallery</span>
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
    </>
  );
};

export default Sidebar;
