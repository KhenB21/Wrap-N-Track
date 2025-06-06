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

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

export default function Inventory() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // Keep for potential autofill
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
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
    // Filter products by search term (excluding SKU)
    let filtered = products;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = products.filter(item =>
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.description && item.description.toLowerCase().includes(term)) ||
        (item.category && item.category.toLowerCase().includes(term)) ||
        (item.unit_price && String(item.unit_price).toLowerCase().includes(term)) ||
        (item.quantity && String(item.quantity).toLowerCase().includes(term)) ||
        (item.last_updated && new Date(item.last_updated).toLocaleString().toLowerCase().includes(term))
      );
    }
    // Apply stock filter after search
    switch (filter) {
      case 'low-stock':
        filtered = filtered.filter(item => Number(item.quantity || 0) <= 300);
        break;
      case 'medium-stock':
        filtered = filtered.filter(item => {
          const quantity = Number(item.quantity || 0);
          return quantity > 300 && quantity <= 800;
        });
        break;
      case 'high-stock':
        filtered = filtered.filter(item => Number(item.quantity || 0) > 800);
        break;
      case 'replenishment':
        filtered = filtered.filter(item => Number(item.quantity || 0) <= 0);
        break;
      default:
        break;
    }
    setFilteredProducts(filtered);
  }, [searchTerm, filter, products]);

  // Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('http://localhost:3001/api/inventory');
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
        ? await apiFileUpload.post('http://localhost:3001/api/inventory', formData)
        : await api.post('http://localhost:3001/api/inventory', formData);
        
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

  const handleRowClick = (sku) => {
    navigate(`/product-details/${sku}`);
  };

  // Archive (delete) product
  const handleArchive = async (sku) => {
    if (window.confirm('Are you sure you want to archive (delete) this item?')) {
      try {
        await api.delete(`http://localhost:3001/api/inventory/${sku}`);
        await fetchProducts();
        toast.success('Product archived (deleted) successfully!');
      } catch (err) {
        toast.error('Failed to archive (delete) product');
      }
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar
          lowStockProducts={products.filter(item => Number(item.quantity || 0) < 300)}
          searchValue={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
        />
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
                    <th style={{ width: '120px' }}>Unit Price</th>
                    <th style={{ width: '150px' }}>Category</th>
                    <th style={{ width: '120px' }}>Expiration</th>
                    <th style={{ width: '150px' }}>Last Updated</th>
                    <th style={{ width: '100px' }}>UOM</th>
                    <th style={{ width: '100px' }}>In Stocks</th>
                    <th style={{ width: '100px' }}>Ordered</th>
                    <th style={{ width: '100px' }}>Delivered</th>
                    <th style={{ width: '160px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr 
                      key={product.sku} 
                      style={{ cursor: 'pointer' }} 
                      onClick={e => handleRowClick(product.sku)}
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
                      <td className="ellipsis" title={product.sku} style={{ textAlign: 'center' }}>
                        {product.sku}
                      </td>
                      <td className="ellipsis" title={product.name} style={{ textAlign: 'center' }}>
                        {product.name}
                      </td>
                      <td className="ellipsis" title={product.description} style={{ textAlign: 'center' }}>
                        {product.description}
                      </td>
                      <td style={{ textAlign: 'center' }}>₱{parseFloat(product.unit_price).toFixed(2)}</td>
                      <td className="ellipsis" title={product.category} style={{ textAlign: 'center' }}>
                        {product.category}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {product.expiration ? new Date(product.expiration).toISOString().slice(0, 10) : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>{new Date(product.last_updated).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        {UOMS_REQUIRING_CONVERSION.includes(product.uom) && product.conversion_qty
                          ? `${product.uom} (${product.conversion_qty})`
                          : product.uom}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          marginRight: '5px',
                          backgroundColor: Number(product.quantity || 0) <= 300 ? 'red' :
                                           Number(product.quantity || 0) > 800 ? 'green' :
                                           'orange'
                        }}></span>
                        {product.quantity}
                      </td>
                      <td style={{ textAlign: 'center' }}>{product.ordered}</td>
                      <td style={{ textAlign: 'center' }}>{product.delivered}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="action-btn add" title="Add" onClick={e => { e.stopPropagation(); setSelectedProduct(null); setShowModal(true); }}>
                          Add
                        </button>
                        <button className="action-btn edit" title="Edit" onClick={e => { e.stopPropagation(); setSelectedProduct(product); setShowModal(true); }}>
                          Edit
                        </button>
                        <button className="action-btn archive" title="Archive" onClick={e => { e.stopPropagation(); handleArchive(product.sku); }}>
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
          {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdd={handleAddProduct} products={products} initialData={selectedProduct || {}} isEdit={!!selectedProduct} />}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}