import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import TopBar from "../../Components/TopBar";
import withEmployeeAuth from "../../Components/withEmployeeAuth";
import "./OrderManagementDashboard.css";

function OrderManagementDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    customer_name: "",
    date_from: "",
    date_to: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    newStatus: "",
    notes: "",
    confirmationText: "",
    paymentMethod: "",
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [stats, setStats] = useState({});

  // Redirect if not authenticated or not employee
  useEffect(() => {
    if (!isAuthenticated || user?.source !== "employee") {
      navigate("/login-employee-pensee");
    }
  }, [isAuthenticated, user, navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      const response = await fetch(
        `/api/order-management/orders?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setPagination(data.pagination || pagination);
        setError("");
      } else {
        setError("Failed to fetch orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/order-management/dashboard-stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // Fetch orders and stats
  useEffect(() => {
    if (isAuthenticated && user?.source === "employee") {
      fetchOrders();
      fetchStats();
    }
  }, [isAuthenticated, user, fetchOrders, fetchStats]);

  // Real-time sync - refresh data every 30 seconds
  useEffect(() => {
    if (isAuthenticated && user?.source === "employee") {
      const interval = setInterval(() => {
        fetchOrders();
        fetchStats();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, fetchOrders, fetchStats]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleOrderClick = async (order) => {
    try {
      const response = await fetch(
        `/api/order-management/orders/${order.order_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order);
        setShowOrderDetails(true);
      } else {
        alert("Failed to fetch order details");
      }
    } catch (err) {
      console.error("Error fetching order details:", err);
      alert("Failed to fetch order details");
    }
  };

  const handleStatusUpdate = (order) => {
    setSelectedOrder(order);
    setStatusUpdate({
      newStatus: order.status,
      notes: "",
      confirmationText: "",
      paymentMethod: order.payment_method || "",
    });
    setShowStatusModal(true);
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !statusUpdate.newStatus) return;

    // Check if marking as completed and require typing confirmation
    if (statusUpdate.newStatus === "Completed") {
      if (statusUpdate.confirmationText !== "I love Pensee") {
        alert(
          'To mark this order as completed, please type "I love Pensee" in the confirmation field.',
        );
        return;
      }
    }

    try {
      setUpdatingStatus(true);
      const response = await fetch(
        `/api/order-management/orders/${selectedOrder.order_id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            status: statusUpdate.newStatus,
            notes: statusUpdate.notes,
            payment_method: statusUpdate.paymentMethod,
          }),
        },
      );

      if (response.ok) {
        await response.json();
        alert("Order status updated successfully");
        setShowStatusModal(false);
        setSelectedOrder(null);
        setStatusUpdate({
          newStatus: "",
          notes: "",
          confirmationText: "",
          paymentMethod: "",
        });
        fetchOrders();
        fetchStats();
      } else {
        const errorData = await response.json();
        alert(`Failed to update status: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      "Order Placed": "#17a2b8",
      "Order Paid": "#28a745",
      "To Be Packed": "#ffc107",
      "Order Shipped Out": "#007bff",
      "Ready for Delivery": "#6f42c1",
      "Order Received": "#20c997",
      Completed: "#28a745",
      Cancelled: "#dc3545",
    };
    return statusColors[status] || "#6c757d";
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      "Order Placed": "📋",
      "Order Paid": "💳",
      "To Be Packed": "📦",
      "Order Shipped Out": "🚚",
      "Ready for Delivery": "🚛",
      "Order Received": "✅",
      Completed: "🎉",
      Cancelled: "❌",
    };
    return statusIcons[status] || "❓";
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      Pending: ["Order Paid", "Cancelled"],
      "Order Placed": ["Order Paid", "Cancelled"],
      "Order Paid": ["To Be Packed", "Cancelled"],
      "To Be Packed": ["Order Shipped Out", "Cancelled"],
      "Order Shipped Out": ["Ready for Delivery", "Cancelled"],
      "Ready for Delivery": ["Order Received", "Cancelled"],
      "Order Received": ["Completed", "Cancelled"],
      Completed: [],
      Cancelled: [],
    };
    return statusFlow[currentStatus] || [];
  };

  if (!isAuthenticated || user?.source !== "employee") {
    return null;
  }

  return (
    <div className="order-management-dashboard">
      <TopBar searchPlaceholder="Search orders..." />

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Order Management Dashboard</h1>
          <p>Manage and track customer orders</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{stats.order_placed || 0}</h3>
              <p>Order Placed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💳</div>
            <div className="stat-content">
              <h3>{stats.order_paid || 0}</h3>
              <p>Order Paid</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <h3>{stats.to_be_packed || 0}</h3>
              <p>To Be Packed</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚚</div>
            <div className="stat-content">
              <h3>{stats.order_shipped_out || 0}</h3>
              <p>Order Shipped Out</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🚛</div>
            <div className="stat-content">
              <h3>{stats.ready_for_delivery || 0}</h3>
              <p>Ready for Delivery</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.completed || 0}</h3>
              <p>Completed</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="all">All Orders</option>
                <option value="Order Placed">Order Placed</option>
                <option value="Order Paid">Order Paid</option>
                <option value="To Be Packed">To Be Packed</option>
                <option value="Order Shipped Out">Order Shipped Out</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Order Received">Order Received</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Customer:</label>
              <input
                type="text"
                placeholder="Search by customer name..."
                value={filters.customer_name}
                onChange={(e) =>
                  handleFilterChange("customer_name", e.target.value)
                }
              />
            </div>
            <div className="filter-group">
              <label>From Date:</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
              />
            </div>
            <div className="filter-group">
              <label>To Date:</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="orders-section">
          <div className="section-header">
            <h2>Orders ({pagination.total})</h2>
            <button
              onClick={fetchOrders}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading orders...</p>
            </div>
          )}

          {error && (
            <div className="error-container">
              <p>Error: {error}</p>
              <button onClick={fetchOrders}>Retry</button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="empty-orders">
              <p>No orders found matching your criteria</p>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="orders-table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id}>
                      <td className="order-id">{order.order_id}</td>
                      <td className="customer-name">{order.customer_name}</td>
                      <td className="order-date">
                        {formatDate(order.order_date)}
                      </td>
                      <td className="order-status">
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: getStatusColor(order.status),
                          }}
                        >
                          {getStatusIcon(order.status)} {order.status}
                        </span>
                      </td>
                      <td className="order-total">
                        {formatPrice(order.total_cost)}
                      </td>
                      <td className="order-actions">
                        <button
                          onClick={() => handleOrderClick(order)}
                          className="view-btn"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order)}
                          className="update-btn"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={pagination.page === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={pagination.page === pagination.pages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="order-details-modal-overlay">
            <div className="order-details-modal">
              <div className="modal-header">
                <h2>Order Details - {selectedOrder.order_id}</h2>
                <button
                  onClick={() => setShowOrderDetails(false)}
                  className="close-btn"
                >
                  ✕
                </button>
              </div>

              <div className="modal-content">
                <div className="order-info-section">
                  <h3>Order Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Order Date:</label>
                      <span>{formatDate(selectedOrder.order_date)}</span>
                    </div>
                    <div className="info-item">
                      <label>Status:</label>
                      <span
                        className="status-text"
                        style={{ color: getStatusColor(selectedOrder.status) }}
                      >
                        {getStatusIcon(selectedOrder.status)}{" "}
                        {selectedOrder.status}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>Total Cost:</label>
                      <span>{formatPrice(selectedOrder.total_cost)}</span>
                    </div>
                    <div className="info-item">
                      <label>Payment Method:</label>
                      <span>{selectedOrder.payment_method}</span>
                    </div>
                    <div className="info-item">
                      <label>Expected Delivery:</label>
                      <span>{formatDate(selectedOrder.expected_delivery)}</span>
                    </div>
                    <div className="info-item">
                      <label>Last Updated:</label>
                      <span>{formatDate(selectedOrder.status_updated_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="shipping-info-section">
                  <h3>Shipping Information</h3>
                  <div className="shipping-address">
                    <p>
                      <strong>Ship to:</strong> {selectedOrder.shipped_to}
                    </p>
                    <p>
                      <strong>Address:</strong> {selectedOrder.shipping_address}
                    </p>
                    <p>
                      <strong>Phone:</strong> {selectedOrder.telephone}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedOrder.email_address}
                    </p>
                  </div>
                </div>

                {selectedOrder.products &&
                  selectedOrder.products.length > 0 && (
                    <div className="products-section">
                      <h3>Order Items</h3>
                      <div className="products-list">
                        {selectedOrder.products.map((product, index) => (
                          <div key={index} className="product-item">
                            <div className="product-info">
                              <h4>{product.product_name}</h4>
                              <p>SKU: {product.sku}</p>
                              <p>{product.description}</p>
                            </div>
                            <div className="product-quantity">
                              <span>Qty: {product.quantity}</span>
                            </div>
                            <div className="product-price">
                              <span>{formatPrice(product.total_price)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedOrder.remarks && (
                  <div className="remarks-section">
                    <h3>Special Instructions</h3>
                    <p>{selectedOrder.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedOrder && (
          <div className="status-modal-overlay">
            <div className="status-modal">
              <div className="modal-header">
                <h2>Update Order Status</h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="close-btn"
                >
                  ✕
                </button>
              </div>

              <div className="modal-content">
                <div className="current-status">
                  <p>
                    <strong>Current Status:</strong> {selectedOrder.status}
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="newStatus">New Status:</label>
                  <select
                    id="newStatus"
                    value={statusUpdate.newStatus}
                    onChange={(e) =>
                      setStatusUpdate((prev) => ({
                        ...prev,
                        newStatus: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select new status</option>
                    {getNextStatus(selectedOrder.status).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes (Optional):</label>
                  <textarea
                    id="notes"
                    value={statusUpdate.notes}
                    onChange={(e) =>
                      setStatusUpdate((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Add any notes about this status change..."
                    rows="3"
                  />
                </div>

                {(statusUpdate.newStatus === "Pending" ||
                  statusUpdate.newStatus === "Order Paid" ||
                  statusUpdate.newStatus === "To Be Packed") && (
                  <div className="form-group">
                    <label htmlFor="paymentMethod">Payment Method:</label>
                    <select
                      id="paymentMethod"
                      value={statusUpdate.paymentMethod}
                      onChange={(e) =>
                        setStatusUpdate((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="E-Wallet">E-Wallet</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                    </select>
                  </div>
                )}

                {statusUpdate.newStatus === "Completed" && (
                  <div className="form-group">
                    <label htmlFor="confirmationText">
                      Confirmation Required: Type "I love Pensee" to complete
                      this order
                    </label>
                    <input
                      type="text"
                      id="confirmationText"
                      value={statusUpdate.confirmationText}
                      onChange={(e) =>
                        setStatusUpdate((prev) => ({
                          ...prev,
                          confirmationText: e.target.value,
                        }))
                      }
                      placeholder="Type: I love Pensee"
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="cancel-btn"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={updateOrderStatus}
                  className="update-status-btn"
                  disabled={
                    updatingStatus ||
                    !statusUpdate.newStatus ||
                    (statusUpdate.newStatus === "Completed" &&
                      statusUpdate.confirmationText !== "I love Pensee") ||
                    ((statusUpdate.newStatus === "Pending" ||
                      statusUpdate.newStatus === "Order Paid" ||
                      statusUpdate.newStatus === "To Be Packed") &&
                      !statusUpdate.paymentMethod)
                  }
                >
                  {updatingStatus ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withEmployeeAuth(OrderManagementDashboard);
