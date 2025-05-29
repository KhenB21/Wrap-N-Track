import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TopbarCustomer from '../../Components/TopbarCustomer/TopbarCustomer';
import './CarloPreview.css';

// List of default product names
export const defaultProductNames = [
  'Signature box',
  'Envelope',
  'Wellsmith sprinkle',
  'Palapa seasoning',
  'Wine'
];

export default function CarloPreview() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact: '',
    orderQuantity: '',
    approximateBudget: '',
    eventDate: '',
    shippingLocation: '',
    packageName: 'Carlo'
  });
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState("");

  React.useEffect(() => {
    // Fetch inventory on mount
    axios.get('http://localhost:3001/api/inventory').then(res => setInventory(res.data)).catch(() => setInventory([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateOrderId = () => {
    return `ORD${Date.now()}`;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit button clicked");
    setError("");

    // Log form data
    console.log("Form data:", form);

    // Validate order quantity
    const orderQty = Number(form.orderQuantity);
    console.log("Order Quantity:", orderQty);
    if (!orderQty || orderQty < 1) {
        setError("Order Quantity must be a positive number.");
        return;
    }

    // Validate approximate budget
    const approximateBudget = form.approximateBudget ? Number(form.approximateBudget) : 0;
    console.log("Approximate Budget:", approximateBudget);
    if (approximateBudget < 0) {
        setError("Approximate Budget cannot be negative.");
        return;
    }

    // Create products array with sku and quantity
    const products = defaultProductNames.map(name => {
        // Find matching inventory item to get SKU
        const inventoryItem = inventory.find(item => item.name.toLowerCase() === name.toLowerCase());
        return {
            sku: inventoryItem?.sku || null,
            quantity: orderQty
        };
    }).filter(product => product.sku !== null);

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
        carlo_products: defaultProductNames,
        order_quantity: orderQty,
        approximate_budget: approximateBudget.toFixed(2),
        products: products
    };

    console.log("Submitting order:", JSON.stringify(order, null, 2));

    try {
        console.log("Making API request...");
        const response = await axios.post("http://localhost:3001/api/orders", order);
        console.log("Order submission response:", response.data);
        setModalOpen(false);
        window.location.href = "/orders";
    } catch (err) {
        console.error("Order submission error:", err.response?.data || err.message);
        setError(err.response?.data?.message || "Failed to submit order. Please try again.");
    }
  };

  return (
    <div className="carlo-preview-container">
      <TopbarCustomer />
      <div className="carlo-preview-header">
        <h1 className="carlo-preview-title">Carlo</h1>
        <div className="carlo-preview-subtitle">THANK YOU GIFT BOXES FOR PRINCIPAL SPONSORS</div>
      </div>
      <div className="carlo-preview-main">
        {/* Main Preview Image */}
        <div className="carlo-preview-image-wrapper">
          <img src="/Assets/Images/Previews/carlo.png" alt="Carlo Preview" className="carlo-preview-image" />
        </div>
      </div>
      <button className="order-now-btn" onClick={() => setModalOpen(true)}>
        Order now
      </button>
      {modalOpen && (
        <div className="order-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="order-modal" onClick={e => e.stopPropagation()}>
            <div className="order-modal-content">
              <div className="order-modal-form-col">
                <h2 className="order-modal-title">Place Your Order</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact">Contact Number</label>
                    <input
                      type="tel"
                      id="contact"
                      name="contact"
                      value={form.contact}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="orderQuantity">Order Quantity</label>
                    <input
                      type="number"
                      id="orderQuantity"
                      name="orderQuantity"
                      value={form.orderQuantity}
                      onChange={handleChange}
                      min="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="approximateBudget">Approximate Budget</label>
                    <input
                      type="number"
                      id="approximateBudget"
                      name="approximateBudget"
                      value={form.approximateBudget}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="eventDate">Event Date</label>
                    <input
                      type="date"
                      id="eventDate"
                      name="eventDate"
                      value={form.eventDate}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shippingLocation">Shipping Location</label>
                    <input
                      type="text"
                      id="shippingLocation"
                      name="shippingLocation"
                      value={form.shippingLocation}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="order-form-actions">
                    <button type="submit">Submit</button>
                    <button type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                  </div>
                </form>
              </div>
              <div className="order-modal-details-col">
                <h3 className="order-modal-details-title">What's Inside</h3>
                <ul className="order-modal-details-ul">
                  <li><b>Signature box</b> <span className="order-modal-detail-note">(Customizable)</span></li>
                  <li><b>Envelope</b> <span className="order-modal-detail-note">(Customizable)</span></li>
                  <li><b>Wellsmith sprinkle</b></li>
                  <li><b>Palapa seasoning</b></li>
                  <li><b>Wine</b> <span className="order-modal-detail-note">(Customizable)</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}