import React, { useState, useEffect } from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import "./CustomerPOV.css";
import api from "../../api/axios";
import config from "../../config";

function generateOrderId() {
  // Example: #CO + timestamp + random 3 digits
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

export default function CarloPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    orderQuantity: "",
    budget: "",
    eventDate: "",
    shippingLocation: "",
  });
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState("");

  React.useEffect(() => {
    // Fetch inventory on mount
    api
      .get("/api/inventory")
      .then((res) => setInventory(res.data))
      .catch(() => setInventory([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const orderQty = Number(form.orderQuantity);
    if (!orderQty || orderQty < 1) {
      setError("Order Quantity must be a positive number.");
      return;
    }
    // List of default product names
    const defaultProductNames = [
      "Signature box",
      "Envelope",
      "Wellsmith sprinkle",
      "Palapa seasoning",
      "Wine",
    ];
    // Find SKUs for these products in inventory
    const missingProducts = [];
    const products = defaultProductNames
      .map((name) => {
        const item = inventory.find(
          (i) => i.name.toLowerCase() === name.toLowerCase()
        );
        if (!item) {
          missingProducts.push(name);
          return null;
        }
        return {
          sku: item.sku,
          quantity: orderQty,
        };
      })
      .filter(Boolean);
    if (missingProducts.length > 0) {
      setError(
        `The following products are missing from inventory: ${missingProducts.join(
          ", "
        )}`
      );
      return;
    }
    if (products.length === 0) {
      setError("No valid products found for this order.");
      return;
    }
    try {
      const order_id = generateOrderId();
      const order = {
        order_id,
        name: form.name,
        shipped_to: form.name, // Assuming recipient is the same as name
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery: form.eventDate,
        status: "Pending",
        shipping_address: form.shippingLocation,
        total_cost: "0.00",
        payment_type: "",
        payment_method: "",
        account_name: "",
        remarks: "",
        telephone: "",
        cellphone: form.contact,
        email_address: form.email,
        products,
      };
      await api.post("/api/orders", order);
      setModalOpen(false);
      window.location.href = "/orders";
    } catch (err) {
      setError("Failed to submit order. Please try again.");
    }
  };

  useEffect(() => {
    // Load the chatbot script
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

    // Wait until script is loaded, then add chatbot element
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
    <div className="carlo-preview-container">
      <TopbarCustomer />
      <div className="carlo-preview-header">
        <h1 className="carlo-preview-title">Carlo</h1>
        <div className="carlo-preview-subtitle">
          THANK YOU GIFT BOXES FOR PRINCIPAL SPONSORS
        </div>
      </div>
      <div className="carlo-preview-main">
        {/* Main Preview Image */}
        <div className="carlo-preview-image-wrapper">
          <img
            src="/Assets/Images/Previews/carlo.png"
            alt="Carlo Preview"
            className="carlo-preview-image"
          />
        </div>
      </div>
      <button className="order-now-btn" onClick={() => setModalOpen(true)}>
        Order now
      </button>
      {modalOpen && (
        <div
          className="order-modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="order-modal order-modal-two-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="order-modal-close"
              onClick={() => setModalOpen(false)}
              aria-label="Close order form"
            >
              &times;
            </button>
            <div className="order-modal-content">
              <div className="order-modal-form-col">
                <h2>Order Form</h2>
                <form className="order-form" onSubmit={handleSubmit}>
                  {error && (
                    <div style={{ color: "red", marginBottom: 12 }}>
                      {error}
                    </div>
                  )}
                  <label>
                    Name*
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Email Address*
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Contact Number*
                    <input
                      name="contact"
                      value={form.contact}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Order Quantity*
                    <input
                      name="orderQuantity"
                      type="number"
                      min="1"
                      value={form.orderQuantity}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Approximate Budget per Gift Box
                    <input
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Date of Event*
                    <input
                      name="eventDate"
                      type="date"
                      value={form.eventDate}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <label>
                    Shipping Location*
                    <input
                      name="shippingLocation"
                      value={form.shippingLocation}
                      onChange={handleChange}
                      required
                    />
                  </label>
                  <div className="order-form-actions">
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => setModalOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
              <div className="order-modal-details-col">
                <h3 className="order-modal-details-title">What's Inside</h3>
                <ul className="order-modal-details-ul">
                  <li>
                    <b>Signature box</b>{" "}
                    <span className="order-modal-detail-note">
                      (Customizable)
                    </span>
                  </li>
                  <li>
                    <b>Envelope</b>{" "}
                    <span className="order-modal-detail-note">
                      (Customizable)
                    </span>
                  </li>
                  <li>
                    <b>Wellsmith sprinkle</b>
                  </li>
                  <li>
                    <b>Palapa seasoning</b>
                  </li>
                  <li>
                    <b>Wine</b>{" "}
                    <span className="order-modal-detail-note">
                      (Customizable)
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
