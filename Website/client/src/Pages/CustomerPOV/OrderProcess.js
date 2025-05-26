import React, { useState, useEffect } from "react";
import "./OrderProcess.css";

const styles = {
  container: {
    minHeight: "100vh",
    background: "#fff",
    padding: "40px 24px",
  },
  header: {
    maxWidth: "1200px",
    margin: "0 auto",
    marginBottom: "40px",
    textAlign: "center",
  },
  title: {
    fontSize: "36px",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "16px",
  },
  subtitle: {
    fontSize: "18px",
    color: "#6c757d",
    maxWidth: "600px",
    margin: "0 auto",
  },
  steps: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "40px",
  },
  step: {
    flex: 1,
    textAlign: "center",
    padding: "20px",
    position: "relative",
  },
  stepNumber: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#4a90e2",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: "20px",
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "8px",
  },
  stepDescription: {
    fontSize: "14px",
    color: "#6c757d",
  },
  form: {
    maxWidth: "800px",
    margin: "0 auto",
    background: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  formGroup: {
    marginBottom: "24px",
  },
  label: {
    display: "block",
    fontSize: "16px",
    fontWeight: "500",
    color: "#2c3e50",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    "&:focus": {
      outline: "none",
      borderColor: "#4a90e2",
    },
  },
  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    background: "#fff",
    "&:focus": {
      outline: "none",
      borderColor: "#4a90e2",
    },
  },
  button: {
    padding: "12px 32px",
    background: "#4a90e2",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.3s ease",
    "&:hover": {
      background: "#357abd",
    },
  },
};

export default function OrderProcess() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    weddingDate: "",
    guestCount: "",
    style: "",
    budget: "",
    specialRequests: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  useEffect(() => {
    const scriptId = "zapier-chatbot-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src =
        "https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js";
      script.type = "module";
      script.async = true;
      document.body.appendChild(script);
    }

    const chatbotId = "cmb4k6r9900ek14o7r1yropa0";
    const existingBot = document.querySelector(
      "zapier-interfaces-chatbot-embed"
    );

    if (!existingBot) {
      const bot = document.createElement("zapier-interfaces-chatbot-embed");
      bot.setAttribute("is-popup", "true");
      bot.setAttribute("chatbot-id", chatbotId);
      document.body.appendChild(bot);
    }
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Create Your Perfect Gift Box</h1>
        <p style={styles.subtitle}>
          Follow these simple steps to create your custom wedding gift boxes
        </p>
      </div>

      {/* Steps */}
      <div style={styles.steps}>
        <div style={styles.step}>
          <div style={styles.stepNumber}>1</div>
          <h3 style={styles.stepTitle}>Choose Your Style</h3>
          <p style={styles.stepDescription}>
            Select from our curated wedding styles
          </p>
        </div>
        <div style={styles.step}>
          <div style={styles.stepNumber}>2</div>
          <h3 style={styles.stepTitle}>Customize</h3>
          <p style={styles.stepDescription}>Add your personal touch</p>
        </div>
        <div style={styles.step}>
          <div style={styles.stepNumber}>3</div>
          <h3 style={styles.stepTitle}>Review & Order</h3>
          <p style={styles.stepDescription}>Finalize your gift boxes</p>
        </div>
      </div>

      {/* Form */}
      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Your Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Phone Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Wedding Date</label>
          <input
            type="date"
            name="weddingDate"
            value={formData.weddingDate}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Number of Gift Boxes</label>
          <input
            type="number"
            name="guestCount"
            value={formData.guestCount}
            onChange={handleInputChange}
            style={styles.input}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Preferred Style</label>
          <select
            name="style"
            value={formData.style}
            onChange={handleInputChange}
            style={styles.select}
            required
          >
            <option value="">Select a style</option>
            <option value="modern-romantic">Modern Romantic</option>
            <option value="boho-chic">Boho Chic</option>
            <option value="classic-elegance">Classic Elegance</option>
            <option value="minimalist-modern">Minimalist Modern</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Budget Range</label>
          <select
            name="budget"
            value={formData.budget}
            onChange={handleInputChange}
            style={styles.select}
            required
          >
            <option value="">Select budget range</option>
            <option value="budget">Budget Friendly</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Special Requests</label>
          <textarea
            name="specialRequests"
            value={formData.specialRequests}
            onChange={handleInputChange}
            style={{ ...styles.input, height: "120px" }}
            placeholder="Any specific requirements or preferences?"
          />
        </div>

        <button type="submit" style={styles.button}>
          Submit Order
        </button>
      </form>
    </div>
  );
}
