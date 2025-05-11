import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/inventory');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (formData) => {
    try {
      console.log('Sending request to add product...');
      const response = await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        body: formData,
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product');
      }
      
      console.log('Product added successfully, refreshing list...');
      await fetchProducts();
      setShowModal(false);
    } catch (err) {
      console.error('Error adding product:', err);
      alert(err.message || 'Failed to add product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory/${selectedProduct.sku}`, {
        method: 'PUT',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product');
      }
      
      await fetchProducts();
      setShowEditModal(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error('Error updating product:', err);
      alert(err.message || 'Failed to update product. Please try again.');
    }
  };

  const handleDelete = (product) => {
    setSelectedProduct(product);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory/${selectedProduct.sku}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete product');
      }
      
      await fetchProducts();
      setShowDeleteDialog(false);
      setSelectedProduct(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.message || 'Failed to delete product. Please try again.');
    }
  };

  const handleRowClick = (sku) => {
    navigate(`/product-details/${sku}`);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        <div className="inventory-container">
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button className="add-product-btn" onClick={() => setShowModal(true)}>Add product +</button>
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
                {products.map(product => (
                  <tr key={product.sku} style={{ cursor: 'pointer' }} onClick={e => { if (e.target.tagName !== 'BUTTON') handleRowClick(product.sku); }}>
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
    </div>
  );
} 