import React, { useState, useEffect } from 'react';
import './SupplierModal.css';

export default function SupplierModal({ mode, supplier, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    cellphone: '',
    telephone: '',
    email_address: '',
    street_address: '',
    barangay: '',
    city_municipality: '',
    province: '',
    zip_code: '',
    description: '',
    reliability_score: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        cellphone: supplier.cellphone || '',
        telephone: supplier.telephone || '',
        email_address: supplier.email_address || '',
        street_address: supplier.street_address || '',
        barangay: supplier.barangay || '',
        city_municipality: supplier.city_municipality || '',
        province: supplier.province || '',
        zip_code: supplier.zip_code || '',
        description: supplier.description || '',
        reliability_score: supplier.reliability_score || ''
      });
    }
  }, [mode, supplier]);

  const validateForm = () => {
    const newErrors = {};

    // Supplier name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    // Contact person validation
    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    // Email validation
    if (!formData.email_address.trim()) {
      newErrors.email_address = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_address)) {
      newErrors.email_address = 'Please enter a valid email address';
    }

    // Phone validation (at least one phone number required)
    if (!formData.cellphone.trim() && !formData.telephone.trim()) {
      newErrors.cellphone = 'At least one phone number is required';
    } else {
      if (formData.cellphone.trim() && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.cellphone.replace(/\s/g, ''))) {
        newErrors.cellphone = 'Please enter a valid cellphone number';
      }
      if (formData.telephone.trim() && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.telephone.replace(/\s/g, ''))) {
        newErrors.telephone = 'Please enter a valid telephone number';
      }
    }

    // Reliability score validation
    if (formData.reliability_score.trim() && (
      isNaN(formData.reliability_score) || 
      parseInt(formData.reliability_score) < 0 || 
      parseInt(formData.reliability_score) > 100
    )) {
      newErrors.reliability_score = 'Reliability score must be between 0 and 100';
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
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
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
      console.error('Error saving supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Supplier Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                  placeholder="Enter supplier name"
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="contact_person">Contact Person *</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className={errors.contact_person ? 'error' : ''}
                  placeholder="Enter contact person name"
                />
                {errors.contact_person && <span className="error-message">{errors.contact_person}</span>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3>Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cellphone">Cellphone Number *</label>
                <input
                  type="tel"
                  id="cellphone"
                  name="cellphone"
                  value={formData.cellphone}
                  onChange={handleChange}
                  className={errors.cellphone ? 'error' : ''}
                  placeholder="Enter cellphone number"
                />
                {errors.cellphone && <span className="error-message">{errors.cellphone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="telephone">Telephone Number</label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className={errors.telephone ? 'error' : ''}
                  placeholder="Enter telephone number"
                />
                {errors.telephone && <span className="error-message">{errors.telephone}</span>}
              </div>
            </div>

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
          </div>

          {/* Address Information */}
          <div className="form-section">
            <h3>Address Information</h3>
            <div className="form-group">
              <label htmlFor="street_address">Street Address</label>
              <input
                type="text"
                id="street_address"
                name="street_address"
                value={formData.street_address}
                onChange={handleChange}
                placeholder="Enter street address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="barangay">Barangay</label>
                <input
                  type="text"
                  id="barangay"
                  name="barangay"
                  value={formData.barangay}
                  onChange={handleChange}
                  placeholder="Enter barangay"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city_municipality">City/Municipality</label>
                <input
                  type="text"
                  id="city_municipality"
                  name="city_municipality"
                  value={formData.city_municipality}
                  onChange={handleChange}
                  placeholder="Enter city/municipality"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="province">Province</label>
                <input
                  type="text"
                  id="province"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  placeholder="Enter province"
                />
              </div>

              <div className="form-group">
                <label htmlFor="zip_code">ZIP Code</label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="form-section">
            <h3>Business Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="description">Type of Supplies</label>
                <select
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                >
                  <option value="">Select type of supplies</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Services">Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="reliability_score">Reliability Score (0-100)</label>
                <input
                  type="number"
                  id="reliability_score"
                  name="reliability_score"
                  value={formData.reliability_score}
                  onChange={handleChange}
                  className={errors.reliability_score ? 'error' : ''}
                  placeholder="Enter reliability score"
                  min="0"
                  max="100"
                />
                {errors.reliability_score && <span className="error-message">{errors.reliability_score}</span>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'add' ? 'Add Supplier' : 'Update Supplier')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
