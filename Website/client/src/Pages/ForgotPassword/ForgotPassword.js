/* eslint-disable no-undef */
import React, { useState } from "react";

import { useNavigate } from "react-router-dom"; // ✅ needed for navigate
import api from "../../api";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [success, setSuccess] = useState(null);
  const [savedEmail, setSavedEmail] = useState("");

  const navigate = useNavigate();

  // Cooldown timer for resend
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Resend code handler
  const handleResendCode = async () => {
    setResendMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email: savedEmail });
      setMessage(res.data.message);
      setResendMessage("A new code has been generated. Please check your email.");
      setResendCooldown(30); // 30s cooldown
    } catch (err) {
      setError("Unable to resend code. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (value) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setError("");
    setMessage("");

    if (!validateEmail(value)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/api/auth/forgot-password', {
        email
      });

      if (response.status === 200) {
        setSuccess('Password reset instructions have been sent to your email.');
        setSavedEmail(email);
        setEmail(""); // Clear the email field
        setCodeSent(true); // Show OTP input
        setResendCooldown(30); // Start cooldown
      } else {
        setError('Failed to process request. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/api/auth/verify-reset-code`, {
        email: savedEmail,
        code,
      });

      localStorage.setItem("reset_email", savedEmail);
      localStorage.setItem("reset_code", code); // Store the verified code for reset-password step
      navigate("/reset-password");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="background-image" />

      <div className="content-wrapper">
        <div className="left-section">
          <h1>Wrap N' Track</h1>
          <img
            src="/Assets/Images/PenseeLogos/pensee-name-only.png"
            alt="Logo"
            className="brand-logo"
          />
        </div>

        <div className="right-section">
          <h3>{codeSent ? "Verify Your Email" : "Forgot Password"}</h3>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          {resendMessage && <div className="success-message">{resendMessage}</div>}
          
          {!codeSent ? (
            <form onSubmit={handleSubmit}>
              <div className="input-container">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
                {emailError && (
                  <div className="error-message">{emailError}</div>
                )}
              </div>
              <button
                type="submit"
                className="submit-button"
                disabled={loading || !!emailError}
              >
                {loading ? "Sending..." : "Send Reset Instructions"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit}>
              <p className="verification-instructions">
                We've sent a 6-digit verification code to <strong>{savedEmail}</strong>. 
                Please enter the code below to continue.
              </p>
              <div className="input-container">
                <label htmlFor="code">Verification Code:</label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="submit-button"
                disabled={code.length !== 6 || loading}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                className="resend-button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
