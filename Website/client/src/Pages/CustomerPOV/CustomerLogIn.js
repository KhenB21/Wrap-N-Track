import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../api';
import "./CustomerLogIn.css";
import TopbarCustomer from "../../Components/TopbarCustomer";
import { useAuth } from "../../Context/AuthContext";

function CustomerLogIn() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Only redirect customers if already authenticated
  // Employees who come to customer login page want to stay on customer site
  useEffect(() => {
    if (isAuthenticated && user && user.source === 'customer') {
      navigate('/about');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First, try customer login
      let response;
      let loginSuccess = false;
      let userType = '';

      console.log('🔐 Attempting customer login...');
      try {
        response = await api.post('/api/auth/customer/login', {
          username: formData.username,
          password: formData.password
        });

        if (response.data.success) {
          login(response.data.customer, response.data.token, 'customer');
          userType = 'customer';
          loginSuccess = true;
          console.log('✅ Customer login successful');
        }
      } catch (customerError) {
        console.log('❌ Customer login failed, trying employee login...');
        
        // If customer login fails, try employee login
        try {
          response = await api.post('/api/auth/login', {
            username: formData.username,
            password: formData.password
          });

          if (response.data.success) {
            login(response.data.user, response.data.token, 'employee');
            userType = 'employee';
            loginSuccess = true;
            console.log('✅ Employee login successful');
          }
        } catch (employeeError) {
          console.log('❌ Both login attempts failed');
          // Both failed, show error
          throw new Error('Invalid username or password');
        }
      }

      if (loginSuccess) {
        if (userType === 'employee') {
          setSuccessMessage('Welcome! You are logged in as an employee. Redirecting to customer website...');
          setTimeout(() => {
            navigate('/about');
          }, 2000);
        } else {
          setSuccessMessage('Welcome! Redirecting...');
          setTimeout(() => {
            navigate('/about');
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccessMessage("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="customer-login-container">
      <TopbarCustomer />
      <div className="background-image" />
      <div className="customer-login-content-wrapper">
        <div className="content-wrapper">
          <div className="left-section">
            <img
              src="/Assets/Images/PenseeLogos/pensee-name-only.png"
              alt="Logo"
              className="brand-logo"
            />
          </div>
          <div className="right-section">
            <h3>Login</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Sign in with your customer or employee account
            </p>
            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div style={{
                backgroundColor: '#d4edda',
                color: '#155724',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #c3e6cb'
              }}>
                {successMessage}
              </div>
            )}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    disabled={loading}
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
                disabled={loading}
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