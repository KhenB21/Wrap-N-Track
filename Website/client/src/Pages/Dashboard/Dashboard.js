import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }
    // Fetch inventory data
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3001/api/inventory');
        const data = await res.json();
        setInventory(data);
      } catch (err) {
        setInventory([]);
      }
      setLoading(false);
    };
    fetchInventory();
  }, [navigate]);

  const getProfilePictureUrl = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.profile_picture_path) return "/placeholder-profile.png";
    if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
    return `http://localhost:3001${user.profile_picture_path}`;
  };

  // Optionally, check authentication before rendering
  if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
    return <div>Loading...</div>;
  }

  // Calculate totals
  const totalProducts = inventory.length;
  const totalProductUnits = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        {/* Inventory Overview */}
        <div className="dashboard-section">
          <h3>Inventory Overview</h3>
          <div className="dashboard-cards-row">
            <div className="dashboard-card card-red">
              <div className="card-title">Total Products</div>
              <div className="card-value">{loading ? '...' : totalProducts}</div>
            </div>
            <div className="dashboard-card card-orange">
              <div className="card-title">Total Product Units</div>
              <div className="card-value">{loading ? '...' : totalProductUnits.toLocaleString()}</div>
            </div>
            <div className="dashboard-card card-green">
              <div className="card-title">Low in Stock</div>
              <div className="card-value card-low">39</div>
            </div>
            <div className="dashboard-card card-blue">
              <div className="card-title">Replenishment Pending</div>
              <div className="card-value">46</div>
            </div>
          </div>
        </div>

        {/* Sales Overview */}
        <div className="dashboard-section">
          <h3>Sales Overview <span className="dashboard-month">March</span></h3>
          <div className="dashboard-cards-row">
            <div className="dashboard-card">
              <div className="card-title">Total Revenue</div>
              <div className="card-value">₱213,000.00</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Orders</div>
              <div className="card-value">52</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Units Sold</div>
              <div className="card-value">1,219</div>
            </div>
            <div className="dashboard-card">
              <div className="card-title">Total Customers</div>
              <div className="card-value">46</div>
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
                <div className="activity-value">47</div>
                <span className="activity-icon">📦</span>
              </div>
              <div className="activity-card activity-orange">
                <div>To be Shipped</div>
                <div className="activity-value">39</div>
                <span className="activity-icon">🛒</span>
              </div>
              <div className="activity-card activity-green">
                <div>Out for Delivery</div>
                <div className="activity-value">15</div>
                <span className="activity-icon">🚚</span>
              </div>
            </div>
          </div>

          <div className="dashboard-top-selling">
            <h4>Top Selling Products <span className="dashboard-month">March</span></h4>
            <ol className="top-selling-list">
              <li><span className="product-bar"></span> Artisan Candles <span className="units">256 units</span></li>
              <li><span className="product-bar"></span> Artisan Teas <span className="units">189 units</span></li>
              <li><span className="product-bar"></span> Wine Glass <span className="units">126 units</span></li>
              <li><span className="product-bar"></span> Red Wine <span className="units">113 units</span></li>
              <li><span className="product-bar"></span> White Wine <span className="units">106 units</span></li>
            </ol>
          </div>

          <div className="dashboard-recent-activity">
            <h4>Recent Activity</h4>
            <div className="recent-activity-list">
              <div className="recent-activity-item">
                <img className="activity-avatar" src="https://randomuser.me/api/portraits/men/2.jpg" alt="Grant Nathan" />
                <div>
                  <div>Grant Nathan placed an order: <span className="activity-link">#CO-00016</span></div>
                  <div className="activity-time">12:04am</div>
                </div>
              </div>
              <div className="recent-activity-item">
                <img className="activity-avatar" src="https://randomuser.me/api/portraits/men/3.jpg" alt="John Cena" />
                <div>
                  <div>John Cena created a supplier order: <span className="activity-link">#SO-00001</span></div>
                  <div className="activity-time">6:21pm</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
