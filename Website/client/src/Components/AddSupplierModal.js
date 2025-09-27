import React, { useState } from 'react';
import api from '../api';
import './AddSupplierModal.css';

const AddSupplierModal = ({ onClose, onSupplierAdded }) => {
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Format phone number input
    if (name === 'phone') {
      // Remove all non-numeric characters
      const numericValue = value.replace(/\D/g, '');
      // Format as XXX-XXX-XXXX or similar
      if (numericValue.length >= 10) {
        formattedValue = numericValue.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      } else if (numericValue.length >= 6) {
        formattedValue = numericValue.replace(/(\d{3})(\d{3})/, '$1-$2-');
      } else if (numericValue.length >= 3) {
        formattedValue = numericValue.replace(/(\d{3})/, '$1-');
      } else {
        formattedValue = numericValue;
      }
    }
    
    // Format email input (convert to lowercase)
    if (name === 'email') {
      formattedValue = value.toLowerCase().trim();
    }
    
    setForm(prev => ({ ...prev, [name]: formattedValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Helper function to get input validation class
  const getInputClass = (fieldName, value) => {
    if (errors[fieldName]) return 'error';
    if (!value) return '';
    
    if (fieldName === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'valid' : '';
    }
    
    if (fieldName === 'phone') {
      const phoneDigits = value.replace(/\D/g, '');
      return phoneDigits.length >= 10 && phoneDigits.length <= 15 ? 'valid' : '';
    }
    
    return '';
  };

  const handleKeyPress = (e) => {
    const { name } = e.target;
    
    // Only allow numbers, dashes, parentheses, plus signs, and spaces for phone
    if (name === 'phone') {
      const allowedChars = /[\d\-\+\(\)\s]/;
      if (!allowedChars.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    }
    
    // Only allow valid email characters
    if (name === 'email') {
      const allowedChars = /[a-zA-Z0-9@._-]/;
      if (!allowedChars.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Enhanced phone validation
    if (form.phone.trim()) {
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        newErrors.phone = 'Phone number must be at least 10 digits';
      } else if (phoneDigits.length > 15) {
        newErrors.phone = 'Phone number cannot exceed 15 digits';
      } else if (!/^[\d\-\+\(\)\s]+$/.test(form.phone)) {
        newErrors.phone = 'Phone number contains invalid characters';
      }
    }

    if (form.website && !/^https?:\/\/.+/.test(form.website)) {
      newErrors.website = 'Please enter a valid website URL (include http:// or https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/suppliers', form);
      
      if (response.data) {
        // Call the callback with the new supplier data
        onSupplierAdded({
          value: response.data.supplier_id,
          label: response.data.name,
          phone: response.data.phone,
          website: response.data.website,
          email: response.data.email,
          contact_person: response.data.contact_person
        });
        onClose();
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create supplier';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="add-supplier-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Supplier</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-supplier-form">
          <div className="form-section">
            <h4>Basic Information</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">
                  Supplier Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter supplier name"
                  required
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="contact_person">Contact Person</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={form.contact_person}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter phone number (e.g., 123-456-7890)"
                  maxLength="15"
                  pattern="[\d\-\+\(\)\s]+"
                  className={getInputClass('phone', form.phone)}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
                {!errors.phone && form.phone && getInputClass('phone', form.phone) === 'valid' && (
                  <span className="success-message">✓ Valid phone number format</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="email">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={getInputClass('email', form.email)}
                  placeholder="Enter email address (e.g., supplier@example.com)"
                  required
                  autoComplete="email"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
                {!errors.email && form.email && getInputClass('email', form.email) === 'valid' && (
                  <span className="success-message">✓ Valid email format</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                name="website"
                value={form.website}
                onChange={handleChange}
                className={errors.website ? 'error' : ''}
                placeholder="https://example.com"
              />
              {errors.website && <span className="error-message">{errors.website}</span>}
            </div>
          </div>

          <div className="form-section">
            <h4>Address Information</h4>
            
            <div className="form-group">
              <label htmlFor="address">Street Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter street address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="state">State/Province</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Enter state or province"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="postal_code">Postal Code</label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={form.postal_code}
                  onChange={handleChange}
                  placeholder="Enter postal code"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Enter any additional notes about this supplier"
                rows="3"
              />
            </div>
          </div>

          {errors.submit && (
            <div className="error-message submit-error">{errors.submit}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSupplierModal;
