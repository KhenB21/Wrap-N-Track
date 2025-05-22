import React, { useState } from 'react';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerPOV.css';
import axios from 'axios';

function generateOrderId() {
  // Example: #CO + timestamp + random 3 digits
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

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
    }).filter(product => product.sku !== null); // Only include products with valid SKUs

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
          <div className="order-modal order-modal-two-col" onClick={e => e.stopPropagation()}>
            <button className="order-modal-close" onClick={() => setModalOpen(false)} aria-label="Close order form">&times;</button>
            <div className="order-modal-content">
              <div className="order-modal-form-col">
                <h2>Order Form</h2>
                <form className="order-form" onSubmit={handleSubmit}>
                  {error && <div style={{color:'red',marginBottom:12}}>{error}</div>}
                  <label>Name*
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </label>
                  <label>Email Address*
                    <input name="email" type="email" value={form.email} onChange={handleChange} required />
                  </label>
                  <label>Contact Number*
                    <input name="contact" value={form.contact} onChange={handleChange} required />
                  </label>
                  <label>Order Quantity*
                    <input name="orderQuantity" type="number" min="1" value={form.orderQuantity} onChange={handleChange} required />
                  </label>
                  <label>Approximate Budget per Gift Box
                    <input name="approximateBudget" type="number" step="0.01" min="0" value={form.approximateBudget} onChange={handleChange} />
                  </label>
                  <label>Date of Event*
                    <input name="eventDate" type="date" value={form.eventDate} onChange={handleChange} required />
                  </label>
                  <label>Shipping Location*
                    <input name="shippingLocation" value={form.shippingLocation} onChange={handleChange} required />
                  </label>
                  <label>Package Name*
                    <input name="packageName" value={form.packageName} required readOnly/>
                  </label>
                  <div className="order-form-actions">
                    <button type="submit" onClick={() => console.log("Submit button clicked")}>Submit</button>
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