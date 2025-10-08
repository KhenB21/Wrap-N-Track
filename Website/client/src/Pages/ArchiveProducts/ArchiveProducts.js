import React, { useState, useEffect } from 'react';
import './ArchiveProducts.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import { useNavigate } from 'react-router-dom';
import api from "../../api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

function ArchiveProductsContent() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure products is an array before filtering
    if (!Array.isArray(products)) {
      setFilteredProducts([]);
      return;
    }

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/archived');
      console.log('API response:', res.data);
      // Backend returns { success: true, archivedInventory: [...] }
      const archivedInventoryData = res.data.archivedInventory || [];
      console.log('Archived products data:', archivedInventoryData);
      setProducts(archivedInventoryData);
    } catch (err) {
      console.error('Error fetching archived inventory:', err);
      setError('Failed to load archived inventory');
      toast.error('Failed to load archived inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRowClick = (sku) => {
    // For archived products, we might want to show a read-only view or restore option
    // For now, let's just show an alert
    toast.info('This is an archived product. Use the restore button to reactivate it.');
  };

  const handleRestore = async (sku) => {
    if (window.confirm('Are you sure you want to restore this archived item?')) {
      try {
        await api.patch(`/api/inventory/${sku}/restore`);
        await fetchProducts();
        toast.success('Product restored successfully!');
      } catch (err) {
        toast.error('Failed to restore product');
      }
    }
  };

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#ffffff', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div className="dashboard-main" style={{ marginLeft: '220px', width: 'calc(100% - 220px)', height: '100vh', backgroundColor: '#ffffff', overflow: 'hidden' }}>
        <TopBar
          lowStockProducts={[]} // Archived products don't need low stock alerts
          searchValue={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
        />
        <div className="inventory-container">
          <div className="inventory-header">
            <h2>Archived Products</h2>
            <button
              className="back-button"
              onClick={() => navigate('/inventory')}
              title="Back to Inventory"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
              Back to Inventory
            </button>
          </div>
          <div className="inventory-filters">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="inventory-filter-select"
            >
              <option value="all">All Archived Products</option>
              <option value="low-stock">Low Stock (≤300)</option>
              <option value="medium-stock">Medium Stock (301-800)</option>
              <option value="high-stock">High Stock (&gt;800)</option>
              <option value="replenishment">Need Replenishment (0)</option>
            </select>
          </div>
          {loading ? (
            <div className="loading-container">Loading archived products...</div>
          ) : (
            <div className="inventory-table-container">
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>Image</th>
                      <th style={{ width: '100px' }}>SKU</th>
                      <th style={{ width: '120px' }}>Name</th>
                      <th style={{ width: '140px' }}>Description</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '100px' }}>Category</th>
                      <th style={{ width: '120px' }}>Supplier</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Expiration</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Last Updated</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>UOM</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Quantity</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Ordered</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Delivered</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr
                        key={product.sku}
                        style={{ cursor: 'pointer', opacity: 0.7 }} // Slightly faded to indicate archived status
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
                        <td className="ellipsis" title={product.sku}>
                          {product.sku}
                        </td>
                        <td className="ellipsis" title={product.name}>
                          <s>{product.name}</s> {/* Strikethrough to indicate archived */}
                        </td>
                        <td className="ellipsis" title={product.description}>
                          <s>{product.description}</s> {/* Strikethrough to indicate archived */}
                        </td>
                        <td style={{ textAlign: 'right' }}>₱{parseFloat(product.unit_price).toFixed(2)}</td>
                        <td className="ellipsis" title={product.category}>
                          <s>{product.category}</s> {/* Strikethrough to indicate archived */}
                        </td>
                        <td className="ellipsis" title={product.supplier_name || 'No supplier'}>
                          {product.supplier_name ? (
                            <div className="supplier-cell">
                              <div className="supplier-name"><s>{product.supplier_name}</s></div>
                              {product.supplier_phone && (
                                <div className="supplier-phone">{product.supplier_phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="no-supplier">No supplier</span>
                          )}
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
                          <div style={{
                            padding: '8px 16px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            opacity: 0.6
                          }}>
                            {(() => {
                              const qty = Number(product.quantity || 0);
                              return qty.toLocaleString();
                            })()}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{Number(product.ordered_quantity || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>{Number(product.delivered_quantity || 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="action-btn restore"
                            title="Restore Product"
                            onClick={e => {
                              e.stopPropagation();
                              handleRestore(product.sku);
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-2 14h-2v-2h2v2zm0-4h-2v-2h2v2zm-4-2h2v2H8v-2zm0 4h2v2H8v-2zm-1.9-6.95l1.45-1.45 1.05 1.05 2.85-2.85 1.45 1.45-4.3 4.3-2.5-2.5z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {filteredProducts.length === 0 && !loading && (
            <div className="no-products">
              <p>No archived products found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveProducts() {
  return (
    <>
      <ArchiveProductsContent />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </>
  );
}

export default withEmployeeAuth(ArchiveProducts);
