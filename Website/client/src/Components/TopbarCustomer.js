import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './TopbarCustomer.css';
import api from '../api';

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
  const [customer, setCustomer] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const hideDropdownTimeout = useRef(null);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const token = localStorage.getItem('customerToken');
        if (!token) return;

        const response = await api.get('/api/customer/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data && response.data.success) {
          const customerData = {
            customer_id: response.data.customer.customer_id,
            name: response.data.customer.name,
            email: response.data.customer.email,
            username: response.data.customer.username,
            phone_number: response.data.customer.phone_number,
            profile_picture_data: response.data.customer.profile_picture_base64,
            profile_picture_path: response.data.customer.profile_picture_path
          };
          setCustomer(customerData);
          // Update localStorage with the complete customer data
          localStorage.setItem('customer', JSON.stringify(customerData));
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };

    fetchCustomerData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    navigate('/customer-home');
  };

  const handleViewProfile = () => {
    navigate('/customer-user-details');
  };

  const getProfilePictureUrl = () => {
    if (!customer) return "/placeholder-profile.png";
    
    // If we have base64 data, use that
    if (customer.profile_picture_data) {
      return `data:image/jpeg;base64,${customer.profile_picture_data}`;
    }
    
    // If we have a profile picture path, use that
      if (customer.profile_picture_path) {
      if (customer.profile_picture_path.startsWith('http')) {
        return customer.profile_picture_path;
      }
  return `${customer.profile_picture_path}`;
    }
    
    return "/placeholder-profile.png";
  };

  // Add this new function to handle profile click
  const handleProfileClick = (e) => {
    e.stopPropagation();
    setDropdownVisible(prev => !prev);
  };

  // Modify the useEffect for click outside
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
          {!customer ? (
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
                  <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); navigate('/customer-user-details'); }}>My Account</button>
                  <button onClick={(e) => { e.stopPropagation(); setDropdownVisible(false); navigate('/customer-cart'); }}>My Purchase</button>
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