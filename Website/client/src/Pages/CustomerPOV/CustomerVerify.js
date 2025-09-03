import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import './CustomerVerify.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';

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

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/auth/customer/verify', {
        email,
        code: verificationCode
      });

      if (response.data.success) {
        setMessage('Email verified successfully! You can now log in.');
        setTimeout(() => {
          navigate('/customer-login');
        }, 2000);
      } else {
        setError('Verification failed. Please check your code and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.response?.data?.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      const response = await api.post('/api/auth/customer/resend-code', 
        { email },
        {
          headers: {
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
        <form onSubmit={handleVerify}>
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