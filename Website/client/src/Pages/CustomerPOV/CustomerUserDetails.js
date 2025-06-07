import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import './CustomerUserDetails.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api/axios';

export default function CustomerUserDetails() {
  const [userData, setUserData] = useState({
    user_id: '',
    name: '',
    username: '',
    email: '',
    profile_picture_path: '',
    profile_picture_data: '',
    phone_number: '',
    addresses: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newAddress, setNewAddress] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({
    username: '',
    name: '',
    email: '',
    phone_number: ''
  });

  // Define the order of fields
  const fieldOrder = ['username', 'name', 'email', 'phone_number'];

  useEffect(() => {
    const token = localStorage.getItem('customerToken');
    if (!token) {
      navigate('/customer-login');
      return;
    }
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/customer/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.data) {
          throw new Error('Failed to fetch user data');
        }

        // Ensure we have default values for all fields
        const userData = {
          user_id: response.data.customer_id,
          name: response.data.name || '',
          username: response.data.username || '',
          email: response.data.email_address || '',
          phone_number: response.data.phone_number || '',
          profile_picture_data: response.data.profile_picture_data,
          addresses: response.data.addresses || []
        };

        setUserData(userData);
        setEditValues({
          username: userData.username,
          name: userData.name,
          email: userData.email,
          phone_number: userData.phone_number
        });
        setError(null);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('customerToken');
          localStorage.removeItem('customer');
          navigate('/customer-login');
        } else {
          console.error('Error fetching user data:', error);
          setError(error.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  const getProfilePictureUrl = () => {
    if (userData.profile_picture_data) {
      return `data:image/jpeg;base64,${userData.profile_picture_data}`;
    }
    return '/placeholder-profile.png';
  };

  const handlePencilClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const token = localStorage.getItem('customerToken');
      const response = await api.post('/api/customer/profile-picture', formData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to upload profile picture');
      }
      
      setUserData(prev => ({ ...prev, profile_picture_path: response.data.profile_picture_path }));
      setPreviewUrl(null);
      
      // Update localStorage user object
      const storedUser = JSON.parse(localStorage.getItem('customer'));
      const updatedUser = { ...storedUser, profile_picture_path: response.data.profile_picture_path };
      localStorage.setItem('customer', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (e, field) => {
    e.preventDefault();
    setEditingField(field);
    // Reset edit values to current user data when starting to edit
    setEditValues({
      username: userData.username,
      email: userData.email,
      name: userData.name,
      phone_number: userData.phone_number
    });
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setEditingField(null);
    setError(null);
    // Reset edit values to current user data when canceling
    setEditValues({
      username: userData.username,
      email: userData.email,
      name: userData.name,
      phone_number: userData.phone_number
    });
  };

  const handleSave = async (e, field) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!editValues[field]?.trim()) {
      setError(`${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('customerToken');
      
      // Map the field name to match the database column names
      const fieldMapping = {
        username: 'username',
        email: 'email_address',
        name: 'name',
        phone_number: 'phone_number'
      };

      const dbField = fieldMapping[field];
      const value = editValues[field].trim();

      // Create update object with all required fields
      const updateData = {
        name: field === 'name' ? value : userData.name,
        username: field === 'username' ? value : userData.username,
        email_address: field === 'email' ? value : userData.email,
        phone_number: field === 'phone_number' ? value : userData.phone_number || ''
      };

      console.log('Sending update request with data:', updateData); // Debug log

      const response = await api.put('/api/customer/profile', 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Update response:', response.data); // Debug log

      if (response.data.success) {
        // If email was changed and it's different from current email
        if (field === 'email' && value !== userData.email) {
          console.log('Email changed, redirecting to verification'); // Debug log
          // Store the new email for verification
          localStorage.setItem('verificationEmail', value);
          // Store the current user data
          const storedCustomer = JSON.parse(localStorage.getItem('customer'));
          const updatedCustomer = { 
            ...storedCustomer, 
            email: value,
            is_verified: false
          };
          localStorage.setItem('customer', JSON.stringify(updatedCustomer));
          // Update the userData state
          setUserData(prev => ({
            ...prev,
            email: value,
            is_verified: false
          }));
          // Reset editing state
          setEditingField(null);
          // Redirect to verification page
          navigate('/customer/verify');
          return;
        }

        // Update the userData state with the new value
        setUserData(prev => ({
          ...prev,
          [field]: value
        }));
        
        // Update localStorage with new data
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = { 
          ...storedCustomer, 
          [field]: value
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        
        // Reset editing state and show success message
        setEditingField(null);
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
      // Reset edit values to current user data on error
      setEditValues({
        username: userData.username,
        email: userData.email,
        name: userData.name,
        phone_number: userData.phone_number
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    
    try {
      const token = localStorage.getItem('customerToken');
      const response = await api.post('/api/customer/profile/address', 
        { address: newAddress.trim() },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        setUserData(prev => ({
          ...prev,
          addresses: [...prev.addresses, newAddress.trim()]
        }));
        setNewAddress('');
      }
    } catch (err) {
      setError('Failed to add address');
    }
  };

  const handleRemoveAddress = async (e, addressToRemove) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('customerToken');
      const response = await api.delete('/api/customer/profile/address', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: { address: addressToRemove }
      });

      if (response.data) {
        setUserData(prev => ({
          ...prev,
          addresses: prev.addresses.filter(addr => addr !== addressToRemove)
        }));
      }
    } catch (err) {
      setError('Failed to remove address');
    }
  };

  const handleUpdatePhone = async () => {
    if (!newPhone.trim()) return;
    
    try {
      const token = localStorage.getItem('customerToken');
      const response = await api.put('/api/customer/phone', 
        { phone_number: newPhone.trim() },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setUserData(prev => ({
          ...prev,
          phone_number: newPhone.trim()
        }));
        setEditingPhone(false);
        setNewPhone('');
      }
    } catch (err) {
      setError('Failed to update phone number');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('customerToken');
      const response = await api.put('/api/customer/profile', 
        {
          name: userData.name,
          phone_number: userData.phone_number
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data) {
        // Update localStorage with new data
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = { 
          ...storedCustomer, 
          name: userData.name,
          phone_number: userData.phone_number
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        setError('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditValues(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    setError(null);
  };

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const token = localStorage.getItem('customerToken');
      const response = await api.post('/api/customer/profile-picture', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to update profile picture');
      }
      
      setUserData(prev => ({ 
        ...prev, 
        profile_picture_data: response.data.profile_picture_data 
      }));
      setPreviewUrl(null);
      
      // Update localStorage with new profile picture
      const storedCustomer = JSON.parse(localStorage.getItem('customer'));
      const updatedCustomer = { 
        ...storedCustomer, 
        profile_picture_data: response.data.profile_picture_data
      };
      localStorage.setItem('customer', JSON.stringify(updatedCustomer));
      setSuccess('Profile picture updated successfully!');
    } catch (err) {
      console.error('Error updating profile picture:', err);
      setError(err.message || 'Failed to update profile picture');
    }
  };

  if (loading) {
    return (
      <div className="customer-dashboard-container">
        <TopbarCustomer />
        <div className="customer-dashboard-main">
          <div className="customer-user-details-container">
            <div className="customer-user-details-card">
              <div className="loading">Loading user data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-user-details-container">
      <TopbarCustomer />
      <div className="customer-user-details-content">
        <div className="customer-user-details-header">
          <h2>User Details</h2>
        </div>
        <div className="customer-user-details-form">
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="profile-picture-container">
                <img
                  src={previewUrl || getProfilePictureUrl()}
                  alt="Profile"
                  className="profile-picture"
                />
                <button
                  type="button"
                  className="edit-profile-pic-btn"
                  title="Change profile picture"
                  onClick={handlePencilClick}
                  disabled={uploading}
                >
                  <span role="img" aria-label="Edit">✏️</span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleProfilePictureChange}
                  disabled={uploading}
                />
              </div>
              {uploading && <div className="loading">Uploading...</div>}
            </div>

            {fieldOrder.map((field) => (
              <div key={field} className="form-group">
                <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                <div className="edit-field-container">
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    name={field}
                    value={editValues[field]}
                    onChange={handleInputChange}
                    disabled={editingField !== field}
                    required
                  />
                  {editingField === field ? (
                    <div className="edit-buttons">
                      <button 
                        type="button"
                        className="save-btn"
                        onClick={(e) => handleSave(e, field)}
                        disabled={loading}
                      >
                        Save
                      </button>
                      <button 
                        type="button"
                        className="cancel-btn"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={(e) => handleEdit(e, field)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="form-group addresses-section">
              <label>Addresses:</label>
              <div className="addresses-list">
                {userData.addresses.map((address, index) => (
                  <div key={index} className="address-item">
                    <span>{address}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAddress(e, address)}
                      className="remove-address-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="add-address">
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Add new address"
                  />
                  <button 
                    type="button"
                    onClick={handleAddAddress}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
} 