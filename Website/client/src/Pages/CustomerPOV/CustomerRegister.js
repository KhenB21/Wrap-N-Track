import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import config from "../../config";
import "./CustomerRegister.css";
import TopbarCustomer from "../../Components/TopbarCustomer";

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
    username: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
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
  const [usernameError, setUsernameError] = useState("");
  const [checkingName, setCheckingName] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  }, [formData.password, formData.confirmPassword]);

  const checkEmailExists = debounce(async (email) => {
    if (!email) return;
    try {
      setCheckingEmail(true);
      const res = await axios.get(`${config.API_URL}/api/auth/check-email`, {
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

  const checkNameExists = debounce(async (name) => {
    if (!name.trim()) return;
    try {
      setCheckingName(true);
      const res = await axios.get(`${config.API_URL}/api/auth/check-name`, {
        params: { name: name.trim() }
      });

      if (res.data.exists) {
        setNameError("Name is already taken");
      } else {
        setNameError("");
      }
    } catch (err) {
      console.error("Name check failed:", err);
      setNameError("Could not check name");
    } finally {
      setCheckingName(false);
    }
  }, 500);

  const checkUsernameExists = debounce(async (username) => {
    if (!username.trim()) return;
    try {
      setCheckingUsername(true);
      const res = await axios.get(`${config.API_URL}/api/auth/check-username`, {
        params: { username: username.trim() }
      });

      if (res.data.exists) {
        setUsernameError("Username is already taken");
      } else {
        setUsernameError("");
      }
    } catch (err) {
      console.error("Username check failed:", err);
      setUsernameError("Could not check username");
    } finally {
      setCheckingUsername(false);
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

    if (name === "name") {
      checkNameExists(value);
    }

    if (name === "username") {
      const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernamePattern.test(value)) {
        setUsernameError("Username must be 3-20 characters and can only contain letters, numbers, and underscores");
      } else {
        setUsernameError("");
        checkUsernameExists(value);
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
      console.log('Attempting registration with API URL:', config.API_URL);
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("username", formData.username);
      if (profilePicture) {
        formDataToSend.append("profilePicture", profilePicture);
      }

      const response = await axios.post(
        `${config.API_URL}/api/auth/customer/register`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Registration response:", response.data);

      if (response.data.success) {
        localStorage.setItem("verificationEmail", formData.email);
        navigate("/customer/verify");
      }
    } catch (err) {
      const message = err.response?.data?.message;

      if (message === "Email already registered") {
        setEmailError(message);
      } else if (message === "Username already taken") {
        setUsernameError(message);
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
        <h2>Customer Registration</h2>
        {error && <div className="error-message">{error}</div>}
        {verificationSent && (
          <div className="success-message">
            Registration successful! Please check your email for verification.
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            {checkingUsername && <small>Checking username...</small>}
            {usernameError && <div className="error-message">{usernameError}</div>}
          </div>

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
            {checkingName && <small>Checking name...</small>}
            {nameError && <div className="error-message">{nameError}</div>}
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

          <div className="form-group">
            <label htmlFor="profilePicture">Profile Picture:</label>
            <input
              type="file"
              id="profilePicture"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className="preview-container">
                <img src={previewUrl} alt="Preview" className="preview-image" />
              </div>
            )}
          </div>

          <div className="tos-notifier">
            <p>By creating an account, you agree to our <a href="/terms-of-service">Terms of Service and Privacy Policy</a></p>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CustomerRegister;
