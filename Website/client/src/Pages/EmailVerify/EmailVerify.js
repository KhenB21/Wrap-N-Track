/* eslint-disable no-undef */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./EmailVerify.css";
import api from "../../api";

function EmailVerify() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.email) {
      setEmail(storedUser.email);
    } else {
      // If no user info, redirect to login/register
      navigate("/login-employee-pensee");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      // Pass email & code

      const res = await api.post(`/api/auth/verify`, { email, code });

      setMessage(res.data.message || "Email successfully verified.");
      setTimeout(() => navigate("/login-employee-pensee"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);

    const token = localStorage.getItem("token");

    try {
      const res = await api.post(
        `/api/auth/resend-code`,

        { email }, // send email in body
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setMessage(res.data.message || "Verification code resent.");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expired. Please register or login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setTimeout(() => {
          navigate("/register");
        }, 2000);
      } else {
        setError(err.response?.data?.message || "Could not resend code.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="email-verifier-container">
      <div className="verifier-card">
        <div className="left-section">
          <h1>Wrap N' Track</h1>
          <p className="subtitle">Pensée</p>
          <p className="gifting">Gifting Studio</p>
        </div>

        <div className="right-section">
          <h3>Email Verification</h3>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-container">
              <label htmlFor="code">Verification Code:</label>
              <input
                type="text"
                id="code"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the code sent to your email"
                required
              />
            </div>
            <button type="submit" className="verify-button" disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <button
            onClick={handleResend}
            className="resend-button"
            disabled={resending}
          >
            {resending ? "Resending..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailVerify;
