import React, { useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./SupplierDetails.css";

const suppliers = [
  { id: 1, code: "#SU000001", name: "Terence Auyong", selected: true },
  { id: 2, code: "#SU000002", name: "Terence Auyong", selected: false },
  { id: 3, code: "#SU000003", name: "Terence Auyong", selected: false },
  { id: 4, code: "#SU000004", name: "Terence Auyong", selected: false },
];

const tabs = ["Overview", "Order History", "Ongoing orders"];

const products = [
  {
    img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=facearea&w=80&q=80",
    item: "Artisan Teas",
    variant: "Oolong tea",
    category: "Beverages",
    stock: 716,
    price: "195.00",
  },
];

export default function SupplierDetails() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        {/* Action Bar */}
        <div className="supplier-action-bar">
          <button className="btn-edit">Edit</button>
          <button className="btn-delete">Delete</button>
          <span className="selected-count">1 Selected</span>
        </div>

        {/* Filters */}
        <div className="supplier-filters">
          <span>Total Customers: 4</span>
          <select><option>All</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="supplier-search" type="text" placeholder="Search" />
        </div>

        <div className="supplier-details-layout">
          {/* Supplier List */}
          <div className="supplier-list">
            <div className="supplier-list-title">SUPPLIERS</div>
            {suppliers.map((s) => (
              <div className={`supplier-list-item${s.selected ? " selected" : ""}`} key={s.id}>
                <input type="checkbox" checked={s.selected} readOnly />
                <div className="supplier-info">
                  <div className="supplier-code">{s.code}</div>
                  <div className="supplier-name">{s.name}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Supplier Details */}
          <div className="supplier-details-panel">
            <div className="supplier-details-header">
              <div>
                <div className="supplier-details-title">Supplier #000001</div>
                <div className="supplier-details-name">Celestea</div>
              </div>
              <div className="supplier-details-actions">
                <button className="icon-btn">✏️</button>
                <button className="icon-btn">🗑️</button>
                <button className="icon-btn">❌</button>
              </div>
            </div>
            <div className="supplier-details-tabs">
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
            <div className="supplier-details-content">
              {activeTab === 0 && (
                <>
                  <div className="details-section">
                    <div className="details-label">CONTACT DETAILS</div>
                    <div className="details-row"><span>Contact Person</span> <span>Juan Dela Cruz</span></div>
                    <div className="details-row"><span>Telephone</span> <span>(02) 8123 4567</span></div>
                    <div className="details-row"><span>Cellphone</span> <span>+63 917 123 4567</span></div>
                    <div className="details-row"><span>Email Address</span> <span>auyongterence@gmail.com</span></div>
                  </div>
                  <div className="details-section">
                    <div className="details-label">PRODUCTS</div>
                    <div className="supplier-products-table-wrapper">
                      <table className="supplier-products-table">
                        <thead>
                          <tr>
                            <th>IMAGE</th>
                            <th>ITEM</th>
                            <th>VARIANT</th>
                            <th>CATEGORY</th>
                            <th>STOCK QUANTITY</th>
                            <th>PRICE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p, idx) => (
                            <tr key={idx}>
                              <td><img src={p.img} alt={p.item} className="product-table-thumb" /></td>
                              <td>{p.item}</td>
                              <td>{p.variant}</td>
                              <td>{p.category}</td>
                              <td>{p.stock}</td>
                              <td>{p.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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