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
  const [itemsPerPage] = useState(10);

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

    setFilteredCustomers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

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
        toast.success('Customer deleted successfully!');
      } catch (err) {
        console.error('Error deleting customer:', err);
        toast.error('Failed to delete customer');
      }
    }
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
            <h2>Customer Management</h2>
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

          <div className="customers-filters">
            <div className="filter-group">
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
            <div className="results-info">
              Showing {currentCustomers.length} of {filteredCustomers.length} customers
            </div>
          </div>

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
                      <th>Customer ID</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Address</th>
                      <th>Date Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCustomers.map(customer => (
                      <tr key={customer.customer_id}>
                        <td>#{customer.customer_id}</td>
                        <td className="customer-name">{customer.name}</td>
                        <td className="customer-email">{customer.email_address || 'N/A'}</td>
                        <td>{customer.phone_number || 'N/A'}</td>
                        <td className="customer-address">{customer.address || 'N/A'}</td>
                        <td>{formatDate(customer.date_joined)}</td>
                        <td>{getStatusBadge(customer.status)}</td>
                        <td>
                          <div className="action-buttons">
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
                    <p>No customers found</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {showModal && (
          <CustomerModal
            mode={modalMode}
            customer={selectedCustomer}
            onSave={handleSaveCustomer}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
      
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}
