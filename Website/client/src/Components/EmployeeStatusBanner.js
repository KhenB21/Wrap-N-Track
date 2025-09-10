import React from 'react';
import { useAuth } from '../Context/AuthContext';

export default function EmployeeStatusBanner() {
  const { isEmployee } = useAuth();

  if (!isEmployee) {
    return null; // Don't render anything if not an employee
  }

  return (
    <div style={{
      backgroundColor: '#ff6b35',
      color: 'white',
      padding: '10px 20px',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      borderRadius: '6px',
      margin: '10px auto',
      maxWidth: '600px'
    }}>
      🔧 Employee Mode: You have administrative access to manage products and orders
    </div>
  );
}
