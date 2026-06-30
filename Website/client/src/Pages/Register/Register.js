import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../api';
import "./Register.css";

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
}


function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "operations_manager", // Default to a valid backend role
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");

  const navigate = useNavigate();


  useEffect(() => {
    if (
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  }, [formData.password, formData.confirmPassword]);


  const checkEmailExists = debounce(async (email) => {
    if (!email) return;
    try {
      setCheckingEmail(true);
      setEmailError("");

  const res = await api.get('/api/auth/check-email', {
        params: { email },
      });

      if (res.data.exists) {
        setEmailError("Email is already registered");
      }
    } catch (err) {
      console.error("Email check failed:", err);
      setEmailError("Could not check email availability");
    } finally {
      setCheckingEmail(false);
    }
  }, 500);

  // Name uniqueness check removed - multiple users can have the same name


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

    if (name === "name") {
      if (value.trim().length < 2) {
        setNameError("Name must be at least 2 characters long");
      } else {
        setNameError("");
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      if (!file.type.match(/^image\/(jpg|jpeg|png|gif)$/)) {
        setError("Only image files (jpg, jpeg, png, gif) are allowed");
        return;
      }

      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError("");
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
    try {
  console.log('Attempting registration (unified api instance)');
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("role", formData.role);
      if (profilePicture) {
        formDataToSend.append("profilePicture", profilePicture);
      }

      const response = await api.post(
        `/api/auth/register`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Registration response:", response.data);

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/verify");
      }
    } catch (err) {
      const message = err.response?.data?.message;

      if (message === "Email already registered") {
        setEmailError(message); // shows below the email input
      } else if (message === "Name already taken") {
        setNameError(message);
      } else if (message === "Invalid role selected") {
        setError("Invalid role selected. Please choose a valid role.");
      } else {
        setError(message || "Registration failed. Please try again.");
      }
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="header-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 16.08C6.03 14.29 10 12.9 12 12.9C13.99 12.9 17.97 14.29 18 16.08C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="register-title">Create Your Account</h1>
          <p className="register-subtitle">Join us and start your journey today</p>
        </div>

        {error && <div className="error-message global-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="section-title">Personal Information</h2>
            </div>
            
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className={nameError ? 'error' : ''}
              />
              {nameError && <div className="error-message">{nameError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
                className={emailError ? 'error' : ''}
              />
              {checkingEmail && <small className="checking-text">Checking email availability...</small>}
              {emailError && <div className="error-message">{emailError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="role">Account Type</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="customer">Customer</option>
                <option value="sales_representative">Sales Representative</option>
                <option value="marketing_specialist">Marketing Specialist</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15 8H9V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8Z" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="section-title">Security</h2>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                className={passwordError ? 'error' : ''}
              />
              {passwordError && <div className="error-message">{passwordError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter your password"
                className={passwordMatchError ? 'error' : ''}
              />
              {passwordMatchError && <div className="error-message">{passwordMatchError}</div>}
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <div className="section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="section-title">Profile Picture</h2>
            </div>
            
            <div className="form-group">
              <label htmlFor="profilePicture">Upload Photo</label>
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="profilePicture"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="file-input"
                />
                <label htmlFor="profilePicture" className="file-upload-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor"/>
                  </svg>
                  <span>Choose File</span>
                </label>
                <span className="file-name">No file chosen</span>
              </div>
              {previewUrl && (
                <div className="image-preview">
                  <img src={previewUrl} alt="Preview" />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !!emailError ||
              !!nameError ||
              !!passwordError ||
              !!passwordMatchError
            }
            className="register-button"
          >
            {loading ? (
              <span className="button-content">
                <span className="spinner"></span>
                Creating Account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <span onClick={() => navigate("/login")}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

export default Register;