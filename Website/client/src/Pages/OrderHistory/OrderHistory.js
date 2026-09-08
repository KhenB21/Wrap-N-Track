import React, { useEffect, useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from "../../api";
import "./OrderHistory.css";
import { useNavigate } from "react-router-dom";

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/png;base64,${user.profile_picture_data}`;
  }
  if (user.profile_picture_path) {
    if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
  return `${user.profile_picture_path}`;
  }
  return "/placeholder-profile.png";
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderProducts, setOrderProducts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all | completed | cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
  const [ws, setWs] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [confirmation, setConfirmation] = useState({ open: false, message: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const navigate = useNavigate();

  const fetchOrders = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      // Only Cancelled/Completed orders belong on this page — filtering
      // server-side keeps pagination meaningful (was previously fetching
      // every order in one shot, which included embedded product images
      // and could OOM-crash the server on large histories).
      const response = await api.get(`/api/customer-orders/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { status: 'Completed,Cancelled', page: pageToFetch, limit: 20 }
      });
      const data = response.data.orders || [];
      setOrders(data);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  // WebSocket base: use config or fallback to current origin
  const wsBase = process.env.REACT_APP_WS_URL || window.location.origin.replace(/^http/, 'ws');
  const wsUrl = `${wsBase}/ws`;
  console.log('Connecting to WebSocket:', wsUrl);
  const newWs = new WebSocket(wsUrl);
    setWs(newWs);

    newWs.onopen = () => {
      console.log('WebSocket connected');
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newWs.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    };

    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'order-archived') {
        // Fetch updated order history when an order is archived
        setPage(1);
        fetchOrders(1);
      }
    };

    return () => {
      if (newWs) {
        newWs.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (selectedOrderId) {
      // Clear previous products to avoid showing stale data that may resemble order names
      setOrderProducts([]);
      fetchOrderProducts(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchOrderProducts = async (orderId) => {
    try {
      const res = await api.get(`/api/customer-orders/orders/${orderId}`);
      if (res.data && res.data.success && res.data.order && res.data.order.products) {
        setOrderProducts(res.data.order.products);
      } else {
        setOrderProducts([]);
      }
    } catch (err) {
      console.error('Error fetching order products:', err);
      setError('Failed to load order products');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} showSearch={false} />
        
        {/* Header / Filters */}
        <div className="order-filters">
          <span>Total Archived Orders: {pagination.total}</span>
          <div className="history-badges">
            <button
              type="button"
              className={`badge badge-green filter-badge${filterStatus==='completed'?' active':''}`}
              onClick={() => {
                const newStatus = filterStatus === 'completed' ? 'all' : 'completed';
                setFilterStatus(newStatus);
                setSelectedOrderId(null); // Clear selection when switching filters
              }}
              aria-pressed={filterStatus==='completed'}
            >
              Completed
            </button>
            <button
              type="button"
              className={`badge badge-red filter-badge${filterStatus==='cancelled'?' active':''}`}
              onClick={() => {
                const newStatus = filterStatus === 'cancelled' ? 'all' : 'cancelled';
                setFilterStatus(newStatus);
                setSelectedOrderId(null); // Clear selection when switching filters
              }}
              aria-pressed={filterStatus==='cancelled'}
            >
              Cancelled
            </button>
          </div>
          <input 
            className="order-search" 
            type="text" 
            placeholder="Search by customer, ship to, order ID, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="order-details-layout">
          {/* Order List */}
          <div className="order-list">
            <div className="order-list-title">ARCHIVED ORDERS</div>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="order-list-item" style={{ pointerEvents: 'none' }}>
                  <div className="order-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: '16px', margin: 0 }} />
                    <div className="skeleton-shimmer" style={{ width: '60px', height: '18px', borderRadius: '10px' }} />
                  </div>
                  <div className="order-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '8px' }}>
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '70px', height: '14px', margin: 0 }} />
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '90px', height: '14px', margin: 0 }} />
                  </div>
                </div>
              ))
            ) : error ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#e74c3c'}}>
                <div style={{fontSize: '16px', marginBottom: '8px'}}>Error loading orders</div>
                <div style={{fontSize: '14px'}}>{error}</div>
              </div>
            ) : orders.filter((o)=> {
              const statusMatch = filterStatus==='all' ? true : (filterStatus==='completed' ? o.status==='Completed' : o.status==='Cancelled');
              const searchMatch = !searchTerm ||
                (o.customer_name && o.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (o.shipped_to && o.shipped_to.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (o.order_id && o.order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (o.email_address && o.email_address.toLowerCase().includes(searchTerm.toLowerCase()));
              return statusMatch && searchMatch;
            }).length === 0 ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                <div style={{fontSize: '16px', marginBottom: '8px'}}>No orders found</div>
                <div style={{fontSize: '14px'}}>
                  {filterStatus === 'all' ? 'No archived orders available' : 
                   filterStatus === 'completed' ? 'No completed orders found' : 
                   'No cancelled orders found'}
                </div>
              </div>
            ) : orders
              .filter((o)=> {
                const statusMatch = filterStatus==='all' ? true : (filterStatus==='completed' ? o.status==='Completed' : o.status==='Cancelled');
                const searchMatch = !searchTerm ||
                  (o.customer_name && o.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (o.shipped_to && o.shipped_to.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (o.order_id && o.order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (o.email_address && o.email_address.toLowerCase().includes(searchTerm.toLowerCase()));
                return statusMatch && searchMatch;
              })
              .map((o) => (
              <div
                className={`order-list-item${selectedOrderId === o.order_id ? " selected" : ""}`}
                key={o.order_id}
                onClick={() => setSelectedOrderId(o.order_id)}
                style={{cursor:'pointer'}}
              >
                <div className="order-info">
                  <div className="order-name">{o.customer_name || o.shipped_to || 'Unknown Customer'}</div>
                  <div className={`order-status-badge ${o.status === 'Completed' ? 'status-completed' : 'status-cancelled'}`}>
                    {o.status}
                  </div>
                </div>
                <div className="order-meta">
                  <div className="order-price">₱{Number(o.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                  <div className="order-date">
                    {(() => {
                      // Try different date fields and format properly
                      const dateField = o.archived_at || o.order_date || o.status_updated_at;
                      if (!dateField) return 'No date';
                      
                      try {
                        const date = new Date(dateField);
                        if (isNaN(date.getTime())) return 'Invalid date';
                        return date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                      } catch (e) {
                        return 'Invalid date';
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
            {!loading && !error && pagination.totalPages > 1 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'12px 0'}}>
                <button
                  type="button"
                  className="badge"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{cursor: pagination.page <= 1 ? 'default' : 'pointer', opacity: pagination.page <= 1 ? 0.5 : 1}}
                >
                  Prev
                </button>
                <span style={{fontSize:13,color:'#666'}}>Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  type="button"
                  className="badge"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  style={{cursor: pagination.page >= pagination.totalPages ? 'default' : 'pointer', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1}}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div className="order-details-panel">
            {!selectedOrder ? (
              <div className="order-details-empty">Select an order to view details</div>
            ) : (
              <div className="order-details-content">
                <div className="order-details-columns">
                  {/* LEFT COLUMN: DETAILS */}
                  <div className="order-details-main">
                    <div className="order-details-heading">
                      <div className="order-details-customer">{selectedOrder.customer_name || selectedOrder.shipped_to || 'Unknown Customer'}</div>
                      <div className="order-details-id">{selectedOrder.order_id}</div>
                      <div className="order-details-archived-date">
                        {(() => {
                          const dateField = selectedOrder.archived_at || selectedOrder.order_date || selectedOrder.status_updated_at;
                          if (!dateField) return 'Archived on Unknown Date';

                          try {
                            const date = new Date(dateField);
                            if (isNaN(date.getTime())) return 'Archived on Invalid Date';
                            return `Archived on ${date.toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`;
                          } catch (e) {
                            return 'Archived on Invalid Date';
                          }
                        })()}
                      </div>
                    </div>
                    <hr className="order-details-divider"/>
                    <div className="order-detail-section">
                      <div className="order-detail-section-title">Contact Details</div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Cellphone</div>
                        <div className="order-detail-value">{selectedOrder.cellphone || '-'}</div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Email Address</div>
                        <div className="order-detail-value">{selectedOrder.email_address || '-'}</div>
                      </div>
                    </div>
                    <div className="order-detail-section">
                      <div className="order-detail-section-title">Shipping Details</div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Ship to</div>
                        <div className="order-detail-value">{selectedOrder.shipped_to || '-'}</div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Address</div>
                        <div className="order-detail-value">{selectedOrder.shipping_address || '-'}</div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Date Ordered</div>
                        <div className="order-detail-value">
                          {(() => {
                            if (!selectedOrder.order_date) return 'Not specified';
                            try {
                              const date = new Date(selectedOrder.order_date);
                              if (isNaN(date.getTime())) return selectedOrder.order_date;
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            } catch (e) {
                              return selectedOrder.order_date;
                            }
                          })()}
                        </div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Expected Delivery</div>
                        <div className="order-detail-value">
                          {(() => {
                            if (!selectedOrder.expected_delivery) return 'Not specified';
                            try {
                              const date = new Date(selectedOrder.expected_delivery);
                              if (isNaN(date.getTime())) return selectedOrder.expected_delivery;
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            } catch (e) {
                              return selectedOrder.expected_delivery;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="order-detail-section">
                      <div className="order-detail-section-title">Payment Details</div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Payment Method</div>
                        <div className="order-detail-value">{selectedOrder.payment_method || 'Not specified'}</div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Total Cost</div>
                        <div className="order-detail-value order-detail-value-strong">₱{Number(selectedOrder.total_cost || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                      </div>
                      <div className="order-detail-row">
                        <div className="order-detail-label">Remarks</div>
                        <div className="order-detail-value">{selectedOrder.remarks || 'None'}</div>
                      </div>
                    </div>
                  </div>
                  {/* RIGHT COLUMN: PRODUCTS CARD */}
                  <div className="order-history-products-card">
                    <div className="order-detail-section-title">Products</div>
                    {(() => {
                      // Prefer explicitly fetched products; fall back to embedded products if valid
                      const fetched = Array.isArray(orderProducts) ? orderProducts : [];
                      const embedded = Array.isArray(selectedOrder?.products) ? selectedOrder.products : [];
                      const hasValidFetched = fetched.some(p => p && (p.sku || p.image_data || p.unit_price !== undefined || p.quantity !== undefined));
                      const effectiveProducts = hasValidFetched ? fetched : embedded;
                      if (!effectiveProducts || effectiveProducts.length === 0) {
                        return <div className="order-products-empty">No products in this order.</div>;
                      }
                      return (
                        <div>
                        {effectiveProducts.map((p, idx) => {
                          const unitPrice = Number(p && p.unit_price != null ? p.unit_price : 0);
                          const qty = Number(p && p.quantity != null ? p.quantity : 0);
                          const lineTotal = unitPrice * (isNaN(qty) ? 0 : qty);
                          const orderName = selectedOrder?.customer_name;
                          const displayName = (p?.name && p.name !== orderName) ? p.name : (p?.sku || 'Item');
                          const imgSrc = p?.sku ? `${api.defaults.baseURL || ''}/api/inventory/${encodeURIComponent(p.sku)}/image` : null;
                          return (
                            <div key={`${p.sku}-${idx}`} className={`order-product-row${idx!==effectiveProducts.length-1 ? ' order-product-row-bordered' : ''}`}>
                              <div className="order-product-thumb">
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={displayName}
                                    onError={(e)=>{
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="order-product-thumb-fallback" style={{ display: imgSrc ? 'none' : 'flex' }}>
                                  📦
                                </div>
                              </div>
                              <div className="order-product-info">
                                <div className="order-product-name">{displayName}</div>
                                <div className="order-product-unit-price">₱{unitPrice.toLocaleString(undefined, {minimumFractionDigits:2})} each</div>
                              </div>
                              <div className="order-product-totals">
                                <div className="order-product-qty">Qty: {qty}</div>
                                <div className="order-product-line-total">
                                  ₱{lineTotal.toLocaleString(undefined, {minimumFractionDigits:2})}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 