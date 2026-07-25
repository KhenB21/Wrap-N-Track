import React, { useState, useEffect } from 'react';
import api from '../../api';
import './CustomerModal.css';

const ARCHIVED_STATUSES = ['completed', 'cancelled'];

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₱0.00';
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function renderOrdersList(list, isLoading, error, emptyMessage) {
  if (isLoading) {
    return (
      <div className="order-mini-list">
        {[0, 1].map((i) => (
          <div className="order-mini-row skeleton-card" key={i}>
            <div className="skeleton-shimmer skeleton-text" style={{ width: '60%', height: '14px' }} />
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="order-mini-empty order-mini-error">{error}</p>;
  }
  if (!list.length) {
    return <p className="order-mini-empty">{emptyMessage}</p>;
  }
  return (
    <div className="order-mini-list">
      {list.map((order) => (
        <div className="order-mini-row" key={order.order_id}>
          <div className="order-mini-main">
            <span className="order-mini-id">#{order.order_id}</span>
            <span className="order-mini-date">{formatDate(order.order_date)}</span>
          </div>
          <span className={`order-mini-status status-${(order.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
            {order.status || 'Pending'}
          </span>
          <span className="order-mini-total">{formatCurrency(order.total_cost)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CustomerModal({ mode, customer, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    telephone: '',
    cellphone: '',
    address: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  useEffect(() => {
    if (mode === 'edit' && customer) {
      setFormData({
        name: customer.name || '',
        email_address: customer.email_address || '',
        telephone: customer.telephone || '',
        cellphone: customer.cellphone || customer.phone_number || '',
        address: customer.address || '',
        status: customer.status || 'active'
      });
    } else {
      // Reset form for add mode
      setFormData({
        name: '',
        email_address: '',
        telephone: '',
        cellphone: '',
        address: '',
        status: 'active'
      });
    }
    setIsDirty(false);
    setErrors({});
  }, [mode, customer]);

  // Ongoing Orders / Order History sections only apply once the customer actually
  // exists (edit mode) — a brand-new "add" form has no orders yet.
  useEffect(() => {
    if (mode !== 'edit' || !customer?.customer_id) {
      setOrders([]);
      setOrdersError(null);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError(null);
    api.get('/api/customer-orders/orders', { params: { customer_id: customer.customer_id } })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data?.orders || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching customer orders:', err);
        setOrdersError('Failed to load this customer\'s orders');
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => { cancelled = true; };
  }, [mode, customer]);

  const ongoingOrders = orders.filter((o) => !ARCHIVED_STATUSES.includes((o.status || '').toLowerCase()));
  const orderHistory = orders.filter((o) => ARCHIVED_STATUSES.includes((o.status || '').toLowerCase()));

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Email validation
    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
      newErrors.email_address = 'Please enter a valid email address';
    }

    if (!formData.cellphone.trim()) {
      newErrors.cellphone = 'Cellphone is required';
    } else if (!/^(\+639|639|09)\d{9}$/.test(formData.cellphone.replace(/[^\d+]/g, ''))) {
      newErrors.cellphone = 'Use a valid PH mobile number, e.g. 09171234567 or +639171234567';
    }

    if (formData.telephone && formData.telephone.replace(/\D/g, '').length < 7) {
      newErrors.telephone = 'Telephone number is too short';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Shipping address is required';
    } else if (formData.address.length > 500) {
      newErrors.address = 'Address must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setIsDirty(true);
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handlePhoneChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    setIsDirty(true);
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{mode === 'add' ? 'Add New Customer' : 'Edit Customer'}</h2>
            <p className="modal-subtitle">
              {mode === 'add' 
                ? 'Fill in the customer information below' 
                : `Editing ${customer?.name || 'customer'}`
              }
            </p>
          </div>
          <button className="modal-close" onClick={handleClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="customer-form">
          {/* 1. Basic Information */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter full name"
                  maxLength="100"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={errors.status ? 'error' : ''}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {errors.status && <span className="error-message">{errors.status}</span>}
              </div>
            </div>
          </div>

          {/* 2. Contact Information */}
          <div className="form-section">
            <h3 className="section-title">Contact Information</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email_address">Email Address *</label>
                <input
                  type="email"
                  id="email_address"
                  name="email_address"
                  value={formData.email_address}
                  onChange={handleChange}
                  className={errors.email_address ? 'error' : ''}
                  placeholder="Enter email address"
                />
                {errors.email_address && <span className="error-message">{errors.email_address}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="cellphone">Cellphone *</label>
                <input
                  type="tel"
                  id="cellphone"
                  name="cellphone"
                  value={formData.cellphone}
                  onChange={(e) => handlePhoneChange('cellphone', e.target.value)}
                  className={errors.cellphone ? 'error' : ''}
                  placeholder="09171234567 or +639171234567"
                  maxLength="20"
                />
                {errors.cellphone && <span className="error-message">{errors.cellphone}</span>}
              </div>
            </div>
            <div className="form-row single">
              <div className="form-group">
                <label htmlFor="telephone">Telephone</label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={(e) => handlePhoneChange('telephone', e.target.value)}
                  className={errors.telephone ? 'error' : ''}
                  placeholder="Landline or office telephone"
                  maxLength="20"
                />
                {errors.telephone && <span className="error-message">{errors.telephone}</span>}
              </div>
            </div>
          </div>

          {/* 3. Address */}
          <div className="form-section">
            <h3 className="section-title">Address</h3>

            <div className="form-row single">
              <div className="form-group">
                <label htmlFor="address">Shipping Address *</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={errors.address ? 'error' : ''}
                  placeholder="Enter shipping address"
                  rows="4"
                  maxLength="500"
                />
                <div className="character-count">
                  {formData.address.length}/500 characters
                </div>
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>
            </div>
          </div>

          {/* 4-6. Account Information / Ongoing Orders / Order History — only exist
              once the customer has actually been created (edit mode). */}
          {mode === 'edit' && (
            <>
              <div className="form-section readonly-section">
                <h3 className="section-title">Account Information</h3>
                <div className="account-info-grid">
                  <div className="account-info-item">
                    <span className="account-info-label">Customer ID</span>
                    <span className="account-info-value">#{customer?.customer_id ?? '—'}</span>
                  </div>
                  <div className="account-info-item">
                    <span className="account-info-label">Member Since</span>
                    <span className="account-info-value">{formatDate(customer?.created_at)}</span>
                  </div>
                  <div className="account-info-item">
                    <span className="account-info-label">Last Updated</span>
                    <span className="account-info-value">{formatDate(customer?.updated_at)}</span>
                  </div>
                  <div className="account-info-item">
                    <span className="account-info-label">Total Orders</span>
                    <span className="account-info-value">{ordersLoading ? '…' : orders.length}</span>
                  </div>
                </div>
              </div>

              <div className="form-section readonly-section">
                <h3 className="section-title">Ongoing Orders</h3>
                {renderOrdersList(ongoingOrders, ordersLoading, ordersError, 'No ongoing orders right now.')}
              </div>

              <div className="form-section readonly-section">
                <h3 className="section-title">Order History</h3>
                {renderOrdersList(orderHistory, ordersLoading, ordersError, 'No completed or cancelled orders yet.')}
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? (
                <>
                  <svg className="loading-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="save-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                  </svg>
                  {mode === 'add' ? 'Add Customer' : 'Update Customer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
