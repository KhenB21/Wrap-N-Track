import React, { useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./CustomerDetails.css";

const customers = [
  {
    id: 1,
    name: "Terence Auyong",
    code: "#CO000002",
    selected: true,
  },
  {
    id: 2,
    name: "Khen Bolima",
    code: "#CO000002",
    selected: false,
  },
  {
    id: 3,
    name: "Reinan Briones",
    code: "#CO000002",
    selected: false,
  },
  {
    id: 4,
    name: "Grant Nathan",
    code: "#CO000002",
    selected: false,
  },
];

const tabs = ["Overview", "Order History", "Ongoing orders"];

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  }
  return "/placeholder-profile.png";
}

export default function CustomerDetails() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        {/* Action Bar */}
        <div className="customer-action-bar">
          <button className="btn-edit">Edit</button>
          <button className="btn-delete">Delete</button>
          <span className="selected-count">1 Selected</span>
        </div>

        {/* Filters */}
        <div className="customer-filters">
          <span>Total Customers: 4</span>
          <select><option>All</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="customer-search" type="text" placeholder="Search" />
        </div>

        <div className="customer-details-layout">
          {/* Customer List */}
          <div className="customer-list">
            <div className="customer-list-title">CUSTOMERS</div>
            {customers.map((c) => (
              <div className={`customer-list-item${c.selected ? " selected" : ""}`} key={c.id}>
                <input type="checkbox" checked={c.selected} readOnly />
                <div className="customer-info">
                  <div className="customer-name">{c.name}</div>
                  <div className="customer-code">{c.code}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Details */}
          <div className="customer-details-panel">
            <div className="customer-details-header">
              <div>
                <div className="customer-details-title">Customer #000001</div>
                <div className="customer-details-name">Terence Auyong</div>
              </div>
              <div className="customer-details-actions">
                <button className="icon-btn">✏️</button>
                <button className="icon-btn">🗑️</button>
                <button className="icon-btn">❌</button>
              </div>
            </div>
            <div className="customer-details-tabs">
              {tabs.map((tab, idx) => (
                <button
                  key={tab}
                  className={`tab-btn${activeTab === idx ? " active" : ""}`}
                  onClick={() => setActiveTab(idx)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="customer-details-content">
              {activeTab === 0 && (
                <>
                  <div className="details-section">
                    <div className="details-label">CONTACT DETAILS</div>
                    <div className="details-row"><span>Telephone</span> <span>(02) 8123 4567</span></div>
                    <div className="details-row"><span>Cellphone</span> <span>+63 917 123 4567</span></div>
                    <div className="details-row"><span>Email Address</span> <span>auyongterence@gmail.com</span></div>
                  </div>
                  <div className="details-section">
                    <div className="details-label">ADDRESS DETAILS</div>
                    <div className="details-row"><span>Address</span> <span>50 Rose st., Pamplona tres,<br/>Las pinas city, Metro Manila, 1740</span></div>
                  </div>
                </>
              )}
              {activeTab === 1 && (
                <div className="details-section"><div className="details-label">Order History</div><div className="details-row">No order history.</div></div>
              )}
              {activeTab === 2 && (
                <div className="details-section"><div className="details-label">Ongoing Orders</div><div className="details-row">No ongoing orders.</div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 