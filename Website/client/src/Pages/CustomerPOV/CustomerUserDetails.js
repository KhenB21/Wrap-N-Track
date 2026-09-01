import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CustomerUserDetails.css';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import { useAuth } from '../../Context/AuthContext';

const ORDER_STATUS_CLASS = {
  'Pending': 'pf-status-pending',
  'Order Placed': 'pf-status-pending',
  'Order Paid': 'pf-status-progress',
  'To Be Packed': 'pf-status-progress',
  'Order Shipped Out': 'pf-status-progress',
  'Ready for Delivery': 'pf-status-progress',
  'Order Received': 'pf-status-done',
  'Completed': 'pf-status-done',
  'Cancelled': 'pf-status-cancelled',
};

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
}

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
    house_street_number: '',
    barangay: '',
    city: '',
    postal_code: '',
    created_at: '',
    role: '',
    is_verified: false
  });
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('view'); // 'view' | 'edit'
  const [editValues, setEditValues] = useState({
    username: '',
    name: '',
    email: '',
    phone_number: '',
    house_street_number: '',
    barangay: '',
    city: '',
    postal_code: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Account verification (OTP) state
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyResendCountdown, setVerifyResendCountdown] = useState(0);

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
            house_street_number: c.house_street_number || '',
            barangay: c.barangay || '',
            city: c.city || '',
            postal_code: c.postal_code || '',
            profile_picture_base64: c.profile_picture_base64 || '',
            created_at: c.created_at || '',
            role: 'Customer',
            is_verified: !!c.is_verified
          };
          setUserData(mapped);
          setEditValues({
            username: mapped.username,
            name: mapped.name,
            email: mapped.email,
            phone_number: mapped.phone_number,
            house_street_number: mapped.house_street_number,
            barangay: mapped.barangay,
            city: mapped.city,
            postal_code: mapped.postal_code
          });

          setOrdersLoading(true);
          try {
            const ordersRes = await api.get('/api/customer-orders/orders');
            setOrders(ordersRes.data?.success ? (ordersRes.data.orders || []) : []);
          } catch (ordersErr) {
            console.error('Error fetching orders:', ordersErr);
            setOrders([]);
          } finally {
            setOrdersLoading(false);
          }
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditValues(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('customerToken');
      // Send the address as its parts — the backend derives the combined
      // display string ("12 Elm St, Barangay X, City, 1234") from these.
      const response = await api.put('/api/customer/profile',
        {
          name: editValues.name,
          username: editValues.username,
          email_address: editValues.email,
          phone_number: editValues.phone_number,
          house_street_number: editValues.house_street_number,
          barangay: editValues.barangay,
          city: editValues.city,
          postal_code: editValues.postal_code
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data?.customer) {
        const updated = response.data.customer;
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = {
          ...storedCustomer,
          name: updated.name,
          username: updated.username,
          email: updated.email_address,
          phone_number: updated.phone_number,
          address: updated.address,
          house_street_number: updated.house_street_number,
          barangay: updated.barangay,
          city: updated.city,
          postal_code: updated.postal_code
        };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        setUserData(prev => ({
          ...prev,
          name: updated.name,
          username: updated.username,
          email: updated.email_address,
          phone_number: updated.phone_number,
          address: updated.address,
          house_street_number: updated.house_street_number,
          barangay: updated.barangay,
          city: updated.city,
          postal_code: updated.postal_code
        }));
        setSuccess('Profile updated successfully!');
        setViewMode('view');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
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
      const token = localStorage.getItem('customerToken');
      const response = await api.put('/api/customer/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
  };

  // Verification requires: a valid address and phone number on file, and
  // proving email ownership via a one-time code (the same /api/otp/* flow
  // order placement uses).
  const handleStartVerification = async () => {
    setVerifyError('');
    if (!userData.address || !userData.address.trim()) {
      setVerifyError('Please add your address before verifying your account.');
      return;
    }
    if (!userData.phone_number || !/^(09\d{9}|\+639\d{9})$/.test(userData.phone_number.trim())) {
      setVerifyError('Please add a valid phone number (09XXXXXXXXX or +639XXXXXXXXX) before verifying your account.');
      return;
    }
    if (!userData.email) {
      setVerifyError('No email on file for this account.');
      return;
    }
    setVerifySending(true);
    try {
      await api.post('/api/otp/send-otp', { email: userData.email });
      setVerifyModalVisible(true);
      setVerifyCode('');
      setVerifyResendCountdown(30);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setVerifySending(false);
    }
  };

  const handleResendVerifyOtp = async () => {
    if (verifyResendCountdown > 0) return;
    setVerifyError('');
    try {
      await api.post('/api/otp/send-otp', { email: userData.email });
      setVerifyResendCountdown(30);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  useEffect(() => {
    if (verifyResendCountdown <= 0) return;
    const timer = setInterval(() => setVerifyResendCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [verifyResendCountdown > 0]);

  const handleConfirmVerification = async () => {
    setVerifyError('');
    if (!verifyCode || verifyCode.trim().length < 6) {
      setVerifyError('Please enter the 6-digit code.');
      return;
    }
    setVerifySubmitting(true);
    try {
      await api.post('/api/otp/verify-otp', { email: userData.email, code: verifyCode.trim() });
      const token = localStorage.getItem('customerToken');
      await api.put('/api/customer/mark-verified', {}, { headers: { Authorization: `Bearer ${token}` } });

      setUserData(prev => ({ ...prev, is_verified: true }));
      const storedCustomer = JSON.parse(localStorage.getItem('customer')) || {};
      localStorage.setItem('customer', JSON.stringify({ ...storedCustomer, is_verified: true }));

      setVerifyModalVisible(false);
      setVerifyCode('');
      setSuccess('Account verified!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setVerifySubmitting(false);
    }
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

      setUserData(prev => {
        const updatedUser = { ...prev, profile_picture_data: response.data.profile_picture_data };
        const storedCustomer = JSON.parse(localStorage.getItem('customer'));
        const updatedCustomer = { ...storedCustomer, profile_picture_data: response.data.profile_picture_data };
        localStorage.setItem('customer', JSON.stringify(updatedCustomer));
        return updatedUser;
      });
      setPreviewUrl(null);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
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
      <div className="pf-content">
        {isEmployee && <EmployeeBanner />}

        <div className="pf-header">
          <h1 className="pf-title">Profile</h1>
          <div className="pf-header-actions">
            <button className="secondary-btn" onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}>
              {viewMode === 'view' ? 'Edit Profile' : 'Cancel'}
            </button>
            <button className="secondary-btn" onClick={() => setShowPasswordChange(!showPasswordChange)}>
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
            <button className="danger-btn" onClick={() => { logout(); navigate('/customer-home'); }}>Logout</button>
          </div>
        </div>

        {error && <div className="error" role="alert">{error}</div>}
        {success && <div className="success" role="status">{success}</div>}

          <div className="pf-grid">
            {/* Left column */}
            <div className="pf-card pf-left-card">
              <div className="pf-avatar-row">
                <div className="pf-avatar-wrap">
                  {getProfilePictureUrl() ? (
                    <img src={getProfilePictureUrl()} alt="Profile" className="pf-avatar" />
                  ) : (
                    <div className="pf-avatar pf-avatar-initials" aria-label="Profile placeholder">
                      {getInitials(userData.name)}
                    </div>
                  )}
                  <button className="pf-avatar-edit" onClick={handlePencilClick} title="Change profile picture" aria-label="Change profile picture">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleProfilePictureChange} />
                </div>
                {viewMode === 'edit' ? (
                  <div className="pf-name-edit">
                    <input type="text" name="name" value={editValues.name} onChange={handleInputChange} placeholder="Full name" required />
                    <input type="text" name="username" value={editValues.username} onChange={handleInputChange} placeholder="Username" required />
                  </div>
                ) : (
                  <div>
                    <div className="pf-name">{userData.name || userData.username}</div>
                    <div className="pf-id">#{userData.username || userData.user_id}</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="pf-section">
                  <div className="pf-section-title">About</div>
                  {viewMode === 'edit' ? (
                    <>
                      <div className="pf-info-row pf-info-row-edit">
                        <span className="pf-info-icon" aria-hidden>📞</span>
                        <input type="text" name="phone_number" value={editValues.phone_number} onChange={handleInputChange} placeholder="+639XXXXXXXXX" />
                      </div>
                      <div className="pf-info-row pf-info-row-edit">
                        <span className="pf-info-icon" aria-hidden>✉️</span>
                        <input type="email" name="email" value={editValues.email} onChange={handleInputChange} placeholder="Email" required />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="pf-info-row">
                        <span className="pf-info-icon" aria-hidden>📞</span>
                        <span>{userData.phone_number || 'No phone on file'}</span>
                      </div>
                      <div className="pf-info-row">
                        <span className="pf-info-icon" aria-hidden>✉️</span>
                        <span>{userData.email || '—'}</span>
                      </div>
                    </>
                  )}
                  <div className="pf-info-row">
                    <span className="pf-info-icon" aria-hidden>🗓️</span>
                    <span>Member since {createdLabel}</span>
                  </div>
                  {viewMode !== 'edit' && (
                    <div className="pf-verify-row">
                      <span className={`pf-status-pill ${userData.is_verified ? 'pf-status-done' : 'pf-status-cancelled'}`}>
                        {userData.is_verified ? '✓ Verified' : 'Unverified'}
                      </span>
                      {!userData.is_verified && (
                        <button
                          type="button"
                          className="pf-verify-link"
                          onClick={handleStartVerification}
                          disabled={verifySending}
                        >
                          {verifySending ? 'Sending code…' : 'Verify account'}
                        </button>
                      )}
                    </div>
                  )}
                  {!userData.is_verified && verifyError && !verifyModalVisible && (
                    <div className="pf-empty-note" style={{ color: '#b0413e' }}>{verifyError}</div>
                  )}
                </div>

                <div className="pf-section">
                  <div className="pf-section-title">Address</div>
                  {viewMode === 'edit' ? (
                    <div className="pf-address-fields">
                      <div className="pf-field">
                        <label>Street No. / Unit Number / Floor</label>
                        <input type="text" name="house_street_number" value={editValues.house_street_number} onChange={handleInputChange} placeholder="e.g. 27 St, Unit 4B" />
                      </div>
                      <div className="pf-field">
                        <label>Barangay</label>
                        <input type="text" name="barangay" value={editValues.barangay} onChange={handleInputChange} placeholder="e.g. Lower Bicutan" />
                      </div>
                      <div className="pf-field">
                        <label>City</label>
                        <input type="text" name="city" value={editValues.city} onChange={handleInputChange} placeholder="e.g. Taguig City" />
                      </div>
                      <div className="pf-field">
                        <label>Postal Code</label>
                        <input type="text" name="postal_code" value={editValues.postal_code} onChange={handleInputChange} placeholder="e.g. 1630" maxLength={4} inputMode="numeric" />
                      </div>
                    </div>
                  ) : userData.address ? (
                    <div className="pf-info-row">
                      <span className="pf-info-icon" aria-hidden>📍</span>
                      <span>{userData.address}</span>
                    </div>
                  ) : (
                    <div className="pf-empty-note">No address on file yet — you'll be asked for one the next time you place an order.</div>
                  )}
                </div>

                {viewMode === 'edit' && (
                  <div className="pf-edit-actions">
                    <button type="submit" className="save-btn">Save</button>
                  </div>
                )}
              </form>
            </div>

            {/* Right column */}
            <div className="pf-card pf-right-card">
              <div className="pf-section-title pf-orders-title">Orders</div>
              {ordersLoading ? (
                <div className="pf-empty-note">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="pf-empty-note">No orders yet. Once you place an order, it'll show up here.</div>
              ) : (
                <div className="pf-table-wrap">
                  <table className="pf-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Status</th>
                        <th>Remaining Balance</th>
                        <th>Expected Delivery</th>
                        <th>Drop-off Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, i) => (
                        <tr key={order.order_id || i} onClick={() => navigate('/customer-cart')} tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/customer-cart'); }}>
                          <td className="pf-order-id">{order.order_id}</td>
                          <td>
                            <span className={`pf-status-pill ${ORDER_STATUS_CLASS[order.status] || 'pf-status-pending'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{order.remaining_balance != null ? formatPeso(order.remaining_balance) : '—'}</td>
                          <td>{formatDate(order.expected_delivery)}</td>
                          <td className="pf-location">{order.shipping_address || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        {/* Password Change Form */}
        {showPasswordChange && (
          <div className="pf-card pf-password-card">
            <div className="pf-section-title">Change Password</div>
            <form className="pf-password-form" onSubmit={handlePasswordSubmit}>
              {passwordError && <div className="error" role="alert">{passwordError}</div>}

              <div className="pf-field">
                <label>Current Password</label>
                <div className="pf-password-input-wrap">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <PasswordToggle shown={showCurrentPassword} onClick={() => setShowCurrentPassword(v => !v)} />
                </div>
              </div>

              <div className="pf-field">
                <label>New Password</label>
                <div className="pf-password-input-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="8"
                  />
                  <PasswordToggle shown={showNewPassword} onClick={() => setShowNewPassword(v => !v)} />
                </div>
              </div>

              <div className="pf-field">
                <label>Confirm New Password</label>
                <div className="pf-password-input-wrap">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="8"
                  />
                  <PasswordToggle shown={showConfirmPassword} onClick={() => setShowConfirmPassword(v => !v)} />
                </div>
              </div>

              <div className="pf-edit-actions">
                <button className="save-btn" type="submit">Change Password</button>
              </div>
            </form>
          </div>
        )}

        {/* Verify Account OTP Modal */}
        {verifyModalVisible && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
            <div style={{ background: '#fff', width: 420, maxWidth: '90vw', borderRadius: 12, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Verify your account</h3>
                <button onClick={() => { setVerifyModalVisible(false); setVerifyCode(''); setVerifyError(''); }} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ color: '#666', marginBottom: 12 }}>We've sent a one-time code to <strong>{userData.email}</strong>. Enter it below to verify your account.</p>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={6}
                placeholder="Enter 6-digit code"
                style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 6, marginBottom: 8, fontSize: 16, letterSpacing: 4, textAlign: 'center' }}
              />
              {verifyError && <div style={{ color: '#b0413e', marginBottom: 8 }}>{verifyError}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button
                  onClick={handleResendVerifyOtp}
                  disabled={verifyResendCountdown > 0}
                  style={{ padding: '8px 12px', background: verifyResendCountdown > 0 ? '#ddd' : '#696a8f', color: verifyResendCountdown > 0 ? '#888' : '#fff', border: 'none', borderRadius: 6, cursor: verifyResendCountdown > 0 ? 'not-allowed' : 'pointer' }}
                >
                  {verifyResendCountdown > 0 ? `Resend (${verifyResendCountdown}s)` : 'Resend code'}
                </button>
                <button
                  onClick={handleConfirmVerification}
                  disabled={verifySubmitting}
                  style={{ padding: '10px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: verifySubmitting ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: verifySubmitting ? 0.7 : 1 }}
                >
                  {verifySubmitting ? 'Verifying…' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordToggle({ shown, onClick }) {
  return (
    <button type="button" className="pf-password-toggle" onClick={onClick} aria-label={shown ? 'Hide password' : 'Show password'}>
      {shown ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.36 5.11A9.94 9.94 0 0 1 12 4.75c5 0 9 4 10.25 7.25a11.4 11.4 0 0 1-2.61 3.87M6.53 6.53C4.4 8 2.9 10 1.75 12c1.25 3.25 5.25 7.25 10.25 7.25 1.4 0 2.71-.31 3.9-.84" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M1.75 12c1.25-3.25 5.25-7.25 10.25-7.25S21.25 8.75 22.25 12c-1.25 3.25-5.25 7.25-10.25 7.25S3 15.25 1.75 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      )}
    </button>
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
