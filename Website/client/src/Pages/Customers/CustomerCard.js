import React from 'react';
import './CustomerCard.css';

export default function CustomerCard({ 
  customer, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}) {
  const handleCardClick = (e) => {
    // Don't trigger selection if clicking on buttons or checkbox
    if (e.target.closest('.card-actions') || e.target.closest('.card-checkbox')) {
      return;
    }
    onSelect(customer.customer_id);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit(customer);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(customer.customer_id);
  };

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onSelect(customer.customer_id);
  };

  return (
    <div 
      className={`customer-card ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="card-header">
        <div className="card-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
          />
        </div>
        <div className="card-actions">
          <button
            className="action-btn edit"
            onClick={handleEditClick}
            title="Edit Customer"
          >
            ✏️
          </button>
          <button
            className="action-btn delete"
            onClick={handleDeleteClick}
            title="Delete Customer"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-content">
        <div className="customer-avatar">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        
        <div className="customer-info">
          <h3 className="customer-name">{customer.name}</h3>
          <p className="customer-id">#{customer.customer_id}</p>
        </div>

        <div className="customer-details">
          <div className="detail-item">
            <span className="detail-icon">📧</span>
            <span className="detail-text">{customer.email_address}</span>
          </div>
          
          {customer.phone_number && (
            <div className="detail-item">
              <span className="detail-icon">📞</span>
              <span className="detail-text">{customer.phone_number}</span>
            </div>
          )}
          
          {customer.address && (
            <div className="detail-item">
              <span className="detail-icon">📍</span>
              <span className="detail-text">{customer.address}</span>
            </div>
          )}
        </div>

        <div className="card-footer">
          <span className={`status-badge ${customer.status || 'active'}`}>
            {customer.status || 'Active'}
          </span>
          
          {customer.created_at && (
            <span className="created-date">
              {new Date(customer.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
