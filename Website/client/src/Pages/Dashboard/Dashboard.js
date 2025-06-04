import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from '../../api/axios';
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
        // Fetch inventory
        const inventoryRes = await api.get('http://localhost:3001/api/inventory');
        setInventory(inventoryRes.data);

        // Fetch user details
        const userRes = await api.get('http://localhost:3001/api/user/details');
        setUser(userRes.data);

        // Fetch order history
        const historyRes = await api.get('http://localhost:3001/api/orders/history');
        setOrderHistory(historyRes.data);
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
    (item) => Number(item.quantity || 0) < 10
  ).length;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar 
          lowStockProducts={inventory.filter(item => Number(item.quantity || 0) < 300)}
        />
        {/* Inventory Overview */}
        <div className="dashboard-section">
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
              <div className="card-value">~~</div>
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
                <div className="activity-value">0</div>
                <span className="activity-icon">📦</span>
              </div>
              <div className="activity-card activity-orange">
                <div>To be Shipped</div>
                <div className="activity-value">0</div>
                <span className="activity-icon">🛒</span>
              </div>
              <div className="activity-card activity-green">
                <div>Out for Delivery</div>
                <div className="activity-value">0</div>
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
