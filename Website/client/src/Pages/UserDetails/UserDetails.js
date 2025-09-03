/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
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
      const response = await api.post('/api/user/profile-picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
      const data = await response.json();
      setUserData((prev) => ({ ...prev, profile_picture_path: data.profile_picture_path }));
      setPreviewUrl(null);
      // Update localStorage user object with new profile_picture_path
      const updatedUser = { ...userData, profile_picture_path: data.profile_picture_path };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload(); // Force reload so all pages update the mini icon
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
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
          </div>
        </div>
      </div>
    </div>
  );
} 