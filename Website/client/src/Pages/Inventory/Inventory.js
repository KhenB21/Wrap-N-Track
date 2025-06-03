import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../../api/axios";
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
      const response = await api.post('/api/inventory', formData);
      if (response.data.success) {
        setShowModal(false);
        fetchProducts();
        toast.success('Product added successfully!');
      }
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Failed to add product');
      toast.error('Failed to add product');
    }
  };

  const handleEdit = (product) => {
    console.log('Editing product:', product);
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (jsonData) => {
    console.log('Submitting edit form with data:', jsonData);
    try {
      const response = await api.put(
        `/api/inventory/${selectedProduct.sku}`,
        jsonData,
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('Edit API response:', response);
      if (response.data && response.data.success) {
        setShowEditModal(false);
        fetchProducts();
        toast.success('Product updated successfully!');
      } else {
        toast.error('Failed to update product');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setError('Failed to update product');
      toast.error('Failed to update product');
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
            <button className="add-product-btn" onClick={() => setShowModal(true)}>Add product +</button>
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
            <div>Loading...</div>
          ) : (
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Category</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
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
                    <td>{product.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.description}</td>
                    <td>{product.quantity}</td>
                    <td>{product.unit_price}</td>
                    <td>{product.category}</td>
                    <td>{product.last_updated}</td>
                    <td>
                      <button className="edit-btn" onClick={e => { e.stopPropagation(); handleEdit(product); }}>Edit</button>
                      <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(product); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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