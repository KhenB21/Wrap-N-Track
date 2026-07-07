import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';

import './ProductDetails.css';
import '../Inventory/Inventory.css';
import api from '../../api';
import * as bwipjs from 'bwip-js/browser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ProductDetails() {
  const { sku } = useParams();
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [stockForm, setStockForm] = useState({ type: 'STOCK_IN', quantity: '', reason: '' });
  const [stockActionLoading, setStockActionLoading] = useState(false);
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

        if (found) {
          try {
            const movementsRes = await api.get(`/api/inventory/movements/${found.sku}`);
            setMovements(movementsRes.data.movements || []);
          } catch (movementErr) {
            console.warn('Failed to load stock movements:', movementErr);
            setMovements([]);
          }
        } else {
          setMovements([]);
        }
        
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
  const getStockStatus = (itemOrQuantity, fallbackReorderLevel = 0) => {
    const qty = typeof itemOrQuantity === 'object'
      ? Number(itemOrQuantity?.quantity || 0)
      : Number(itemOrQuantity || 0);
    const reorderLevel = typeof itemOrQuantity === 'object'
      ? Number(itemOrQuantity?.reorder_level || 0)
      : Number(fallbackReorderLevel || 0);

    if (qty <= 0) return { status: 'Out of Stock', color: '#ef4444', bgColor: '#fef2f2' };
    if (qty <= reorderLevel) return { status: 'Low Stock', color: '#f59e0b', bgColor: '#fffbeb' };
    return { status: 'In Stock', color: '#10b981', bgColor: '#f0fdf4' };
  };

  const encodeSvg = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const escapeXml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const createBarcodeSvg = (value = '') => {
    const safeValue = String(value || '');
    try {
      return encodeSvg(bwipjs.toSVG({
        bcid: 'code128',
        text: safeValue,
        scale: 2,
        height: 12,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'FFFFFF'
      }));
    } catch (err) {
      console.warn('Failed to generate barcode:', err);
      return encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="92"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="48" text-anchor="middle" font-family="Arial" font-size="14" fill="#111827">${escapeXml(safeValue)}</text></svg>`);
    }
  };

  const createQrSvg = (value = '') => {
    const safeValue = String(value || '');
    try {
      return encodeSvg(bwipjs.toSVG({
        bcid: 'qrcode',
        text: safeValue,
        scale: 4,
        eclevel: 'M',
        backgroundcolor: 'FFFFFF'
      }));
    } catch (err) {
      console.warn('Failed to generate QR code:', err);
      return encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="126" height="126"><rect width="100%" height="100%" fill="#fff"/><text x="50%" y="64" text-anchor="middle" font-family="Arial" font-size="12" fill="#111827">${escapeXml(safeValue)}</text></svg>`);
    }
  };

  const getLabelMarkup = () => {
    const barcodeValue = product?.barcode_value || product?.sku || '';
    const qrValue = product?.qr_value || product?.sku || '';
    return `
      <div class="print-label">
        <h2>${escapeXml(product?.name || '')}</h2>
        <p>${escapeXml(product?.sku || '')}</p>
        <img class="print-barcode" src="${createBarcodeSvg(barcodeValue)}" alt="Barcode" />
        <img class="print-qr" src="${createQrSvg(qrValue)}" alt="QR" />
      </div>
    `;
  };

  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=520');
    if (!printWindow) {
      toast.error('Please allow popups to print labels.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${product?.sku || 'product'} label</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            .print-label { width: 320px; border: 1px solid #d1d5db; padding: 18px; text-align: center; }
            h2 { font-size: 18px; margin: 0 0 8px; }
            p { margin: 0 0 14px; color: #374151; font-weight: 700; }
            .print-barcode { width: 100%; max-width: 260px; display: block; margin: 0 auto 14px; }
            .print-qr { width: 126px; height: 126px; display: block; margin: 0 auto; }
          </style>
        </head>
        <body>${getLabelMarkup()}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadLabel = () => {
    const labelSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="360" height="430" viewBox="0 0 360 430">
        <rect x="1" y="1" width="358" height="428" rx="10" fill="#ffffff" stroke="#d1d5db"/>
        <text x="180" y="44" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">${escapeXml(product?.name || '')}</text>
        <text x="180" y="72" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#374151">${escapeXml(product?.sku || '')}</text>
        <image x="45" y="96" width="270" height="115" href="${createBarcodeSvg(product?.barcode_value || product?.sku)}"/>
        <image x="117" y="235" width="126" height="126" href="${createQrSvg(product?.qr_value || product?.sku)}"/>
      </svg>
    `;
    const url = URL.createObjectURL(new Blob([labelSvg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product?.sku || 'product'}-label.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleStockAction = async (e) => {
    e.preventDefault();
    const quantity = Number(stockForm.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error('Enter a positive whole-number quantity.');
      return;
    }

    setStockActionLoading(true);
    try {
      const endpoint = stockForm.type === 'STOCK_OUT' ? '/api/inventory/stock-out' : '/api/inventory/add-stock';
      await api.post(endpoint, {
        sku: product.sku,
        quantity,
        reason: stockForm.reason
      });
      toast.success(stockForm.type === 'STOCK_OUT' ? 'Stock removed successfully.' : 'Stock added successfully.');
      setStockForm({ type: 'STOCK_IN', quantity: '', reason: '' });
      const [productRes, movementsRes] = await Promise.all([
        api.get(`/api/inventory/${product.sku}`),
        api.get(`/api/inventory/movements/${product.sku}`)
      ]);
      setProduct(productRes.data.item);
      setProducts(prev => prev.map(item => item.sku === product.sku ? productRes.data.item : item));
      setMovements(movementsRes.data.movements || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save stock movement.');
    } finally {
      setStockActionLoading(false);
    }
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
                    <div className="stock-indicator" style={{ backgroundColor: getStockStatus(p).color }}></div>
                  </div>
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-category" style={{ color: getCategoryColor(p.category) }}>
                      {p.category}
                    </div>
                    <div className="product-stock">
                      <span className="stock-label">Stock:</span>
                      <span className="stock-value" style={{ color: getStockStatus(p).color }}>
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
                          <div className="stat-value" style={{ color: getStockStatus(product).color }}>
                            {formatNumber(product.quantity)} units
                          </div>
                          <div className="stat-status" style={{ 
                            color: getStockStatus(product).color,
                            backgroundColor: getStockStatus(product).bgColor
                          }}>
                            {product.stock_status || getStockStatus(product).status}
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
                        <span className="detail-label">Barcode Value</span>
                        <span className="detail-value">{product.barcode_value || product.sku}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">QR Value</span>
                        <span className="detail-value">{product.qr_value || product.sku}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Category</span>
                        <span className="detail-value">{product.category}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">
                          {product.created_at ? new Date(product.created_at).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </span>
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
                        <span className="detail-value" style={{ color: getStockStatus(product).color }}>
                          {formatNumber(product.quantity)} units
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Reorder Level</span>
                        <span className="detail-value">{formatNumber(product.reorder_level || 0)} units</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Stock Status</span>
                        <span className="detail-value" style={{ 
                          color: getStockStatus(product).color,
                          backgroundColor: getStockStatus(product).bgColor,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {product.stock_status || getStockStatus(product).status}
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

                  <div className="details-card label-card">
                    <div className="card-header">
                      <h3>Product Label</h3>
                    </div>
                    <div className="card-content">
                      <div className="label-preview">
                        <div className="label-product-name">{product.name}</div>
                        <div className="label-sku">{product.sku}</div>
                        <img className="label-barcode" src={createBarcodeSvg(product.barcode_value || product.sku)} alt="Barcode preview" />
                        <img className="label-qr" src={createQrSvg(product.qr_value || product.sku)} alt="QR preview" />
                      </div>
                      <div className="label-actions">
                        <button type="button" className="label-action-btn" onClick={handlePrintLabel}>Print Label</button>
                        <button type="button" className="label-action-btn secondary" onClick={handleDownloadLabel}>Download SVG</button>
                      </div>
                    </div>
                  </div>

                  <div className="details-card stock-action-card">
                    <div className="card-header">
                      <h3>Stock Movement</h3>
                    </div>
                    <div className="card-content">
                      <form className="stock-action-form" onSubmit={handleStockAction}>
                        <label>
                          Type
                          <select
                            value={stockForm.type}
                            onChange={(e) => setStockForm(prev => ({ ...prev, type: e.target.value }))}
                          >
                            <option value="STOCK_IN">Stock In</option>
                            <option value="STOCK_OUT">Stock Out</option>
                          </select>
                        </label>
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={stockForm.quantity}
                            onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                            required
                          />
                        </label>
                        <label className="stock-reason-field">
                          Reason
                          <input
                            value={stockForm.reason}
                            onChange={(e) => setStockForm(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Supplier delivery, order correction, damage, etc."
                          />
                        </label>
                        <button type="submit" className="label-action-btn" disabled={stockActionLoading}>
                          {stockActionLoading ? 'Saving...' : 'Save Movement'}
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="details-card movements-card">
                    <div className="card-header">
                      <h3>Stock Logs</h3>
                    </div>
                    <div className="card-content movements-list">
                      {movements.length === 0 ? (
                        <div className="empty-movements">No stock movement logs yet.</div>
                      ) : (
                        movements.slice(0, 8).map((movement) => (
                          <div className="movement-row" key={movement.id}>
                            <div>
                              <div className="movement-type">{movement.movement_type.replace(/_/g, ' ')}</div>
                              <div className="movement-reason">{movement.reason || 'No reason provided'}</div>
                            </div>
                            <div className="movement-meta">
                              <strong>{formatNumber(movement.quantity || 0)}</strong>
                              <span>{movement.previous_quantity ?? '-'} -> {movement.new_quantity ?? '-'}</span>
                              <small>{new Date(movement.created_at).toLocaleString('en-PH')}</small>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {product.supplier_name && (
                    <div className="details-card supplier-card">
                      <div className="card-header">
                        <h3>Supplier Information</h3>
                      </div>
                      <div className="card-content">
                        <div className="supplier-info">
                          <div className="supplier-avatar">
                            {product.supplier_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="supplier-details">
                            <div className="supplier-name">
                              <a 
                                href={`/suppliers/${product.supplier_id}`}
                                className="supplier-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/suppliers/${product.supplier_id}`);
                                }}
                              >
                                {product.supplier_name}
                              </a>
                            </div>
                            {product.supplier_phone && (
                              <div className="supplier-contact">
                                <span className="contact-icon">📞</span>
                                <span className="contact-text">{product.supplier_phone}</span>
                              </div>
                            )}
                            {product.supplier_website && (
                              <div className="supplier-contact">
                                <span className="contact-icon">🌐</span>
                                <a 
                                  href={product.supplier_website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="supplier-website"
                                >
                                  {product.supplier_website}
                                  <span className="external-link-icon">↗</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
