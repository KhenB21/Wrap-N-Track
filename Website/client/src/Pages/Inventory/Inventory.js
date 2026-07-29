import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import withEmployeeAuth from '../../Components/withEmployeeAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../../api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import usePermissions from '../../hooks/usePermissions';
import { useTheme } from '../../Context/ThemeContext';

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

function Inventory() {
  const { checkPermission } = usePermissions();
  const { theme } = useTheme();

  useEffect(() => {
    checkPermission('inventory');
  }, []);

  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'addStock'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [reorderInsights, setReorderInsights] = useState({});
  const navigate = useNavigate();

  // Legacy fallback used only until the reorder-insights fetch resolves (or if it fails) —
  // the authoritative status now comes from GET /api/inventory-reports/replenishment-suggestions,
  // which implements the approved hybrid reorder formula (available stock vs. dynamic/threshold
  // reorder point) instead of this raw on-hand-vs-reorder_level comparison.
  const getStockStatus = (product) => {
    const quantity = Number(product?.quantity || 0);
    const reorderLevel = Number(product?.reorder_level || 0);
    if (theme === 'dark') {
      if (quantity <= 0) return { label: 'Out of Stock', className: 'low-stock-row', color: '#fca5a5', background: 'rgba(220, 38, 38, 0.22)' };
      if (quantity <= reorderLevel) return { label: 'Low Stock', className: 'low-stock-row', color: '#fbbf24', background: 'rgba(217, 119, 6, 0.22)' };
      return { label: 'In Stock', className: 'high-stock-row', color: '#6ee7b7', background: 'rgba(4, 120, 87, 0.22)' };
    }
    if (quantity <= 0) return { label: 'Out of Stock', className: 'low-stock-row', color: '#dc2626', background: '#fee2e2' };
    if (quantity <= reorderLevel) return { label: 'Low Stock', className: 'low-stock-row', color: '#d97706', background: '#fef3c7' };
    return { label: 'In Stock', className: 'high-stock-row', color: '#047857', background: '#d1fae5' };
  };

  const REORDER_STATUS_STYLE = theme === 'dark' ? {
    'Out of Stock': { icon: '⛔', color: '#fca5a5', background: 'rgba(220, 38, 38, 0.22)', rowClass: 'low-stock-row' },
    'Reorder Recommended': { icon: '⚠️', color: '#fbbf24', background: 'rgba(217, 119, 6, 0.22)', rowClass: 'low-stock-row' },
    'Approaching Reorder Point': { icon: '🔶', color: '#fcd34d', background: 'rgba(180, 83, 9, 0.22)', rowClass: '' },
    'Healthy': { icon: '✅', color: '#6ee7b7', background: 'rgba(4, 120, 87, 0.22)', rowClass: 'high-stock-row' }
  } : {
    'Out of Stock': { icon: '⛔', color: '#dc2626', background: '#fee2e2', rowClass: 'low-stock-row' },
    'Reorder Recommended': { icon: '⚠️', color: '#d97706', background: '#fef3c7', rowClass: 'low-stock-row' },
    'Approaching Reorder Point': { icon: '🔶', color: '#b45309', background: '#fffbeb', rowClass: '' },
    'Healthy': { icon: '✅', color: '#047857', background: '#d1fae5', rowClass: 'high-stock-row' }
  };

  // Merges the live reorder-formula result for this SKU (if loaded) with a stock-status
  // fallback derived from raw quantity, so the table renders sensibly even before/without
  // the reorder-insights fetch completing.
  const getReorderInfo = (product) => {
    const insight = reorderInsights[product.sku];
    if (insight) {
      const style = REORDER_STATUS_STYLE[insight.reorder_status] || REORDER_STATUS_STYLE.Healthy;
      return {
        label: insight.reorder_status,
        ...style,
        availableStock: Number(insight.available_stock),
        reservedStock: Number(insight.reserved_stock),
        reorderPoint: Number(insight.reorder_point),
        averageDailyUsage: Number(insight.average_daily_usage),
        leadTimeDays: Number(insight.lead_time_days),
        safetyStock: Number(insight.safety_stock),
        suggestedReorderQuantity: Number(insight.suggested_reorder_quantity),
        formulaSource: insight.formula_source,
        daysOfSupply: insight.days_of_supply,
        lastCalculatedAt: insight.last_calculated_at
      };
    }
    const fallback = getStockStatus(product);
    return {
      label: fallback.label === 'Low Stock' ? 'Reorder Recommended' : fallback.label,
      icon: REORDER_STATUS_STYLE[fallback.label === 'Low Stock' ? 'Reorder Recommended' : fallback.label]?.icon || '•',
      color: fallback.color,
      background: fallback.background,
      rowClass: fallback.className,
      availableStock: Number(product.quantity || 0),
      reservedStock: null,
      reorderPoint: Number(product.reorder_level || 0),
      averageDailyUsage: null,
      leadTimeDays: null,
      safetyStock: null,
      suggestedReorderQuantity: null,
      formulaSource: null,
      daysOfSupply: null,
      lastCalculatedAt: null
    };
  };

  const fetchReorderInsights = async () => {
    try {
      const res = await api.get('/api/inventory-reports/replenishment-suggestions');
      const rows = res.data?.data || [];
      const map = {};
      rows.forEach((row) => { map[row.sku] = row; });
      setReorderInsights(map);
    } catch (err) {
      // Non-fatal: the table still works off the legacy quantity-vs-reorder_level fallback.
      console.error('Error fetching reorder insights:', err);
    }
  };

  useEffect(() => {
    console.log('showModal changed:', showModal);
  }, [showModal]);

  useEffect(() => {
    if (location.state?.filter) {
      setFilter(location.state.filter);
    }
  }, [location]);

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
        // "Reorder Recommended" or "Approaching Reorder Point" per the reorder formula
        filtered = filtered.filter(item => {
          const status = getReorderInfo(item).label;
          return status === 'Reorder Recommended' || status === 'Approaching Reorder Point';
        });
        break;
      case 'high-stock':
        filtered = filtered.filter(item => getReorderInfo(item).label === 'Healthy');
        break;
      case 'replenishment':
        filtered = filtered.filter(item => getReorderInfo(item).label === 'Out of Stock');
        break;
      default:
        break;
    }
    setFilteredProducts(filtered);
  }, [searchTerm, filter, products, reorderInsights]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory');
      console.log('API response:', res.data);
      // Backend returns { success: true, inventory: [...] }
      const inventoryData = res.data.inventory || [];
      console.log('First product data sample:', inventoryData[0]);
      console.log('Product quantities:', inventoryData.map(p => ({ sku: p.sku, quantity: p.quantity, stock_quantity: p.stock_quantity })));
      console.log('All product data:', inventoryData);
      setProducts(inventoryData);
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
    fetchReorderInsights();
  }, []);


  const handleAddProduct = async (formData) => {
    // Handle add stock mode
    if (formData.isAddStock) {
      try {
        const response = await api.post('/api/inventory/add-stock', {
          sku: formData.sku,
          quantity: formData.quantity, // Backend expects 'quantity', not 'quantityToAdd'
          reason: formData.reason || '',
        });
        if (response.data.success) {
          setShowModal(false);
          await fetchProducts();
        await fetchReorderInsights();
          toast.success('Stock added successfully!');
        }
      } catch (err) {
        console.error('Error adding stock:', err);
        const errorMessage = err.response?.data?.message || 'Failed to add stock';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      return;
    }

    try {
      const isFileUpload = formData instanceof FormData;
      
      const response = await api.post('/api/inventory', formData, {
        headers: isFileUpload ? { 'Content-Type': 'multipart/form-data' } : undefined
      });
        
      if (response.data.success) {
        setShowModal(false);
        await fetchProducts();
        await fetchReorderInsights();
        const successMessage = formData.isUpdate ? 'Product updated successfully!' : 'Product added successfully!';
        toast.success(successMessage);
      }
    } catch (err) {
      console.error('Error processing product:', err);
      const errorMessage = err.response?.data?.message || 'Failed to process product';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleRowClick = (sku) => {
    navigate(`/product-details/${sku}`);
  };

  const handleArchive = async (sku) => {
    if (window.confirm('Are you sure you want to archive (delete) this item?')) {
      try {
  await api.delete(`/api/inventory/${sku}`);
        await fetchProducts();
        await fetchReorderInsights();
        toast.success('Product archived successfully!');
      } catch (err) {
        toast.error('Failed to archive product');
      }
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = ["SKU", "Name", "Description", "Unit Price", "Category", "Expiration", "Last Updated", "UOM", "In Stocks", "Reorder Level", "Stock Status", "Ordered", "Delivered"];
    const tableRows = [];

    filteredProducts.forEach(product => {
        const productData = [
            product.sku,
            product.name,
            product.description,
            parseFloat(product.unit_price).toFixed(2),
            product.category,
            product.expiration ? new Date(product.expiration).toISOString().slice(0, 10) : '',
            new Date(product.last_updated).toLocaleString(),
            UOMS_REQUIRING_CONVERSION.includes(product.uom) && product.conversion_qty ? `${product.uom} (${product.conversion_qty})` : product.uom,
            product.quantity,
            product.reorder_level || 0,
            product.stock_status || getStockStatus(product).label,
            product.ordered_quantity || 0,
            product.delivered_quantity || 0
        ];
        tableRows.push(productData);
    });

    doc.text("Inventory Report", 14, 15);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("inventory_report.pdf");
    toast.success("Exported to PDF successfully!");
  };

  const exportToExcel = () => {
      const worksheetData = filteredProducts.map(product => ({
          SKU: product.sku,
          Name: product.name,
          Description: product.description,
          'Unit Price': `₱${parseFloat(product.unit_price).toFixed(2)}`,
          Category: product.category,
          Supplier: product.supplier_name || 'No supplier',
          'Supplier Phone': product.supplier_phone || '',
          'Supplier Website': product.supplier_website || '',
          Expiration: product.expiration ? new Date(product.expiration).toISOString().slice(0, 10) : '',
          'Last Updated': new Date(product.last_updated).toLocaleString(),
          UOM: UOMS_REQUIRING_CONVERSION.includes(product.uom) && product.conversion_qty ? `${product.uom} (${product.conversion_qty})` : product.uom,
          'In Stocks': product.quantity,
          'Reorder Level': product.reorder_level || 0,
          'Stock Status': product.stock_status || getStockStatus(product).label,
          Ordered: product.ordered_quantity || 0,
          Delivered: product.delivered_quantity || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      XLSX.writeFile(workbook, "inventory_report.xlsx");
      toast.success("Exported to Excel successfully!");
  };

  return (
    <div className="dashboard-container" style={{ height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div className="dashboard-main" style={{ marginLeft: '220px', width: 'calc(100% - 220px)', height: '100vh', overflow: 'hidden' }}>
        <TopBar
          lowStockProducts={Array.isArray(products) ? products.filter(item => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= Number(item.reorder_level || 0)) : []}
          searchValue={searchTerm}
          onSearchChange={e => setSearchTerm(e.target.value)}
        />
        <div className="inventory-container">
          <div className="inventory-header">
            <h2>Inventory</h2>
            <button 
              className="add-product-btn" 
              onClick={() => {
                setModalMode('add');
                setSelectedProduct(null);
                setShowModal(true);
              }}
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
              <option value="low-stock">Reorder Recommended / Approaching</option>
              <option value="high-stock">Healthy</option>
              <option value="replenishment">Out of Stock</option>
            </select>
            <div className="export-buttons">
              <button onClick={exportToPDF} className="export-btn pdf-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM9.5 11.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V9h2v2.5c0 1.93-1.57 3.5-3.5 3.5S8 13.43 8 11.5V9h1.5v2.5zM13 9V3.5L18.5 9H13z"/></svg>Export as PDF</button>
              <button onClick={exportToExcel} className="export-btn excel-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-2 14h-2v-2h2v2zm0-4h-2v-2h2v2zm-4-2h2v2H8v-2zm0 4h2v2H8v-2zm-1.9-6.95l1.45-1.45 1.05 1.05 2.85-2.85 1.45 1.45-4.3 4.3-2.5-2.5zM13 9V3.5L18.5 9H13z"/></svg>Export as Excel</button>
            </div>
          </div>
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
                  <th style={{ width: '80px', textAlign: 'center' }}>In Stocks</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Available</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Reorder Point</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Reorder Status</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Ordered</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Delivered</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} style={{ pointerEvents: 'none' }}>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer" style={{ width: '30px', height: '30px', borderRadius: '4px', display: 'inline-block' }} /></td>
                      <td><div className="skeleton-shimmer skeleton-text" style={{ width: '80px', height: '16px' }} /></td>
                      <td><div className="skeleton-shimmer skeleton-text" style={{ width: '100px', height: '16px' }} /></td>
                      <td><div className="skeleton-shimmer skeleton-text" style={{ width: '120px', height: '16px' }} /></td>
                      <td style={{ textAlign: 'right' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '50px', height: '16px', marginLeft: 'auto' }} /></td>
                      <td><div className="skeleton-shimmer skeleton-text" style={{ width: '80px', height: '16px' }} /></td>
                      <td><div className="skeleton-shimmer skeleton-text" style={{ width: '90px', height: '16px' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '70px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '100px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '40px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '50px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '50px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer" style={{ width: '90px', height: '20px', borderRadius: '10px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '70px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '40px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '40px', height: '16px', margin: '0 auto' }} /></td>
                      <td style={{ textAlign: 'center' }}><div className="skeleton-shimmer skeleton-text" style={{ width: '80px', height: '16px', margin: '0 auto' }} /></td>
                    </tr>
                  ))
                ) : (
                  filteredProducts.map(product => (
                    <tr 
                      key={product.sku} 
                      style={{ cursor: 'pointer' }} 
                      onClick={e => handleRowClick(product.sku)}
                      className={getReorderInfo(product).rowClass}
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
                      <td style={{ textAlign: 'right' }}>₱{parseFloat(product.unit_price).toFixed(2)}</td>
                      <td className="ellipsis" title={product.category}>
                        {product.category}
                      </td>
                      <td className="ellipsis" title={product.supplier_name || 'No supplier'}>
                        {product.supplier_name ? (
                          <div className="supplier-cell">
                            <div className="supplier-name">{product.supplier_name}</div>
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
                        <div className="inventory-quantity-pill" style={{
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}>
                          {(() => {
                            const qty = Number(product.quantity || 0);
                            return qty.toLocaleString();
                          })()}
                        </div>
                      </td>
                      {(() => {
                        const reorderInfo = getReorderInfo(product);
                        const tooltipLines = [
                          `Available stock: ${reorderInfo.availableStock ?? '—'}${reorderInfo.reservedStock ? ` (reserved: ${reorderInfo.reservedStock})` : ''}`,
                          `Reorder point: ${reorderInfo.reorderPoint ?? '—'}`,
                          reorderInfo.averageDailyUsage != null ? `Avg daily usage: ${reorderInfo.averageDailyUsage}` : null,
                          reorderInfo.leadTimeDays != null ? `Lead time: ${reorderInfo.leadTimeDays} day(s)` : null,
                          reorderInfo.safetyStock != null ? `Safety stock: ${reorderInfo.safetyStock}` : null,
                          reorderInfo.suggestedReorderQuantity != null ? `Suggested reorder qty: ${reorderInfo.suggestedReorderQuantity}` : null,
                          reorderInfo.formulaSource ? `Formula source: ${reorderInfo.formulaSource.replace(/_/g, ' ')}` : null,
                          reorderInfo.lastCalculatedAt ? `Last calculated: ${new Date(reorderInfo.lastCalculatedAt).toLocaleString()}` : null
                        ].filter(Boolean).join('\n');
                        return (
                          <>
                            <td style={{ textAlign: 'center' }} title={tooltipLines}>
                              {reorderInfo.availableStock != null ? reorderInfo.availableStock.toLocaleString() : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }} title={tooltipLines}>
                              {reorderInfo.reorderPoint != null ? reorderInfo.reorderPoint.toLocaleString() : '—'}
                            </td>
                            <td style={{ textAlign: 'center' }} title={tooltipLines}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '999px',
                                fontWeight: 700,
                                fontSize: '12px',
                                color: reorderInfo.color,
                                backgroundColor: reorderInfo.background
                              }}>
                                <span aria-hidden="true">{reorderInfo.icon}</span>
                                {reorderInfo.label}
                              </span>
                            </td>
                          </>
                        );
                      })()}
                      <td style={{ textAlign: 'center' }}>{Number(product.ordered_quantity || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>{Number(product.delivered_quantity || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="action-btn add" title="Add Stock" onClick={e => { 
                          e.stopPropagation(); 
                          setModalMode('addStock');
                          setSelectedProduct(product);
                          setShowModal(true);
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                          </svg>
                        </button>
                        <button className="action-btn edit" title="Edit" onClick={e => { 
                          e.stopPropagation();
                          setModalMode('edit');
                          setSelectedProduct(product);
                          setShowModal(true);
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button className="action-btn archive" title="Archive" onClick={e => { e.stopPropagation(); handleArchive(product.sku); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
          {showModal && (
            <AddProductModal 
              onClose={() => setShowModal(false)} 
              onAdd={handleAddProduct} 
              products={products} 
              initialData={selectedProduct || {}} 
              isEdit={modalMode === 'edit'}
              isAddStockMode={modalMode === 'addStock'}
            />
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}

export default withEmployeeAuth(Inventory);
