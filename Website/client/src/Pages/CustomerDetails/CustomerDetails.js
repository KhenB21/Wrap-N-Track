import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import axios from "axios";
import "./CustomerDetails.css";

const API_BASE_URL = 'http://localhost:3001';

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
  const [customerOrders, setCustomerOrders] = useState({
    ongoing: [],
    completed: []
  });
  const [editForm, setEditForm] = useState({
    name: '',
    phone_number: '',
    email_address: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [orderProducts, setOrderProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const handleOrderClick = useCallback(async (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    
    // Fetch products for the order
    if (order.order_id) {
      setLoadingProducts(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/orders/${order.order_id}/products`);
        setOrderProducts(response.data);
      } catch (error) {
        console.error('Error fetching order products:', error);
        setOrderProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }
  }, []);

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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('Fetching customers...');
      const response = await axios.get(`${API_BASE_URL}/api/customers`);
      console.log('API Response:', response.data);
      console.log('Number of customers received:', response.data.length);
      setCustomers(response.data);
      setFilteredCustomers(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching customers:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load customers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = useCallback(async (customerId) => {
    if (!selectedCustomer) {
      console.log('No customer selected');
      return;
    }

    console.log('Fetching orders for customer:', selectedCustomer.name);
    try {
      // Fetch ongoing orders from orders table
      const ongoingResponse = await axios.get(`${API_BASE_URL}/api/orders/customer/${encodeURIComponent(selectedCustomer.name)}`);
      console.log('Ongoing orders response:', ongoingResponse.data);

      // Fetch completed orders from order_history table
      const completedResponse = await axios.get(`${API_BASE_URL}/api/order-history/customer/${encodeURIComponent(selectedCustomer.name)}`);
      console.log('Completed orders response:', completedResponse.data);

      // Set the orders in state
      setCustomerOrders({
        ongoing: ongoingResponse.data,
        completed: completedResponse.data
      });
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setError('Failed to fetch customer orders');
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
      console.log('Selected customer changed, fetching orders for:', selectedCustomer.name);
      fetchCustomerOrders(selectedCustomer.customer_id);
    }
  }, [selectedCustomer, fetchCustomerOrders]);

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
      const response = await axios.post(`${API_BASE_URL}/api/customers`, editForm);
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
        await axios.delete(`${API_BASE_URL}/api/customers/${customerId}`);
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
      const response = await axios.put(`${API_BASE_URL}/api/customers/${selectedCustomer.customer_id}`, editForm);
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
    if (!customerOrders.completed.length) {
      return <div className="text-center text-gray-500 mt-4">No order history found</div>;
    }

    return (
      <div className="orders-grid2">
        {customerOrders.completed.map((order) => (
          <div 
            key={order.order_id} 
            className="order-tab"
            onClick={() => handleOrderClick(order)}
          >
            <div className="order-tab-header">
              <div className="order-id">Order #{order.order_id}</div>
              <div className={`order-status ${order.status.toLowerCase()}`}>
                {order.status}
              </div>
            </div>
            <div className="order-tab-content">
              <div className="order-date">Date: {new Date(order.order_date).toLocaleDateString()}</div>
              <div className="order-total">₱{Number(order.total_cost).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-xl font-bold">Order #{selectedOrder.order_id}</h2>
            <button className="modal-close" onClick={() => setShowOrderModal(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="modal-section">
              <h3>Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><span className="text-gray-600">Date:</span> {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                  <p><span className="text-gray-600">Status:</span> {selectedOrder.status}</p>
                  <p><span className="text-gray-600">Total Cost:</span> ₱{selectedOrder.total_cost}</p>
                  <p><span className="text-gray-600">Payment Type:</span> {selectedOrder.payment_type}</p>
                  {selectedOrder.expected_delivery && (
                    <p><span className="text-gray-600">Expected Delivery:</span> {new Date(selectedOrder.expected_delivery).toLocaleDateString()}</p>
                  )}
                  <p><span className="text-gray-600">Package:</span> {selectedOrder.package_name}</p>
                </div>
                <div>
                  <h3>Customer Details</h3>
                  <p><span className="text-gray-600">Name:</span> {selectedOrder.name}</p>
                  <p><span className="text-gray-600">Email:</span> {selectedOrder.email_address}</p>
                  <p><span className="text-gray-600">Phone:</span> {selectedOrder.telephone || selectedOrder.cellphone}</p>
                  <p><span className="text-gray-600">Shipping Address:</span> {selectedOrder.shipping_address}</p>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Products</h3>
              <div className="space-y-2">
                {loadingProducts ? (
                  <div className="text-center py-4">Loading products...</div>
                ) : orderProducts.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-image-container">
                      {product.image_data && (
                        <img 
                          src={`data:image/jpeg;base64,${product.image_data}`} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="product-details">
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-sku">SKU: {product.sku}</span>
                      </div>
                      <div className="product-quantity">
                        <div className="quantity">Qty: {product.quantity || 1}</div>
                        {product.unit_price && (
                          <div className="price">₱{product.unit_price} each</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.remarks && (
              <div className="modal-section">
                <h3>Remarks</h3>
                <p className="text-gray-600">{selectedOrder.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOngoingOrders = () => {
    if (!customerOrders.ongoing.length) {
      return <div className="text-center text-gray-500 mt-4">No ongoing orders found</div>;
    }

    return (
      <div className="orders-grid2" style={{ height: '300px', overflowY: 'auto' }}>
        {customerOrders.ongoing.map((order) => (
          <div 
            key={order.order_id} 
            className="order-tab"
            onClick={() => {
              setSelectedOrder(order);
              setShowOrderModal(true);
            }}
          >
            <div className="order-tab-header">
              <div className="order-id">Order {order.order_id}</div>
              <div className={`order-status ${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                {order.status}
              </div>
            </div>
            <div className="order-tab-content">
              <div className="order-total">₱{order.total_cost}</div>
            </div>
          </div>
        ))}
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