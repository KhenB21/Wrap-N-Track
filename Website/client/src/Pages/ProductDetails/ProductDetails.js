import React from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./ProductDetails.css";

const products = [
  {
    id: 1,
    name: "Artisan Teas",
    desc: "Oolong Tea",
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=256&q=80",
    qty: 120,
    selected: true,
  },
  {
    id: 2,
    name: "Kapeng Barako",
    desc: "Coarse",
    img: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=facearea&w=256&q=80",
    qty: 120,
    selected: false,
  },
  {
    id: 3,
    name: "Car Freshener",
    desc: "Fresh bamboo",
    img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=256&q=80",
    qty: 120,
    selected: false,
  },
];

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.profile_picture_path) return "/placeholder-profile.png";
  if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
  return `http://localhost:3001${user.profile_picture_path}`;
}

export default function ProductDetails() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        {/* Action Bar */}
        <div className="product-action-bar">
          <button className="btn-edit">Edit</button>
          <button className="btn-delete">Delete</button>
          <button className="btn-create">Create Order</button>
          <span className="selected-count">1 Selected</span>
          <button className="btn-add-product">Add product +</button>
        </div>

        {/* Filters */}
        <div className="product-filters">
          <span>Total products: 3</span>
          <select><option>Active</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="product-search" type="text" placeholder="Search" />
        </div>

        <div className="product-details-layout">
          {/* Product List */}
          <div className="product-list">
            <div className="product-list-title">PRODUCTS</div>
            {products.map((p) => (
              <div className={`product-list-item${p.selected ? " selected" : ""}`} key={p.id}>
                <input type="checkbox" checked={p.selected} readOnly />
                <img src={p.img} alt={p.name} className="product-thumb" />
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.desc}</div>
                </div>
                <div className="product-qty">Qty: {p.qty}</div>
              </div>
            ))}
          </div>

          {/* Product Details */}
          <div className="product-details-panel">
            <div className="product-details-header">
              <div>
                <div className="product-details-title">Artisan Teas</div>
                <div className="product-details-desc">Oolong Tea</div>
              </div>
              <div className="product-details-actions">
                <button className="icon-btn">✏️</button>
                <button className="icon-btn">📋</button>
                <button className="icon-btn">❌</button>
              </div>
            </div>
            <div className="product-details-content">
              <div className="product-details-info">
                <div className="details-section">
                  <div className="details-label">PRODUCT DETAILS</div>
                  <div className="details-row"><span>Stock Keeping Unit (SKU)</span> <span>#4234JKHKJSD1</span></div>
                  <div className="details-row"><span>Supplier</span> <span>Celestea</span></div>
                  <div className="details-row"><span>Category</span> <span>Beverages</span></div>
                </div>
                <div className="details-section">
                  <div className="details-label">QUANTITY DETAILS</div>
                  <div className="details-row"><span>Stock Quantity</span> <span>1293</span></div>
                  <div className="details-row"><span>Amount Per Unit</span> <span>1</span></div>
                  <div className="details-row"><span>Unit of Measure</span> <span>pc</span></div>
                </div>
                <div className="details-section">
                  <div className="details-label">PRICING DETAILS</div>
                  <div className="details-row"><span>Price per Unit</span> <span>195.00</span></div>
                </div>
                <div className="details-section">
                  <div className="details-label">OTHER DETAILS</div>
                  <div className="details-row"><span>Remarks</span> <span>-----</span></div>
                </div>
              </div>
              <div className="product-details-image">
                <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=400&q=80" alt="Artisan Teas" />
                <div className="product-image-thumbs">
                  <div className="thumb-placeholder"></div>
                  <div className="thumb-placeholder"></div>
                  <div className="thumb-placeholder"></div>
                  <div className="thumb-placeholder"></div>
                  <div className="thumb-placeholder"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 