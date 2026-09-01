import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";
import "./CustomerRegister.css";
import TopbarCustomer from "../../Components/TopbarCustomer";
import { useAuth } from "../../Context/AuthContext";

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
}

function CustomerRegister() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const checkEmailExists = debounce(async (email) => {
    if (!email) return;
    try {
      setCheckingEmail(true);
      const res = await api.get(`/api/auth/check-email`, {
        params: { email }
      });

      if (res.data.exists) {
        setEmailError("Email is already registered");
      } else {
        setEmailError("");
      }
    } catch (err) {
      console.error("Email check failed:", err);
      setEmailError("Could not check email");
    } finally {
      setCheckingEmail(false);
    }
  }, 500);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");

    if (name === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
        checkEmailExists(value);
      }
    }

    if (name === "password") {
      const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
      if (!pattern.test(value)) {
        setPasswordError(
          "Password must be at least 8 characters and include at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol."
        );
      } else {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post(`/api/auth/customer/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.success) {
        // Account is created and usable right away, even unverified — the OTP
        // check only happens later, at order time.
        localStorage.setItem("verificationEmail", formData.email);
        login(response.data.customer, response.data.token, 'customer');
        navigate("/customer-home");
      }
    } catch (err) {
      const message = err.response?.data?.message;

      if (message === "Email already registered") {
        setEmailError(message);
      } else {
        setError(message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-register-container">
      <TopbarCustomer />
      <div className="customer-register-card">
        <h2>Create Your Account</h2>
        <p className="register-subtitle">Join Pensée Gifting Studio and start curating thoughtful gifts</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {checkingEmail && <small>Checking email...</small>}
            {emailError && <div className="error-message">{emailError}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {passwordError && (
              <div className="error-message">{passwordError}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {passwordMatchError && (
              <div className="error-message">{passwordMatchError}</div>
            )}
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <div className="login-link">
          Already have an account? <Link to="/customer-login">Log in here</Link>
        </div>
      </div>
    </div>
  );
}

export default CustomerRegister;
