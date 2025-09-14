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
  const [activeTab, setActiveTab] = useState('overview');
  const [movementData, setMovementData] = useState([]);
  const [replenishmentData, setReplenishmentData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
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
      
      // Fetch all data in parallel
      const [inventoryResponse, movementResponse, replenishmentResponse, analyticsResponse] = await Promise.all([
        api.get('/api/inventory'),
        api.get(`/api/inventory-reports/movement-analysis?days=${getDaysDifference()}`),
        api.get(`/api/inventory-reports/replenishment-suggestions?days=${getDaysDifference()}`),
        api.get(`/api/inventory-reports/advanced-analytics?days=${getDaysDifference()}`)
      ]);
      
      // Handle inventory data
      let data = [];
      if (Array.isArray(inventoryResponse.data)) {
        data = inventoryResponse.data;
      } else if (inventoryResponse.data && inventoryResponse.data.inventory) {
        data = inventoryResponse.data.inventory;
      } else if (inventoryResponse.data && Array.isArray(inventoryResponse.data)) {
        data = inventoryResponse.data;
      }
      
      console.log('Processed inventory data:', data);
      setInventoryData(data);
      calculateReportData(data);
      
      // Set analytics data
      setMovementData(movementResponse.data.data || []);
      setReplenishmentData(replenishmentResponse.data.data || []);
      setAnalyticsData(analyticsResponse.data.data || []);
      
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

  const getDaysDifference = () => {
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
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

  // Helper functions for new analytics
  const getMovementColor = (category) => {
    switch (category) {
      case 'FAST_MOVING': return '#10B981';
      case 'MODERATE_MOVING': return '#F59E0B';
      case 'SLOW_MOVING': return '#EF4444';
      case 'DEAD_STOCK': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return '#EF4444';
      case 'SOON': return '#F59E0B';
      case 'PLAN': return '#3B82F6';
      case 'ADEQUATE': return '#10B981';
      default: return '#6B7280';
    }
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
    doc.text('Enhanced Wrap-N-Track Inventory Report', 14, 22);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 38);
    
    // Executive Summary
    doc.setFontSize(16);
    doc.text('Executive Summary', 14, 50);
    doc.setFontSize(10);
    
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Inventory Value', formatCurrency(reportData.totalValue)],
      ['Total SKUs', formatNumber(reportData.totalSKUs)],
      ['Low Stock Items', formatNumber(reportData.lowStockItems.length)],
      ['Expiring Items', formatNumber(reportData.expiringItems.length)],
      ['Fast Moving Items', formatNumber(movementData.filter(item => item.movement_category === 'FAST_MOVING').length)],
      ['Slow Moving Items', formatNumber(movementData.filter(item => item.movement_category === 'SLOW_MOVING').length)],
      ['Dead Stock Items', formatNumber(movementData.filter(item => item.movement_category === 'DEAD_STOCK').length)],
      ['Urgent Replenishment', formatNumber(replenishmentData.filter(item => item.priority_level === 'URGENT').length)]
    ];
    
    autoTable(doc, {
      startY: 55,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid'
    });
    
    // Fast Moving Items
    const fastMoving = movementData.filter(item => item.movement_category === 'FAST_MOVING').slice(0, 10);
    if (fastMoving.length > 0) {
      doc.setFontSize(14);
      doc.text('Top Fast Moving Items', 14, doc.lastAutoTable.finalY + 20);
      
      const fastMovingData = fastMoving.map(item => [
        item.sku,
        item.name,
        formatNumber(item.sold_quantity),
        formatCurrency(item.sales_value),
        item.movement_category
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['SKU', 'Name', 'Sold Qty', 'Sales Value', 'Category']],
        body: fastMovingData,
        theme: 'grid'
      });
    }
    
    // Urgent Replenishment Items
    const urgentItems = replenishmentData.filter(item => item.priority_level === 'URGENT').slice(0, 10);
    if (urgentItems.length > 0) {
      doc.setFontSize(14);
      doc.text('Urgent Replenishment Items', 14, doc.lastAutoTable.finalY + 20);
      
      const urgentData = urgentItems.map(item => [
        item.sku,
        item.name,
        formatNumber(item.current_stock),
        formatNumber(item.suggested_order_quantity),
        formatCurrency(item.suggested_order_value)
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 25,
        head: [['SKU', 'Name', 'Current Stock', 'Suggested Order Qty', 'Order Value']],
        body: urgentData,
        theme: 'grid'
      });
    }
    
    doc.save('enhanced-inventory-report.pdf');
    toast.success('Enhanced PDF report exported successfully');
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewSheet = XLSX.utils.json_to_sheet([{
      'Total Inventory Value': formatCurrency(reportData.totalValue),
      'Total SKUs': reportData.totalSKUs,
      'Low Stock Items': reportData.lowStockItems.length,
      'Expiring Items': reportData.expiringItems.length,
      'Fast Moving Items': movementData.filter(item => item.movement_category === 'FAST_MOVING').length,
      'Slow Moving Items': movementData.filter(item => item.movement_category === 'SLOW_MOVING').length,
      'Dead Stock Items': movementData.filter(item => item.movement_category === 'DEAD_STOCK').length,
      'Urgent Replenishment': replenishmentData.filter(item => item.priority_level === 'URGENT').length
    }]);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
    
    // Movement Analysis Sheet
    const movementSheet = XLSX.utils.json_to_sheet(movementData.map(item => ({
      SKU: item.sku,
      Name: item.name,
      Category: item.category,
      'Current Stock': item.current_stock,
      'Sold Quantity': item.sold_quantity,
      'Sales Value': formatCurrency(item.sales_value),
      'Movement Category': item.movement_category,
      'Velocity Ratio': item.velocity_ratio,
      'Months of Stock': item.months_of_stock
    })));
    XLSX.utils.book_append_sheet(workbook, movementSheet, 'Movement Analysis');
    
    // Replenishment Suggestions Sheet
    const replenishmentSheet = XLSX.utils.json_to_sheet(replenishmentData.map(item => ({
      SKU: item.sku,
      Name: item.name,
      Category: item.category,
      'Current Stock': item.current_stock,
      'Priority Level': item.priority_level,
      'Suggested Reorder Point': item.suggested_reorder_point,
      'Suggested Order Qty': item.suggested_order_quantity,
      'Days of Supply': item.days_of_supply,
      'Supplier': item.supplier_name
    })));
    XLSX.utils.book_append_sheet(workbook, replenishmentSheet, 'Replenishment Suggestions');
    
    // Advanced Analytics Sheet
    const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData.map(item => ({
      SKU: item.sku,
      Name: item.name,
      Category: item.category,
      'Current Stock': item.current_stock,
      'Sold Quantity': item.sold_quantity,
      'Sales Value': formatCurrency(item.sales_value),
      'Daily Velocity': item.daily_velocity,
      'Days of Supply': item.days_of_supply,
      'Turnover Ratio': item.turnover_ratio,
      'Movement Category': item.movement_category,
      'Stock Level': item.stock_level,
      'Profit Margin': formatCurrency(item.profit_margin),
      'Margin %': item.profit_margin_percentage
    })));
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Advanced Analytics');
    
    XLSX.writeFile(workbook, 'enhanced-inventory-report.xlsx');
    toast.success('Enhanced Excel report exported successfully');
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
            <h1>Enhanced Inventory Analytics</h1>
            <div className="report-controls">
              <div className="date-range">
                <label>Analysis Period:</label>
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

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'movement' ? 'active' : ''}`}
              onClick={() => setActiveTab('movement')}
            >
              🚀 Movement Analysis
            </button>
            <button 
              className={`tab-btn ${activeTab === 'replenishment' ? 'active' : ''}`}
              onClick={() => setActiveTab('replenishment')}
            >
              🔄 Replenishment
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Advanced Analytics
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-content">
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
                <div className="summary-card success">
                  <h3>Fast Moving Items</h3>
                  <div className="value">{formatNumber(movementData.filter(item => item.movement_category === 'FAST_MOVING').length)}</div>
                </div>
                <div className="summary-card warning">
                  <h3>Slow Moving Items</h3>
                  <div className="value">{formatNumber(movementData.filter(item => item.movement_category === 'SLOW_MOVING').length)}</div>
                </div>
                <div className="summary-card danger">
                  <h3>Dead Stock Items</h3>
                  <div className="value">{formatNumber(movementData.filter(item => item.movement_category === 'DEAD_STOCK').length)}</div>
                </div>
                <div className="summary-card info">
                  <h3>Urgent Replenishment</h3>
                  <div className="value">{formatNumber(replenishmentData.filter(item => item.priority_level === 'URGENT').length)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Movement Analysis Tab */}
          {activeTab === 'movement' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Movement Analysis</h2>
                <p>Analysis of item movement patterns over the selected period</p>
              </div>
              
              <div className="movement-grid">
                {['FAST_MOVING', 'MODERATE_MOVING', 'SLOW_MOVING', 'DEAD_STOCK'].map(category => {
                  const items = movementData.filter(item => item.movement_category === category);
                  return (
                    <div key={category} className="movement-category">
                      <div className="category-header" style={{ backgroundColor: getMovementColor(category) }}>
                        <h3>{category.replace('_', ' ')}</h3>
                        <span className="count">{items.length} items</span>
                      </div>
                      <div className="category-items">
                        {items.slice(0, 5).map(item => (
                          <div key={item.sku} className="movement-item">
                            <div className="item-info">
                              <div className="item-name">{item.name}</div>
                              <div className="item-sku">{item.sku}</div>
                            </div>
                            <div className="item-metrics">
                              <div className="metric">
                                <span className="label">Sold:</span>
                                <span className="value">{formatNumber(item.sold_quantity)}</span>
                              </div>
                              <div className="metric">
                                <span className="label">Value:</span>
                                <span className="value">{formatCurrency(item.sales_value)}</span>
                              </div>
                              <div className="metric">
                                <span className="label">Velocity:</span>
                                <span className="value">{item.velocity_ratio}x</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Replenishment Suggestions Tab */}
          {activeTab === 'replenishment' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>AI-Powered Replenishment Suggestions</h2>
                <p>Intelligent recommendations for inventory replenishment based on demand patterns</p>
              </div>
              
              <div className="replenishment-priority">
                {['URGENT', 'SOON', 'PLAN', 'ADEQUATE'].map(priority => {
                  const items = replenishmentData.filter(item => item.priority_level === priority);
                  return (
                    <div key={priority} className="priority-section">
                      <div className="priority-header" style={{ backgroundColor: getPriorityColor(priority) }}>
                        <h3>{priority} Priority</h3>
                        <span className="count">{items.length} items</span>
                      </div>
                      <div className="replenishment-table">
                        <table>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Name</th>
                              <th>Current Stock</th>
                              <th>Daily Demand</th>
                              <th>Days of Supply</th>
                              <th>Suggested Reorder Point</th>
                              <th>Suggested Order Qty</th>
                              <th>Order Value</th>
                              <th>Supplier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => (
                              <tr key={item.sku}>
                                <td>{item.sku}</td>
                                <td>{item.name}</td>
                                <td>{formatNumber(item.current_stock)}</td>
                                <td>{formatNumber(item.avg_daily_demand)}</td>
                                <td>{item.days_of_supply}</td>
                                <td>{formatNumber(item.suggested_reorder_point)}</td>
                                <td>{formatNumber(item.suggested_order_quantity)}</td>
                                <td>{formatCurrency(item.suggested_order_value)}</td>
                                <td>{item.supplier_name || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Advanced Inventory Analytics</h2>
                <p>Comprehensive analysis of inventory performance and profitability</p>
              </div>
              
              <div className="analytics-table-container">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Sold Qty</th>
                      <th>Sales Value</th>
                      <th>Daily Velocity</th>
                      <th>Days of Supply</th>
                      <th>Turnover Ratio</th>
                      <th>Movement</th>
                      <th>Stock Level</th>
                      <th>Profit Margin</th>
                      <th>Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.map(item => (
                      <tr key={item.sku}>
                        <td>{item.sku}</td>
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td>{formatNumber(item.current_stock)}</td>
                        <td>{formatNumber(item.sold_quantity)}</td>
                        <td>{formatCurrency(item.sales_value)}</td>
                        <td>{item.daily_velocity}</td>
                        <td>{item.days_of_supply}</td>
                        <td>{item.turnover_ratio}</td>
                        <td>
                          <span 
                            className="movement-badge" 
                            style={{ backgroundColor: getMovementColor(item.movement_category) }}
                          >
                            {item.movement_category.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={`stock-level ${item.stock_level.toLowerCase()}`}>
                            {item.stock_level.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{formatCurrency(item.profit_margin)}</td>
                        <td>{item.profit_margin_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
