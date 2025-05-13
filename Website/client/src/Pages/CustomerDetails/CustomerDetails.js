import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./CustomerDetails.css";

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
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    email_address: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers. Please try again later.');
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: '',
      phone_number: '',
      email_address: ''
    });
    setError(null);
  };

  const handleSaveAdd = async () => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add customer');
      }

      const newCustomer = await response.json();
      setCustomers([...customers, newCustomer]);
      setIsAdding(false);
      setEditForm({
        name: '',
        phone_number: '',
        email_address: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding customer:', error);
      setError(error.message);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name,
      phone_number: customer.phone_number || '',
      email_address: customer.email_address
    });
    setIsEditing(true);
    setError(null);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const response = await fetch(`/api/customers/${customerId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete customer');
        }

        setCustomers(customers.filter(c => c.user_id !== customerId));
        setSelectedCustomer(null);
        setError(null);
      } catch (error) {
        console.error('Error deleting customer:', error);
        setError(error.message);
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/customers/${selectedCustomer.user_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update customer');
      }

      const updatedCustomer = await response.json();
      setCustomers(customers.map(c => 
        c.user_id === updatedCustomer.user_id ? updatedCustomer : c
      ));
      setSelectedCustomer(updatedCustomer);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error.message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsAdding(false);
    setSelectedCustomer(null);
    setError(null);
  };

  const renderForm = () => (
    <div className="edit-form">
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label>Name: *</label>
        <input 
          type="text" 
          value={editForm.name}
          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Phone Number:</label>
        <input 
          type="text" 
          value={editForm.phone_number}
          onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>Email: *</label>
        <input 
          type="email" 
          value={editForm.email_address}
          onChange={(e) => setEditForm({...editForm, email_address: e.target.value})}
          required
        />
      </div>
      <div className="form-actions">
        <button className="btn-save" onClick={isAdding ? handleSaveAdd : handleSaveEdit}>
          {isAdding ? 'Add Customer' : 'Save Changes'}
        </button>
        <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        
        {/* Action Bar */}
        <div className="customer-action-bar">
          <button className="btn-add" onClick={handleAdd}>
            <span className="icon">+</span> Add Customer
          </button>
          {selectedCustomer && !isEditing && !isAdding && (
            <>
              <button className="btn-edit" onClick={() => handleEdit(selectedCustomer)}>
                <span className="icon">✏️</span> Edit
              </button>
              <button className="btn-delete" onClick={() => handleDelete(selectedCustomer.user_id)}>
                <span className="icon">🗑️</span> Delete
              </button>
            </>
          )}
          <span className="selected-count">{selectedCustomer ? '1 Selected' : '0 Selected'}</span>
        </div>

        {/* Filters */}
        <div className="customer-filters">
          <span>Total Customers: {customers.length}</span>
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
              <div 
                className={`customer-list-item${selectedCustomer?.user_id === c.user_id ? " selected" : ""}`} 
                key={c.user_id}
                onClick={() => setSelectedCustomer(c)}
              >
                <input 
                  type="checkbox" 
                  checked={selectedCustomer?.user_id === c.user_id} 
                  onChange={() => setSelectedCustomer(c)}
                />
                <div className="customer-info">
                  <div className="customer-name">{c.name}</div>
                  <div className="customer-code">#{c.user_id}</div>
                </div>
                <div className="customer-actions">
                  <button 
                    className="icon-btn edit-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(c);
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    className="icon-btn delete-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.user_id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Details */}
          <div className="customer-details-panel">
            {isAdding ? (
              <>
                <div className="customer-details-header">
                  <div>
                    <div className="customer-details-title">Add New Customer</div>
                  </div>
                </div>
                {renderForm()}
              </>
            ) : selectedCustomer ? (
              <>
                <div className="customer-details-header">
                  <div>
                    <div className="customer-details-title">Customer #{selectedCustomer.user_id}</div>
                    <div className="customer-details-name">{selectedCustomer.name}</div>
                  </div>
                  <div className="customer-details-actions">
                    <button className="icon-btn" onClick={() => handleEdit(selectedCustomer)}>✏️</button>
                    <button className="icon-btn" onClick={() => handleDelete(selectedCustomer.user_id)}>🗑️</button>
                    <button className="icon-btn" onClick={() => setSelectedCustomer(null)}>❌</button>
                  </div>
                </div>
                {isEditing ? (
                  renderForm()
                ) : (
                  <>
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
                        <div className="details-section">
                          <div className="details-label">CONTACT DETAILS</div>
                          <div className="details-row">
                            <span>Phone Number</span> 
                            <span>{selectedCustomer.phone_number || 'Not provided'}</span>
                          </div>
                          <div className="details-row">
                            <span>Email Address</span> 
                            <span>{selectedCustomer.email_address || 'Not provided'}</span>
                          </div>
                        </div>
                      )}
                      {activeTab === 1 && (
                        <div className="details-section">
                          <div className="details-label">Order History</div>
                          <div className="details-row">No order history.</div>
                        </div>
                      )}
                      {activeTab === 2 && (
                        <div className="details-section">
                          <div className="details-label">Ongoing Orders</div>
                          <div className="details-row">No ongoing orders.</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="no-selection">Select a customer to view details</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 