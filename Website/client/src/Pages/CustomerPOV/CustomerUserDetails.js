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
    address: '',
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
    phone_number: '',
    address: ''
  });

  // Define the order of fields
  const fieldOrder = ['username', 'name', 'email', 'phone_number', 'address'];

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
        const address = response.data.address || '';
        const userData = {
          user_id: response.data.customer_id,
          name: response.data.name || '',
          username: response.data.username || '',
          email: response.data.email_address || '',
          phone_number: response.data.phone_number || '',
          address,
          profile_picture_data: response.data.profile_picture_data,
          addresses: response.data.addresses || []
        };
        setUserData(userData);
        setEditValues({
          username: userData.username,
          name: userData.name,
          email: userData.email,
          phone_number: userData.phone_number,
          address: userData.address
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
      phone_number: userData.phone_number,
      address: userData.address
    });
  };

  const handleCancel = (e) => {
    e.preventDefault();
    setEditingField(null);
    setError(null);
    setEditValues({
      username: userData.username,
      email: userData.email,
      name: userData.name,
      phone_number: userData.phone_number,
      address: userData.address
    });
  };

  const handleSave = async (e, field) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (!editValues[field]?.trim()) {
      setError(`${field.charAt(0).toUpperCase() + field.slice(1)} cannot be empty`);
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('customerToken');
      const fieldMapping = {
        username: 'username',
        email: 'email_address',
        name: 'name',
        phone_number: 'phone_number',
        address: 'address'
      };
      const dbField = fieldMapping[field];
      const value = editValues[field].trim();
      const updateData = {
        name: field === 'name' ? value : userData.name,
        username: field === 'username' ? value : userData.username,
        email_address: field === 'email' ? value : userData.email,
        phone_number: field === 'phone_number' ? value : userData.phone_number || '',
        address: field === 'address' ? value : userData.address
      };
      const response = await api.put('/api/customer/profile', 
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.success) {
        if (field === 'email' && value !== userData.email) {
          localStorage.setItem('verificationEmail', value);
          const storedCustomer = JSON.parse(localStorage.getItem('customer'));
          const updatedCustomer = { 
            ...storedCustomer, 
            email: value,
            is_verified: false
          };
          localStorage.setItem('customer', JSON.stringify(updatedCustomer));
          setUserData(prev => ({
            ...prev,
            email: value,
            is_verified: false
          }));
          setEditingField(null);
          navigate('/customer/verify');
          return;
        }
        setUserData(prev => ({
          ...prev,
          [field]: value
        }));
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = { 
          ...storedCustomer, 
          [field]: value
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        setEditingField(null);
        setSuccess('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
      setEditValues({
        username: userData.username,
        email: userData.email,
        name: userData.name,
        phone_number: userData.phone_number,
        address: userData.address
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
          name: editValues.name,
          username: editValues.username,
          email_address: editValues.email,
          phone_number: editValues.phone_number,
          address: editValues.address
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data) {
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = { 
          ...storedCustomer, 
          name: editValues.name,
          username: editValues.username,
          email: editValues.email,
          phone_number: editValues.phone_number,
          address: editValues.address
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
        <div className="profile-card">
          <div className="profile-pic-section">
            <img src={previewUrl || getProfilePictureUrl()} alt="Profile" className="profile-picture" />
            <button className="edit-profile-pic-btn" onClick={handlePencilClick} title="Change profile picture">
              <span role="img" aria-label="Edit">✏️</span>
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleProfilePictureChange} />
          </div>
          <form className="profile-form" onSubmit={handleSubmit}>
            <h2>Profile</h2>
            <div className="form-row">
              <label>Username</label>
              <input type="text" name="username" value={editValues.username} onChange={handleInputChange} required />
            </div>
            <div className="form-row">
              <label>Name</label>
              <input type="text" name="name" value={editValues.name} onChange={handleInputChange} required />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" name="email" value={editValues.email} onChange={handleInputChange} required />
            </div>
            <div className="form-row">
              <label>Phone Number</label>
              <input type="text" value={userData.phone_number} disabled />
            </div>
            <div className="form-row">
              <label>Address</label>
              <input type="text" value={userData.address || ''} disabled />
            </div>
            <button className="save-btn" type="submit" style={{ marginTop: 24 }}>Save</button>
          </form>
        </div>
      </div>
    </div>
  );
} 