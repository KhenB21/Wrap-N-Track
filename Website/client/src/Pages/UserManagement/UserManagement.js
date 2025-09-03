import React, { useEffect, useState } from 'react';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
// Central axios instance
import api from '../../api';
import './UserManagement.css';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';

const UserManagement = () => {
  const { checkPermission } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirmation, setConfirmation] = useState({ open: false, message: '' });
  const [inventory, setInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const navigate = useNavigate();

  const fetchInventory = async () => {
    try {
  const response = await api.get('/api/inventory');
      if (response.data) {
        setInventory(response.data);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
  const response = await api.get('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.data) {
        throw new Error('Failed to fetch users');
      }
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid data format received from server');
      }

      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred while fetching users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPermission('accountManagement');
    fetchUsers();
    fetchInventory();
  }, []);

  const handleCardClick = (user) => {
    setSelectedUser(user);
    setEditData({ 
      ...user,
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      mobile: user.mobile || '',
      is_active: user.is_active === undefined ? true : user.is_active, // Default to active
    });
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
    // For the status dropdown, the value is a string 'true' or 'false', convert to boolean
    if (name === 'is_active') {
      setEditData((prev) => ({ ...prev, [name]: value === 'true' }));
    } else {
      setEditData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setActionError(null);
    try {
      const { profile_picture_data, ...userDataToSend } = editData;
      const token = localStorage.getItem('token');

  const response = await api.put(`/api/users/${selectedUser.user_id}`, userDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      await fetchUsers();
      handleModalClose();
      setConfirmation({ open: true, message: response.data.message || 'User updated successfully!' });
    } catch (err) {
      console.error('Error updating user:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to update user.');
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
  await api.delete(`/api/users/${selectedUser.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      await fetchUsers();
      handleModalClose();
      setConfirmation({ open: true, message: 'User deleted successfully!' });
    } catch (err) {
      console.error('Error deleting user:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to delete user.');
    }
  };

  const handleConfirmationClose = () => {
    setConfirmation({ open: false, message: '' });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar />
          <div className="user-management-container">
            <h1>Account Management</h1>
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading users...</p>
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
          <TopBar />
          <div className="user-management-container">
            <h1>Account Management</h1>
            <div className="error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar 
          lowStockProducts={inventory.filter(item => Number(item.quantity || 0) < 300)}
        />
        <div className="user-management-container">
          <div className="user-management-header">
            <h1>Account Management</h1>
            <button className="register-user-btn" onClick={() => navigate('/register')}>Register Account</button>
          </div>
          
          {users.length === 0 ? (
            <div className="no-users-message">No users found. Click "Register Account" to add a new user.</div>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Name</th>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <img
                          src={user.profile_picture_data ? `data:image/jpeg;base64,${user.profile_picture_data}` : '/placeholder-profile.png'}
                          alt={user.name}
                          className="user-table-profile-pic"
                        />
                      </td>
                      <td>{user.name}</td>
                      <td>{user.user_id}</td>
                      <td>{user.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>{user.role.replace(/_/g, ' ')}</td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button 
                          onClick={() => handleCardClick(user)} 
                          className="edit-user-btn-table action-btn"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <option value="super_admin">Super Admin</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="social_media_manager">Social Media Manager</option>
                  </select></label>
                  <label>Created At: <span>{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}</span></label>
                  {editData.mobile !== undefined && <label>Contact Number: <input name="mobile" value={editData.mobile || ''} onChange={handleEditChange} /></label>}
                  {editData.is_active !== undefined && (
                    <label>Status:
                      <select name="is_active" value={editData.is_active} onChange={handleEditChange}>
                        <option value={true}>Active</option>
                        <option value={false}>Inactive</option>
                      </select>
                    </label>
                  )}
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