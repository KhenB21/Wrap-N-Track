import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";

function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });
  const navigate = useNavigate();
  const email = localStorage.getItem("reset_email");

  useEffect(() => {
    // Redirect if no email is stored
    if (!email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    setPasswordRequirements(requirements);
    return Object.values(requirements).every(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!newPassword || !confirmPassword) {
      return setError("Please fill in all fields.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!validatePassword(newPassword)) {
      return setError("Password does not meet requirements.");
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:3001/api/auth/reset-password", {
        email,
        password: newPassword,
      });

      setMessage("Password reset successful! Redirecting...");
      localStorage.removeItem("reset_email");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    validatePassword(password);
  };

  return (
    <div className="reset-container">
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
          <h3>Reset Password</h3>
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="input-container">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                required
              />
              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li className={passwordRequirements.length ? "valid" : "invalid"}>
                    At least 8 characters
                  </li>
                  <li className={passwordRequirements.uppercase ? "valid" : "invalid"}>
                    At least 1 uppercase letter
                  </li>
                  <li className={passwordRequirements.lowercase ? "valid" : "invalid"}>
                    At least 1 lowercase letter
                  </li>
                  <li className={passwordRequirements.number ? "valid" : "invalid"}>
                    At least 1 number
                  </li>
                  <li className={passwordRequirements.symbol ? "valid" : "invalid"}>
                    At least 1 symbol
                  </li>
                </ul>
              </div>
            </div>
            <div className="input-container">
              <label>Confirm New Password:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;