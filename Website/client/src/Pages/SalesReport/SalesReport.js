import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Components/Sidebar/Sidebar';
import TopBar from '../../Components/TopBar';
import api from '../../api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './SalesReport.css';
import usePermissions from '../../hooks/usePermissions';

const STATUS_COLORS = {
  'Order Placed': '#38bdf8',
  'Order Paid': '#22c55e',
  'To Be Packed': '#f59e0b',
  'Order Shipped Out': '#3b82f6',
  'Ready for Delivery': '#8b5cf6',
  'Order Received': '#14b8a6',
  'Completed': '#10b981',
  'Cancelled': '#ef4444'
};
const statusColor = (status) => STATUS_COLORS[status] || '#6b7280';

const EMPTY_SALES_DATA = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  totalProfit: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  pendingOrders: 0,
  paidAmount: 0,
  outstandingAmount: 0,
  ordersByStatus: {},
  revenueTrend: 'stable',
  ordersTrend: 'stable',
  profitTrend: 'stable'
};

export default function SalesReport() {
  const { checkPermission } = usePermissions();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  const [salesData, setSalesData] = useState(EMPTY_SALES_DATA);
  const [trends, setTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [sectionErrors, setSectionErrors] = useState({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login-employee-pensee');
      return;
    }
    if (!checkPermission('reports')) {
      return;
    }
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  // Formats a Date using its LOCAL calendar day (not toISOString, which
  // converts to UTC first — that silently shifts "today" back a day for any
  // positive UTC offset, e.g. Asia/Manila UTC+8, making the "Today" filter
  // miss today's orders).
  const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (period) => {
    const today = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'today':
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        break;
    }

    return {
      startDate: toLocalDateString(startDate),
      endDate: toLocalDateString(endDate)
    };
  };

  const fetchAllData = async () => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(selectedPeriod);
    const errors = {};

    const [overviewRes, trendsRes, topProductsRes, customerRes, recentRes] = await Promise.allSettled([
      api.get(`/api/sales-reports/overview?startDate=${startDate}&endDate=${endDate}`),
      api.get(`/api/sales-reports/trends?startDate=${startDate}&endDate=${endDate}&groupBy=day`),
      api.get(`/api/sales-reports/top-products?startDate=${startDate}&endDate=${endDate}&limit=8`),
      api.get(`/api/sales-reports/customer-analysis?startDate=${startDate}&endDate=${endDate}`),
      api.get('/api/sales-reports/recent?limit=10')
    ]);

    if (overviewRes.status === 'fulfilled' && overviewRes.value.data.success) {
      setSalesData(overviewRes.value.data.data);
    } else {
      errors.overview = true;
      setSalesData(EMPTY_SALES_DATA);
    }

    if (trendsRes.status === 'fulfilled' && trendsRes.value.data.success) {
      setTrends(trendsRes.value.data.data);
    } else {
      errors.trends = true;
      setTrends([]);
    }

    if (topProductsRes.status === 'fulfilled' && topProductsRes.value.data.success) {
      setTopProducts(topProductsRes.value.data.data);
    } else {
      errors.topProducts = true;
      setTopProducts([]);
    }

    if (customerRes.status === 'fulfilled' && customerRes.value.data.success) {
      setTopCustomers((customerRes.value.data.data.customers || []).slice(0, 5));
    } else {
      errors.customers = true;
      setTopCustomers([]);
    }

    if (recentRes.status === 'fulfilled' && recentRes.value.data.success) {
      setRecentSales(recentRes.value.data.data);
    } else {
      errors.recent = true;
      setRecentSales([]);
    }

    setSectionErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Some sections failed to load. Pull to refresh to retry.');
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const insertTestData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/sales-reports/test-data/insert');
      if (response.data.success) {
        toast.success('Sales test data inserted successfully!');
        await fetchAllData();
      } else {
        toast.error('Failed to insert sales test data');
      }
    } catch (error) {
      console.error('Error inserting sales test data:', error);
      toast.error('Error inserting sales test data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/sales-reports/test-data/clear');
      if (response.data.success) {
        toast.success('Sales test data cleared successfully!');
        await fetchAllData();
      } else {
        toast.error('Failed to clear sales test data');
      }
    } catch (error) {
      console.error('Error clearing sales test data:', error);
      toast.error('Error clearing sales test data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);

  const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTrendIcon = (trend) => (trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→');
  const getTrendColor = (trend) => (trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280');

  const statusEntries = Object.entries(salesData.ordersByStatus || {}).sort((a, b) => b[1] - a[1]);
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, count]) => count));
  const maxTrendRevenue = Math.max(1, ...trends.map(t => Number(t.revenue) || 0));

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
                <button className={`period-btn ${selectedPeriod === 'today' ? 'active' : ''}`} onClick={() => setSelectedPeriod('today')}>Today</button>
                <button className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`} onClick={() => setSelectedPeriod('week')}>This Week</button>
                <button className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`} onClick={() => setSelectedPeriod('month')}>This Month</button>
              </div>
              <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? '⟳' : '↻'} Refresh
              </button>
              <button className="test-btn insert" onClick={insertTestData} disabled={loading}>
                🧪 Insert Test Data
              </button>
              <button className="test-btn clear" onClick={clearTestData} disabled={loading}>
                🗑️ Clear Test Data
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">💰</div><div className="metric-title">Total Sales</div></div>
              <div className="metric-value">{formatCurrency(salesData.totalRevenue)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.revenueTrend) }}>{getTrendIcon(salesData.revenueTrend)} {salesData.revenueTrend}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">📦</div><div className="metric-title">Total Orders</div></div>
              <div className="metric-value">{formatNumber(salesData.totalOrders)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.ordersTrend) }}>{getTrendIcon(salesData.ordersTrend)} {salesData.ordersTrend}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">📊</div><div className="metric-title">Avg Order Value</div></div>
              <div className="metric-value">{formatCurrency(salesData.avgOrderValue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">💎</div><div className="metric-title">Total Profit</div></div>
              <div className="metric-value">{formatCurrency(salesData.totalProfit)}</div>
              <div className="metric-trend" style={{ color: getTrendColor(salesData.profitTrend) }}>{getTrendIcon(salesData.profitTrend)} {salesData.profitTrend}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">✅</div><div className="metric-title">Completed Orders</div></div>
              <div className="metric-value">{formatNumber(salesData.completedOrders)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">⏳</div><div className="metric-title">Pending Orders</div></div>
              <div className="metric-value">{formatNumber(salesData.pendingOrders)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">❌</div><div className="metric-title">Cancelled Orders</div></div>
              <div className="metric-value">{formatNumber(salesData.cancelledOrders)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">✔️</div><div className="metric-title">Paid Amount</div></div>
              <div className="metric-value">{formatCurrency(salesData.paidAmount)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-header"><div className="metric-icon">🕓</div><div className="metric-title">Outstanding Payments</div></div>
              <div className="metric-value">{formatCurrency(salesData.outstandingAmount)}</div>
            </div>
          </div>

          {/* Orders by Status */}
          <div className="chart-container">
            <h3 className="chart-title">Orders by Status</h3>
            {statusEntries.length === 0 ? (
              <p className="empty-note">No orders in this period.</p>
            ) : (
              <div className="status-bars">
                {statusEntries.map(([status, count]) => (
                  <div className="status-bar-row" key={status}>
                    <span className="status-bar-label">{status}</span>
                    <div className="status-bar-track">
                      <div
                        className="status-bar-fill"
                        style={{ width: `${(count / maxStatusCount) * 100}%`, backgroundColor: statusColor(status) }}
                      />
                    </div>
                    <span className="status-bar-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sales Trends */}
          <div className="chart-container">
            <h3 className="chart-title">Sales Trend (Revenue)</h3>
            {trends.length === 0 ? (
              <p className="empty-note">No trend data available for this period.</p>
            ) : (
              <div className="trend-bars">
                {trends.map((point) => (
                  <div className="trend-bar-col" key={point.period}>
                    <div className="trend-bar-track">
                      <div
                        className="trend-bar-fill"
                        style={{ height: `${Math.max(4, (Number(point.revenue) / maxTrendRevenue) * 100)}%` }}
                        title={formatCurrency(point.revenue)}
                      />
                    </div>
                    <span className="trend-bar-label">
                      {new Date(point.period).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Performing Products + Sales by Customer */}
          <div className="two-col-grid">
            <div className="table-card">
              <h3 className="chart-title">Top Performing Products</h3>
              {topProducts.length === 0 ? (
                <p className="empty-note">No product sales in this period.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map(p => (
                      <tr key={p.sku}>
                        <td>{p.name}</td>
                        <td className="num-cell">{formatNumber(p.units_sold)}</td>
                        <td className="num-cell">{formatCurrency(p.sales_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="table-card">
              <h3 className="chart-title">Sales by Customer</h3>
              {topCustomers.length === 0 ? (
                <p className="empty-note">No customer sales in this period.</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>Customer</th><th>Orders</th><th>Spent</th></tr>
                  </thead>
                  <tbody>
                    {topCustomers.map(c => (
                      <tr key={`${c.name}-${c.email_address}`}>
                        <td>{c.name}<span className="customer-type-tag">{c.customer_type}</span></td>
                        <td className="num-cell">{formatNumber(c.order_count)}</td>
                        <td className="num-cell">{formatCurrency(c.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="table-card">
            <h3 className="chart-title">Recent Sales</h3>
            {recentSales.length === 0 ? (
              <p className="empty-note">No recent orders found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(order => (
                    <tr key={order.order_id}>
                      <td>#{order.order_id}</td>
                      <td>{order.customer_name}</td>
                      <td>{formatDate(order.order_date)}</td>
                      <td className="num-cell">{formatCurrency(order.total_cost)}</td>
                      <td>
                        <span className={`payment-pill ${order.payment_status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className="status-pill" style={{ backgroundColor: statusColor(order.status) }}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button className="view-order-btn" onClick={() => navigate(`/orders/${order.order_id}`)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
