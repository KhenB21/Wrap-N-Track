import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login submitted:", formData);
    // navigate('/dashboard');
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: "url(/Assets/Images/PenseeLogos/pensee-logo-only.png)",
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        height: "100vh",
      }}
    >
      <div class="left">
        <h1>Wrap N' Track</h1>
        <img
          src="/Assets/Images/PenseeLogos/pensee-name-only.png"
          alt="Logo"
          style={{
            filter: "brightness(0) invert(1)",
            width: "80%",
          }}
        />
      </div>

      <div className="right">
        <h3> Login </h3>
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
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
              placeholder="Email"
              required
            />
          </div>
          <button type="submit">Login</button>
          <div className="forgotPassword-link">
            <p>
              <a href="/register">Forgot password</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
