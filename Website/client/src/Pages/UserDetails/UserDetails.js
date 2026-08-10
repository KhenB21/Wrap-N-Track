import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useAuth } from '../../Context/AuthContext';
import PasswordStrengthMeter from '../../Components/PasswordStrengthMeter';
import './UserDetails.css';

const ROLE_LABELS = {
  admin: 'Admin',
  business_developer: 'Business Developer',
  creatives: 'Creatives',
  director: 'Director',
  sales_manager: 'Sales Manager',
  assistant_sales: 'Assistant Sales',
  packer: 'Packer'
};

const formatRole = (role) => ROLE_LABELS[role] || role || 'Employee';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

function ProfileHeader({ userData, previewUrl, uploading, onPencilClick, fileInputRef, onFileChange, onRemovePicture, hasPicture }) {
  const initials = getInitials(userData.name);
  const isActive = userData.is_active !== false;

  return (
    <section className="profile-header-card fade-up">
      <div className="profile-avatar-block">
        <div className="profile-avatar-wrap">
          {previewUrl || hasPicture ? (
            <img
              src={previewUrl || `data:image/jpeg;base64,${userData.profile_picture_data}`}
              alt="Profile"
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-fallback">{initials}</div>
          )}
          <button
            type="button"
            className="avatar-overlay-btn"
            title="Change profile picture"
            aria-label="Change profile picture"
            onClick={onPencilClick}
            disabled={uploading}
          >
            {uploading ? <span className="spinner-sm" /> : <span aria-hidden="true">📷</span>}
          </button>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={onFileChange}
            disabled={uploading}
          />
        </div>
        {hasPicture && (
          <button type="button" className="link-btn danger-link" onClick={onRemovePicture} disabled={uploading}>
            Remove photo
          </button>
        )}
      </div>

      <div className="profile-header-info">
        <div className="profile-header-title-row">
          <h1>{userData.name || 'Unnamed User'}</h1>
          <span className={`status-pill ${isActive ? 'status-active' : 'status-inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span className="role-badge">{formatRole(userData.role)}</span>
        <p className="profile-header-email">{userData.email}</p>
        <div className="profile-header-meta">
          <span>Joined {formatDate(userData.created_at)}</span>
          <span className="meta-divider">•</span>
          <span>Last login {formatDateTime(userData.last_login)}</span>
        </div>
      </div>
    </section>
  );
}

function PersonalInfoCard({ userData }) {
  return (
    <section className="detail-card fade-up">
      <h2>Personal Information</h2>
      <div className="detail-grid">
        <div className="detail-field">
          <label>Full Name</label>
          <span>{userData.name || 'N/A'}</span>
        </div>
        <div className="detail-field">
          <label>Email Address</label>
          <span>{userData.email || 'N/A'}</span>
        </div>
        <div className="detail-field">
          <label>Role</label>
          <span>{formatRole(userData.role)}</span>
        </div>
        <div className="detail-field">
          <label>Account Status</label>
          <span className={userData.is_active !== false ? 'status-admin' : 'status-employee'}>
            {userData.is_active !== false ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </section>
  );
}

function AccountInfoCard({ userData }) {
  return (
    <section className="detail-card fade-up">
      <h2>Account Information</h2>
      <div className="detail-grid">
        <div className="detail-field">
          <label>User ID</label>
          <span>{userData.user_id}</span>
        </div>
        <div className="detail-field">
          <label>Account Created</label>
          <span>{formatDate(userData.created_at)}</span>
        </div>
        <div className="detail-field">
          <label>Last Login</label>
          <span>{formatDateTime(userData.last_login)}</span>
        </div>
        <div className="detail-field">
          <label>Email Verified</label>
          <span className={`verify-badge ${userData.is_email_verified ? 'verified' : 'unverified'}`}>
            {userData.is_email_verified ? '✓ Verified' : '✗ Not verified'}
          </span>
        </div>
      </div>
    </section>
  );
}

function SecurityCard() {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visibility, setVisibility] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lengthValid = passwordData.newPassword.length >= 8;
  const matchValid = passwordData.newPassword.length > 0 && passwordData.newPassword === passwordData.confirmPassword;
  const canSubmit = passwordData.currentPassword.length > 0 && lengthValid && matchValid && !submitting;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
    setSuccessMessage('');
  };

  const toggleVisibility = (field) => {
    setVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const resetForm = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setVisibility({ currentPassword: false, newPassword: false, confirmPassword: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');

    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await api.put('/api/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setSuccessMessage('Password changed successfully.');
        resetForm();
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPasswordField = (name, label, autoComplete) => (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <div className="password-input-wrap">
        <input
          id={name}
          type={visibility[name] ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          value={passwordData[name]}
          onChange={handleChange}
          required
        />
        <button
          type="button"
          className="visibility-toggle"
          onClick={() => toggleVisibility(name)}
          aria-label={visibility[name] ? `Hide ${label}` : `Show ${label}`}
          tabIndex={-1}
        >
          {visibility[name] ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );

  return (
    <section className="detail-card fade-up">
      <div className="card-header-row">
        <h2>Security</h2>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setShowPasswordChange((prev) => !prev);
            setPasswordError('');
            setSuccessMessage('');
            if (showPasswordChange) resetForm();
          }}
        >
          {showPasswordChange ? 'Cancel' : 'Change Password'}
        </button>
      </div>

      {showPasswordChange && (
        <form onSubmit={handleSubmit} className="password-form">
          {passwordError && <div className="form-banner banner-error" role="alert">{passwordError}</div>}
          {successMessage && <div className="form-banner banner-success" role="status">{successMessage}</div>}

          {renderPasswordField('currentPassword', 'Current Password', 'current-password')}
          {renderPasswordField('newPassword', 'New Password', 'new-password')}

          <PasswordStrengthMeter password={passwordData.newPassword} />

          {renderPasswordField('confirmPassword', 'Confirm New Password', 'new-password')}
          {passwordData.confirmPassword.length > 0 && !matchValid && (
            <p className="field-hint hint-error">Passwords do not match</p>
          )}
          {passwordData.newPassword.length > 0 && !lengthValid && (
            <p className="field-hint hint-error">Must be at least 8 characters</p>
          )}

          <button className="primary-btn" type="submit" disabled={!canSubmit}>
            {submitting ? <span className="spinner-sm" /> : 'Update Password'}
          </button>
        </form>
      )}
    </section>
  );
}

export default function UserDetails() {
  const { updateUser } = useAuth();
  const [userData, setUserData] = useState({
    user_id: '',
    name: '',
    email: '',
    role: '',
    created_at: '',
    last_login: null,
    is_email_verified: false,
    is_active: true,
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
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUserData((prev) => ({ ...prev, ...JSON.parse(storedUser) }));
        }

        const response = await api.get('/api/user/details');
        setUserData((prev) => ({ ...prev, ...response.data }));
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const getProfilePictureUrl = () => {
    if (userData.profile_picture_data) {
      return `data:image/jpeg;base64,${userData.profile_picture_data}`;
    }
    return null;
  };

  const handlePencilClick = () => {
    fileInputRef.current.click();
  };

  const validateImageFile = (file) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only PNG, JPG, JPEG, or WEBP images are allowed.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'Image must be smaller than 5MB.';
    }
    return null;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const response = await api.post('/api/user/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data.success) {
        throw new Error('Failed to upload profile picture');
      }

      setUserData((prev) => ({ ...prev, profile_picture_data: response.data.profile_picture_data }));
      updateUser({ profile_picture_data: response.data.profile_picture_data });
      setPreviewUrl(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePicture = async () => {
    setUploading(true);
    setError(null);
    try {
      await api.delete('/api/user/profile-picture');
      setUserData((prev) => ({ ...prev, profile_picture_data: null }));
      updateUser({ profile_picture_data: null });
      setPreviewUrl(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar avatarUrl={getProfilePictureUrl()} />
          <div className="user-details-container">
            <div className="skeleton-card">
              <div className="skeleton-shimmer skeleton-avatar" style={{ width: '96px', height: '96px' }} />
              <div className="skeleton-shimmer skeleton-title" style={{ width: '220px' }} />
              <div className="skeleton-shimmer skeleton-text" style={{ width: '160px' }} />
            </div>
            <div className="detail-cards-grid">
              <div className="skeleton-card">
                <div className="skeleton-shimmer skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '70%' }} />
              </div>
              <div className="skeleton-card">
                <div className="skeleton-shimmer skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton-shimmer skeleton-button" />
              </div>
              <div className="skeleton-card">
                <div className="skeleton-shimmer skeleton-text" style={{ width: '80%' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '60%' }} />
                <div className="skeleton-shimmer skeleton-text" style={{ width: '70%' }} />
              </div>
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
          {error && <div className="page-error" role="alert">{error}</div>}

          <ProfileHeader
            userData={userData}
            previewUrl={previewUrl}
            uploading={uploading}
            onPencilClick={handlePencilClick}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onRemovePicture={handleRemovePicture}
            hasPicture={!!userData.profile_picture_data}
          />

          <div className="detail-cards-grid">
            <PersonalInfoCard userData={userData} />
            <SecurityCard />
            <AccountInfoCard userData={userData} />
          </div>
        </div>
      </div>
    </div>
  );
}
