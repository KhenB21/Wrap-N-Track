import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';

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
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await api.get(`http://localhost:3001/api/inventory/${sku}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch product details');
        }
        const data = await response.json();
        setProduct(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [sku]);

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
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}