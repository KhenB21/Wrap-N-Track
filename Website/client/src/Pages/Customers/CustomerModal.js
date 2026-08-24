import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useConfirm } from '../../Context/ConfirmContext';
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
  const confirm = useConfirm();
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

  const handleClose = async () => {
    if (isDirty) {
      if (await confirm('You have unsaved changes. Are you sure you want to close?')) {
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
    <div className="cust-modal-overlay" onClick={handleClose}>
      <div className="cust-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cust-modal-header">
          <div className="cust-modal-title-group">
            <span className="cust-modal-icon">👤</span>
            <h2 className="cust-modal-title">
              {mode === 'add' ? 'Add New Customer' : 'Edit Customer'}
            </h2>
          </div>
          <button className="cust-modal-close" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="cust-modal-body">

          {/* ── 1. Customer Information ─────────────────── */}
          <div className="cust-fm-section">
            <h3 className="cust-fm-section-title">Customer Information</h3>
            <div className="cust-fm-grid">

              <div className="cust-fm-field">
                <label className="cust-fm-label" htmlFor="name">
                  Full Name <span className="cust-fm-req">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className={`cust-fm-input${errors.name ? ' cust-fm-input--err' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Maria Santos"
                  maxLength={100}
                />
                {errors.name && <span className="cust-fm-err-msg">{errors.name}</span>}
              </div>

              <div className="cust-fm-field">
                <label className="cust-fm-label" htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  className="cust-fm-select"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

            </div>
          </div>

          {/* ── 2. Contact Information ──────────────────── */}
          <div className="cust-fm-section">
            <h3 className="cust-fm-section-title">Contact Information</h3>
            <div className="cust-fm-grid">

              <div className="cust-fm-field">
                <label className="cust-fm-label" htmlFor="email_address">
                  Email Address <span className="cust-fm-req">*</span>
                </label>
                <input
                  type="email"
                  id="email_address"
                  name="email_address"
                  className={`cust-fm-input${errors.email_address ? ' cust-fm-input--err' : ''}`}
                  value={formData.email_address}
                  onChange={handleChange}
                  placeholder="customer@email.com"
                />
                {errors.email_address && <span className="cust-fm-err-msg">{errors.email_address}</span>}
              </div>

              <div className="cust-fm-field">
                <label className="cust-fm-label" htmlFor="cellphone">
                  Mobile Number <span className="cust-fm-req">*</span>
                </label>
                <input
                  type="tel"
                  id="cellphone"
                  name="cellphone"
                  className={`cust-fm-input${errors.cellphone ? ' cust-fm-input--err' : ''}`}
                  value={formData.cellphone}
                  onChange={(e) => handlePhoneChange('cellphone', e.target.value)}
                  placeholder="09171234567 or +639171234567"
                  maxLength={20}
                />
                {errors.cellphone && <span className="cust-fm-err-msg">{errors.cellphone}</span>}
              </div>

              <div className="cust-fm-field">
                <label className="cust-fm-label" htmlFor="telephone">Telephone</label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  className={`cust-fm-input${errors.telephone ? ' cust-fm-input--err' : ''}`}
                  value={formData.telephone}
                  onChange={(e) => handlePhoneChange('telephone', e.target.value)}
                  placeholder="Landline or office number"
                  maxLength={20}
                />
                {errors.telephone && <span className="cust-fm-err-msg">{errors.telephone}</span>}
              </div>

              {/* spacer */}
              <div className="cust-fm-field cust-fm-field--spacer" aria-hidden="true" />

            </div>
          </div>

          {/* ── 3. Address ──────────────────────────────── */}
          <div className="cust-fm-section">
            <h3 className="cust-fm-section-title">Address</h3>
            <div className="cust-fm-field">
              <label className="cust-fm-label" htmlFor="address">
                Shipping Address <span className="cust-fm-req">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                className={`cust-fm-textarea${errors.address ? ' cust-fm-input--err' : ''}`}
                value={formData.address}
                onChange={handleChange}
                placeholder="Full shipping address"
                rows={4}
                maxLength={500}
              />
              <span className="cust-fm-char-hint">{formData.address.length} / 500</span>
              {errors.address && <span className="cust-fm-err-msg">{errors.address}</span>}
            </div>
          </div>

          {/* ── 4-6. Edit-only sections ─────────────────── */}
          {mode === 'edit' && (
            <>
              <div className="cust-fm-section">
                <h3 className="cust-fm-section-title">Account Information</h3>
                <div className="cust-fm-info-grid">
                  <div className="cust-fm-info-item">
                    <span className="cust-fm-info-label">Customer ID</span>
                    <span className="cust-fm-info-value">#{customer?.customer_id ?? '—'}</span>
                  </div>
                  <div className="cust-fm-info-item">
                    <span className="cust-fm-info-label">Member Since</span>
                    <span className="cust-fm-info-value">{formatDate(customer?.created_at)}</span>
                  </div>
                  <div className="cust-fm-info-item">
                    <span className="cust-fm-info-label">Last Updated</span>
                    <span className="cust-fm-info-value">{formatDate(customer?.updated_at)}</span>
                  </div>
                  <div className="cust-fm-info-item">
                    <span className="cust-fm-info-label">Total Orders</span>
                    <span className="cust-fm-info-value">{ordersLoading ? '…' : orders.length}</span>
                  </div>
                </div>
              </div>

              <div className="cust-fm-section">
                <h3 className="cust-fm-section-title">Ongoing Orders</h3>
                {renderOrdersList(ongoingOrders, ordersLoading, ordersError, 'No ongoing orders right now.')}
              </div>

              <div className="cust-fm-section cust-fm-section--last">
                <h3 className="cust-fm-section-title">Order History</h3>
                {renderOrdersList(orderHistory, ordersLoading, ordersError, 'No completed or cancelled orders yet.')}
              </div>
            </>
          )}

        </form>

        {/* Footer */}
        <div className="cust-modal-footer">
          <button type="button" className="cust-modal-btn cust-modal-btn--cancel" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" form="cust-form-proxy" className="cust-modal-btn cust-modal-btn--save" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Saving…' : mode === 'add' ? 'Add Customer' : 'Update Customer'}
          </button>
        </div>

      </div>
    </div>
  );
}
