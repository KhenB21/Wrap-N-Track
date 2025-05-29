import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import config from "../../config";
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
    role: "employee",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

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


  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");

    const checkEmailExists = debounce(async (email) => {
      if (!email) return;
      try {
        setCheckingEmail(true);
        const res = await axios.get(
          `http://localhost:3001/api/auth/check-email`,
          {
            params: { email },
          }
        );

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
    }, 500); // 500ms debounce

    if (name === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
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
    if (name === "email") {
      setFormData((prev) => ({ ...prev, email: value }));
      setError("");
      checkEmailExists(value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      // Check file type
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
      formDataToSend.append("role", formData.role);
      if (profilePicture) {
        formDataToSend.append("profilePicture", profilePicture);
      }


      const response = await axios.post(
        "http://localhost:3001/api/auth/register",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },

        }
      );

      console.log('Registration response:', response.data);

      if (response.data.success) {

        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate("/");
      }
    } catch (err) {
      const message = err.response?.data?.message;

      if (message === "Email already registered") {
        setEmailError(message); // shows below the email input
      } else {
        setError(message || "Registration failed. Please try again.");
      }

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
              <optgroup label="Heads">
                <option value="business_developer">Business Developer</option>
                <option value="creatives">Creatives</option>
                <option value="director">Director</option>
                <option value="admin">Admin</option>
              </optgroup>
              <optgroup label="Sales">
                <option value="sales_manager">Sales Manager</option>
                <option value="assistant_sales">Assistant Sales</option>
              </optgroup>
              <optgroup label="Operations">
                
              </optgroup>
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
              loading || !!emailError || !!passwordError || !!passwordMatchError
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
