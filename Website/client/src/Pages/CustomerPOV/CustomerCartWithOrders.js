import React, { useState, useEffect } from 'react';
import { useAuth } from '../../Context/AuthContext';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import './CustomerCartWithOrders.css';

export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'oldest'

  useEffect(() => {
    if (user && user.source === 'customer') {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Refresh orders immediately when component mounts (for new orders)
  useEffect(() => {
    if (user && user.source === 'customer') {
      // Small delay to ensure any pending operations complete
      const timer = setTimeout(() => {
        fetchOrders();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Refresh orders when component becomes visible (after navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && user.source === 'customer') {
        fetchOrders();
      }
    };

    const handleFocus = () => {
      if (user && user.source === 'customer') {
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Real-time sync - refresh orders every 30 seconds
  useEffect(() => {
    if (user && user.source === 'customer') {
      const interval = setInterval(() => {
        fetchOrders();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/customer-orders/orders');
      console.log('Orders API Response:', response.data);
      if (response.data && response.data.success) {
        const orders = response.data.orders || [];
        console.log('Orders received:', orders);
        console.log('First order products:', orders[0]?.products);
        setOrders(orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Order Placed': return '#3b82f6';
      case 'To Be Packed': return '#f59e0b';
      case 'In Progress': return '#f59e0b';
      case 'Ready for Delivery': return '#8b5cf6';
      case 'Completed': return '#10b981';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Order Placed': return '📝';
      case 'To Be Packed': return '⚙️';
      case 'In Progress': return '⚙️';
      case 'Ready for Delivery': return '📦';
      case 'Completed': return '✅';
      case 'Cancelled': return '❌';
      default: return '❓';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCustomerStatus = (status) => {
    switch (status) {
      case 'Order Placed': return 'Order Placed';
      case 'Order Paid': return 'Order Paid';
      case 'To Be Packed': return 'Order Paid';
      case 'Order Shipped Out': return 'Order Shipped Out';
      case 'Ready for Delivery': return 'Order Shipped Out';
      case 'Order Received': return 'Order Received';
      case 'Completed': return 'Order Received';
      case 'Cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'To Be Packed': return 'Order is being prepared';
      case 'Order Paid': return 'Order is being prepared';
      default: return '';
    }
  };

  const resolveAssetUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${api.defaults.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const hasDeliveryInfo = (order) => Boolean(
    order.delivery_status ||
    order.delivery_method ||
    order.courier_name ||
    order.tracking_number ||
    order.tracking_link ||
    order.proof_image_url ||
    order.delivery_remarks
  );

  const getTrackingUnavailableMessage = (order) => {
    if (!order) return '';
    if (order.tracking_link_available && order.tracking_link) return '';
    if (order.delivery_type === 'PICKUP' || order.delivery_method === 'Customer Pick-up') return '';
    return order.tracking_unavailable_message || 'Delivery tracking link is not available. Please contact pensee@gmail.com.';
  };

  // Toggle order expansion
  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Expand/collapse all orders
  const toggleAllOrders = () => {
    if (expandedOrders.size === orders.length) {
      setExpandedOrders(new Set());
    } else {
      setExpandedOrders(new Set(orders.map(order => order.order_id)));
    }
  };

  // Sort orders
  const getSortedOrders = () => {
    const sorted = [...orders].sort((a, b) => {
      const dateA = new Date(a.order_date);
      const dateB = new Date(b.order_date);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  };


  if (loading) {
    return (
      <div className="cart-loading">
        <div className="loading-spinner"></div>
        <p>Loading your orders...</p>
      </div>
    );
  }

  if (!user || user.source !== 'customer') {
    return (
      <div className="cart-loading">
        <div className="empty-cart-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>Please log in as a customer to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="customer-orders">
      <TopbarCustomer />
      <div className="orders-header">
        <h1>My Orders</h1>
        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button onClick={fetchOrders} className="retry-btn">
              Retry
            </button>
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <div className="orders-controls">
          <div className="sort-controls">
            <label htmlFor="sort-select">Sort by:</label>
            <select 
              id="sort-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div className="expand-controls">
            <button 
              onClick={toggleAllOrders}
              className="expand-all-btn"
            >
              {expandedOrders.size === orders.length ? 'Collapse All' : 'Expand All'}
            </button>
            <button 
              onClick={fetchOrders}
              className="refresh-btn"
              title="Refresh orders"
            >
              🔄
            </button>
          </div>
        </div>
      )}

        <div className="orders-content">
          {(orders?.length || 0) === 0 ? (
            <div className="empty-orders">
              <div className="empty-orders-icon">📋</div>
              <h2>No orders yet</h2>
              <p>Your order history will appear here</p>
            </div>
          ) : (
            <div className="orders-list">
              {getSortedOrders().map((order) => {
                const isExpanded = expandedOrders.has(order.order_id);
                return (
                  <div key={order.order_id} className={`order-card ${isExpanded ? 'expanded' : 'collapsed'}`}>
                    <div className="order-header" onClick={() => toggleOrderExpansion(order.order_id)}>
                      <div className="order-info">
                        <h3>Order {order.order_id}</h3>
                        <p className="order-date">Placed on {order.order_date ? formatDate(order.order_date) : 'Unknown'}</p>
                      </div>
                      <div className="order-status">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {getStatusIcon(order.status)} {getCustomerStatus(order.status)}
                          {getStatusDescription(order.status) && (
                            <div className="status-description">
                              {getStatusDescription(order.status)}
                            </div>
                          )}
                        </span>
                        <button className="expand-toggle-btn">
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                    </div>
                  
                    {isExpanded && (
                      <div className="order-details">
                        <div className="order-summary">
                          <div className="summary-item">
                            <span className="label">Total:</span>
                            <span className="value">₱{Number(order.total_cost || 0).toFixed(2)}</span>
                          </div>
                          <div className="summary-item">
                            <span className="label">Payment:</span>
                            <span className="value">{order.payment_status || order.payment_method}</span>
                          </div>
                          <div className="summary-item">
                            <span className="label">Remaining Balance:</span>
                            <span className="value">PHP {Number(order.remaining_balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="summary-item">
                            <span className="label">Expected Delivery:</span>
                            <span className="value">{order.expected_delivery ? formatDate(order.expected_delivery) : 'TBD'}</span>
                          </div>
                        </div>
                        
                        {hasDeliveryInfo(order) && (
                          <div className="customer-delivery-info">
                            <h4>Delivery Information</h4>
                            <div className="delivery-info-grid">
                              <div className="delivery-info-item">
                                <span className="label">Delivery Status:</span>
                                <span className="value">{order.delivery_status || 'Pending'}</span>
                              </div>
                              <div className="delivery-info-item">
                                <span className="label">Delivery Mode:</span>
                                <span className="value">{order.delivery_method || 'Not set yet'}</span>
                              </div>
                              <div className="delivery-info-item">
                                <span className="label">Courier / Rider:</span>
                                <span className="value">{order.courier_name || '-'}</span>
                              </div>
                              <div className="delivery-info-item">
                                <span className="label">Tracking Number:</span>
                                <span className="value">{order.tracking_number || '-'}</span>
                              </div>
                              <div className="delivery-info-item">
                                <span className="label">Total Boxes:</span>
                                <span className="value">{order.total_boxes ?? order.order_quantity ?? 0}</span>
                              </div>
                            </div>

                            {order.tracking_link_available && order.tracking_link ? (
                              <a className="track-delivery-btn" href={order.tracking_link} target="_blank" rel="noopener noreferrer">
                                Track Delivery
                              </a>
                            ) : getTrackingUnavailableMessage(order) ? (
                              <p className="tracking-unavailable-message">{getTrackingUnavailableMessage(order)}</p>
                            ) : null}

                            {order.proof_image_url && (
                              <div className="delivery-proof-preview">
                                <span className="label">Proof of Delivery / Sending:</span>
                                <img src={resolveAssetUrl(order.proof_image_url)} alt="Proof of delivery" />
                              </div>
                            )}

                            {order.delivery_remarks && (
                              <p className="delivery-remarks"><strong>Remarks:</strong> {order.delivery_remarks}</p>
                            )}
                          </div>
                        )}

                        <div className="order-products">
                          <h4>Ordered Products</h4>
                          {console.log(`Order ${order.order_id} products:`, order.products)}
                          <div className="products-list">
                            {(order.products || []).map((product, index) => (
                              <div key={index} className="product-item">
                                <div className="product-icon">
                                  {product.image_data ? (
                                    <img 
                                      src={`data:image/jpeg;base64,${product.image_data}`} 
                                      alt={product.name}
                                      className="product-image"
                                    />
                                  ) : (
                                    <div className="product-placeholder">📦</div>
                                  )}
                                </div>
                                <div className="product-details">
                                  <span className="product-name">{product.name}</span>
                                  <span className="product-quantity">Qty: {product.quantity}</span>
                                </div>
                              </div>
                            ))}
                            {(order.products || []).length === 0 && (
                              <div className="no-products">No products found for this order</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="delivery-progress">
                          <h4>Delivery Progress</h4>
                          <div className="progress-steps">
                            <div className={`step ${order.status === 'Order Placed' ? 'active' : order.status === 'To Be Packed' || order.status === 'In Progress' || order.status === 'Ready for Delivery' || order.status === 'Completed' ? 'completed' : ''}`}>
                              <div className="step-icon">📝</div>
                              <div className="step-label">Order Placed</div>
                            </div>
                            <div className={`step ${order.status === 'To Be Packed' || order.status === 'In Progress' ? 'active' : order.status === 'Ready for Delivery' || order.status === 'Completed' ? 'completed' : ''}`}>
                              <div className="step-icon">⚙️</div>
                              <div className="step-label">Processing</div>
                            </div>
                            <div className={`step ${order.status === 'Ready for Delivery' ? 'active' : order.status === 'Completed' ? 'completed' : ''}`}>
                              <div className="step-icon">📦</div>
                              <div className="step-label">Ready for Delivery</div>
                            </div>
                            <div className={`step ${order.status === 'Completed' ? 'active' : ''}`}>
                              <div className="step-icon">✅</div>
                              <div className="step-label">Completed</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
