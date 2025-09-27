import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Test component for 404 functionality
 * This helps verify that 404 pages work correctly
 */
const NotFoundTest = () => {
  const navigate = useNavigate();

  const test404Pages = [
    { name: 'Non-existent Page', path: '/this-page-does-not-exist' },
    { name: 'Wrong Employee Path', path: '/employee-dashboard-wrong' },
    { name: 'Wrong Customer Path', path: '/customer-home-wrong' },
    { name: 'Invalid Product ID', path: '/product/999999' },
    { name: 'Wrong Order ID', path: '/orders/999999' },
    { name: 'Random Characters', path: '/asdfghjkl' },
    { name: 'Deep Nested Path', path: '/very/deep/nested/path/that/does/not/exist' },
    { name: 'Special Characters', path: '/test@#$%^&*()' },
    { name: 'Empty Path', path: '//' },
    { name: 'Spaces in Path', path: '/test with spaces' }
  ];

  const test404 = (path) => {
    navigate(path);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>404 Page Test</h2>
      <p>Click any button below to test the 404 page functionality:</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '10px',
        marginTop: '20px'
      }}>
        {test404Pages.map((test, index) => (
          <button
            key={index}
            onClick={() => test404(test.path)}
            style={{
              padding: '12px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#5a67d8';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#667eea';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {test.name}
          </button>
        ))}
      </div>

      <div style={{ 
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#f7fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h3>What to Test:</h3>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>404 page displays correctly</li>
          <li>Auto-redirect countdown works (10 seconds)</li>
          <li>Manual redirect buttons work</li>
          <li>User-specific home page redirects work</li>
          <li>Popular pages suggestions are relevant</li>
          <li>Page shows correct requested URL</li>
          <li>Responsive design works on mobile</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff5f5',
        borderRadius: '8px',
        border: '1px solid #fed7d7'
      }}>
        <h3>Expected Behavior:</h3>
        <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#c53030' }}>
          <li><strong>Employee users:</strong> Redirect to /employee-dashboard</li>
          <li><strong>Customer users:</strong> Redirect to /customer-home</li>
          <li><strong>Unauthenticated users:</strong> Redirect to / (homepage)</li>
          <li><strong>All users:</strong> See relevant popular pages suggestions</li>
        </ul>
      </div>
    </div>
  );
};

export default NotFoundTest;
