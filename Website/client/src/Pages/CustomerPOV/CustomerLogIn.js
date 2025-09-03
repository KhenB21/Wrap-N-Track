import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../api';
import "./CustomerLogIn.css";
import TopbarCustomer from "../../Components/TopbarCustomer";

function CustomerLogIn() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(
    Number(localStorage.getItem("customerFailedAttempts")) || 0
  );
  const [lockoutTime, setLockoutTime] = useState(
    Number(localStorage.getItem("customerLockoutTime")) || null
  );
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  const [resending, setResending] = useState(false);

  const navigate = useNavigate();

  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    if (failedAttempts >= MAX_ATTEMPTS) {
      const lockTime = Date.now() + 60000; // 1 minute
      setLockoutTime(lockTime);
      setIsLockedOut(true);
      localStorage.setItem("customerLockoutTime", lockTime);
      localStorage.setItem("customerFailedAttempts", failedAttempts);
    }
  }, [failedAttempts]);

  useEffect(() => {
    if (lockoutTime) {
      const interval = setInterval(() => {
        const timeLeft = Math.max(
          0,
          Math.ceil((lockoutTime - Date.now()) / 1000)
        );
        setLockoutCountdown(timeLeft);

        if (timeLeft <= 0) {
          setIsLockedOut(false);
          setFailedAttempts(0);
          setLockoutTime(null);
          localStorage.removeItem("customerLockoutTime");
          localStorage.setItem("customerFailedAttempts", "0");
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutTime]);

  useEffect(() => {
    // If already logged in, redirect to customer details
    const token = localStorage.getItem('customerToken');
    const customer = localStorage.getItem('customer');
    if (token && customer) {
      navigate('/customer-user-details');
    }
  }, [navigate]);

  // Log the resolved base API URL (for debugging only)
  console.log('Login component using API instance base URL');

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
    setError(null);

    // If already logged in, redirect to customer details
    const token = localStorage.getItem('customerToken');
    const customer = localStorage.getItem('customer');
    if (token && customer) {
      navigate('/customer-user-details');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/auth/customer/login', {
        username: formData.username,
        password: formData.password
      });

      if (response.data.success) {
        localStorage.setItem('customerToken', response.data.token);
        localStorage.setItem('customer', JSON.stringify(response.data.customer));
        // Remove old keys if present
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/customer-home');
      } else {
        setError(response.data.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResending(true);
      // First get the user's email using their username
      const username = localStorage.getItem("pendingVerificationUsername");
      const userResponse = await api.get(`/api/auth/customer/get-email/${username}`);
      
      if (!userResponse.data.email) {
        throw new Error("Could not find user's email");
      }

      // Now send the verification code
      const response = await api.post('/api/auth/customer/resend-code', {
        email: userResponse.data.email
      });

      if (response.data.success) {
        setError("New verification code sent successfully. Please check your email.");
        // Store email for verification page
        localStorage.setItem("verificationEmail", userResponse.data.email);
        // Clear the temporary username
        localStorage.removeItem("pendingVerificationUsername");
        // Redirect to verification page
        navigate("/customer/verify");
      }
    } catch (error) {
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const renderAlert = () => {
    if (isLockedOut) {
      return (
        <div className="alert-message lockout">
          Too many failed attempts. Please wait {lockoutCountdown} second
          {lockoutCountdown !== 1 ? "s" : ""} before trying again.
        </div>
      );
    } else if (failedAttempts > 0) {
      const remaining = MAX_ATTEMPTS - failedAttempts;
      return (
        <div className="alert-message warning">
          {remaining} login attempt{remaining !== 1 ? "s" : ""} remaining.
        </div>
      );
    }
    return null;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="customer-login-container">
      <TopbarCustomer />
      {showSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h2>Login Successful!</h2>
            <p>Redirecting to profile...</p>
          </div>
        </div>
      )}

      <div className="background-image" />

      <div className="customer-login-content-wrapper">
        <div className="content-wrapper">
          <div className="left-section">
            {/* <div className="topbar-customer-logo-block">
              <img
                src="/Assets/Images/PenseeLogos/pensee-logo-with-name-vertical.png"
                alt="Pensee Logo Vertical"
                className="topbar-customer-logo"
              />
            </div> */}
            <img
              src="/Assets/Images/PenseeLogos/pensee-name-only.png"
              alt="Logo"
              className="brand-logo"
            />
          </div>

          <div className="right-section">
            <h3>Customer Login</h3>
            {error && <div className="error-message">{error}</div>}
            {renderAlert()}
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
                  disabled={loading || isLockedOut}
                />
              </div>
              <div className="input-container password-container">
                <label htmlFor="password">Password:</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    disabled={loading || isLockedOut}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    disabled={loading || isLockedOut}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        className="eye-icon"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                      >
                        <path
                          fill="currentColor"
                          d="M12 9a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0 9.821 9.821 0 0 0-17.64 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="eye-icon"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                      >
                        <path
                          fill="currentColor"
                          d="M11.83 9L15 12.16V12a3 3 0 0 0-3-3h-.17m-4.3.8l1.55 1.55c-.05.21-.08.42-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2M2 4.27l2.28 2.28.45.45C3.08 8.3 1.78 10 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.43.42L19.73 22 21 20.73 3.27 3M12 7a5 5 0 0 1 5 5c0 .64-.13 1.26-.36 1.82l2.93 2.93c1.5-1.25 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-4 .7l2.17 2.15C10.74 7.13 11.35 7 12 7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={loading || isLockedOut}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              <div className="forgot-password">
                <a href="/customer/forgot-password">Forgot password?</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerLogIn;
