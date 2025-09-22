import React, { useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Security Test Component - Only for development/testing
 * This component helps verify that all security measures are working correctly
 */
const SecurityTest = () => {
  const { user, isAuthenticated, isEmployee, isCustomer } = useAuth();
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (test, result, details = '') => {
    setTestResults(prev => [...prev, { test, result, details, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runSecurityTests = () => {
    setTestResults([]);
    
    // Test 1: Check current user state
    addTestResult(
      'Current User State',
      isAuthenticated ? 'PASS' : 'FAIL',
      `Authenticated: ${isAuthenticated}, User Type: ${user?.source || 'None'}`
    );

    // Test 2: Check employee access
    addTestResult(
      'Employee Access Check',
      isEmployee ? 'PASS' : 'FAIL',
      `Is Employee: ${isEmployee}`
    );

    // Test 3: Check customer access
    addTestResult(
      'Customer Access Check',
      isCustomer ? 'PASS' : 'FAIL',
      `Is Customer: ${isCustomer}`
    );

    // Test 4: Check token presence
    const hasEmployeeToken = !!localStorage.getItem('token');
    const hasCustomerToken = !!localStorage.getItem('customerToken');
    addTestResult(
      'Token Presence Check',
      (hasEmployeeToken || hasCustomerToken) ? 'PASS' : 'FAIL',
      `Employee Token: ${hasEmployeeToken}, Customer Token: ${hasCustomerToken}`
    );

    // Test 5: Check for conflicting tokens
    const hasConflictingTokens = hasEmployeeToken && hasCustomerToken;
    addTestResult(
      'Conflicting Tokens Check',
      !hasConflictingTokens ? 'PASS' : 'WARNING',
      hasConflictingTokens ? 'Both employee and customer tokens found!' : 'No conflicting tokens'
    );
  };

  const testEmployeeAccess = () => {
    navigate('/employee-dashboard');
  };

  const testInventoryAccess = () => {
    navigate('/inventory');
  };

  const testAccountManagementAccess = () => {
    navigate('/account-management');
  };

  const testCustomerAccess = () => {
    navigate('/customer-home');
  };

  const clearAllTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customer');
    addTestResult('Clear All Tokens', 'PASS', 'All tokens cleared');
  };

  const simulateCustomerLogin = () => {
    localStorage.setItem('customerToken', 'test-customer-token');
    localStorage.setItem('customer', JSON.stringify({ 
      id: 1, 
      name: 'Test Customer', 
      source: 'customer' 
    }));
    addTestResult('Simulate Customer Login', 'PASS', 'Customer tokens set');
    window.location.reload();
  };

  const simulateEmployeeLogin = () => {
    localStorage.setItem('token', 'test-employee-token');
    localStorage.setItem('user', JSON.stringify({ 
      id: 1, 
      name: 'Test Employee', 
      source: 'employee' 
    }));
    addTestResult('Simulate Employee Login', 'PASS', 'Employee tokens set');
    window.location.reload();
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Security Test Panel</h2>
      <p><strong>Warning:</strong> This component is for development/testing only. Remove in production.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Current State</h3>
        <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>User Type: {user?.source || 'None'}</p>
        <p>Is Employee: {isEmployee ? 'Yes' : 'No'}</p>
        <p>Is Customer: {isCustomer ? 'Yes' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Security Tests</h3>
        <button onClick={runSecurityTests} style={{ marginRight: '10px', padding: '10px' }}>
          Run Security Tests
        </button>
        <button onClick={clearAllTokens} style={{ marginRight: '10px', padding: '10px' }}>
          Clear All Tokens
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Simulate Login</h3>
        <button onClick={simulateCustomerLogin} style={{ marginRight: '10px', padding: '10px' }}>
          Simulate Customer Login
        </button>
        <button onClick={simulateEmployeeLogin} style={{ marginRight: '10px', padding: '10px' }}>
          Simulate Employee Login
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Test Access</h3>
        <button onClick={testEmployeeAccess} style={{ marginRight: '10px', padding: '10px' }}>
          Try Employee Dashboard
        </button>
        <button onClick={testInventoryAccess} style={{ marginRight: '10px', padding: '10px' }}>
          Try Inventory
        </button>
        <button onClick={testAccountManagementAccess} style={{ marginRight: '10px', padding: '10px' }}>
          Try Account Management
        </button>
        <button onClick={testCustomerAccess} style={{ marginRight: '10px', padding: '10px' }}>
          Try Customer Home
        </button>
      </div>

      {testResults.length > 0 && (
        <div>
          <h3>Test Results</h3>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '5px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {testResults.map((result, index) => (
              <div key={index} style={{ 
                marginBottom: '5px',
                padding: '5px',
                backgroundColor: result.result === 'PASS' ? '#d4edda' : 
                                result.result === 'WARNING' ? '#fff3cd' : '#f8d7da',
                borderRadius: '3px'
              }}>
                <strong>{result.test}</strong>: {result.result} - {result.details} 
                <span style={{ color: '#666', fontSize: '0.8em' }}> ({result.timestamp})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityTest;
