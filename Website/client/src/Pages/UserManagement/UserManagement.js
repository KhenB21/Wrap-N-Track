import React, { useEffect, useState } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import './UserManagement.css';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirmation, setConfirmation] = useState({ open: false, message: '' });
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      if (!user || user.role !== 'admin') {
        setError('Access denied. Admins only.');
        setLoading(false);
        return;
      }

      console.log('Fetching users with token:', token);
      const response = await api.get(`${config.API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('Fetched users:', data);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }

      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCardClick = (user) => {
    setSelectedUser(user);
    setEditData({ ...user });
    setModalOpen(true);
    setActionError(null);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
    setEditData(null);
    setActionError(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmationClose = () => {
    setConfirmation({ open: false, message: '' });
  };

  const handleSave = async () => {
    setActionError(null);
    try {
      const token = localStorage.getItem('token');
      const { profile_picture_data, mobile, department, status, ...userDataToSend } = editData;
      const response = await api.put(`${config.API_URL}/api/users/${selectedUser.user_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userDataToSend),
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found (may have been deleted)');
        throw new Error('Failed to update user');
      }
      await fetchUsers();
      handleModalClose();
      setConfirmation({ open: true, message: 'User updated successfully!' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`${config.API_URL}/api/users/${selectedUser.user_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found (may have been deleted)');
        throw new Error('Failed to delete user');
      }
      await fetchUsers();
      handleModalClose();
      setConfirmation({ open: true, message: 'User deleted successfully!' });
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar />
          <div className="user-management-container">
            <div className="loading">Loading users...</div>
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
          <TopBar />
          <div className="user-management-container">
            <div className="error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const admins = users.filter(u => u.role === 'admin');
  const employees = users.filter(u => u.role !== 'admin');

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        <div className="user-management-container">
          <div className="user-management-header">
            <h1>Account Management</h1>
            <button className="register-user-btn" onClick={() => navigate('/register')}>Register Account</button>
          </div>
          
          {users.length === 0 ? (
            <div className="no-users-message">No users found. Click "Register Account" to add a new user.</div>
          ) : (
            <>
              {admins.length > 0 && (
                <>
                  <h2 className="user-section-title">Admins</h2>
                  <div className="user-cards-list">
                    {admins.map((user) => (
                      <div className="user-card" key={user.user_id} onClick={() => handleCardClick(user)}>
                        <div className="user-card-header">
                          <img
                            src={user.profile_picture_data ? `data:image/jpeg;base64,${user.profile_picture_data}` : '/placeholder-profile.png'}
                            alt="Profile"
                            className="user-profile-pic-large"
                          />
                          <div>
                            <div className="user-card-name">{user.name}</div>
                            <div className="user-card-role">{user.role}</div>
                          </div>
                        </div>
                        <div className="user-card-info">
                          <div><span className="user-card-label">User ID:</span> {user.user_id}</div>
                          <div><span className="user-card-label">Email:</span> {user.email}</div>
                          <div><span className="user-card-label">Role:</span> {user.role}</div>
                          <div><span className="user-card-label">Created At:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
                          {user.mobile && <div><span className="user-card-label">Mobile:</span> {user.mobile}</div>}
                          {user.department && <div><span className="user-card-label">Department:</span> {user.department}</div>}
                          {user.status && <div><span className="user-card-label">Status:</span> {user.status}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {employees.length > 0 && (
                <>
                  <h2 className="user-section-title">Employees</h2>
                  <div className="user-cards-list">
                    {employees.map((user) => (
                      <div className="user-card" key={user.user_id} onClick={() => handleCardClick(user)}>
                        <div className="user-card-header">
                          <img
                            src={user.profile_picture_data ? `data:image/jpeg;base64,${user.profile_picture_data}` : '/placeholder-profile.png'}
                            alt="Profile"
                            className="user-profile-pic-large"
                          />
                          <div>
                            <div className="user-card-name">{user.name}</div>
                            <div className="user-card-role">{user.role}</div>
                          </div>
                        </div>
                        <div className="user-card-info">
                          <div><span className="user-card-label">User ID:</span> {user.user_id}</div>
                          <div><span className="user-card-label">Email:</span> {user.email}</div>
                          <div><span className="user-card-label">Role:</span> {user.role}</div>
                          <div><span className="user-card-label">Created At:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
                          {user.mobile && <div><span className="user-card-label">Mobile:</span> {user.mobile}</div>}
                          {user.department && <div><span className="user-card-label">Department:</span> {user.department}</div>}
                          {user.status && <div><span className="user-card-label">Status:</span> {user.status}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {modalOpen && selectedUser && (
          <div className="user-modal-overlay" onClick={handleModalClose}>
            <div className="user-modal" onClick={e => e.stopPropagation()}>
              <div className="user-modal-header">
                <h3>Edit User</h3>
                <button className="user-modal-close" onClick={handleModalClose}>&times;</button>
              </div>
              <div className="user-modal-body">
                <img
                  src={selectedUser.profile_picture_data ? `data:image/jpeg;base64,${selectedUser.profile_picture_data}` : '/placeholder-profile.png'}
                  alt="Profile"
                  className="user-profile-pic-large"
                  style={{ marginBottom: 12 }}
                />
                <div className="user-modal-fields">
                  <label>User ID: <span>{selectedUser.user_id}</span></label>
                  <label>Name: <input name="name" value={editData.name} onChange={handleEditChange} /></label>
                  <label>Email: <input name="email" value={editData.email} onChange={handleEditChange} /></label>
                  <label>Role: <select name="role" value={editData.role} onChange={handleEditChange}>
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </select></label>
                  <label>Created At: <span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</span></label>
                  {selectedUser.mobile && <label>Mobile: <input name="mobile" value={editData.mobile || ''} onChange={handleEditChange} /></label>}
                  {selectedUser.department && <label>Department: <input name="department" value={editData.department || ''} onChange={handleEditChange} /></label>}
                  {selectedUser.status && <label>Status: <input name="status" value={editData.status || ''} onChange={handleEditChange} /></label>}
                </div>
                {actionError && <div className="error" style={{marginTop:8}}>{actionError}</div>}
              </div>
              <div className="user-modal-actions">
                <button className="user-modal-save" onClick={handleSave}>Save</button>
                <button className="user-modal-delete" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {confirmation.open && (
          <div className="user-modal-overlay" onClick={handleConfirmationClose}>
            <div className="user-modal" onClick={e => e.stopPropagation()}>
              <div className="user-modal-header">
                <h3>Success</h3>
                <button className="user-modal-close" onClick={handleConfirmationClose}>&times;</button>
              </div>
              <div className="user-modal-body">
                <div style={{textAlign:'center',fontSize:'1.1rem',color:'#3bb77e',margin:'18px 0'}}>{confirmation.message}</div>
              </div>
              <div className="user-modal-actions">
                <button className="user-modal-save" onClick={handleConfirmationClose}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement; 