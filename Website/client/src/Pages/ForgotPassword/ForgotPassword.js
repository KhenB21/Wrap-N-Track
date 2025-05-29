import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ needed for navigate
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");

  const navigate = useNavigate();

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
    setMessage("");
    setError("");

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("http://localhost:3001/api/auth/forgot-password", { email });
      setMessage(res.data.message);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:3001/api/auth/verify-reset-code", {
        email,
        code,
      });

      localStorage.setItem("reset_email", email);
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

      {/* ✅ Modal for verification code */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            {error && <div className="error-message">{error}</div>}
            <h3>Enter Verification Code</h3>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code sent to your email"
            />
            <button onClick={handleCodeSubmit}>Verify</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
