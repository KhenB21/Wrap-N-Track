import React from 'react';
import { Link } from 'react-router-dom';
import './TopbarCustomer.css';

export default function TopbarCustomer() {
  return (
    <div className="topbar-customer">
      <div className="topbar-customer-left">
        <Link to="/" className="topbar-customer-logo">
          Wrap-N-Track
        </Link>
      </div>
      <div className="topbar-customer-right">
        <Link to="/orders" className="topbar-customer-link">My Orders</Link>
        <Link to="/contact" className="topbar-customer-link">Contact Us</Link>
      </div>
    </div>
  );
} 