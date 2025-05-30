import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { apiFileUpload } from "../../api/axios";
import config from "../../config";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Inventory() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  // Log showModal changes
  useEffect(() => {
    console.log('showModal changed:', showModal);
  }, [showModal]);

  useEffect(() => {
    // Check if we have a filter from dashboard navigation
    if (location.state?.filter) {
      setFilter(location.state.filter);
    }
  }, [location]);

  useEffect(() => {
    // Apply filtering based on current filter state
    switch (filter) {
      case 'low-stock':
        setFilteredProducts(products.filter(item => Number(item.quantity || 0) <= 300));
        break;
      case 'medium-stock':
        setFilteredProducts(products.filter(item => {
          const quantity = Number(item.quantity || 0);
          return quantity > 300 && quantity <= 800;
        }));
        break;
      case 'high-stock':
        setFilteredProducts(products.filter(item => Number(item.quantity || 0) > 800));
        break;
      case 'replenishment':
        setFilteredProducts(products.filter(item => Number(item.quantity || 0) <= 0));
        break;
      default:
        setFilteredProducts(products);
    }
  }, [filter, products]);

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory');
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (formData) => {
    try {
      // Determine if this is a file upload (FormData) or JSON data
      const isFileUpload = formData instanceof FormData;
      
      // Use apiFileUpload for file uploads, regular api for JSON
      const response = isFileUpload 
        ? await apiFileUpload.post('/api/inventory', formData)
        : await api.post('/api/inventory', formData);
        
      if (response.data.success) {
        setShowModal(false);
        await fetchProducts();
        toast.success('Product added successfully!');
      }
    } catch (err) {
      console.error('Error adding product:', err);
      const errorMessage = err.response?.data?.message || 'Failed to add product';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEdit = (product) => {
    console.log('Editing product:', product);
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (formData) => {
    console.log('Submitting edit form with data:', formData);
    try {
      // Determine if this is a file upload (FormData) or JSON data
      const isFileUpload = formData instanceof FormData;
      
      // Use the appropriate API instance and headers
      const response = isFileUpload
        ? await apiFileUpload.put(`/api/inventory/${selectedProduct.sku}`, formData)
        : await api.put(
            `/api/inventory/${selectedProduct.sku}`,
            formData,
            { headers: { 'Content-Type': 'application/json' } }
          );
      
      console.log('Edit API response:', response);
      
      if (response.data) {
        // If we have a success message, show it, otherwise assume success if we have data
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to update product');
        }
        
        // Close the modal and refresh the product list
        setShowEditModal(false);
        await fetchProducts(); // Wait for the products to be refreshed
        toast.success('Product updated successfully!');
      } else {
        throw new Error('No data received from server');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update product';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDelete = (product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/api/inventory/${selectedProduct.sku}`);
      if (response.data.success) {
        fetchProducts();
        toast.success('Product deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
      toast.error('Failed to delete product');
    }
  };

  const handleRowClick = (sku) => {
    navigate(`/product-details/${sku}`);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar lowStockProducts={products.filter(item => Number(item.quantity || 0) < 300)} />
        <div className="inventory-container">
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button 
              className="add-product-btn" 
              onClick={() => setShowModal(true)}
              title="Add New Product"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add Product
            </button>
          </div>
          <div className="inventory-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="inventory-filter-select"
            >
              <option value="all">All Products</option>
              <option value="low-stock">Low Stock (≤300)</option>
              <option value="medium-stock">Medium Stock (301-800)</option>
              <option value="high-stock">High Stock (&gt;800)</option>
              <option value="replenishment">Need Replenishment (0)</option>
            </select>
          </div>
          {loading ? (
            <div className="loading-container">Loading...</div>
          ) : (
            <div className="inventory-table-container">
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Image</th>
                    <th style={{ width: '120px' }}>SKU</th>
                    <th style={{ width: '150px' }}>Name</th>
                    <th style={{ width: '200px' }}>Description</th>
                    <th style={{ width: '100px' }}>Quantity</th>
                    <th style={{ width: '120px' }}>Unit Price</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th style={{ width: '150px' }}>Last Updated</th>
                    <th style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr 
                      key={product.sku} 
                      style={{ cursor: 'pointer' }} 
                      onClick={e => { if (e.target.tagName !== 'BUTTON') handleRowClick(product.sku); }}
                      className={
                        Number(product.quantity || 0) <= 300 ? 'low-stock-row' :
                        Number(product.quantity || 0) > 800 ? 'high-stock-row' :
                        'medium-stock-row'
                      }
                    >
                      <td>
                        {product.image_data ? (
                          <img 
                            src={`data:image/jpeg;base64,${product.image_data}`} 
                            alt={product.name} 
                            className="product-img-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/50';
                            }}
                          />
                        ) : (
                          <div className="img-placeholder" />
                        )}
                      </td>
                      <td className="ellipsis" title={product.sku}>
                        {product.sku}
                      </td>
                      <td className="ellipsis" title={product.name}>
                        {product.name}
                      </td>
                      <td className="ellipsis" title={product.description}>
                        {product.description}
                      </td>
                      <td>{product.quantity}</td>
                      <td>₱{parseFloat(product.unit_price).toFixed(2)}</td>
                      <td className="ellipsis" title={product.category}>
                        {product.category}
                      </td>
                      <td>{new Date(product.last_updated).toLocaleString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="text-btn edit-btn" 
                            onClick={e => { e.stopPropagation(); handleEdit(product); }}
                            title="Edit Product"
                            aria-label="Edit product"
                          >
                            Edit
                          </button>
                          <button 
                            className="text-btn delete-btn" 
                            onClick={e => { e.stopPropagation(); handleDelete(product); }}
                            title="Delete Product"
                            aria-label="Delete product"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
          {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdd={handleAddProduct} />}
          {showEditModal && selectedProduct && (
            <AddProductModal 
              onClose={() => { setShowEditModal(false); setSelectedProduct(null); }} 
              onAdd={handleEditSubmit}
              initialData={selectedProduct}
              isEdit={true}
            />
          )}
          {showDeleteDialog && selectedProduct && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ maxWidth: 340, textAlign: 'center' }}>
                <h3>Delete Product</h3>
                <p>Are you sure you want to delete {selectedProduct.name}?</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                  <button className="delete-btn" onClick={handleDeleteConfirm}>Delete</button>
                  <button className="edit-btn" onClick={() => { setShowDeleteDialog(false); setSelectedProduct(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}