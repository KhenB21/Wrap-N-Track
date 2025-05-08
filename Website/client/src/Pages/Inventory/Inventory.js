import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate } from 'react-router-dom';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
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
      await fetch('http://localhost:3001/api/inventory', {
        method: 'POST',
        body: formData,
      });
      fetchProducts();
    } catch (err) {
      // handle error
    }
    setShowModal(false);
  };

  // Placeholder handlers for edit/delete
  const handleEdit = (product) => {
    // TODO: Show edit modal and handle update
    alert('Edit not implemented yet for SKU: ' + product.sku);
  };
  const handleDelete = (product) => {
    // TODO: Show confirm dialog and handle delete
    alert('Delete not implemented yet for SKU: ' + product.sku);
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
                    <td>{product.image_path ? <img src={`http://localhost:3001${product.image_path}`} alt={product.name} className="product-img-thumb" /> : <div className="img-placeholder" />}</td>
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
        </div>
      </div>
    </div>
  );
} 