import React, { useEffect, useState } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from "../../api/axios";
import config from "../../config";
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
    return `${config.API_URL}${user.profile_picture_path}`;
  }
  return "/placeholder-profile.png";
}

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderProducts, setOrderProducts] = useState([]);
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
  const [ws, setWs] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [confirmation, setConfirmation] = useState({ open: false, message: '' });
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      const response = await api.get('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const newWs = new WebSocket('ws://localhost:3001/ws');
    setWs(newWs);

    newWs.onopen = () => {
      console.log('WebSocket connected');
    };

    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'order-archived') {
        // Fetch updated order history when an order is archived
        fetchOrders();
      }
    };

    return () => {
      if (newWs) {
        newWs.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) fetchOrderProducts(selectedOrderId);
  }, [selectedOrderId]);

  const fetchOrderProducts = async (orderId) => {
    try {
      const res = await api.get(`/api/orders/history/${orderId}/products`);
      setOrderProducts(res.data);
    } catch (err) {
      console.error('Error fetching order products:', err);
      setError('Failed to load order products');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        
        {/* Filters */}
        <div className="order-filters">
          <span>Total Archived Orders: {orders.length}</span>
          <select><option>All</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="order-search" type="text" placeholder="Search" />
        </div>

        <div className="order-details-layout">
          {/* Order List */}
          <div className="order-list">
            <div className="order-list-title">ARCHIVED ORDERS</div>
            {loading ? <div>Loading...</div> : orders.map((o) => (
              <div
                className={`order-list-item${selectedOrderId === o.order_id ? " selected" : ""}`}
                key={o.order_id}
                onClick={() => setSelectedOrderId(o.order_id)}
                style={{cursor:'pointer'}}
              >
                <div className="order-info">
                  <div className="order-name">{o.name}</div>
                  <div className="order-code">{o.order_id}</div>
                </div>
                <div className="order-price">{Number(o.total_cost).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                <div className="order-date">{new Date(o.archived_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>

          {/* Order Details */}
          <div className="order-details-panel">
            {!selectedOrder ? (
              <div style={{color:'#bbb',fontSize:22,display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>Select an order to view details</div>
            ) : (
              <div style={{padding:'0 12px'}}>
                <div style={{display:'flex',gap:32,alignItems:'flex-start'}}>
                  {/* LEFT COLUMN: DETAILS */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18}}>
                      <div>
                        <div style={{fontSize:28,fontWeight:700,marginBottom:2}}>{selectedOrder.name}</div>
                        <div style={{fontSize:18,color:'#888'}}>{selectedOrder.order_id}</div>
                        <div style={{fontSize:14,color:'#666',marginTop:4}}>Archived on {new Date(selectedOrder.archived_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <hr style={{margin:'18px 0'}}/>
                    <div style={{marginBottom:18}}>
                      <div style={{fontWeight:700,fontSize:16,marginBottom:8,letterSpacing:1}}>CONTACT DETAILS</div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Telephone</div>
                        <div style={{fontWeight:500}}>{selectedOrder.telephone || '-'}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Cellphone</div>
                        <div style={{fontWeight:500}}>{selectedOrder.cellphone || '-'}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Email Address</div>
                        <div style={{fontWeight:500}}>{selectedOrder.email_address || '-'}</div>
                      </div>
                    </div>
                    <div style={{marginBottom:18}}>
                      <div style={{fontWeight:700,fontSize:16,marginBottom:8,letterSpacing:1}}>SHIPPING DETAILS</div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Ship to</div>
                        <div style={{fontWeight:500}}>{selectedOrder.shipped_to}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Address</div>
                        <div style={{fontWeight:500}}>{selectedOrder.shipping_address}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Date Ordered</div>
                        <div style={{fontWeight:500}}>{selectedOrder.order_date}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Expected Delivery</div>
                        <div style={{fontWeight:500}}>{selectedOrder.expected_delivery}</div>
                      </div>
                    </div>
                    <div style={{marginBottom:18}}>
                      <div style={{fontWeight:700,fontSize:16,marginBottom:8,letterSpacing:1}}>PAYMENT DETAILS</div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Payment Type</div>
                        <div style={{fontWeight:500}}>{selectedOrder.payment_type}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Payment Method</div>
                        <div style={{fontWeight:500}}>{selectedOrder.payment_method}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Account Name</div>
                        <div style={{fontWeight:500}}>{selectedOrder.account_name}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Total Cost</div>
                        <div style={{fontWeight:500}}>{Number(selectedOrder.total_cost).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                      </div>
                      <div style={{display:'flex',gap:32,marginBottom:4}}>
                        <div style={{minWidth:120,color:'#888'}}>Remarks</div>
                        <div style={{fontWeight:500}}>{selectedOrder.remarks}</div>
                      </div>
                    </div>
                  </div>
                  {/* RIGHT COLUMN: PRODUCTS CARD */}
                  <div style={{width:340,minWidth:260,background:'#fafbfc',borderRadius:10,padding:'18px 24px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                    <div style={{fontWeight:700,fontSize:16,marginBottom:12,letterSpacing:1}}>PRODUCTS</div>
                    {orderProducts.length === 0 ? (
                      <div style={{color:'#aaa'}}>No products in this order.</div>
                    ) : (
                      <div>
                        {orderProducts.map((p, idx) => (
                          <div key={p.sku} style={{display:'flex',alignItems:'center',gap:16,padding:'10px 0',borderBottom:idx!==orderProducts.length-1?'1px solid #eee':'none'}}>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600,fontSize:15}}>{p.name}</div>
                              <div style={{fontSize:13,color:'#888'}}>₱{Number(p.unit_price).toLocaleString(undefined, {minimumFractionDigits:2})} each</div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{color:'#888',fontWeight:500,fontSize:15}}>Qty: {p.quantity}</div>
                              <div style={{color:'#666',fontWeight:600,fontSize:15}}>
                                ₱{Number(p.unit_price * p.quantity).toLocaleString(undefined, {minimumFractionDigits:2})}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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