import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './TopbarCustomer.css';

const navLinks = [
  { label: 'HOME', path: '/customer-home' },
  { label: 'ABOUT', path: '/about' },
  { label: 'ORDER', path: '/order' },
  { label: 'WEDDING', path: '/wedding' },
  { label: 'CORPORATE', path: '/corporate' },
  { label: 'BESPOKE', path: '/bespoke' },
];

export default function TopbarCustomer() {
  const location = useLocation();
  return (
    <header className="topbar-customer">
      <nav className="topbar-customer-nav">
        <div className="topbar-customer-links left">
          {navLinks.slice(0, 3).map(link => (
            <Link
              key={link.label}
              to={link.path}
              className={`topbar-customer-link${location.pathname === link.path ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="topbar-customer-logo-block">
          <img
            src="/Assets/Images/PenseeLogos/pensee-logo-with-name-vertical.png"
            alt="Pensee Logo Vertical"
            className="topbar-customer-logo"
          />
        </div>
        <div className="topbar-customer-links right">
          {navLinks.slice(3).map(link => (
            <Link
              key={link.label}
              to={link.path}
              className={`topbar-customer-link${location.pathname === link.path ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
} 