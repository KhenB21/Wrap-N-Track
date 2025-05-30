import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import AddProductModal from '../Inventory/AddProductModal';
import './ProductDetails.css';
import '../Inventory/Inventory.css';
import api from '../../api/axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ProductDetails() {
  const { sku } = useParams();
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/inventory');
        setProducts(res.data);
        const found = res.data.find(p => p.sku === sku);
        setProduct(found);

      } catch (err) {
        setProducts([]);
        setProduct(null);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [sku]);

  const handleEdit = () => setShowEditModal(true);
  const handleDelete = () => setShowDeleteDialog(true);

  const handleEditSubmit = async (formData) => {
    try {
      const response = await api.put(`/api/inventory/${sku}`, formData);
      if (response.data.success) {
        setShowEditModal(false);
        // Refresh product data without full page reload
        const res = await api.get('/api/inventory');
        setProducts(res.data);
        const found = res.data.find(p => p.sku === sku);
        setProduct(found);
        toast.success('Product updated successfully!');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      toast.error('Failed to update product');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/api/inventory/${sku}`);
      if (response.data.success) {
        setShowDeleteDialog(false);
        toast.success('Product deleted successfully!');
        
        // Go to next product or inventory
        const idx = products.findIndex(p => p.sku === sku);
        if (products.length > 1) {
          const next = products[idx === 0 ? 1 : idx < products.length - 1 ? idx + 1 : idx - 1];
          navigate(`/product-details/${next.sku}`);
        } else {
          navigate('/inventory');
        }
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error('Failed to delete product');
      setShowDeleteDialog(false);
    }
  };


  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar />
        <div className="product-details-layout" style={{ display: 'flex', gap: 32, marginTop: 24 }}>
          {/* Product List */}
          <div className="product-list">
            <div className="product-list-title">PRODUCTS</div>
            {products.map((p) => (
              <div
                className={`product-list-item${p.sku === sku ? ' selected' : ''}`}
                key={p.sku}
                onClick={() => navigate(`/product-details/${p.sku}`)}
              >

                <img 
                  src={p.image_data ? `data:image/jpeg;base64,${p.image_data}` : ''} 
                  alt={p.name} 
                  className="product-thumb" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/42?text=No+Image';
                  }}
                />
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description}</div>
                </div>
                <div className="product-qty">Qty: {p.quantity}</div>
              </div>
            ))}
          </div>

          {/* Product Details */}
          <div className="product-details-panel">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</div>
            ) : !product ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Product not found</div>
            ) : (
              <>
                {/* Header */}
                <div className="product-details-header">
                  <div>
                    <h1 className="product-details-title">{product.name}</h1>
                    <p className="product-details-desc">{product.description}</p>
                  </div>
                  <div className="product-details-actions">
                    <button className="btn-edit" onClick={handleEdit}>Edit</button>
                    <button className="btn-delete" onClick={handleDelete}>Delete</button>
                  </div>
                </div>
                {/* Details Sections */}
                <div className="product-details-content">
                  <div className="product-details-info">
                    <div className="details-section">
                      <div className="details-label">Product Details</div>
                      <div className="details-row"><span>Stock Keeping Unit (SKU)</span> <span>{product.sku}</span></div>
                      <div className="details-row"><span>Category</span> <span>{product.category}</span></div>
                      <div className="details-row"><span>Last Updated</span> <span>{new Date(product.last_updated).toLocaleString()}</span></div>
                    </div>
                    <div className="details-section">
                      <div className="details-label">Quantity Details</div>
                      <div className="details-row">
                        <span>Stock Quantity</span> 
                        <span className={Number(product.quantity) <= 300 ? 'low-stock' : Number(product.quantity) > 800 ? 'high-stock' : 'medium-stock'}>
                          {product.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="details-section">
                      <div className="details-label">Pricing Details</div>
                      <div className="details-row"><span>Price per Unit</span> <span>₱{parseFloat(product.unit_price).toFixed(2)}</span></div>
                    </div>
                    <div className="details-section">
                      <div className="details-label">Other Details</div>
                      <div className="details-row"><span>Remarks</span> <span>-----</span></div>
                    </div>
                  </div>
                  <div className="product-details-image">
                    {product.image_data ? (
                      <img 
                        src={`data:image/jpeg;base64,${product.image_data}`} 
                        alt={product.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/240x180?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="img-placeholder" />
                    )}
                    <div className="product-image-thumbs">
                      {/* Thumbnails placeholder */}
                      {[...Array(5)].map((_, i) => (
                        <div className="thumb-placeholder" key={i} />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Edit Modal */}
        {showEditModal && product && (
          <AddProductModal
            onClose={() => setShowEditModal(false)}
            onAdd={handleEditSubmit}
            initialData={product}
            isEdit
          />
        )}
        {/* Delete Dialog */}
        {showDeleteDialog && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 340, textAlign: 'center' }}>
              <h3>Delete Product</h3>
              <p>Are you sure you want to delete this product?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                <button className="delete-btn" onClick={handleDeleteConfirm}>Delete</button>
                <button className="edit-btn" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}