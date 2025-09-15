import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from '../../api';
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderHistory, setOrderHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Add navigation handlers
  const handleTotalProductsClick = () => {
    navigate('/inventory');
  };

  const handleTotalUnitsClick = () => {
    navigate('/inventory');
  };

  const handleLowStockClick = () => {
    navigate('/inventory', { state: { filter: 'low-stock' } });
  };

  const handleReplenishmentClick = () => {
    navigate('/inventory', { state: { filter: 'replenishment' } });
  };

  // Fetch dashboard analytics
  const fetchDashboardAnalytics = async (month, year) => {
    try {
      setLoadingAnalytics(true);
      console.log('Fetching dashboard analytics for month:', month, 'year:', year);
      const response = await api.get(`/api/dashboard/analytics?month=${month}&year=${year}`);
      console.log('Dashboard analytics response:', response.data);
      if (response.data.success) {
        setDashboardData(response.data.data);
        console.log('Dashboard data set:', response.data.data);
      } else {
        console.error('Dashboard analytics failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch available months
  const fetchAvailableMonths = async () => {
    try {
      console.log('Fetching available months...');
      const response = await api.get('/api/dashboard/available-months');
      console.log('Available months response:', response.data);
      if (response.data.success) {
        setAvailableMonths(response.data.data);
        console.log('Available months set:', response.data.data);
      } else {
        console.error('Available months failed:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  // Handle month/year change
  const handleMonthYearChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    fetchDashboardAnalytics(month, year);
  };

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login-employee-pensee");
      return;
    }

    // Fetch data
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch inventory (use api baseURL)
        const inventoryRes = await api.get('/api/inventory');
        console.log('Dashboard inventory API response:', inventoryRes.data);
        
        // Handle the response structure from our backend
        if (inventoryRes.data && inventoryRes.data.success && Array.isArray(inventoryRes.data.inventory)) {
          setInventory(inventoryRes.data.inventory);
        } else {
          console.error('Unexpected inventory response structure:', inventoryRes.data);
          setInventory([]);
        }

        // Fetch user details
        try {
          const userRes = await api.get('/api/user/details');
          setUser(userRes.data || null);
        } catch (uErr) {
          console.warn('Failed to fetch user details:', uErr);
          setUser(null);
        }

        // Fetch both orders endpoints if available and merge them
        let orders = [];
        try {
          const ordersRes = await api.get('/api/orders');
          if (Array.isArray(ordersRes.data)) orders = ordersRes.data;
        } catch (oErr) {
          console.warn('Failed to fetch /api/orders:', oErr);
        }

        try {
          const historyRes = await api.get('/api/orders/history');
          if (Array.isArray(historyRes.data)) {
            // merge by order_id to avoid duplicates
            const map = new Map();
            (orders || []).forEach(o => map.set(o.order_id || o.id || JSON.stringify(o), o));
            (historyRes.data || []).forEach(o => map.set(o.order_id || o.id || JSON.stringify(o), o));
            orders = Array.from(map.values());
          }
        } catch (hErr) {
          // If history endpoint isn't available, keep orders as-is
          console.warn('Failed to fetch /api/orders/history (optional):', hErr);
        }

        setOrderHistory(Array.isArray(orders) ? orders : []);
        console.debug('Dashboard fetched counts - orders:', (orders || []).length);
        console.debug('Sample order data:', orders?.[0]); // Debug log to see actual order structure
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Separate useEffect for dashboard analytics
  useEffect(() => {
    if (localStorage.getItem("token")) {
      fetchDashboardAnalytics(selectedMonth, selectedYear);
      fetchAvailableMonths();
    }
  }, [selectedMonth, selectedYear]);

  const getProfilePictureUrl = () => {
    if (!user || !user.profile_picture_data) return "/placeholder-profile.png";
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  };

  // Optionally, check authentication before rendering
  if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
    return <div>Loading...</div>;
  }

  // Calculate totals with safety checks
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const totalProducts = safeInventory.length;
  const totalProductUnits = safeInventory.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const lowStockProducts = safeInventory.filter(
    (item) => Number(item.quantity || 0) <= 300
  ).length;

  // Helper to classify order status into dashboard buckets
  const classifyStatus = (status) => {
    if (!status) return null;
    const s = status.toString().toLowerCase();
    // Check delivery/enroute first
    if (/deliver|out for|outfor|en\s?-?route|enroute/.test(s)) return 'outForDelivery';
    // Then shipping
    if (/ship|shipped|to be ship|to-be-ship|tobe ship|to be shipped/.test(s)) return 'toBeShipped';
    // Then packing / pending
    if (/pack|pending|to be pack|to-be-pack|tobe pack/.test(s)) return 'toBePack';
    return null;
  };

  // Compute counts from orderHistory
  const toBePackCount = orderHistory.reduce((acc, o) => classifyStatus(o.status) === 'toBePack' ? acc + 1 : acc, 0);
  const toBeShippedCount = orderHistory.reduce((acc, o) => classifyStatus(o.status) === 'toBeShipped' ? acc + 1 : acc, 0);
  const outForDeliveryCount = orderHistory.reduce((acc, o) => classifyStatus(o.status) === 'outForDelivery' ? acc + 1 : acc, 0);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar 
          lowStockProducts={inventory.filter(item => Number(item.quantity || 0) <= 300)}
        />
        {/* Inventory Overview */}
        <div className="dashboard-content">
          <h3>Inventory Overview</h3>
          <div className="dashboard-cards-row">
            <div className="dashboard-card card-red" onClick={handleTotalProductsClick} style={{ cursor: 'pointer' }}>
              <div className="card-title">Total Products</div>
              <div className="card-value">
                {loading ? "..." : totalProducts}
              </div>
            </div>
            <div className="dashboard-card card-orange" onClick={handleTotalUnitsClick} style={{ cursor: 'pointer' }}>
              <div className="card-title">Total Product Units</div>
              <div className="card-value">
                {loading ? "..." : totalProductUnits.toLocaleString()}
              </div>
            </div>
            <div className="dashboard-card card-green" onClick={handleLowStockClick} style={{ cursor: 'pointer' }}>
              <div className="card-title">Low in Stock</div>
              <div className="card-value card-low">
                {loading ? "..." : lowStockProducts}
              </div>
            </div>
            <div className="dashboard-card card-blue" onClick={handleReplenishmentClick} style={{ cursor: 'pointer' }}>
              <div className="card-title">Replenishment Pending</div>
              <div className="card-value">
                {loading ? "..." : inventory.filter(item => Number(item.quantity || 0) <= 0).length}
              </div>
            </div>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="dashboard-section">
          <h3>
            Sales Overview <span className="dashboard-month">
              {dashboardData?.monthName || 'Loading...'}
            </span>
          </h3>
          <div className="dashboard-cards-row">
            <div className="dashboard-card">
              <div className="card-title">Total Revenue</div>
              <div className="card-value">
                {loadingAnalytics ? "..." : `₱${(dashboardData?.salesOverview?.total_revenue || 0).toLocaleString()}`}
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Orders</div>
              <div className="card-value">
                {loadingAnalytics ? "..." : (dashboardData?.salesOverview?.total_orders || 0).toLocaleString()}
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Units Sold</div>
              <div className="card-value">
                {loadingAnalytics ? "..." : (dashboardData?.salesOverview?.total_units_sold || 0).toLocaleString()}
              </div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Customers</div>
              <div className="card-value">
                {loadingAnalytics ? "..." : (dashboardData?.salesOverview?.total_customers || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Lower Section: Sales Activity, Top Selling Products, Recent Activity */}
        <div className="dashboard-lower">
          <div className="dashboard-activity">
            <h4>Sales Activity</h4>
            <div className="activity-list">
              <div className="activity-card activity-red">
                <div>To be Packed</div>
                <div className="activity-value">
                  {loadingAnalytics ? '...' : (dashboardData?.salesActivity?.toBePack || 0)}
                </div>
                <span className="activity-icon">📦</span>
              </div>
              <div className="activity-card activity-orange">
                <div>To be Shipped</div>
                <div className="activity-value">
                  {loadingAnalytics ? '...' : (dashboardData?.salesActivity?.toBeShipped || 0)}
                </div>
                <span className="activity-icon">🛒</span>
              </div>
              <div className="activity-card activity-green">
                <div>Out for Delivery</div>
                <div className="activity-value">
                  {loadingAnalytics ? '...' : (dashboardData?.salesActivity?.outForDelivery || 0)}
                </div>
                <span className="activity-icon">🚚</span>
              </div>
            </div>
          </div>

          <div className="dashboard-top-selling">
            <div className="top-selling-header">
              <h4>Top Selling Products</h4>
              <div className="month-year-selector">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => handleMonthYearChange(parseInt(e.target.value), selectedYear)}
                  className="month-select"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={(e) => handleMonthYearChange(selectedMonth, parseInt(e.target.value))}
                  className="year-select"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            <ol className="top-selling-list">
              {loadingAnalytics ? (
                <li>Loading...</li>
              ) : dashboardData?.topSellingProducts?.length > 0 ? (
                dashboardData.topSellingProducts.map((product, index) => (
                  <li key={product.sku}>
                    <span className="product-bar" style={{
                      backgroundColor: index === 0 ? '#4CAF50' : 
                                     index === 1 ? '#8BC34A' : 
                                     index === 2 ? '#CDDC39' : 
                                     index === 3 ? '#FFC107' : '#FF9800'
                    }}></span>
                    {product.name}{" "}
                    <span className="units">{product.units_sold} units</span>
                  </li>
                ))
              ) : (
                <li>No sales data for this period</li>
              )}
            </ol>
          </div>

          <div className="dashboard-recent-activity">
            <h4>Recent Activity</h4>
            <div className="recent-activity-list">
              {loadingAnalytics ? (
                <div className="recent-activity-item">Loading...</div>
              ) : dashboardData?.recentActivity?.length > 0 ? (
                dashboardData.recentActivity.map((order, index) => (
                  <div key={order.order_id || index} className="recent-activity-item">
                    <img
                      className="activity-avatar"
                      src={order.archived_by_profile_picture 
                        ? `data:image/jpeg;base64,${order.archived_by_profile_picture}` 
                        : "/placeholder-profile.svg"
                      }
                      alt={order.archived_by_name || "User"}
                      onError={(e) => {
                        e.target.src = "/placeholder-profile.svg";
                      }}
                    />
                    <div>
                      <div>
                        <b>{order.archived_by_name || order.customer_name || "Unknown User"}</b> placed an order:{" "}
                        <span className="activity-link">#{order.order_id}</span>
                      </div>
                      <div className="activity-time">
                        {order.order_date 
                          ? new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "Unknown time"
                        }
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recent-activity-item">No recent activity found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
