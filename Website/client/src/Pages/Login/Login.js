import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../api/axios';
import config from '../../config';
import "./Login.css";

function LoginPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  // Log the API URL being used
  console.log('Login component using API URL:', config.API_URL);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('Attempting login with API URL:', config.API_URL);
      const response = await api.post('/api/auth/login', {
        username: formData.username,
        password: formData.password
      });

      console.log('Login response:', response.data);

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setShowSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(err.response.data.message || "Login failed. Please try again.");
      } else if (err.request) {
        console.error('No response received:', err.request);
        setError("No response from server. Please check your connection.");
      } else {
        console.error('Error setting up request:', err.message);
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h2>Login Successful!</h2>
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      )}

      {/* Background Image */}
      <div className="background-image" />

      {/* Content Container */}
      <div className="content-wrapper">
        {/* Left Section - Branding */}
        <div className="left-section">
          <h1>Wrap N' Track</h1>
          <img
            src="/Assets/Images/PenseeLogos/pensee-name-only.png"
            alt="Logo"
            className="brand-logo"
          />
        </div>

        {/* Right Section - Login Form */}
        <div className="right-section">
          <h3>Login</h3>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="input-container">
              <label htmlFor="username">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>
            <div className="input-container">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="forgot-password">
              <a href="/register">Forgot password?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
