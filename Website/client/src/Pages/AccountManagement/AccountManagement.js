import React, { useState, useEffect } from 'react';
import usePermissions from '../../hooks/usePermissions';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import UserFormModal from '../../Components/UserFormModal';
import ConfirmDialog from '../../Components/ConfirmDialog';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AccountManagement.css';
import api from '../../api';

const AccountManagement = () => {
  const { isReadOnly } = usePermissions();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [archiveTarget, setArchiveTarget] = useState(null); // { userId, name, action: 'archive'|'restore' }

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [showArchived]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/account-management/users', {
        params: {
          includeArchived: showArchived,
          search: searchTerm,
          role: roleFilter,
          status: statusFilter
        }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/api/account-management/roles');
      setRoles(response.data.roles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(u => u.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(u => !u.is_active);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleFormSaved = (message) => {
    toast.success(message);
    setShowAddModal(false);
    setEditingUser(null);
    fetchUsers();
  };

  const confirmArchiveToggle = async () => {
    if (!archiveTarget) return;
    const { userId, name, action } = archiveTarget;
    setArchiveTarget(null);
    try {
      await api.put(`/api/account-management/users/${userId}/${action}`);
      toast.success(`User ${name} has been ${action === 'archive' ? 'archived' : 'restored'}`);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getStatusBadge = (u) => {
    if (u.is_archived) {
      return <span className="status-badge archived">Archived</span>;
    }
    return u.is_active ?
      <span className="status-badge active">Active</span> :
      <span className="status-badge inactive">Inactive</span>;
  };

  if (isReadOnly()) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="account-management">
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to access Account Management.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="account-management">
          <div className="account-management-header">
            <h1>Account Management</h1>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add New User
            </button>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="filters-row">
              <div className="filter-group">
                <label>Search:</label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-group">
                <label>Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="filter-group">
                <label>
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />
                  Show Archived
                </label>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="users-table-container">
            {loading ? (
              <div className="loading">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="users-empty-state">
                <span className="users-empty-icon" aria-hidden="true">👥</span>
                <p>No users match your current filters.</p>
              </div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.user_id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{getRoleLabel(u.role)}</td>
                      <td>{getStatusBadge(u)}</td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditingUser(u)}
                          >
                            Edit
                          </button>
                          {u.is_archived ? (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => setArchiveTarget({ userId: u.user_id, name: u.name, action: 'restore' })}
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setArchiveTarget({ userId: u.user_id, name: u.name, action: 'archive' })}
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {showAddModal && (
            <UserFormModal
              mode="add"
              roles={roles}
              onClose={() => setShowAddModal(false)}
              onSaved={handleFormSaved}
            />
          )}

          {editingUser && (
            <UserFormModal
              mode="edit"
              user={editingUser}
              roles={roles}
              onClose={() => setEditingUser(null)}
              onSaved={handleFormSaved}
            />
          )}

          <ConfirmDialog
            open={!!archiveTarget}
            title={archiveTarget?.action === 'archive' ? 'Archive this user?' : 'Restore this user?'}
            message={archiveTarget
              ? `${archiveTarget.name} will be ${archiveTarget.action === 'archive' ? 'archived and signed out of access' : 'restored to active status'}.`
              : ''}
            confirmLabel={archiveTarget?.action === 'archive' ? 'Archive' : 'Restore'}
            tone={archiveTarget?.action === 'archive' ? 'danger' : 'default'}
            onConfirm={confirmArchiveToggle}
            onCancel={() => setArchiveTarget(null)}
          />

          <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
        </div>
      </div>
    </div>
  );
};

export default withEmployeeAuth(AccountManagement);
