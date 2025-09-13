import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

export default function EmployeeStatusBanner() {
  const { isEmployee } = useAuth();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Reset visibility when role changes
    setVisible(true);
  }, [isEmployee]);

  if (!isEmployee || !visible) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#fef3c7',
      color: '#92400e',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      border: '1px solid #fde68a',
      borderRadius: '8px',
      margin: '10px 16px'
    }}>
      <div aria-hidden style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 15h-1v-6h2v6h-1Zm0-8h-1V7h2v2h-1Z" fill="#92400e"/>
        </svg>
      </div>
      <div style={{ flex: 1, fontSize: '14px' }}>
        You are logged in with employee privileges.
      </div>
      <Link to="/employee-dashboard" style={{
        backgroundColor: '#92400e', color: '#fff', textDecoration: 'none',
        padding: '6px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 600
      }}>
        Go to Employee Dashboard
      </Link>
      <button onClick={() => setVisible(false)} aria-label="Dismiss"
        style={{
          background: 'transparent', border: 'none', color: '#92400e',
          cursor: 'pointer', padding: 4, marginLeft: 6
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="#92400e" strokeWidth="2" strokeLinecap="round"/>
          <path d="M6 6L18 18" stroke="#92400e" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
