import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';

import './ProductDetails.css';
import '../Inventory/Inventory.css';
import api from '../../api';
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
        console.log('API Response:', res.data);
        
        // Handle different response formats
        let productsData = [];
        if (!res.data) {
          console.warn('No data received from API');
          productsData = [];
        } else if (Array.isArray(res.data)) {
          // Direct array response (most common)
          productsData = res.data;
        } else if (res.data && Array.isArray(res.data.inventory)) {
          // Wrapped in inventory property
          productsData = res.data.inventory;
        } else if (res.data && Array.isArray(res.data.data)) {
          // Wrapped in data property
          productsData = res.data.data;
        } else if (res.data && res.data.products && Array.isArray(res.data.products)) {
          // Wrapped in products property
          productsData = res.data.products;
        } else if (res.data && res.data.success && Array.isArray(res.data.inventory)) {
          // Success response with inventory array
          productsData = res.data.inventory;
        } else {
          console.warn('Unexpected API response format:', res.data);
          console.warn('Response type:', typeof res.data);
          console.warn('Response keys:', res.data ? Object.keys(res.data) : 'null');
          productsData = [];
        }
        
        setProducts(productsData);
        
        // Find the specific product
        const found = productsData.find(p => p && p.sku === sku);
        setProduct(found);
        setError(null);
        
        console.log('Products loaded:', productsData.length);
        console.log('Looking for SKU:', sku);
        console.log('Found product:', found);
        
        if (!found && productsData.length > 0) {
          console.log('Available SKUs:', productsData.map(p => p?.sku).filter(Boolean));
        }
        
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
        setProduct(null);
        setError('Failed to load products');
        toast.error('Failed to load products: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [sku]);

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Helper function to format number with commas
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-PH').format(num);
  };

  // Helper function to get stock status
  const getStockStatus = (quantity) => {
    const qty = Number(quantity);
    if (qty <= 50) return { status: 'Critical', color: '#ef4444', bgColor: '#fef2f2' };
    if (qty <= 200) return { status: 'Low', color: '#f59e0b', bgColor: '#fffbeb' };
    if (qty <= 500) return { status: 'Medium', color: '#3b82f6', bgColor: '#eff6ff' };
    return { status: 'High', color: '#10b981', bgColor: '#f0fdf4' };
  };

  // Helper function to get category color
  const getCategoryColor = (category) => {
    const colors = {
      'Gift Wraps': '#8b5cf6',
      'Ribbons': '#ec4899',
      'Bags': '#06b6d4',
      'Boxes': '#f59e0b',
      'Accessories': '#10b981',
      'Other': '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="product-details-container">
      <Sidebar />
      <div className="product-details-main">
        <TopBar />
        
        {/* Breadcrumb Navigation */}
        <div className="breadcrumb-nav">
          <button onClick={() => navigate('/inventory')} className="breadcrumb-btn">
            ← Back to Inventory
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Product Details</span>
        </div>

        <div className="product-details-layout">
          {/* Product List Sidebar */}
          <div className="product-list-sidebar">
            <div className="sidebar-header">
              <h3>Products</h3>
              <span className="product-count">{products.length} items</span>
            </div>
            <div className="product-list">
              {products.map((p) => (
                <div
                  className={`product-list-item${p.sku === sku ? ' selected' : ''}`}
                  key={p.sku}
                  onClick={() => navigate(`/product-details/${p.sku}`)}
                >
                  <div className="product-thumb-container">
                    {p.image_data ? (
                      <img 
                        src={`data:image/jpeg;base64,${p.image_data}`}
                        alt={p.name} 
                        className="product-thumb" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="product-thumb-placeholder"
                      style={{ display: p.image_data ? 'none' : 'flex' }}
                    >
                      <div className="placeholder-icon">📦</div>
                    </div>
                    <div className="stock-indicator" style={{ backgroundColor: getStockStatus(p.quantity).color }}></div>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-category" style={{ color: getCategoryColor(p.category) }}>
                      {p.category}
                    </div>
                    <div className="product-stock">
                      <span className="stock-label">Stock:</span>
                      <span className="stock-value" style={{ color: getStockStatus(p.quantity).color }}>
                        {formatNumber(p.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Product Details */}
          <div className="product-details-main-content">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading product details...</p>
              </div>
            ) : error ? (
              <div className="error-container">
                <div className="error-icon">⚠️</div>
                <h2>Error Loading Product</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="retry-btn">
                  Try Again
                </button>
              </div>
            ) : !product ? (
              <div className="not-found-container">
                <div className="not-found-icon">🔍</div>
                <h2>Product Not Found</h2>
                <p>The product with SKU "{sku}" could not be found.</p>
                <button onClick={() => navigate('/inventory')} className="back-to-inventory-btn">
                  Back to Inventory
                </button>
              </div>
            ) : (
              <div className="product-details-content">
                {/* Product Header */}
                <div className="product-header">
                  <div className="product-image-section">
                    <div className="main-image-container">
                      {product.image_data ? (
                        <img 
                          src={`data:image/jpeg;base64,${product.image_data}`} 
                          alt={product.name}
                          className="main-product-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="no-image-placeholder"
                        style={{ display: product.image_data ? 'none' : 'flex' }}
                      >
                        <div className="no-image-icon">📦</div>
                        <p>No Image Available</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="product-info-section">
                    <div className="product-title-section">
                      <h1 className="product-title">{product.name}</h1>
                      <p className="product-description">{product.description}</p>
                      <div className="product-category-badge" style={{ backgroundColor: getCategoryColor(product.category) }}>
                        {product.category}
                      </div>
                    </div>

                    <div className="product-stats">
                      <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-content">
                          <div className="stat-label">Current Stock</div>
                          <div className="stat-value" style={{ color: getStockStatus(product.quantity).color }}>
                            {formatNumber(product.quantity)} units
                          </div>
                          <div className="stat-status" style={{ 
                            color: getStockStatus(product.quantity).color,
                            backgroundColor: getStockStatus(product.quantity).bgColor
                          }}>
                            {getStockStatus(product.quantity).status} Stock
                          </div>
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-content">
                          <div className="stat-label">Unit Price</div>
                          <div className="stat-value">{formatCurrency(product.unit_price)}</div>
                          <div className="stat-subtitle">per unit</div>
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-icon">💎</div>
                        <div className="stat-content">
                          <div className="stat-label">Total Value</div>
                          <div className="stat-value">{formatCurrency(product.quantity * product.unit_price)}</div>
                          <div className="stat-subtitle">inventory value</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="product-details-grid">
                  <div className="details-card">
                    <div className="card-header">
                      <h3>Product Information</h3>
                    </div>
                    <div className="card-content">
                      <div className="detail-row">
                        <span className="detail-label">SKU</span>
                        <span className="detail-value">{product.sku}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Category</span>
                        <span className="detail-value">{product.category}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Last Updated</span>
                        <span className="detail-value">
                          {new Date(product.last_updated).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="details-card">
                    <div className="card-header">
                      <h3>Inventory Details</h3>
                    </div>
                    <div className="card-content">
                      <div className="detail-row">
                        <span className="detail-label">Current Stock</span>
                        <span className="detail-value" style={{ color: getStockStatus(product.quantity).color }}>
                          {formatNumber(product.quantity)} units
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Stock Status</span>
                        <span className="detail-value" style={{ 
                          color: getStockStatus(product.quantity).color,
                          backgroundColor: getStockStatus(product.quantity).bgColor,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {getStockStatus(product.quantity).status}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Unit Price</span>
                        <span className="detail-value">{formatCurrency(product.unit_price)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="details-card">
                    <div className="card-header">
                      <h3>Financial Summary</h3>
                    </div>
                    <div className="card-content">
                      <div className="detail-row">
                        <span className="detail-label">Total Inventory Value</span>
                        <span className="detail-value highlight">
                          {formatCurrency(product.quantity * product.unit_price)}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Unit Cost</span>
                        <span className="detail-value">{formatCurrency(product.unit_price)}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Stock Units</span>
                        <span className="detail-value">{formatNumber(product.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}