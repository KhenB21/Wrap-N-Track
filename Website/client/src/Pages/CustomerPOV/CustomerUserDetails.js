import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CustomerUserDetails.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import { useAuth } from '../../Context/AuthContext';

export default function CustomerUserDetails() {
  const { isEmployee, logout } = useAuth();
  const [userData, setUserData] = useState({
    user_id: '',
    name: '',
    username: '',
    email: '',
    profile_picture_base64: '', // customer
    profile_picture_data: '',   // employee
    phone_number: '',
    address: '',
    created_at: '',
    role: ''
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
  const [viewMode, setViewMode] = useState('view'); // 'view' | 'edit'
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
    const customerToken = localStorage.getItem('customerToken');
    const employeeToken = localStorage.getItem('token');
    if (!customerToken && !employeeToken) {
      navigate('/customer-login');
      return;
    }
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (customerToken) {
          const response = await api.get('/api/customer/profile');
          if (!response.data?.success || !response.data.customer) {
            throw new Error('Failed to fetch customer profile');
          }
          const c = response.data.customer;
          const mapped = {
            user_id: c.customer_id,
            name: c.name || '',
            username: c.username || '',
            email: c.email || c.email_address || '',
            phone_number: c.phone_number || '',
            address: c.address || '',
            profile_picture_base64: c.profile_picture_base64 || '',
            created_at: c.created_at || '',
            role: 'Customer'
          };
          setUserData(mapped);
          setEditValues({
            username: mapped.username,
            name: mapped.name,
            email: mapped.email,
            phone_number: mapped.phone_number,
            address: mapped.address
          });
        } else {
          const response = await api.get('/api/user/details');
          if (!response.data) {
            throw new Error('Failed to fetch employee details');
          }
          const e = response.data;
          setUserData({
            user_id: e.user_id,
            name: e.name || '',
            username: e.name || '',
            email: e.email || '',
            phone_number: e.phone_number || '',
            address: e.address || '',
            profile_picture_data: e.profile_picture_data || '',
            created_at: e.created_at || e.createdAt || '',
            role: 'Employee'
          });
          setEditValues({
            username: e.name || '',
            name: e.name || '',
            email: e.email || '',
            phone_number: e.phone_number || '',
            address: e.address || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message || 'Failed to fetch user details');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  const getProfilePictureUrl = () => {
    if (previewUrl) return previewUrl;
    if (userData.profile_picture_base64) {
      return `data:image/jpeg;base64,${userData.profile_picture_base64}`;
    }
    if (userData.profile_picture_data) {
      return `data:image/jpeg;base64,${userData.profile_picture_data}`;
    }
    return '';
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
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

  const createdLabel = userData.created_at ? new Date(userData.created_at).toLocaleDateString() : '—';

  if (loading) {
    return (
      <div className="customer-user-details-container">
        <TopbarCustomer />
        <div className="customer-user-details-content">
          <div className="profile-card">
            <div className="skeleton-avatar" />
            <div className="skeleton-line" style={{ width: '60%' }} />
            <div className="skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton-line" style={{ width: '80%', marginTop: 16 }} />
            <div className="skeleton-line" style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-user-details-container">
      <TopbarCustomer />
      <div className="customer-user-details-content">
        {/* Employee banner (blue), dismissible */}
        {isEmployee && (
          <EmployeeBanner />
        )}

        <div className="profile-card">
          <div className="profile-pic-section">
            {getProfilePictureUrl() ? (
              <img src={getProfilePictureUrl()} alt="Profile" className="profile-picture" />
            ) : (
              <div className="profile-initials" aria-label="Profile placeholder">
                {getInitials(userData.name)}
              </div>
            )}
            <button className="edit-profile-pic-btn" onClick={handlePencilClick} title="Change profile picture">
              <span role="img" aria-label="Edit">✏️</span>
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleProfilePictureChange} />
          </div>

          {/* Top section: name + role */}
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <div className="user-name-heading">{userData.name || userData.username}</div>
            <span className={`role-badge ${isEmployee ? 'employee' : 'customer'}`}>{userData.role || (isEmployee ? 'Employee' : 'Customer')}</span>
          </div>

          {/* Details */}
          {error && <div className="error" role="alert">{error}</div>}
          {success && <div className="success" role="status">{success}</div>}

          {viewMode === 'view' && (
            <div className="details-list">
              <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{userData.email || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Role</span><span className="detail-value">{userData.role || (isEmployee ? 'Employee' : 'Customer')}</span></div>
              <div className="detail-row"><span className="detail-label">Account Created</span><span className="detail-value">{createdLabel}</span></div>
              {userData.phone_number && (
                <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{userData.phone_number}</span></div>
              )}
              {userData.address && (
                <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{userData.address}</span></div>
              )}
            </div>
          )}

          {viewMode === 'edit' && (
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
          )}

          {/* Actions */}
          <div className="actions-row">
            <button className="secondary-btn" onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}>
              {viewMode === 'view' ? 'Edit Profile' : 'Cancel'}
            </button>
            <button className="danger-btn" onClick={() => { logout(); navigate('/customer-home'); }}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
} 

function EmployeeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="employee-banner">
      <div className="employee-banner-left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 15h-1v-6h2v6h-1Zm0-8h-1V7h2v2h-1Z" fill="#0369a1"/>
        </svg>
        <span>You are logged in with employee privileges.</span>
      </div>
      <div className="employee-banner-actions">
        <Link to="/employee-dashboard" className="employee-banner-cta">Go to Employee Dashboard</Link>
        <button className="employee-banner-dismiss" aria-label="Dismiss" onClick={() => setDismissed(true)}>×</button>
      </div>
    </div>
  );
}