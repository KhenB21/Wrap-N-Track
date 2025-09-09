import React from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

const EmployeeStatusBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user || user.source !== 'employee') {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: '14px',
      borderBottom: '1px solid #bbdefb',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      🏢 You are browsing the customer website as an employee ({user.name}). 
      <button 
        onClick={() => navigate('/employee-dashboard')}
        style={{
          marginLeft: '10px',
          padding: '4px 8px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Return to Dashboard
      </button>
    </div>
  );
};

export default EmployeeStatusBanner;
