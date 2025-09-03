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

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    // Fetch data
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch inventory (use api baseURL)
        const inventoryRes = await api.get('/api/inventory');
        setInventory(inventoryRes.data || []);

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
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  const getProfilePictureUrl = () => {
    if (!user || !user.profile_picture_data) return "/placeholder-profile.png";
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  };

  // Optionally, check authentication before rendering
  if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
    return <div>Loading...</div>;
  }

  // Calculate totals
  const totalProducts = inventory.length;
  const totalProductUnits = inventory.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
  const lowStockProducts = inventory.filter(
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
            Sales Overview <span className="dashboard-month">March</span>
          </h3>
          <div className="dashboard-cards-row">
            <div className="dashboard-card">
              <div className="card-title">Total Revenue</div>
              <div className="card-value">₱ ~~~~</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Orders</div>
              <div className="card-value">~~~</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Units Sold</div>
              <div className="card-value">~~~</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Customers</div>
              <div className="card-value">~~~</div>
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
                <div className="activity-value">{loading ? '...' : toBePackCount}</div>
                <span className="activity-icon">📦</span>
              </div>
              <div className="activity-card activity-orange">
                <div>To be Shipped</div>
                <div className="activity-value">{loading ? '...' : toBeShippedCount}</div>
                <span className="activity-icon">🛒</span>
              </div>
              <div className="activity-card activity-green">
                <div>Out for Delivery</div>
                <div className="activity-value">{loading ? '...' : outForDeliveryCount}</div>
                <span className="activity-icon">🚚</span>
              </div>
            </div>
          </div>

          <div className="dashboard-top-selling">
            <h4>
              Top Selling Products{" "}
              <span className="dashboard-month">March</span>
            </h4>
            <ol className="top-selling-list">
              <li>
                <span className="product-bar"></span> ~~~{" "}
                <span className="units">0 units</span>
              </li>
              <li>
                <span className="product-bar"></span> ~~~{" "}
                <span className="units">0 units</span>
              </li>
              <li>
                <span className="product-bar"></span> ~~~{" "}
                <span className="units">0 units</span>
              </li>
              <li>
                <span className="product-bar"></span> ~~~{" "}
                <span className="units">0 units</span>
              </li>
              <li>
                <span className="product-bar"></span> ~~~{" "}
                <span className="units">0 units</span>
              </li>
            </ol>
          </div>

          <div className="dashboard-recent-activity">
            <h4>Recent Activity</h4>
            <div className="recent-activity-list">
              {orderHistory.slice(0, 5).map((order) => (
                <div key={order.order_id} className="recent-activity-item">
                  <img
                    className="activity-avatar"
                    src={order.archived_by_profile_picture ? `data:image/jpeg;base64,${order.archived_by_profile_picture}` : "/placeholder-profile.png"}
                    alt={order.archived_by_name || "User"}
                  />
                  <div>
                    <div>
                      <b>{order.archived_by_name}</b> placed an order:{" "}
                      <span className="activity-link">#{order.order_id}</span>
                    </div>
                    <div className="activity-time">
                      {new Date(order.archived_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
