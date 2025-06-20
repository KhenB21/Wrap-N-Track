import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '../../api/axios';
import config from '../../config';
// (keep axios import only if needed for FormData compatibility, otherwise use api) "axios";
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
  const [checkingName, setCheckingName] = useState(false);

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

      const res = await api.get('http://localhost:3001/api/auth/check-email', {
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

  const checkNameExists = debounce(async (name) => {
    if (!name.trim()) return;
    try {
      setCheckingName(true);
      setNameError("");

      const res = await api.get('http://localhost:3001/api/auth/check-name', {
        params: { name: name.trim() },
      });

      if (res.data.exists) {
        setNameError("Name is already taken (case-sensitive)");
      }
    } catch (err) {
      console.error("Name check failed:", err);
      setNameError("Could not check name availability");
    } finally {
      setCheckingName(false);
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
      if (value.trim().length < 2) {
        setNameError("Name must be at least 2 characters long");
      } else {
        setNameError("");
        checkNameExists(value);
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
      console.log('Attempting registration with API URL:', config.API_URL);
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("role", formData.role);
      if (profilePicture) {
        formDataToSend.append("profilePicture", profilePicture);
      }

      const response = await api.post(
        `${config.API_URL}/api/auth/register`,
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
        <h2>Register</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name:</label>
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
            <label htmlFor="role">Role:</label>
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

          <div className="form-group">
            <label htmlFor="profilePicture">Profile Picture:</label>
            <input
              type="file"
              id="profilePicture"
              accept="image/*"
              onChange={handleFileChange}
              required
            />
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Preview" />
              </div>
            )}
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
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
