import React, { useState, useEffect } from 'react';
import './Inventory.css';
import AddProductModal from './AddProductModal';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import { useNavigate, useLocation } from 'react-router-dom';
import api from "../../api";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import usePermissions from '../../hooks/usePermissions';

const UOMS_REQUIRING_CONVERSION = ['Dozen', 'Box', 'Bundle', 'Set', 'Kit'];

export default function Inventory() {
  const { checkPermission } = usePermissions();

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
  const navigate = useNavigate();

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
      const res = await api.get('/api/inventory');
      console.log('API response:', res.data);
      // Backend returns { success: true, inventory: [...] }
      setProducts(res.data.inventory || []);
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
    // Handle add stock mode
    if (formData.isAddStock) {
      try {
        const response = await api.post('/api/inventory/add-stock', {
          sku: formData.sku,
          quantity: formData.quantity, // Backend expects 'quantity', not 'quantityToAdd'
        });
        if (response.data.success) {
          setShowModal(false);
          await fetchProducts();
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
        toast.success('Product archived (deleted) successfully!');
      } catch (err) {
        toast.error('Failed to archive (delete) product');
      }
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = ["SKU", "Name", "Description", "Unit Price", "Category", "Expiration", "Last Updated", "UOM", "In Stocks", "Ordered", "Delivered"];
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
          Expiration: product.expiration ? new Date(product.expiration).toISOString().slice(0, 10) : '',
          'Last Updated': new Date(product.last_updated).toLocaleString(),
          UOM: UOMS_REQUIRING_CONVERSION.includes(product.uom) && product.conversion_qty ? `${product.uom} (${product.conversion_qty})` : product.uom,
          'In Stocks': product.quantity,
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
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar
          lowStockProducts={Array.isArray(products) ? products.filter(item => Number(item.quantity || 0) < 300) : []}
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
              <option value="low-stock">Low Stock (≤300)</option>
              <option value="medium-stock">Medium Stock (301-800)</option>
              <option value="high-stock">High Stock (&gt;800)</option>
              <option value="replenishment">Need Replenishment (0)</option>
            </select>
            <div className="export-buttons">
              <button onClick={exportToPDF} className="export-btn pdf-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM9.5 11.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V9h2v2.5c0 1.93-1.57 3.5-3.5 3.5S8 13.43 8 11.5V9h1.5v2.5zM13 9V3.5L18.5 9H13z"/></svg>Export as PDF</button>
              <button onClick={exportToExcel} className="export-btn excel-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-2 14h-2v-2h2v2zm0-4h-2v-2h2v2zm-4-2h2v2H8v-2zm0 4h2v2H8v-2zm-1.9-6.95l1.45-1.45 1.05 1.05 2.85-2.85 1.45 1.45-4.3 4.3-2.5-2.5zM13 9V3.5L18.5 9H13z"/></svg>Export as Excel</button>
            </div>
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
                      <td style={{ textAlign: 'center' }}>{product.ordered_quantity || 0}</td>
                      <td style={{ textAlign: 'center' }}>{product.delivered_quantity || 0}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="action-btn add" title="Add Stock" onClick={e => { 
                          e.stopPropagation(); 
                          setModalMode('addStock');
                          setSelectedProduct(product); 
                          setShowModal(true); 
                        }}>
                          Add
                        </button>
                        <button className="action-btn edit" title="Edit" onClick={e => { 
                          e.stopPropagation();
                          setModalMode('edit');
                          setSelectedProduct(product); 
                          setShowModal(true); 
                        }}>
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