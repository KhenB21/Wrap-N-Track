import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";

import api from "../../api";
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
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleOrderClick = useCallback(async (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    
    // Fetch products for the order
    if (order.order_id) {
      setLoadingProducts(true);
      try {

        const response = await api.get(`/api/orders/${order.order_id}/products`);

        setOrderProducts(response.data);
      } catch (error) {
        console.error('Error fetching order products:', error);
        setOrderProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }
  }, []);

  const cleanupDuplicates = async () => {
    try {
      let cleanupAttempt = 0;
      const maxCleanupAttempts = 2;
      let hasRemainingDuplicates = true;

      while (hasRemainingDuplicates && cleanupAttempt < maxCleanupAttempts) {
        cleanupAttempt++;
        console.log(`Starting cleanup attempt ${cleanupAttempt}`);

        // Fetch all customers

        const response = await api.get(`/api/customers`);

        const allCustomers = response.data;
        
        // Group by name (case-insensitive)
        const customersByName = new Map();
        allCustomers.forEach(customer => {
          const nameKey = customer.name.toLowerCase().trim();
          if (!customersByName.has(nameKey)) {
            customersByName.set(nameKey, []);
          }
          customersByName.get(nameKey).push(customer);
        });

        // Process each group
        for (const [nameKey, duplicates] of customersByName) {
          if (duplicates.length > 1) {
            console.log(`Processing ${duplicates.length} duplicates for ${nameKey}`);
            
            // Sort by customer_id to ensure consistent primary customer selection
            duplicates.sort((a, b) => a.customer_id - b.customer_id);
            
            // Keep the first customer and merge others into it
            const primaryCustomer = duplicates[0];
            const mergedEmails = new Set();
            const mergedPhones = new Set();

            // Collect all contact details
            duplicates.forEach(customer => {
              if (customer.email_address) {
                customer.email_address.split(',').forEach(email => {
                  const trimmedEmail = email.trim();
                  if (trimmedEmail) mergedEmails.add(trimmedEmail);
                });
              }
              if (customer.phone_number) {
                customer.phone_number.split(',').forEach(phone => {
                  const trimmedPhone = phone.trim();
                  if (trimmedPhone) mergedPhones.add(trimmedPhone);
                });
              }
            });

            // Update primary customer with merged data
            const updatedCustomer = {
              ...primaryCustomer,
              email_address: Array.from(mergedEmails).filter(Boolean).join(', '),
              phone_number: Array.from(mergedPhones).filter(Boolean).join(', ')
            };

            // Try to update the primary customer with retries
            let updateSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!updateSuccess && retryCount < maxRetries) {
              try {
                await api.put(`/api/customers/${primaryCustomer.customer_id}`, updatedCustomer);
                console.log(`Updated primary customer: ${primaryCustomer.name}`);
                updateSuccess = true;
                // Wait a bit after successful update
                await new Promise(resolve => setTimeout(resolve, 500));
              } catch (error) {
                retryCount++;
                console.error(`Update attempt ${retryCount} failed for ${nameKey}:`, error);
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            }

            if (updateSuccess) {
              // Delete duplicate customers one by one with delays
              for (let i = 1; i < duplicates.length; i++) {
                let deleteSuccess = false;
                retryCount = 0;

                while (!deleteSuccess && retryCount < maxRetries) {
                  try {
                    await api.delete(`/api/customers/${duplicates[i].customer_id}`);
                    console.log(`Deleted duplicate customer: ${duplicates[i].name}`);
                    deleteSuccess = true;
                    // Wait a bit after successful deletion
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } catch (error) {
                    retryCount++;
                    console.error(`Delete attempt ${retryCount} failed for ${duplicates[i].name}:`, error);
                    if (retryCount < maxRetries) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }
                }
              }
            }
          }
        }

        // Wait before verifying
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify if any duplicates remain

        const verifyResponse = await api.get(`/api/customers`);


        const remainingCustomers = verifyResponse.data;
        const remainingByName = new Map();
        
        remainingCustomers.forEach(customer => {
          const nameKey = customer.name.toLowerCase().trim();
          if (!remainingByName.has(nameKey)) {
            remainingByName.set(nameKey, []);
          }
          remainingByName.get(nameKey).push(customer);
        });

        // Check if any duplicates remain
        hasRemainingDuplicates = false;
        for (const [nameKey, customers] of remainingByName) {
          if (customers.length > 1) {
            console.warn(`Warning: Still found ${customers.length} duplicates for ${nameKey}`);
            hasRemainingDuplicates = true;
          }
        }

        if (hasRemainingDuplicates && cleanupAttempt < maxCleanupAttempts) {
          console.log('Waiting before next cleanup attempt...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (hasRemainingDuplicates) {
        console.warn('Some duplicates could not be cleaned up after maximum attempts');
      } else {
        console.log('Cleanup completed successfully');
      }

    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      throw error;
    }
  };

  const syncCustomersFromOrders = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncingCustomers(true);
    try {
      // First clean up any existing duplicates
      await cleanupDuplicates();
      console.log('Finished cleaning up duplicates');

      // Wait a bit before starting the sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then proceed with normal sync

      const existingCustomersResponse = await api.get(`/api/customers`);
      const existingCustomers = existingCustomersResponse.data;

      // Fetch all orders
      const response = await api.get(`/api/orders`);

      const orders = response.data;
      
      // Group customers by name (case-insensitive)
      const customersByName = new Map();
      
      orders.forEach(order => {
        if (order.name) {
          const name = order.name.toLowerCase().trim();
          if (!customersByName.has(name)) {
            customersByName.set(name, {
              name: order.name.trim(), // Keep original case
              email_addresses: new Set(),
              phone_numbers: new Set()
            });
          }
          
          const customer = customersByName.get(name);
          if (order.email_address) {
            customer.email_addresses.add(order.email_address.trim());
          }
          if (order.cellphone) {
            customer.phone_numbers.add(order.cellphone.trim());
          }
          if (order.telephone) {
            customer.phone_numbers.add(order.telephone.trim());
          }
        }
      });

      // Process each unique customer
      for (const [nameKey, customerData] of customersByName) {
        try {
          // Find existing customer by name (case-insensitive)
          const existingCustomer = existingCustomers.find(c => 
            c.name.toLowerCase().trim() === nameKey
          );

          if (existingCustomer) {
            // Merge contact details with existing customer
            const existingEmails = new Set(existingCustomer.email_address?.split(',').map(e => e.trim()) || []);
            const existingPhones = new Set(existingCustomer.phone_number?.split(',').map(p => p.trim()) || []);
            
            // Add new contact details
            customerData.email_addresses.forEach(email => existingEmails.add(email));
            customerData.phone_numbers.forEach(phone => existingPhones.add(phone));

            // Update existing customer
            const updatedCustomer = {
              ...existingCustomer,
              email_address: Array.from(existingEmails).filter(Boolean).join(', '),
              phone_number: Array.from(existingPhones).filter(Boolean).join(', ')
            };
            
            try {

              await api.put(`/api/customers/${existingCustomer.customer_id}`, updatedCustomer);

              console.log('Updated customer:', customerData.name);
            } catch (error) {
              console.error(`Failed to update customer ${customerData.name}:`, error);
              // Continue with other customers even if one fails
            }
          } else {
            // Add new customer
            const newCustomer = {
              name: customerData.name,
              email_address: Array.from(customerData.email_addresses).filter(Boolean).join(', '),
              phone_number: Array.from(customerData.phone_numbers).filter(Boolean).join(', ')
            };
            
            try {

              await api.post(`/api/customers`, newCustomer);

              console.log('Added new customer:', customerData.name);
            } catch (error) {
              console.error(`Failed to add customer ${customerData.name}:`, error);
              // Continue with other customers even if one fails
            }
          }
        } catch (error) {
          console.error('Error processing customer:', error);
          // Continue with other customers even if one fails
        }
      }

      // Refresh customer list
      await fetchCustomers();
    } catch (error) {
      console.error('Error syncing customers from orders:', error);
      setError('Failed to sync customers from orders');
    } finally {
      setIsSyncing(false);
      setSyncingCustomers(false);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {

      const response = await api.get(`/api/customers`);
      console.log('Fetched customers:', response.data);

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

  const fetchCustomerOrders = useCallback(async (customerId) => {
    if (!selectedCustomer) {
      console.log('No customer selected');
      return;
    }

    console.log('Fetching orders for customer:', selectedCustomer.name);
    try {
      // Fetch ongoing orders for the customer
  const ongoingResponse = await api.get(`/api/orders/customer/${encodeURIComponent(selectedCustomer.name)}`);
      console.log('Ongoing orders response:', ongoingResponse.data);

      // Fetch completed orders from archived orders
  const historyResponse = await api.get('/api/order-history');
      const completedOrders = (historyResponse.data?.orders || []).filter(order => 
        order.customer_name && order.customer_name.toLowerCase() === selectedCustomer.name.toLowerCase()
      );
      console.log('Completed orders response:', completedOrders);

      // Set the orders in state
      setCustomerOrders({
        ongoing: ongoingResponse.data,
        completed: completedOrders
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Filter customers based on search term and category
    let filtered = customers;
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }
    
    setFilteredCustomers(filtered);
  }, [customers, searchTerm, selectedCategory]);

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
    
    // Validate each email address
    const emails = editForm.email_address.split(',').map(email => email.trim());
    for (const email of emails) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Invalid email format: ' + email);
        return false;
      }
    }
    
    // Validate each phone number
    const phones = editForm.phone_number.split(',').map(phone => phone.trim());
    for (const phone of phones) {
      if (phone && !/^\+?[\d\s-]{10,}$/.test(phone)) {
        setError('Invalid phone number format: ' + phone);
        return false;
      }
    }
    
    return true;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {

      const response = await api.post(`/api/customers`, editForm);

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
        await api.delete(`/api/customers/${customerId}`);
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

      const response = await api.put(`/api/customers/${selectedCustomer.customer_id}`, editForm);

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
        <label>Phone Numbers:</label>
        <input 
          type="text" 
          value={editForm.phone_number}
          onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
          placeholder="Multiple numbers separated by commas"
        />
      </div>
      <div className="form-group">
        <label>Email Addresses: *</label>
        <input 
          type="text" 
          value={editForm.email_address}
          onChange={(e) => setEditForm({...editForm, email_address: e.target.value})}
          placeholder="Multiple emails separated by commas"
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

  const renderCustomerDetails = () => (
    <div className="details-section">
      <div className="details-label">CONTACT DETAILS</div>
      <div className="details-row">
        <span>Phone Numbers</span> 
        <span>{selectedCustomer.phone_number ? selectedCustomer.phone_number.split(',').map(num => num.trim()).join(', ') : 'Not provided'}</span>
      </div>
      <div className="details-row">
        <span>Email Addresses</span> 
        <span>{selectedCustomer.email_address ? selectedCustomer.email_address.split(',').map(email => email.trim()).join(', ') : 'Not provided'}</span>
      </div>
    </div>
  );

  // Update the sync button in the UI
  const renderSyncButton = () => (
    <button 
      className="btn-sync" 
      onClick={syncCustomersFromOrders}
      disabled={isSyncing}
    >
      {isSyncing ? 'Syncing...' : 'Sync from Orders'}
    </button>
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
          {renderSyncButton()}
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
            <div style={{overflowY: 'auto', height: '440px'}}>
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
                      {renderCustomerDetails()}
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