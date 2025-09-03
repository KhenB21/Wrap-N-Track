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
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [success, setSuccess] = useState(null);

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
      const res = await api.post("/api/auth/forgot-password", { email });
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
        setShowModal(true); // Show the modal after successful code sending
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

  const handleCodeSubmit = async () => {
    try {

      const res = await api.post(`/api/auth/verify-reset-code`, {

        email,
        code,
      });

      localStorage.setItem("reset_email", email);
      localStorage.setItem("reset_code", code); // Store the verified code for reset-password step
      setShowModal(false);
      navigate("/reset-password");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code.");
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
          <h3>Forgot Password</h3>
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}
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
        </div>
      </div>

      {/* Modal for verification code */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <button className="modal-close" onClick={() => {
              setShowModal(false);
              setError("");
              setMessage("");
              setCode("");
            }}>&times;</button>
            {error && <div className="error-message modal-error">{error}</div>}
            <h3>Enter Verification Code</h3>
            <p className="modal-instructions">
              Please enter the 6-digit code sent to your email address.
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code"
              maxLength={6}
              style={{letterSpacing:'0.3em',textAlign:'center'}}
            />
            <button onClick={handleCodeSubmit} style={{marginTop:'1em'}}>Verify</button>
            <button
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || loading}
              style={{marginTop:'0.5em',marginLeft:'1em'}}
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
            {resendMessage && <div className="success-message modal-success">{resendMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
