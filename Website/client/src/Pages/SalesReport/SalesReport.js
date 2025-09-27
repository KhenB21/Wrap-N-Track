import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import api from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SalesReport.css';
import usePermissions from '../../hooks/usePermissions';

export default function SalesReport() {
  const { checkPermission } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProfit: 0,
    ordersByStatus: {
      pending: 0,
      delivered: 0,
      completed: 0
    },
    revenueTrend: 'up',
    ordersTrend: 'up',
    profitTrend: 'up'
  });

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
    
    fetchSalesData();
  }, [selectedPeriod]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      console.log('Fetching sales data for period:', selectedPeriod);
      
      // Calculate date range based on selected period
      const { startDate, endDate } = getDateRange(selectedPeriod);
      
      // Fetch sales data
      const response = await api.get(`/api/sales-reports/overview?startDate=${startDate}&endDate=${endDate}`);
      
      if (response.data.success) {
        setSalesData(response.data.data);
        console.log('Sales data loaded:', response.data.data);
      } else {
        console.error('Failed to fetch sales data:', response.data.message);
        toast.error('Failed to load sales data');
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Error loading sales data');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period) => {
    const today = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSalesData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-PH').format(num);
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→';
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';
  };

  if (loading) {
    return (
      <div className="sales-report-container">
        <Sidebar />
        <div className="sales-report-main">
          <TopBar />
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading sales data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-report-container">
      <Sidebar />
      <div className="sales-report-main">
        <TopBar />
        
        <div className="sales-report-content">
          {/* Header Section */}
          <div className="sales-header">
            <h1 className="sales-title">Sales Overview</h1>
            <div className="header-controls">
              <div className="period-selector">
                <button 
                  className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod('today')}
                >
                  Today
                </button>
                <button 
                  className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod('week')}
                >
                  This Week
                </button>
                <button 
                  className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
                  onClick={() => setSelectedPeriod('month')}
                >
                  This Month
                </button>
              </div>
              <button 
                className="refresh-btn"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? '⟳' : '↻'} Refresh
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card revenue-card">
              <div className="metric-header">
                <div className="metric-icon">💰</div>
                <div className="metric-title">Total Revenue</div>
              </div>
              <div className="metric-value">{formatCurrency(salesData.totalRevenue)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.revenueTrend) }}>
                {getTrendIcon(salesData.revenueTrend)} 12.5%
              </div>
            </div>

            <div className="metric-card orders-card">
              <div className="metric-header">
                <div className="metric-icon">📦</div>
                <div className="metric-title">Total Orders</div>
              </div>
              <div className="metric-value">{formatNumber(salesData.totalOrders)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.ordersTrend) }}>
                {getTrendIcon(salesData.ordersTrend)} 8.2%
              </div>
            </div>

            <div className="metric-card avg-order-card">
              <div className="metric-header">
                <div className="metric-icon">📊</div>
                <div className="metric-title">Avg Order Value</div>
              </div>
              <div className="metric-value">{formatCurrency(salesData.avgOrderValue)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.revenueTrend) }}>
                {getTrendIcon(salesData.revenueTrend)} 5.1%
              </div>
            </div>

            <div className="metric-card profit-card">
              <div className="metric-header">
                <div className="metric-icon">💎</div>
                <div className="metric-title">Total Profit</div>
              </div>
              <div className="metric-value">{formatCurrency(salesData.totalProfit)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.profitTrend) }}>
                {getTrendIcon(salesData.profitTrend)} 15.3%
              </div>
            </div>
          </div>

          {/* Orders by Status Chart */}
          <div className="chart-container">
            <h3 className="chart-title">Orders by Status</h3>
            <div className="chart-content">
              <div className="chart-wrapper">
                <div className="donut-chart">
                  <div className="donut-center">
                    <div className="donut-total">{salesData.totalOrders}</div>
                    <div className="donut-label">Total Orders</div>
                  </div>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color pending"></div>
                    <div className="legend-text">
                      <span className="legend-label">Pending</span>
                      <span className="legend-value">{salesData.ordersByStatus.pending}</span>
                    </div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color delivered"></div>
                    <div className="legend-text">
                      <span className="legend-label">Delivered</span>
                      <span className="legend-value">{salesData.ordersByStatus.delivered}</span>
                    </div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color completed"></div>
                    <div className="legend-text">
                      <span className="legend-label">Completed</span>
                      <span className="legend-value">{salesData.ordersByStatus.completed}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <ToastContainer />
    </div>
  );
}
