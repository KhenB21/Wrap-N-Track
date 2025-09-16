import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import CustomerModal from './CustomerModal';
import CustomerCard from './CustomerCard';
import './Customers.css';
import api from '../../api';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/customers');
      setCustomers(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter and search customers
  useEffect(() => {
    let filtered = customers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone_number && customer.phone_number.includes(searchTerm))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(customer => customer.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [customers, searchTerm, filterStatus, sortBy, sortOrder]);

  // Handle customer operations
  const handleAddCustomer = () => {
    setModalMode('add');
    setSelectedCustomer(null);
    setShowModal(true);
  };

  const handleEditCustomer = (customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/api/customers/${customerId}`);
        await fetchCustomers();
        toast.success('Customer deleted successfully');
      } catch (err) {
        console.error('Error deleting customer:', err);
        toast.error('Failed to delete customer');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) {
      toast.warning('Please select customers to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customers?`)) {
      try {
        const deletePromises = Array.from(selectedCustomers).map(id =>
          api.delete(`/api/customers/${id}`)
        );
        await Promise.all(deletePromises);
        await fetchCustomers();
        setSelectedCustomers(new Set());
        toast.success(`${selectedCustomers.size} customers deleted successfully`);
      } catch (err) {
        console.error('Error deleting customers:', err);
        toast.error('Failed to delete customers');
      }
    }
  };

  const handleModalSave = async (customerData) => {
    try {
      if (modalMode === 'add') {
        await api.post('/api/customers', customerData);
        toast.success('Customer added successfully');
      } else {
        await api.put(`/api/customers/${selectedCustomer.customer_id}`, customerData);
        toast.success('Customer updated successfully');
      }
      await fetchCustomers();
      setShowModal(false);
    } catch (err) {
      console.error('Error saving customer:', err);
      toast.error('Failed to save customer');
    }
  };

  const handleSelectCustomer = (customerId) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === paginatedCustomers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(paginatedCustomers.map(c => c.customer_id)));
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Statistics
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active' || !c.status).length,
    inactive: customers.filter(c => c.status === 'inactive').length,
    selected: selectedCustomers.size
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main">
          <TopBar />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        
        <div className="customers-page">
          {/* Header Section */}
          <div className="customers-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="page-title">
                  <span className="title-icon">👥</span>
                  Customer Management
                </h1>
                <p className="page-subtitle">Manage your customer database</p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn-primary"
                  onClick={handleAddCustomer}
                >
                  <span className="btn-icon">+</span>
                  Add Customer
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">📊</div>
              <div className="stat-content">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total Customers</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.active}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon inactive">⏸️</div>
              <div className="stat-content">
                <div className="stat-number">{stats.inactive}</div>
                <div className="stat-label">Inactive</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon selected">🎯</div>
              <div className="stat-content">
                <div className="stat-number">{stats.selected}</div>
                <div className="stat-label">Selected</div>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="customers-controls">
            <div className="controls-left">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="name">Sort by Name</option>
                <option value="email_address">Sort by Email</option>
                <option value="created_at">Sort by Date</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-order-btn"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="controls-right">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  ⊞
                </button>
                <button
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  ☰
                </button>
              </div>

              {selectedCustomers.size > 0 && (
                <button
                  className="btn-danger"
                  onClick={handleBulkDelete}
                >
                  <span className="btn-icon">🗑️</span>
                  Delete Selected ({selectedCustomers.size})
                </button>
              )}
            </div>
          </div>

          {/* Customer List */}
          <div className="customers-content">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
                <button onClick={fetchCustomers} className="retry-btn">Retry</button>
              </div>
            )}

            {filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No customers found</h3>
                <p>
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first customer'
                  }
                </p>
                {!searchTerm && filterStatus === 'all' && (
                  <button className="btn-primary" onClick={handleAddCustomer}>
                    Add First Customer
                  </button>
                )}
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="customers-grid">
                    {paginatedCustomers.map((customer) => (
                      <CustomerCard
                        key={customer.customer_id}
                        customer={customer}
                        isSelected={selectedCustomers.has(customer.customer_id)}
                        onSelect={handleSelectCustomer}
                        onEdit={handleEditCustomer}
                        onDelete={handleDeleteCustomer}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="customers-table-container">
                    <table className="customers-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.size === paginatedCustomers.length && paginatedCustomers.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCustomers.map((customer) => (
                          <tr key={customer.customer_id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedCustomers.has(customer.customer_id)}
                                onChange={() => handleSelectCustomer(customer.customer_id)}
                              />
                            </td>
                            <td>
                              <div className="customer-info">
                                <div className="customer-avatar">
                                  {customer.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="customer-details">
                                  <div className="customer-name">{customer.name}</div>
                                  <div className="customer-id">#{customer.customer_id}</div>
                                </div>
                              </div>
                            </td>
                            <td>{customer.email_address}</td>
                            <td>{customer.phone_number || 'N/A'}</td>
                            <td>
                              <span className={`status-badge ${customer.status || 'active'}`}>
                                {customer.status || 'Active'}
                              </span>
                            </td>
                            <td>
                              {customer.created_at 
                                ? new Date(customer.created_at).toLocaleDateString()
                                : 'N/A'
                              }
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="action-btn edit"
                                  onClick={() => handleEditCustomer(customer)}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDeleteCustomer(customer.customer_id)}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      ← Previous
                    </button>
                    
                    <div className="pagination-numbers">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      className="pagination-btn"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <CustomerModal
            mode={modalMode}
            customer={selectedCustomer}
            onSave={handleModalSave}
            onClose={() => setShowModal(false)}
          />
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </div>
  );
}