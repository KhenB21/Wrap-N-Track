import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InventoryReport.css';
import AppShell from '../../Components/AppShell';
import { BarChart } from '../../Components/Charts';
import api from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import usePermissions from '../../hooks/usePermissions';

export default function InventoryReport() {
  const { checkPermission, canUseTestData } = usePermissions();
  const showTestDataControls = canUseTestData();
  const navigate = useNavigate();
  const [inventoryData, setInventoryData] = useState([]);
  const [reportData, setReportData] = useState({
    totalValue: 0,
    totalSKUs: 0,
    lowStockItems: [],
    outOfStockItems: [],
    expiringItems: [],
    categoryBreakdown: [],
    topSellingItems: [],
    inventoryTurnover: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [movementData, setMovementData] = useState([]);
  const [replenishmentData, setReplenishmentData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [stockFlow, setStockFlow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // all | low | out
  const [searchTerm, setSearchTerm] = useState('');

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
      const days = getDaysDifference();
      const [inventoryResponse, movementResponse, replenishmentResponse, analyticsResponse,
             forecastResponse, stockFlowResponse] = await Promise.all([
        api.get('/api/inventory'),
        api.get(`/api/inventory-reports/movement-analysis?days=${days}`),
        api.get(`/api/inventory-reports/replenishment-suggestions?days=${days}`),
        api.get(`/api/inventory-reports/advanced-analytics?days=${days}`),
        api.get('/api/analytics/forecast/demand').catch(() => null),
        api.get(`/api/inventory-reports/stock-flow?days=${days}`).catch(() => null),
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
      if (forecastResponse?.data?.data)  setForecastData(forecastResponse.data.data);
      if (stockFlowResponse?.data?.data) setStockFlow(stockFlowResponse.data.data);
      
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
  const MOVEMENT_COLORS = {
    FAST_MOVING:     'var(--success,#10B981)',
    MODERATE_MOVING: 'var(--warning,#F59E0B)',
    SLOW_MOVING:     'var(--danger,#EF4444)',
    DEAD_STOCK:      'var(--text-muted,#6B7280)',
  };
  const getMovementColor = (cat) => MOVEMENT_COLORS[cat] || 'var(--text-muted,#6B7280)';

  // Matches the actual reorder_status values the backend computes in
  // /api/inventory-reports/replenishment-suggestions (see the formula
  // documented in Website/server/routes/inventory-reports.js) — the frontend
  // previously filtered on invented URGENT/SOON/PLAN/ADEQUATE labels that the
  // backend never sends, so this tab always rendered empty.
  const PRIORITY_COLORS = {
    'Out of Stock':              'var(--danger,#EF4444)',
    'Reorder Recommended':       'var(--warning,#F59E0B)',
    'Approaching Reorder Point': 'var(--brand,#3B82F6)',
    'Healthy':                   'var(--success,#10B981)',
  };
  const getPriorityColor = (status) => PRIORITY_COLORS[status] || 'var(--text-muted,#6B7280)';

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
    
    // Out-of-stock: zero (or negative) quantity — tracked separately from "low stock"
    // so the two KPIs don't double-count the same items.
    const outOfStockItems = data.filter(item => (parseFloat(item.quantity) || 0) <= 0);

    // Low stock: positive quantity at/below reorder level (or 20% of stock if no
    // reorder_level is set), excluding items already counted as out of stock.
    const lowStockItems = data.filter(item => {
      const quantity = parseFloat(item.quantity) || 0;
      if (quantity <= 0) return false;
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
      outOfStockItems,
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
      ['Out of Stock Items', formatNumber(reportData.outOfStockItems.length)],
      ['Expiring Items', formatNumber(reportData.expiringItems.length)],
      ['Fast Moving Items', formatNumber(movementData.filter(item => item.movement_category === 'FAST_MOVING').length)],
      ['Slow Moving Items', formatNumber(movementData.filter(item => item.movement_category === 'SLOW_MOVING').length)],
      ['Dead Stock Items', formatNumber(movementData.filter(item => item.movement_category === 'DEAD_STOCK').length)],
      ['Urgent Replenishment', formatNumber(replenishmentData.filter(item => item.reorder_status === 'Out of Stock' || item.reorder_status === 'Reorder Recommended').length)]
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
    const urgentItems = replenishmentData
      .filter(item => item.reorder_status === 'Out of Stock' || item.reorder_status === 'Reorder Recommended')
      .slice(0, 10);
    if (urgentItems.length > 0) {
      doc.setFontSize(14);
      doc.text('Urgent Replenishment Items', 14, doc.lastAutoTable.finalY + 20);

      const urgentData = urgentItems.map(item => [
        item.sku,
        item.name,
        formatNumber(item.available_stock),
        formatNumber(item.suggested_reorder_quantity),
        formatCurrency((parseFloat(item.suggested_reorder_quantity) || 0) * (parseFloat(item.unit_price) || 0))
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
      'Out of Stock Items': reportData.outOfStockItems.length,
      'Expiring Items': reportData.expiringItems.length,
      'Fast Moving Items': movementData.filter(item => item.movement_category === 'FAST_MOVING').length,
      'Slow Moving Items': movementData.filter(item => item.movement_category === 'SLOW_MOVING').length,
      'Dead Stock Items': movementData.filter(item => item.movement_category === 'DEAD_STOCK').length,
      'Urgent Replenishment': replenishmentData.filter(item => item.reorder_status === 'Out of Stock' || item.reorder_status === 'Reorder Recommended').length
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
      'Available Stock': item.available_stock,
      'Status': item.reorder_status,
      'Reorder Point': item.reorder_point,
      'Suggested Order Qty': item.suggested_reorder_quantity,
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

  // Test data functions
  const insertTestData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/inventory-reports/test-data/insert');
      if (response.data.success) {
        toast.success('Test data inserted successfully!');
        // Refresh data to show the new test data
        await fetchInventoryData();
      } else {
        toast.error('Failed to insert test data');
      }
    } catch (error) {
      console.error('Error inserting test data:', error);
      toast.error('Error inserting test data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/inventory-reports/test-data/clear');
      if (response.data.success) {
        toast.success('Test data cleared successfully!');
        // Refresh data to show the cleared state
        await fetchInventoryData();
      } else {
        toast.error('Failed to clear test data');
      }
    } catch (error) {
      console.error('Error clearing test data:', error);
      toast.error('Error clearing test data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = Array.from(
    new Set((inventoryData || []).map(item => item.category || 'Uncategorized'))
  ).sort();
  const supplierOptions = Array.from(
    new Set((inventoryData || []).map(item => item.supplier_name).filter(Boolean))
  ).sort();

  // Product/stock table for the Low Stock & Out of Stock section — combines
  // reportData's lowStockItems + outOfStockItems, then applies the
  // category/supplier/stock-status/search filters.
  const stockWatchItems = [...reportData.lowStockItems, ...reportData.outOfStockItems]
    .filter(item => selectedCategory === 'all' || (item.category || 'Uncategorized') === selectedCategory)
    .filter(item => selectedSupplier === 'all' || item.supplier_name === selectedSupplier)
    .filter(item => {
      if (stockStatusFilter === 'all') return true;
      const qty = parseFloat(item.quantity) || 0;
      return stockStatusFilter === 'out' ? qty <= 0 : qty > 0;
    })
    .filter(item => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(term) ||
        (item.sku || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0));

  if (loading) {
    return (
      <AppShell>
        <div className="loading">Loading inventory report...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="inventory-report">
          <div className="report-header">
            <div>
              <h1>Enhanced Inventory Analytics</h1>
              <p style={{ margin: '8px 0 0 0', color: '#718096', fontSize: '16px' }}>
                Comprehensive insights into your inventory performance and optimization opportunities
              </p>
            </div>
            <div className="report-controls">
              <div className="date-range">
                <label>Analysis Period</label>
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
                {showTestDataControls && (
                  <>
                    <button onClick={insertTestData} className="test-btn insert" disabled={loading}>
                      🧪 Insert Test Data
                    </button>
                    <button onClick={clearTestData} className="test-btn clear" disabled={loading}>
                      🗑️ Clear Test Data
                    </button>
                  </>
                )}
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
            <button
              className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              🔮 Demand Forecast
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
                  <h3>Out of Stock</h3>
                  <div className="value">{formatNumber(reportData.outOfStockItems.length)}</div>
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
                  <div className="value">{formatNumber(replenishmentData.filter(item => item.reorder_status === 'Out of Stock' || item.reorder_status === 'Reorder Recommended').length)}</div>
                </div>
              </div>

              <div className="section-header" style={{ marginTop: '32px' }}>
                <h2>Low Stock &amp; Out of Stock</h2>
                <p>Products that need attention, filterable by category, supplier, and status</p>
              </div>

              <div className="stock-watch-filters">
                <input
                  type="text"
                  className="stock-watch-search"
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                  <option value="all">All Suppliers</option>
                  {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)}>
                  <option value="all">Low Stock + Out of Stock</option>
                  <option value="low">Low Stock Only</option>
                  <option value="out">Out of Stock Only</option>
                </select>
              </div>

              {stockWatchItems.length === 0 ? (
                <p className="empty-note">No products match the current filters.</p>
              ) : (
                <div className="replenishment-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Reorder Threshold</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockWatchItems.map(item => {
                        const qty = parseFloat(item.quantity) || 0;
                        const threshold = item.reorder_level || Math.ceil(qty * 0.2);
                        const isOut = qty <= 0;
                        return (
                          <tr key={item.sku}>
                            <td>{item.name}</td>
                            <td>{item.sku}</td>
                            <td>{formatNumber(qty)}</td>
                            <td>{formatNumber(threshold)}</td>
                            <td>
                              <span className={`stock-status-pill ${isOut ? 'out' : 'low'}`}>
                                {isOut ? 'Out of Stock' : 'Low Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Movement Analysis Tab */}
          {activeTab === 'movement' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Movement Analysis</h2>
                <p>Analysis of item movement patterns over the selected period</p>
              </div>

              {/* Stock In vs Out chart */}
              {stockFlow.length > 0 && (() => {
                const totalIn  = stockFlow.reduce((s, d) => s + d.stockIn, 0);
                const totalOut = stockFlow.reduce((s, d) => s + d.stockOut, 0);
                const netData  = stockFlow.map(d => ({ name: d.date, value: d.stockIn - d.stockOut }));
                return (
                  <div className="ir-chart-card">
                    <h3 className="ir-chart-title">Stock Flow — {getDaysDifference()}-day window</h3>
                    <div className="ir-flow-summary">
                      <div className="ir-flow-tile ir-flow-in">
                        <span className="ir-flow-label">Total Stock In</span>
                        <span className="ir-flow-val">{formatNumber(totalIn)} units</span>
                      </div>
                      <div className="ir-flow-tile ir-flow-out">
                        <span className="ir-flow-label">Total Stock Out</span>
                        <span className="ir-flow-val">{formatNumber(totalOut)} units</span>
                      </div>
                      <div className="ir-flow-tile">
                        <span className="ir-flow-label">Net Change</span>
                        <span className={`ir-flow-val ${totalIn - totalOut >= 0 ? 'ir-flow-pos' : 'ir-flow-neg'}`}>
                          {totalIn - totalOut >= 0 ? '+' : ''}{formatNumber(totalIn - totalOut)} units
                        </span>
                      </div>
                    </div>
                    <BarChart
                      data={netData}
                      dataKey="value"
                      nameKey="name"
                      layout="vertical"
                      isCurrency={false}
                      colorByIndex={false}
                      height={Math.max(160, netData.length * 22)}
                    />
                    <p className="ir-chart-note">Positive = more received than consumed; negative = drawdown.</p>
                  </div>
                );
              })()}

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
                {['Out of Stock', 'Reorder Recommended', 'Approaching Reorder Point', 'Healthy'].map(status => {
                  const items = replenishmentData.filter(item => item.reorder_status === status);
                  return (
                    <div key={status} className="priority-section">
                      <div className="priority-header" style={{ backgroundColor: getPriorityColor(status) }}>
                        <h3>{status}</h3>
                        <span className="count">{items.length} items</span>
                      </div>
                      <div className="replenishment-table">
                        <table>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Name</th>
                              <th>Available Stock</th>
                              <th>Avg Daily Usage</th>
                              <th>Days of Supply</th>
                              <th>Reorder Point</th>
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
                                <td>{formatNumber(item.available_stock)}</td>
                                <td>{formatNumber(item.average_daily_usage)}</td>
                                <td>{item.days_of_supply ?? 'N/A'}</td>
                                <td>{formatNumber(item.reorder_point)}</td>
                                <td>{formatNumber(item.suggested_reorder_quantity)}</td>
                                <td>{formatCurrency((parseFloat(item.suggested_reorder_quantity) || 0) * (parseFloat(item.unit_price) || 0))}</td>
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

          {/* Demand Forecast Tab */}
          {activeTab === 'forecast' && (
            <div className="tab-content">
              <div className="section-header">
                <h2>Demand Forecast</h2>
                <p>Per-SKU velocity trends, days-to-stockout, and reorder recommendations. Items with fewer than 30 days of sales history are listed separately — their forecast would be unreliable.</p>
              </div>

              {forecastData.length === 0 ? (
                <p className="empty-note">No forecast data available. The analytics server may need a restart.</p>
              ) : (() => {
                const okItems = forecastData.filter(d => d.status === 'ok');
                const thinItems = forecastData.filter(d => d.status !== 'ok');

                return (
                  <>
                    {okItems.length > 0 && (
                      <div className="analytics-table-container">
                        <table className="analytics-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Name</th>
                              <th>Avg Daily Use (30d)</th>
                              <th>Trend</th>
                              <th>Stock on Hand</th>
                              <th>Days to Stockout</th>
                              <th>Projected Stockout</th>
                              <th>Reorder Qty</th>
                              <th>Reorder Status</th>
                              <th>Formula</th>
                            </tr>
                          </thead>
                          <tbody>
                            {okItems.map(d => {
                              const urgent = d.daysToStockout !== null && d.daysToStockout <= (d.leadTimeDays || 7);
                              return (
                                <tr key={d.sku} className={urgent ? 'ir-forecast-urgent' : ''}>
                                  <td>{d.sku}</td>
                                  <td>{d.name}</td>
                                  <td>{d.averageDailyUsage?.d30 ?? '—'}</td>
                                  <td>
                                    {d.trend ? (
                                      <span className={`ir-trend-badge ir-trend-${d.trend.direction || 'flat'}`}>
                                        {d.trend.direction === 'up' ? '↑' : d.trend.direction === 'down' ? '↓' : '→'}{' '}
                                        {d.trend.changePct != null ? `${Math.abs(d.trend.changePct).toFixed(0)}%` : ''}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td>{formatNumber(d.availableStock)}</td>
                                  <td className={d.daysToStockout !== null && d.daysToStockout <= 14 ? 'ir-cell-danger' : ''}>
                                    {d.daysToStockout !== null ? `${Math.ceil(d.daysToStockout)}d` : '—'}
                                  </td>
                                  <td>{d.projectedStockoutDate ?? '—'}</td>
                                  <td>{d.recommendedReorderQuantity > 0 ? formatNumber(d.recommendedReorderQuantity) : '—'}</td>
                                  <td>
                                    <span className="movement-badge" style={{ backgroundColor: getPriorityColor(d.reorderStatus) }}>
                                      {d.reorderStatus || '—'}
                                    </span>
                                  </td>
                                  <td className="ir-formula-source">{d.formulaSource ?? '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {thinItems.length > 0 && (
                      <div style={{ marginTop: 24 }}>
                        <h3 className="ir-chart-title">Insufficient History ({thinItems.length} SKUs)</h3>
                        <p className="ir-chart-note">These SKUs have fewer than 30 days of sales activity in the last 90 days. A demand forecast would be unreliable, so none is shown.</p>
                        <div className="analytics-table-container">
                          <table className="analytics-table">
                            <thead>
                              <tr><th>SKU</th><th>Name</th><th>Sales Days (90d window)</th></tr>
                            </thead>
                            <tbody>
                              {thinItems.map(d => (
                                <tr key={d.sku}>
                                  <td>{d.sku}</td>
                                  <td>{d.name}</td>
                                  <td>{d.salesDays90 ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
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
                        <td>{item.profit_margin_percentage != null ? formatCurrency(item.profit_margin) : '—'}</td>
                        <td>{item.profit_margin_percentage != null ? `${item.profit_margin_percentage}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      <ToastContainer position="bottom-right" />
    </AppShell>
  );
}
