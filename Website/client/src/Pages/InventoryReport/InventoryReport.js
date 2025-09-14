import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InventoryReport.css';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import api from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import usePermissions from '../../hooks/usePermissions';

export default function InventoryReport() {
  const { checkPermission } = usePermissions();
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [reportData, setReportData] = useState({
    totalValue: 0,
    totalSKUs: 0,
    lowStockItems: [],
    expiringItems: [],
    categoryBreakdown: [],
    topSellingItems: [],
    inventoryTurnover: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    // Check if user is logged in first
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login-employee-pensee');
      return;
    }
    
    // Check permissions
    if (!checkPermission('reports')) {
      return;
    }
    
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      console.log('Fetching inventory data...');
      const response = await api.get('/api/inventory');
      console.log('API response:', response);
      
      // Handle different response formats
      let data = [];
      if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
      } else if (response.data && response.data.inventory) {
        // Wrapped response with inventory property
        data = response.data.inventory;
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback for direct array
        data = response.data;
      }
      
      console.log('Processed inventory data:', data);
      console.log('Data length:', data.length);
      setInventoryData(data);
      calculateReportData(data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
        navigate('/login-employee-pensee');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You do not have permission to view inventory data.');
      } else {
        toast.error('Failed to fetch inventory data');
      }
      setInventoryData([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

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

  const calculateReportData = (data) => {
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error('calculateReportData: data is not an array', data);
      return;
    }
    
    // Calculate total inventory value
    const totalValue = data.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return sum + (quantity * unitPrice);
    }, 0);
    
    // Calculate total SKUs
    const totalSKUs = data.length;
    
    // Find low stock items (assuming reorder_level exists, otherwise use 20% of current stock)
    const lowStockItems = data.filter(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const reorderLevel = item.reorder_level || Math.ceil(quantity * 0.2);
      return quantity <= reorderLevel;
    });
    
    // Find expiring items (within 30 days)
    const expiringItems = data.filter(item => {
      if (!item.expiration_date) return false;
      const expirationDate = new Date(item.expiration_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expirationDate <= thirtyDaysFromNow;
    });
    
    // Calculate category breakdown
    const categoryBreakdown = data.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0, items: [] };
      }
      acc[category].count += 1;
      acc[category].value += quantity * unitPrice;
      acc[category].items.push(item);
      return acc;
    }, {});
    
    // Convert to array and sort by value
    const categoryArray = Object.entries(categoryBreakdown)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
    
    // Calculate top selling items (based on delivered quantity)
    const topSellingItems = data
      .filter(item => item.delivered_quantity > 0)
      .sort((a, b) => b.delivered_quantity - a.delivered_quantity)
      .slice(0, 5);
    
    // Calculate inventory turnover (simplified)
    const totalDelivered = data.reduce((sum, item) => sum + (item.delivered_quantity || 0), 0);
    const averageInventory = data.reduce((sum, item) => sum + item.quantity, 0) / data.length;
    const inventoryTurnover = averageInventory > 0 ? (totalDelivered / averageInventory) : 0;
    
    setReportData({
      totalValue,
      totalSKUs,
      lowStockItems,
      expiringItems,
      categoryBreakdown: categoryArray,
      topSellingItems,
      inventoryTurnover
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Wrap-N-Track Inventory Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 14, 45);
    doc.setFontSize(10);
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Inventory Value', formatCurrency(reportData.totalValue)],
      ['Total SKUs', formatNumber(reportData.totalSKUs)],
      ['Low Stock Items', formatNumber(reportData.lowStockItems.length)],
      ['Expiring Items', formatNumber(reportData.expiringItems.length)],
      ['Inventory Turnover', reportData.inventoryTurnover.toFixed(2)]
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid'
    });
    
    // Low Stock Items
    if (reportData.lowStockItems.length > 0) {
      doc.setFontSize(14);
      doc.text('Low Stock Items', 14, doc.lastAutoTable.finalY + 20);
      
      const lowStockData = reportData.lowStockItems.map(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        return [
          item.sku,
          item.name,
          formatNumber(quantity),
          formatCurrency(unitPrice)
        ];
      });
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['SKU', 'Name', 'Quantity', 'Unit Price']],
        body: lowStockData,
        theme: 'grid'
      });
    }
    
    doc.save('inventory-report.pdf');
    toast.success('PDF report exported successfully');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(inventoryData.map(item => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      return {
        SKU: item.sku,
        Name: item.name,
        Category: item.category,
        Quantity: quantity,
        'Unit Price': formatCurrency(unitPrice),
        'Total Value': formatCurrency(quantity * unitPrice),
        'Reorder Level': item.reorder_level || 'N/A',
        'Last Updated': item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'
      };
    }));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');
    XLSX.writeFile(workbook, 'inventory-report.xlsx');
    toast.success('Excel report exported successfully');
  };

  const filteredData = selectedCategory === 'all' 
    ? (inventoryData || []) 
    : (inventoryData || []).filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="inventory-report-container">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <div className="loading">Loading inventory report...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-report-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <div className="inventory-report">
          <div className="report-header">
            <h1>Inventory Report</h1>
            <div className="report-controls">
              <div className="date-range">
                <label>Date Range:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                />
              </div>
              <div className="category-filter">
                <label>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {reportData.categoryBreakdown.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="export-buttons">
                <button onClick={exportToPDF} className="export-btn pdf">
                  📄 Export PDF
                </button>
                <button onClick={exportToExcel} className="export-btn excel">
                  📊 Export Excel
                </button>
                <button onClick={fetchInventoryData} className="refresh-btn">
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total Inventory Value</h3>
              <div className="value">{formatCurrency(reportData.totalValue)}</div>
            </div>
            <div className="summary-card">
              <h3>Total SKUs</h3>
              <div className="value">{formatNumber(reportData.totalSKUs)}</div>
            </div>
            <div className="summary-card warning">
              <h3>Low Stock Items</h3>
              <div className="value">{formatNumber(reportData.lowStockItems.length)}</div>
            </div>
            <div className="summary-card danger">
              <h3>Expiring Items</h3>
              <div className="value">{formatNumber(reportData.expiringItems.length)}</div>
            </div>
            <div className="summary-card">
              <h3>Inventory Turnover</h3>
              <div className="value">{reportData.inventoryTurnover.toFixed(2)}x</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="report-section">
            <h2>Category Breakdown</h2>
            <div className="category-chart">
              {reportData.categoryBreakdown.map((category, index) => (
                <div key={category.name} className="category-item">
                  <div className="category-header">
                    <span className="category-name">{category.name}</span>
                    <span className="category-value">{formatCurrency(category.value)}</span>
                  </div>
                  <div className="category-bar">
                    <div 
                      className="category-fill" 
                      style={{ 
                        width: `${(category.value / reportData.totalValue) * 100}%`,
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                      }}
                    ></div>
                  </div>
                  <div className="category-details">
                    <span>{formatNumber(category.count)} items</span>
                    <span>{((category.value / reportData.totalValue) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          {reportData.lowStockItems.length > 0 && (
            <div className="report-section alert-section">
              <h2>🚨 Low Stock Alert</h2>
              <div className="alert-grid">
                {reportData.lowStockItems.map(item => (
                  <div key={item.sku} className="alert-item">
                    <div className="alert-header">
                      <span className="sku">{item.sku}</span>
                      <span className="status critical">CRITICAL</span>
                    </div>
                    <div className="alert-details">
                      <div className="item-name">{item.name}</div>
                      <div className="stock-info">
                        <span>Current: {item.quantity}</span>
                        <span>Reorder Level: {item.reorder_level || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div className="report-section">
            <h2>Detailed Inventory</h2>
            <div className="inventory-table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit Price (₱)</th>
                    <th>Total Value (₱)</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(filteredData) && filteredData.length > 0 ? (
                    filteredData.map(item => {
                      const quantity = parseFloat(item.quantity) || 0;
                      const unitPrice = parseFloat(item.unit_price) || 0;
                      const reorderLevel = item.reorder_level || Math.ceil(quantity * 0.2);
                      const isLowStock = quantity <= reorderLevel;
                      const isExpiring = item.expiration_date && 
                        new Date(item.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      const totalValue = quantity * unitPrice;
                      
                      return (
                        <tr key={item.sku} className={isLowStock ? 'low-stock' : ''}>
                          <td>{item.sku}</td>
                          <td>{item.name}</td>
                          <td>{item.category || 'Uncategorized'}</td>
                          <td>{formatNumber(quantity)}</td>
                          <td>{formatCurrency(unitPrice)}</td>
                          <td>{formatCurrency(totalValue)}</td>
                          <td>{item.reorder_level || 'N/A'}</td>
                          <td>
                            <span className={`status ${isLowStock ? 'critical' : isExpiring ? 'warning' : 'healthy'}`}>
                              {isLowStock ? 'Low Stock' : isExpiring ? 'Expiring Soon' : 'Healthy'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>
                        {loading ? 'Loading inventory data...' : 'No inventory data available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
