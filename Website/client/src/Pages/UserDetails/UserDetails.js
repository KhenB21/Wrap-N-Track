/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import './UserDetails.css';

export default function UserDetails() {
  const [userData, setUserData] = useState({
    user_id: '',
    name: '',
    email: '',
    role: '',
    created_at: '',
    profile_picture_path: '',
    profile_picture_data: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (!token || !storedUser) {
          throw new Error('No authentication token found');
        }
        const parsedUser = JSON.parse(storedUser);
        setUserData(parsedUser);
      const response = await api.get('/api/user/details', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          console.warn('Could not fetch updated user data, using stored data');
          return;
        }
        const data = await response.json();
        setUserData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Function to get the full profile picture URL
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
      const token = localStorage.getItem('token');
      const response = await api.post('/api/user/profile-picture', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to upload profile picture');
      }
      
      setUserData((prev) => {
        const updatedUser = { ...prev, profile_picture_data: response.data.profile_picture_data };
        // Update localStorage with the new state
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      });
      setPreviewUrl(null);
      
      // Show success message
      alert('Profile picture updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/api/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        alert('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordChange(false);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const isAdminRole = ['admin'].includes(userData.role);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar avatarUrl={getProfilePictureUrl()} />
          <div className="user-details-container">
            <div className="user-details-card">
              <div className="loading">Loading user data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar avatarUrl={getProfilePictureUrl()} />
          <div className="user-details-container">
            <div className="user-details-card">
              <div className="error">Error: {error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        <div className="user-details-container">
          <div className="user-details-card">
            <h1>User Profile</h1>
            <div className="profile-picture-container" style={{ position: 'relative' }}>
              <img
                src={previewUrl || getProfilePictureUrl()}
                alt="Profile"
                className="profile-picture"
              />
              <button
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
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            {uploading && <div className="loading">Uploading...</div>}
            <div className="user-details-content">
              <div className="user-detail-item">
                <label>User ID:</label>
                <span>{userData.user_id}</span>
              </div>
              <div className="user-detail-item">
                <label>Name:</label>
                <span>{userData.name}</span>
              </div>
              <div className="user-detail-item">
                <label>Email:</label>
                <span>{userData.email}</span>
              </div>
              <div className="user-detail-item">
                <label>Role:</label>
                <span>{userData.role}</span>
              </div>
              <div className="user-detail-item">
                <label>Created At:</label>
                <span>{userData.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="user-detail-item">
                <label>Status:</label>
                <span className={isAdminRole ? 'status-admin' : 'status-employee'}>
                  {isAdminRole ? 'Admin' : 'Employee'}
                </span>
              </div>
              <div className="user-detail-item">
                <label>Last Updated:</label>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
            
            {/* Password Change Section */}
            <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <button 
                className="secondary-btn" 
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                style={{ marginBottom: '10px' }}
              >
                {showPasswordChange ? 'Cancel' : 'Change Password'}
              </button>
              
              {showPasswordChange && (
                <form onSubmit={handlePasswordSubmit}>
                  <h3>Change Password</h3>
                  {passwordError && <div className="error" role="alert">{passwordError}</div>}
                  <div className="form-group">
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      name="currentPassword" 
                      value={passwordData.currentPassword} 
                      onChange={handlePasswordChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      name="newPassword" 
                      value={passwordData.newPassword} 
                      onChange={handlePasswordChange} 
                      required 
                      minLength="8"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      name="confirmPassword" 
                      value={passwordData.confirmPassword} 
                      onChange={handlePasswordChange} 
                      required 
                      minLength="8"
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" style={{ marginTop: '10px' }}>Change Password</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 