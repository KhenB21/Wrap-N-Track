import React, { useState } from "react";
import TopbarCustomer from "../../Components/TopbarCustomer";
import "./CustomerPOV.css";
import axios from "axios";

function generateOrderId() {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

export const defaultProductNames = [
  "Signature box",
  "Envelope",
  "Wellsmith sprinkle",
  "Palapa seasoning",
  "Wine",
];

export default function DanielPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    orderQuantity: "",
    approximateBudget: "",
    eventDate: "",
    shippingLocation: "",
    packageName: "Eric & Mariel",
  });
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState("");

  React.useEffect(() => {
    axios
      .get(`${config.API_URL}/api/inventory`)
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
    const approximateBudget = form.approximateBudget
      ? Number(form.approximateBudget)
      : 0;
    if (approximateBudget < 0) {
      setError("Approximate Budget cannot be negative.");
      return;
    }
    const products = defaultProductNames
      .map((name) => {
        const inventoryItem = inventory.find(
          (item) => item.name.toLowerCase() === name.toLowerCase()
        );
        return {
          sku: inventoryItem?.sku || null,
          quantity: orderQty,
        };
      })
      .filter((product) => product.sku !== null);
    const order = {
      order_id: generateOrderId(),
      name: form.name,
      shipped_to: form.name,
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
      package_name: form.packageName,
      daniel_products: defaultProductNames,
      order_quantity: orderQty,
      approximate_budget: approximateBudget.toFixed(2),
      products: products,
    };
    try {
      await axios.post(`${config.API_URL}/api/orders`, order);
      setModalOpen(false);
      window.location.href = "/orders";
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit order. Please try again."
      );
    }
  };

  return (
    <div className="carlo-preview-container">
      <TopbarCustomer />
      <div className="carlo-preview-header">
        <h1 className="carlo-preview-title">Eric & Mariel</h1>
        <div className="carlo-preview-subtitle">
          THANK YOU GIFT BOXES FOR PRINCIPAL SPONSORS
        </div>
      </div>
      <div className="carlo-preview-main">
        <div className="carlo-preview-image-wrapper">
          <img
            src="/Assets/Images/Previews/carlo.png"
            alt="EricMariel Preview"
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
                      name="approximateBudget"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.approximateBudget}
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
                  <label>
                    Package Name*
                    <input
                      name="packageName"
                      value={form.packageName}
                      required
                      readOnly
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
