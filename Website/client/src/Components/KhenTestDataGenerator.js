import React, { useState } from 'react';
import api from '../api';

const KhenTestDataGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const generateKhenData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/khen-test/create-khen-orders');
      
      if (response.data.success) {
        setResult(response.data);
        alert('Khen test data created successfully! You can now view orders in the cart.');
      } else {
        setError(response.data.message || 'Failed to create test data');
      }
    } catch (error) {
      console.error('Error creating Khen test data:', error);
      setError('Failed to create test data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // This would need to be implemented in the backend
      const response = await api.delete('/khen-test/clear-khen-orders');
      
      if (response.data.success) {
        setResult(null);
        alert('Khen test data cleared successfully!');
      } else {
        setError(response.data.message || 'Failed to clear test data');
      }
    } catch (error) {
      console.error('Error clearing Khen test data:', error);
      setError('Failed to clear test data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Khen Test Data Generator</h2>
      <p>This tool creates test orders for the Khen account to demonstrate the cart and order functionality.</p>
      
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={generateKhenData}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Creating...' : 'Generate Khen Test Data'}
        </button>
        
        <button
          onClick={clearTestData}
          disabled={loading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Clearing...' : 'Clear Test Data'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>✅ Test Data Created Successfully!</h3>
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            <li>Customer ID: {result.data.customer_id}</li>
            <li>Orders Created: {result.data.orders_created}</li>
            <li>Order Products: {result.data.order_products_created}</li>
            <li>Status History: {result.data.status_history_created}</li>
          </ul>
        </div>
      )}

      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 12px 0' }}>What This Creates:</h3>
        <ul style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
          <li><strong>3 Test Orders</strong> with different statuses (Order Placed, In Progress, Ready for Delivery)</li>
          <li><strong>Order Products</strong> using existing inventory items</li>
          <li><strong>Status History</strong> showing order progression</li>
          <li><strong>Customer Account</strong> for Khen Bolima</li>
        </ul>
        
        <h4 style={{ margin: '16px 0 8px 0' }}>Next Steps:</h4>
        <ol style={{ margin: '0', paddingLeft: '20px', color: '#374151' }}>
          <li>Login as Khen customer account</li>
          <li>Go to <code>/customer-cart</code> to see the new cart with orders</li>
          <li>Switch to "Orders" tab to see delivery monitoring</li>
        </ol>
      </div>
    </div>
  );
};

export default KhenTestDataGenerator;

