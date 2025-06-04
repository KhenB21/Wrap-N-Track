import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import './CustomerVerify.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api/axios';

function CustomerVerify() {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from localStorage
    const storedEmail = localStorage.getItem('verificationEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate('/customer-user-details');
    }
  }, [navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/customer/verify-email', 
        {
          email,
          code: verificationCode
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        // Update customer data in localStorage
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = {
          ...storedCustomer,
          is_verified: true
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        
        // Clear verification email from storage
        localStorage.removeItem('verificationEmail');
        
        // Show success message and redirect to profile
        navigate('/customer-user-details', { 
          state: { 
            message: 'Email verified successfully!' 
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      const token = localStorage.getItem('token');
      const response = await api.post('/api/customer/resend-verification', 
        { email },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setMessage('New verification code sent successfully');
        setResendDisabled(true);
        setCountdown(60); // 60 seconds cooldown
      }
    } catch (error) {
      setError('Failed to resend verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-container">
      <TopbarCustomer />
      <div className="verify-card">
        <h2>Email Verification</h2>
        <p className="verification-info">
          Please enter the verification code sent to <strong>{email}</strong>
        </p>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        <form onSubmit={handleVerification}>
          <div className="form-group">
            <label htmlFor="verificationCode">Verification Code:</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter verification code"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="verify-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>
        <div className="resend-section">
          <button
            onClick={handleResendCode}
            disabled={resendDisabled || resending}
            className="resend-button"
          >
            {resending ? 'Sending...' : resendDisabled ? `Resend in ${countdown}s` : 'Resend verification code'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerVerify; 