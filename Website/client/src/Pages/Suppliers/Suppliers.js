import React, { useState, useEffect } from 'react';
import './Suppliers.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import SupplierModal from './SupplierModal';
import api from "../../api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import usePermissions from '../../hooks/usePermissions';

export default function Suppliers() {
  const { checkPermission } = usePermissions();
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    checkPermission('suppliers');
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm, typeFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/suppliers');
      console.log('Fetched suppliers:', response.data);
      setSuppliers(response.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    let filtered = suppliers;

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name?.toLowerCase().includes(term) ||
        supplier.contact_person?.toLowerCase().includes(term) ||
        supplier.email_address?.toLowerCase().includes(term) ||
        supplier.cellphone?.toLowerCase().includes(term) ||
        supplier.description?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.type_of_supplies === typeFilter);
    }

    setFilteredSuppliers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleAddSupplier = () => {
    setModalMode('add');
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    setModalMode('edit');
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/api/suppliers/${supplierId}`);
        await fetchSuppliers();
        toast.success('Supplier deleted successfully!');
      } catch (err) {
        console.error('Error deleting supplier:', err);
        toast.error('Failed to delete supplier');
      }
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    try {
      if (modalMode === 'add') {
        await api.post('/api/suppliers', supplierData);
        toast.success('Supplier added successfully!');
      } else {
        await api.put(`/api/suppliers/${selectedSupplier.supplier_id}`, supplierData);
        toast.success('Supplier updated successfully!');
      }
      setShowModal(false);
      await fetchSuppliers();
    } catch (err) {
      console.error('Error saving supplier:', err);
      const errorMessage = err.response?.data?.message || 'Failed to save supplier';
      toast.error(errorMessage);
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatAddress = (supplier) => {
    const parts = [
      supplier.street_address,
      supplier.barangay,
      supplier.city_municipality,
      supplier.province
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const getReliabilityBadge = (score) => {
    if (!score) return <span className="reliability-badge reliability-none">N/A</span>;
    
    const numScore = parseInt(score);
    if (numScore >= 80) return <span className="reliability-badge reliability-high">High ({score}%)</span>;
    if (numScore >= 60) return <span className="reliability-badge reliability-medium">Medium ({score}%)</span>;
    return <span className="reliability-badge reliability-low">Low ({score}%)</span>;
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar
          searchValue={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
        />
        
        <div className="suppliers-container">
          <div className="suppliers-header">
            <h2>Supplier Management</h2>
            <button 
              className="add-supplier-btn" 
              onClick={handleAddSupplier}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add Supplier
            </button>
          </div>

          <div className="suppliers-filters">
            <div className="filter-group">
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="type-filter"
              >
                <option value="all">All Types</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Packaging">Packaging</option>
                <option value="Equipment">Equipment</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="results-info">
              Showing {currentSuppliers.length} of {filteredSuppliers.length} suppliers
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading suppliers...</p>
            </div>
          ) : (
            <>
              <div className="suppliers-table-container">
                <table className="suppliers-table">
                  <thead>
                    <tr>
                      <th>Supplier ID</th>
                      <th>Supplier Name</th>
                      <th>Contact Person</th>
                      <th>Phone Number</th>
                      <th>Email Address</th>
                      <th>Company Address</th>
                      <th>Type of Supplies</th>
                      <th>Reliability Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSuppliers.map(supplier => (
                      <tr key={supplier.supplier_id}>
                        <td>#{supplier.supplier_id}</td>
                        <td className="supplier-name">{supplier.name}</td>
                        <td>{supplier.contact_person || 'N/A'}</td>
                        <td>{supplier.cellphone || supplier.telephone || 'N/A'}</td>
                        <td className="supplier-email">{supplier.email_address || 'N/A'}</td>
                        <td className="supplier-address">{formatAddress(supplier)}</td>
                        <td>{supplier.description || 'N/A'}</td>
                        <td>{getReliabilityBadge(supplier.reliability_score)}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit-btn" 
                              onClick={() => handleEditSupplier(supplier)}
                              title="Edit Supplier"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                              </svg>
                            </button>
                            <button 
                              className="action-btn delete-btn" 
                              onClick={() => handleDeleteSupplier(supplier.supplier_id)}
                              title="Delete Supplier"
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

                {currentSuppliers.length === 0 && (
                  <div className="no-suppliers">
                    <p>No suppliers found</p>
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
          <SupplierModal
            mode={modalMode}
            supplier={selectedSupplier}
            onSave={handleSaveSupplier}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
      
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}
