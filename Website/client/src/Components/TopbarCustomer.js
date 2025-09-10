import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './TopbarCustomer.css';
import { useAuth } from '../Context/AuthContext';

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
  const navigate = useNavigate();
  const dropdownRef = useRef();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/customer-home');
  };

  const getProfilePictureUrl = () => {
    if (!user) return "/placeholder-profile.png";
    
    if (user.profile_picture_data) {
      return `data:image/jpeg;base64,${user.profile_picture_data}`;
    }
    
    if (user.profile_picture_path) {
      if (user.profile_picture_path.startsWith('http')) {
        return user.profile_picture_path;
      }
  return `${user.profile_picture_path}`;
    }
    
    return "/placeholder-profile.png";
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setDropdownVisible(prev => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          {navLinks.slice(3, 6).map(link => (
            <Link
              key={link.label}
              to={link.path}
              className={`topbar-customer-link${location.pathname === link.path ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          {!isAuthenticated ? (
            <>
              <Link
                to="/customer-register"
                className={`topbar-customer-link${location.pathname === '/customer-register' ? ' active' : ''}`}
              >
                REGISTER
              </Link>
              <button
                className={`topbar-customer-link${location.pathname === '/customer-login' ? ' active' : ''}`}
                style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
                onClick={() => navigate('/customer-login')}
              >
                LOG IN
              </button>
            </>
          ) : (
            <div
              className="customer-profile"
              ref={dropdownRef}
              onClick={handleProfileClick}
            >
              <img
                src={getProfilePictureUrl()}
                alt="Profile"
                className="customer-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-profile.png';
                }}
              />
              {dropdownVisible && (
                <div className="customer-dropdown-menu">
                  {user.source === 'customer' && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); navigate('/customer-user-details'); }}>My Account</button>
                      <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); navigate('/customer-cart'); }}>My Purchase</button>
                    </>
                  )}
                  {user.source === 'employee' && (
                    <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); navigate('/employee-dashboard'); }}>Employee Dashboard</button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); handleLogout(); }} className="logout-btn">Logout</button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}