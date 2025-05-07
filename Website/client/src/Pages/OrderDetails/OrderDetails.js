import React from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./OrderDetails.css";

const orders = [
  {
    id: 1,
    name: "Terence Auyong",
    code: "#CO000002",
    price: "₱125.00",
    status: "Invoiced",
    statusClass: "status-invoiced",
    selected: true,
  },
  {
    id: 2,
    name: "Khen Bolima",
    code: "#CO000002",
    price: "₱125.00",
    status: "Packed",
    statusClass: "status-packed",
    selected: false,
  },
  {
    id: 3,
    name: "Reinan Briones",
    code: "#CO000002",
    price: "₱315.00",
    status: "Shipped",
    statusClass: "status-shipped",
    selected: false,
  },
  {
    id: 4,
    name: "Grant Nathan",
    code: "#CO000002",
    price: "₱315.00",
    status: "Complete",
    statusClass: "status-complete",
    selected: false,
  },
];

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.profile_picture_path) return "/placeholder-profile.png";
  if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
  return `http://localhost:3001${user.profile_picture_path}`;
}

export default function OrderDetails() {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        {/* Action Bar */}
        <div className="order-action-bar">
          <button className="btn-edit">Edit</button>
          <button className="btn-delete">Delete</button>
          <button className="btn-create">Create Order</button>
          <span className="selected-count">1 Selected</span>
        </div>

        {/* Filters */}
        <div className="order-filters">
          <span>Total Orders: 3</span>
          <select><option>All</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="order-search" type="text" placeholder="Search" />
        </div>

        <div className="order-details-layout">
          {/* Order List */}
          <div className="order-list">
            <div className="order-list-title">ORDERS</div>
            {orders.map((o) => (
              <div className={`order-list-item${o.selected ? " selected" : ""}`} key={o.id}>
                <input type="checkbox" checked={o.selected} readOnly />
                <div className="order-info">
                  <div className="order-name">{o.name}</div>
                  <div className="order-code">{o.code}</div>
                </div>
                <div className="order-price">{o.price}</div>
                <div className={`order-status ${o.statusClass}`}>{o.status}</div>
              </div>
            ))}
          </div>

          {/* Order Details */}
          <div className="order-details-panel">
            <div className="order-details-header">
              <div>
                <div className="order-details-title">John Terence Auyong</div>
                <div className="order-details-code">#CO000001</div>
              </div>
              <div className="order-details-actions">
                <button className="icon-btn">✏️</button>
                <button className="icon-btn">🗑️</button>
                <button className="icon-btn">❌</button>
              </div>
            </div>
            <button className="order-status-badge status-invoiced">Invoiced</button>
            <div className="order-details-content">
              <div className="details-section">
                <div className="details-label">CONTACT DETAILS</div>
                <div className="details-row"><span>Telephone</span> <span>(02) 8123 4567</span></div>
                <div className="details-row"><span>Cellphone</span> <span>+63 917 123 4567</span></div>
                <div className="details-row"><span>Email Address</span> <span>auyongterence@gmail.com</span></div>
              </div>
              <div className="details-section">
                <div className="details-label">SHIPPING DETAILS</div>
                <div className="details-row"><span>Ship to</span> <span>Terence Auyong</span></div>
                <div className="details-row"><span>Address</span> <span>50 Rose st., Pamplona tres,<br/>Las pinas city, Metro Manila, 1740</span></div>
                <div className="details-row"><span>Date Ordered</span> <span>01/23/25</span></div>
                <div className="details-row"><span>Expected Delivery</span> <span>02/15/25</span></div>
              </div>
              <div className="details-section">
                <div className="details-label">PAYMENT DETAILS</div>
                <div className="details-row"><span>Payment Type</span> <span>Full</span></div>
                <div className="details-row"><span>Payment Method</span> <span>Bank Transfer - BPI</span></div>
                <div className="details-row"><span>Account Name</span> <span>REINAN JOHN BRIONES</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 