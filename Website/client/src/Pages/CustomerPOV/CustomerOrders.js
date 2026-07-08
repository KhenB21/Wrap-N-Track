import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import TopbarCustomer from '../../Components/TopbarCustomer';
import api from '../../api';
import './CustomerOrders.css';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || user?.source !== 'customer') {
      navigate('/customer-login');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch customer orders
  useEffect(() => {
    if (isAuthenticated && user?.source === 'customer') {
      fetchOrders();
    }
  }, [isAuthenticated, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer-orders/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setError('');
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = async (order) => {
    try {
      const response = await fetch(`/api/customer-orders/orders/${order.order_id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customerToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data.order);
        setShowOrderDetails(true);
      } else {
        alert('Failed to fetch order details');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to fetch order details');
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Order Placed': '#17a2b8',
      'Order Paid': '#28a745',
      'To Be Packed': '#ffc107',
      'Order Shipped Out': '#007bff',
      'Ready for Delivery': '#6f42c1',
      'Order Received': '#20c997',
      'Completed': '#28a745',
      'Cancelled': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const getStatusIcon = (status) => {
    const statusIcons = {
      'Order Placed': '📋',
      'Order Paid': '💳',
      'To Be Packed': '📦',
      'Order Shipped Out': '🚚',
      'Ready for Delivery': '🚛',
      'Order Received': '✅',
      'Completed': '🎉',
      'Cancelled': '❌'
    };
    return statusIcons[status] || '❓';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-PH');
  };

  const resolveAssetUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${api.defaults.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const getDeliveryMessage = (delivery) => {
    if (!delivery) return '';
    if (delivery.tracking_link_available && delivery.tracking_link) return '';
    if (delivery.delivery_type === 'PICKUP' || delivery.delivery_method === 'Customer Pick-up') return '';
    return delivery.tracking_unavailable_message || 'Delivery tracking link is not available. Please contact pensee@gmail.com.';
  };

  const getTrackingSteps = (order) => {
    const steps = [
      {
        id: 'order-placed',
        title: 'Order Placed',
        description: 'Your order has been received and is being processed',
        completed: true,
        timestamp: order.order_placed_at,
        status: 'completed'
      },
      {
        id: 'order-paid',
        title: 'Order Paid',
        description: 'Payment confirmed and order is being prepared',
        completed: ['Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status),
        timestamp: order.order_paid_at,
        status: order.status === 'To Be Packed' ? 'preparing' : 
                ['Order Paid', 'To Be Packed', 'Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending',
        extraLabel: order.status === 'To Be Packed' ? 'Order is being prepared' : null
      },
      {
        id: 'order-shipped',
        title: 'Order Shipped Out',
        description: 'Your order is on its way to you',
        completed: ['Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status),
        timestamp: order.order_shipped_at,
        status: ['Order Shipped Out', 'Ready for Delivery', 'Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending'
      },
      {
        id: 'order-received',
        title: 'Order Received',
        description: 'Your order has been delivered',
        completed: ['Order Received', 'Completed'].includes(order.status),
        timestamp: order.order_received_at,
        status: ['Order Received', 'Completed'].includes(order.status) ? 'completed' : 'pending'
      }
    ];

    return steps;
  };

  if (!isAuthenticated || user?.source !== 'customer') {
    return null;
  }

  return (
    <div className="customer-orders-page">
      <TopbarCustomer />
      
      <div className="orders-container">
        <div className="orders-header">
          <h1>My Orders</h1>
          <p>Track your order status and view order details</p>
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
            <div className="empty-orders-icon">📦</div>
            <h2>No orders yet</h2>
            <p>Start shopping to see your orders here!</p>
            <button 
              className="start-shopping-btn"
              onClick={() => navigate('/order')}
            >
              Start Shopping
            </button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3 className="order-id">{order.order_id}</h3>
                    <p className="order-date">Ordered on {formatDate(order.order_date)}</p>
                  </div>
                  <div className="order-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusIcon(order.status)} {order.status}
                    </span>
                  </div>
                </div>

                <div className="order-details">
                  <div className="order-summary">
                    <p><strong>Total:</strong> {formatPrice(order.total_cost)}</p>
                    <p><strong>Payment:</strong> {order.payment_method}</p>
                    <p><strong>Expected Delivery:</strong> {formatDate(order.expected_delivery)}</p>
                  </div>
                  
                  <div className="order-actions">
                    <button 
                      onClick={() => handleOrderClick(order)}
                      className="view-details-btn"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                {/* Tracking Steps */}
                <div className="tracking-steps">
                  {getTrackingSteps(order).map((step, index) => (
                    <div key={step.id} className={`tracking-step ${step.status}`}>
                      <div className="step-indicator">
                        <div className="step-circle">
                          {step.completed ? '✓' : (index + 1)}
                        </div>
                        {index < getTrackingSteps(order).length - 1 && (
                          <div className="step-line"></div>
                        )}
                      </div>
                      <div className="step-content">
                        <h4 className="step-title">{step.title}</h4>
                        <p className="step-description">{step.description}</p>
                        {step.extraLabel && (
                          <span className="extra-label">{step.extraLabel}</span>
                        )}
                        {step.timestamp && (
                          <p className="step-timestamp">{formatDate(step.timestamp)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
                        {getStatusIcon(selectedOrder.status)} {selectedOrder.status}
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
                  </div>
                </div>

                <div className="shipping-info-section">
                  <h3>Shipping Information</h3>
                  <div className="shipping-address">
                    <p><strong>Ship to:</strong> {selectedOrder.shipped_to}</p>
                    <p><strong>Address:</strong> {selectedOrder.shipping_address}</p>
                    <p><strong>Phone:</strong> {selectedOrder.telephone}</p>
                    <p><strong>Email:</strong> {selectedOrder.email_address}</p>
                  </div>
                </div>

                {selectedOrder.delivery && (
                  <div className="customer-delivery-section">
                    <h3>Delivery Tracking</h3>
                    <div className="customer-delivery-grid">
                      <div>
                        <label>Delivery Status:</label>
                        <span>{selectedOrder.delivery.delivery_status || selectedOrder.delivery_status || 'Pending'}</span>
                      </div>
                      <div>
                        <label>Delivery Mode:</label>
                        <span>{selectedOrder.delivery.delivery_method || 'Not set yet'}</span>
                      </div>
                      <div>
                        <label>Courier / Service:</label>
                        <span>{selectedOrder.delivery.courier_name || '-'}</span>
                      </div>
                      <div>
                        <label>Tracking Number:</label>
                        <span>{selectedOrder.delivery.tracking_number || '-'}</span>
                      </div>
                      <div>
                        <label>Total Boxes:</label>
                        <span>{selectedOrder.total_boxes || selectedOrder.products?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}</span>
                      </div>
                      <div>
                        <label>Expected Delivery:</label>
                        <span>{formatDate(selectedOrder.expected_delivery)}</span>
                      </div>
                    </div>

                    {selectedOrder.delivery.tracking_link_available && selectedOrder.delivery.tracking_link ? (
                      <a className="customer-track-btn" href={selectedOrder.delivery.tracking_link} target="_blank" rel="noreferrer">
                        Track Delivery
                      </a>
                    ) : getDeliveryMessage(selectedOrder.delivery) ? (
                      <p className="customer-delivery-message">{getDeliveryMessage(selectedOrder.delivery)}</p>
                    ) : null}

                    {selectedOrder.delivery.proof_image_url && (
                      <div className="customer-proof">
                        <label>Proof of Sending / Pickup:</label>
                        <img src={resolveAssetUrl(selectedOrder.delivery.proof_image_url)} alt="Proof of delivery sending" />
                      </div>
                    )}

                    {selectedOrder.delivery.delivery_remarks && (
                      <p className="customer-delivery-remarks"><strong>Remarks:</strong> {selectedOrder.delivery.delivery_remarks}</p>
                    )}

                    {selectedOrder.deliveryHistory?.length > 0 && (
                      <div className="customer-delivery-timeline">
                        <h4>Delivery Timeline</h4>
                        {selectedOrder.deliveryHistory.map((entry, index) => (
                          <div className="customer-delivery-timeline-item" key={`${entry.status}-${entry.created_at}-${index}`}>
                            <strong>{entry.status}</strong>
                            <span>{formatDateTime(entry.created_at)}</span>
                            {entry.remarks && <p>{entry.remarks}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.products && selectedOrder.products.length > 0 && (
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
      </div>
    </div>
  );
}
