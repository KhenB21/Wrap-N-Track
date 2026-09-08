import React from 'react';
import './CustomerModal.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function CustomerViewModal({ customer, onClose, onEdit }) {
  if (!customer) return null;

  const phone = customer.cellphone || customer.phone_number || 'Not provided';

  return (
    <div className="cust-modal-overlay" onClick={onClose}>
      <div className="cust-modal cust-modal--compact" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cust-modal-header">
          <div className="cust-modal-title-group">
            <span className="cust-modal-icon">👤</span>
            <h2 className="cust-modal-title">{customer.name}</h2>
          </div>
          <button className="cust-modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cust-modal-body cust-modal-body--view">
          <div className="cust-fm-info-grid">
            <div className="cust-fm-info-item">
              <span className="cust-fm-info-label">Customer ID</span>
              <span className="cust-fm-info-value">#{customer.customer_id}</span>
            </div>
            <div className="cust-fm-info-item">
              <span className="cust-fm-info-label">Status</span>
              <span className="cust-fm-info-value">{customer.status || 'Active'}</span>
            </div>
            <div className="cust-fm-info-item">
              <span className="cust-fm-info-label">Email</span>
              <span className="cust-fm-info-value">{customer.email_address || 'Not provided'}</span>
            </div>
            <div className="cust-fm-info-item">
              <span className="cust-fm-info-label">Mobile Number</span>
              <span className="cust-fm-info-value">{phone}</span>
            </div>
            {customer.telephone && (
              <div className="cust-fm-info-item">
                <span className="cust-fm-info-label">Telephone</span>
                <span className="cust-fm-info-value">{customer.telephone}</span>
              </div>
            )}
            <div className="cust-fm-info-item">
              <span className="cust-fm-info-label">Member Since</span>
              <span className="cust-fm-info-value">{formatDate(customer.created_at)}</span>
            </div>
            {customer.address && (
              <div className="cust-fm-info-item cust-fm-info-item--full">
                <span className="cust-fm-info-label">Shipping Address</span>
                <span className="cust-fm-info-value">{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="cust-modal-footer">
          <button type="button" className="cust-modal-btn cust-modal-btn--cancel" onClick={onClose}>
            Close
          </button>
          <button type="button" className="cust-modal-btn cust-modal-btn--save" onClick={() => onEdit(customer)}>
            Edit Customer
          </button>
        </div>

      </div>
    </div>
  );
}
