import React, { useState, useEffect } from 'react';
import './Customers.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import CustomerModal from './CustomerModal';
import api from "../../api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePermissions from '../../hooks/usePermissions';

export default function Customers() {
  const { checkPermission } = usePermissions();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  useEffect(() => {
    checkPermission('customers');
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/customers');
      console.log('Fetched customers:', response.data);
      setCustomers(response.data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(term) ||
        customer.email_address?.toLowerCase().includes(term) ||
        customer.phone_number?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    // Sort filtered data
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleAddCustomer = () => {
    console.log('Add customer clicked'); // Debug log
    setModalMode('add');
    setSelectedCustomer(null);
    setShowModal(true);
  };

  const handleEditCustomer = (customer) => {
    console.log('Edit customer clicked:', customer); // Debug log
    setModalMode('edit');
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    setCustomerToDelete(customerId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/api/customers/${customerToDelete}`);
      await fetchCustomers();
      toast.success('Customer deleted successfully!');
      setSelectedCustomers(prev => prev.filter(id => id !== customerToDelete));
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Failed to delete customer');
    } finally {
      setShowDeleteConfirm(false);
      setCustomerToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setCustomerToDelete(null);
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (modalMode === 'add') {
        await api.post('/api/customers', customerData);
        toast.success('Customer added successfully!');
      } else {
        await api.put(`/api/customers/${selectedCustomer.customer_id}`, customerData);
        toast.success('Customer updated successfully!');
      }
      setShowModal(false);
      await fetchCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save customer';
      toast.error(errorMessage);
    }
  };

  // Bulk operations
  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === currentCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(currentCustomers.map(customer => customer.customer_id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    try {
      await Promise.all(selectedCustomers.map(id => 
        api.put(`/api/customers/${id}`, { 
          ...customers.find(c => c.customer_id === id),
          status: newStatus 
        })
      ));
      await fetchCustomers();
      setSelectedCustomers([]);
      toast.success(`${selectedCustomers.length} customers updated successfully!`);
    } catch (err) {
      console.error('Error updating customers:', err);
      toast.error('Failed to update customers');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCustomers.length} customers?`)) {
      try {
        await Promise.all(selectedCustomers.map(id => api.delete(`/api/customers/${id}`)));
        await fetchCustomers();
        setSelectedCustomers([]);
        toast.success(`${selectedCustomers.length} customers deleted successfully!`);
      } catch (err) {
        console.error('Error deleting customers:', err);
        toast.error('Failed to delete customers');
      }
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14l5-5 5 5z"/>
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5 5z"/>
      </svg>
    );
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export functionality
  const exportToCSV = () => {
    const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Address', 'Status', 'Date Joined'];
    const csvContent = [
      headers.join(','),
      ...filteredCustomers.map(customer => [
        customer.customer_id,
        `"${customer.name || ''}"`,
        `"${customer.email_address || ''}"`,
        `"${customer.phone_number || ''}"`,
        `"${customer.address || ''}"`,
        customer.status || 'active',
        formatDate(customer.date_joined || customer.created_at)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Customer data exported successfully!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusClass = status === 'active' ? 'status-active' : 'status-inactive';
    return <span className={`status-badge ${statusClass}`}>{status || 'active'}</span>;
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar
          searchValue={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
        />
        
        <div className="customers-container">
          <div className="customers-header">
            <div className="header-left">
              <h2>Customer Management</h2>
              <p className="header-subtitle">
                Manage your customer database and relationships
              </p>
            </div>
            <div className="header-actions">
              <button 
                className="export-btn" 
                onClick={exportToCSV}
                title="Export to CSV"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
                Export
              </button>
              <button 
                className="add-customer-btn" 
                onClick={handleAddCustomer}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Customer
              </button>
            </div>
          </div>

          <div className="customers-controls">
            <div className="filters-section">
              <div className="filter-group">
                <label>Status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Show:</label>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="items-per-page"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            <div className="results-info">
              {selectedCustomers.length > 0 ? (
                <span className="selected-count">
                  {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
                </span>
              ) : (
                <span>
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
                </span>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCustomers.length > 0 && (
            <div className="bulk-actions">
              <div className="bulk-actions-left">
                <span className="bulk-actions-label">Bulk Actions:</span>
              </div>
              <div className="bulk-actions-buttons">
                <button 
                  className="bulk-btn bulk-activate"
                  onClick={() => handleBulkStatusUpdate('active')}
                >
                  Activate Selected
                </button>
                <button 
                  className="bulk-btn bulk-deactivate"
                  onClick={() => handleBulkStatusUpdate('inactive')}
                >
                  Deactivate Selected
                </button>
                <button 
                  className="bulk-btn bulk-delete"
                  onClick={handleBulkDelete}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading customers...</p>
            </div>
          ) : (
            <>
              <div className="customers-table-container">
                <table className="customers-table">
                  <thead>
                    <tr>
                      <th className="checkbox-column">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.length === currentCustomers.length && currentCustomers.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('customer_id')}
                      >
                        ID {getSortIcon('customer_id')}
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('name')}
                      >
                        Name {getSortIcon('name')}
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('email_address')}
                      >
                        Email {getSortIcon('email_address')}
                      </th>
                      <th>Phone</th>
                      <th>Address</th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('date_joined')}
                      >
                        Date Joined {getSortIcon('date_joined')}
                      </th>
                      <th 
                        className="sortable" 
                        onClick={() => handleSort('status')}
                      >
                        Status {getSortIcon('status')}
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCustomers.map(customer => (
                      <tr 
                        key={customer.customer_id}
                        className={selectedCustomers.includes(customer.customer_id) ? 'selected' : ''}
                      >
                        <td className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer.customer_id)}
                            onChange={() => handleSelectCustomer(customer.customer_id)}
                          />
                        </td>
                        <td className="customer-id">#{customer.customer_id}</td>
                        <td className="customer-name">{customer.name}</td>
                        <td className="customer-email">{customer.email_address || 'N/A'}</td>
                        <td className="customer-phone">{customer.phone_number || 'N/A'}</td>
                        <td className="customer-address">{customer.address || 'N/A'}</td>
                        <td className="customer-date">{formatDate(customer.date_joined || customer.created_at)}</td>
                        <td>{getStatusBadge(customer.status)}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn view-btn" 
                              onClick={() => {/* Add view functionality */}}
                              title="View Customer Details"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            </button>
                            <button 
                              className="action-btn edit-btn" 
                              onClick={() => handleEditCustomer(customer)}
                              title="Edit Customer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </button>
                            <button 
                              className="action-btn delete-btn" 
                              onClick={() => handleDeleteCustomer(customer.customer_id)}
                              title="Delete Customer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {currentCustomers.length === 0 && (
                  <div className="no-customers">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 21H5V3H13V9H19V21Z"/>
                    </svg>
                    <h3>No customers found</h3>
                    <p>
                      {searchTerm ? 
                        `No customers match your search "${searchTerm}"` : 
                        'Start by adding your first customer'
                      }
                    </p>
                    {!searchTerm && (
                      <button className="add-first-customer-btn" onClick={handleAddCustomer}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        Add Your First Customer
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <div className="pagination">
                    <button 
                      onClick={() => paginate(1)}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                      title="First page"
                    >
                      «
                    </button>
                    <button 
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="pagination-btn"
                      title="Previous page"
                    >
                      ‹
                    </button>
                    
                    {/* Page numbers */}
                    {(() => {
                      const delta = 2;
                      const range = [];
                      const rangeWithDots = [];

                      for (let i = Math.max(2, currentPage - delta); 
                           i <= Math.min(totalPages - 1, currentPage + delta); 
                           i++) {
                        range.push(i);
                      }

                      if (currentPage - delta > 2) {
                        rangeWithDots.push(1, '...');
                      } else {
                        rangeWithDots.push(1);
                      }

                      rangeWithDots.push(...range);

                      if (currentPage + delta < totalPages - 1) {
                        rangeWithDots.push('...', totalPages);
                      } else if (totalPages > 1) {
                        rangeWithDots.push(totalPages);
                      }

                      return rangeWithDots.map((page, index) => (
                        page === '...' ? (
                          <span key={index} className="pagination-dots">...</span>
                        ) : (
                          <button
                            key={index}
                            onClick={() => paginate(page)}
                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        )
                      ));
                    })()}
                    
                    <button 
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                      title="Next page"
                    >
                      ›
                    </button>
                    <button 
                      onClick={() => paginate(totalPages)}
                      disabled={currentPage === totalPages}
                      className="pagination-btn"
                      title="Last page"
                    >
                      »
                    </button>
                  </div>
                  
                  <div className="pagination-info">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Customer Modal */}
        {showModal && (
          <CustomerModal
            mode={modalMode}
            customer={selectedCustomer}
            onSave={handleSaveCustomer}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <div className="confirm-modal-header">
                <h3>Confirm Delete</h3>
              </div>
              <div className="confirm-modal-body">
                <p>Are you sure you want to delete this customer? This action cannot be undone.</p>
              </div>
              <div className="confirm-modal-actions">
                <button className="btn-cancel" onClick={cancelDelete}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={confirmDelete}>
                  Delete Customer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop 
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}
