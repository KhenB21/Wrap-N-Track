import React, { useState, useEffect } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import axios from "axios";
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
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customerOrders, setCustomerOrders] = useState([]);
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    email_address: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search term and category
    let filtered = customers;
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }
    
    setFilteredCustomers(filtered);
  }, [customers, searchTerm, selectedCategory]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerOrders(selectedCustomer.customer_id);
    }
  }, [selectedCustomer]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCustomers(response.data);
      setFilteredCustomers(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Failed to load customers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/orders?customer_id=${customerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCustomerOrders(response.data);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setError('Failed to load customer orders');
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

  const validateForm = () => {
    if (!editForm.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!editForm.email_address.trim()) {
      setError('Email is required');
      return false;
    }
    if (editForm.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email_address)) {
      setError('Invalid email format');
      return false;
    }
    if (editForm.phone_number && !/^\+?[\d\s-]{10,}$/.test(editForm.phone_number)) {
      setError('Invalid phone number format');
      return false;
    }
    return true;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3001/api/customers', editForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCustomers([...customers, response.data]);
      setIsAdding(false);
      setEditForm({
        name: '',
        phone_number: '',
        email_address: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding customer:', error);
      setError(error.response?.data?.message || 'Failed to add customer');
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
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3001/api/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setCustomers(customers.filter(c => c.customer_id !== customerId));
        setSelectedCustomer(null);
        setError(null);
      } catch (error) {
        console.error('Error deleting customer:', error);
        setError(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3001/api/customers/${selectedCustomer.customer_id}`, editForm, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCustomers(customers.map(c => 
        c.customer_id === response.data.customer_id ? response.data : c
      ));
      setSelectedCustomer(response.data);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error updating customer:', error);
      setError(error.response?.data?.message || 'Failed to update customer');
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
          placeholder="+1234567890"
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

  const renderOrderHistory = () => {
    const completedOrders = customerOrders.filter(order => order.status === 'Completed');
    return (
      <div className="details-section">
        <div className="details-label">Order History</div>
        {completedOrders.length === 0 ? (
          <div className="details-row">No completed orders found.</div>
        ) : (
          completedOrders.map(order => (
            <div 
              key={order.order_id} 
              className="order-item clickable"
              onClick={() => {
                setSelectedOrder(order);
                setShowOrderModal(true);
              }}
            >
              <div className="order-header">
                <span className="order-id">Order #{order.order_id}</span>
                <span className="order-date">{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="order-details">
                <div>Status: {order.status}</div>
                <div>Total: ${order.total_cost}</div>
                <div>Payment: {order.payment_type}</div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Order #{selectedOrder.order_id}</h2>
            <button className="modal-close" onClick={() => setShowOrderModal(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="order-info">
              <div className="info-row">
                <span>Order Date:</span>
                <span>{new Date(selectedOrder.order_date).toLocaleDateString()}</span>
              </div>
              <div className="info-row">
                <span>Status:</span>
                <span>{selectedOrder.status}</span>
              </div>
              <div className="info-row">
                <span>Total Cost:</span>
                <span>${selectedOrder.total_cost}</span>
              </div>
              <div className="info-row">
                <span>Payment Type:</span>
                <span>{selectedOrder.payment_type}</span>
              </div>
              {selectedOrder.expected_delivery && (
                <div className="info-row">
                  <span>Expected Delivery:</span>
                  <span>{new Date(selectedOrder.expected_delivery).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div className="order-items">
              <h3>Order Items</h3>
              {selectedOrder.items?.map((item, index) => (
                <div key={index} className="order-item-detail">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">x{item.quantity}</span>
                  </div>
                  <span className="item-price">${item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOngoingOrders = () => {
    const ongoingOrders = customerOrders.filter(order => order.status !== 'Completed');
    return (
      <div className="details-section">
        <div className="details-label">Ongoing Orders</div>
        {ongoingOrders.length === 0 ? (
          <div className="details-row">No ongoing orders found.</div>
        ) : (
          ongoingOrders.map(order => (
            <div key={order.order_id} className="order-item">
              <div className="order-header">
                <span className="order-id">Order #{order.order_id}</span>
                <span className="order-date">{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="order-details">
                <div>Status: {order.status}</div>
                <div>Expected Delivery: {new Date(order.expected_delivery).toLocaleDateString()}</div>
                <div>Total: ${order.total_cost}</div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const handleCustomerSelect = (customer, event) => {
    if (event.shiftKey && selectedCustomers.size > 0) {
      // Get the index of the last selected customer
      const lastSelectedIndex = filteredCustomers.findIndex(
        c => c.customer_id === Array.from(selectedCustomers).pop()
      );
      const currentIndex = filteredCustomers.findIndex(
        c => c.customer_id === customer.customer_id
      );
      
      // Select all customers between the last selected and current
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      
      const newSelected = new Set(selectedCustomers);
      for (let i = start; i <= end; i++) {
        newSelected.add(filteredCustomers[i].customer_id);
      }
      setSelectedCustomers(newSelected);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection for Ctrl/Cmd + click
      const newSelected = new Set(selectedCustomers);
      if (newSelected.has(customer.customer_id)) {
        newSelected.delete(customer.customer_id);
      } else {
        newSelected.add(customer.customer_id);
      }
      setSelectedCustomers(newSelected);
    } else {
      // Single selection
      setSelectedCustomers(new Set([customer.customer_id]));
      setSelectedCustomer(customer);
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set());
      setSelectedCustomer(null);
    } else {
      const allIds = new Set(filteredCustomers.map(c => c.customer_id));
      setSelectedCustomers(allIds);
      if (filteredCustomers.length === 1) {
        setSelectedCustomer(filteredCustomers[0]);
      }
    }
  };

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
          {selectedCustomers.size > 0 && !isEditing && !isAdding && (
            <>
              <button 
                className="btn-edit" 
                onClick={() => handleEdit(selectedCustomer)}
                disabled={selectedCustomers.size > 1}
              >
                <span className="icon">✏️</span> Edit
              </button>
              <button 
                className="btn-delete" 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) {
                    Array.from(selectedCustomers).forEach(handleDelete);
                  }
                }}
              >
                <span className="icon">🗑️</span> Delete
              </button>
            </>
          )}
          <span className="selected-count">
            {selectedCustomers.size} {selectedCustomers.size === 1 ? 'Customer' : 'Customers'} Selected
          </span>
        </div>

        {/* Filters */}
        <div className="customer-filters">
          <span>Total Customers: {customers.length}</span>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Regular">Regular</option>
            <option value="VIP">VIP</option>
            <option value="Corporate">Corporate</option>
          </select>
          <input 
            className="customer-search" 
            type="text" 
            placeholder="Search customers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="customer-details-layout">
          {/* Customer List */}
          <div className="customer-list">
            <div className="customer-list-header">
              <div className="customer-list-title">CUSTOMERS</div>
              <div className="select-all">
                <input 
                  type="checkbox"
                  checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                  onChange={handleSelectAll}
                />
                <span>Select All</span>
              </div>
            </div>
            {loading ? (
              <div className="loading">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="no-results">No customers found</div>
            ) : (
              filteredCustomers.map((c) => (
                <div 
                  className={`customer-list-item${selectedCustomers.has(c.customer_id) ? " selected" : ""}`} 
                  key={c.customer_id}
                  onClick={(e) => handleCustomerSelect(c, e)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedCustomers.has(c.customer_id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleCustomerSelect(c, e);
                    }}
                  />
                  <div className="customer-info">
                    <div className="customer-name">{c.name}</div>
                    <div className="customer-code">#{c.customer_id}</div>
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
                        handleDelete(c.customer_id);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
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
                    <div className="customer-details-title">Customer #{selectedCustomer.customer_id}</div>
                    <div className="customer-details-name">{selectedCustomer.name}</div>
                  </div>
                  <div className="customer-details-actions">
                    <button className="icon-btn" onClick={() => handleEdit(selectedCustomer)}>✏️</button>
                    <button className="icon-btn" onClick={() => handleDelete(selectedCustomer.customer_id)}>🗑️</button>
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
                      {activeTab === 1 && renderOrderHistory()}
                      {activeTab === 2 && renderOngoingOrders()}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="no-selection">Select a customer to view details</div>
            )}
          </div>
        </div>

        {/* Add the modal render at the end of the component */}
        {showOrderModal && renderOrderModal()}
      </div>
    </div>
  );
} 