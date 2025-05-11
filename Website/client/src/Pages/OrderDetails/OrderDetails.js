import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./OrderDetails.css";
import axios from "axios";
import { FaEdit, FaTrash, FaCheckCircle } from 'react-icons/fa';

const orders = [
  {
    id: 1,
    name: "Terence Auyong",
    code: "#CO000002",
    price: "₱125.00",
    status: "Invoiced",
    statusClass: "status-invoiced",
    selected: true,
  },
  {
    id: 2,
    name: "Khen Bolima",
    code: "#CO000002",
    price: "₱125.00",
    status: "Packed",
    statusClass: "status-packed",
    selected: false,
  },
  {
    id: 3,
    name: "Reinan Briones",
    code: "#CO000002",
    price: "₱315.00",
    status: "Shipped",
    statusClass: "status-shipped",
    selected: false,
  },
  {
    id: 4,
    name: "Grant Nathan",
    code: "#CO000002",
    price: "₱315.00",
    status: "Complete",
    statusClass: "status-complete",
    selected: false,
  },
];

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/png;base64,${user.profile_picture_data}`;
  }
  if (user.profile_picture_path) {
    if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
    return `http://localhost:3001${user.profile_picture_path}`;
  }
  return "/placeholder-profile.png";
}

export default function OrderDetails() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    order_id: '', name: '', shipped_to: '', order_date: '', expected_delivery: '', status: '',
    shipping_address: '', total_cost: '', payment_type: '', payment_method: '', account_name: '', remarks: '',
    telephone: '', cellphone: '', email_address: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
  const [showProductModal, setShowProductModal] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [orderProducts, setOrderProducts] = useState([]);
  const [productSelection, setProductSelection] = useState({}); // { sku: quantity }
  const [profitMargins, setProfitMargins] = useState({}); // { sku: margin }
  const [placingOrder, setPlacingOrder] = useState(false);
  const [productError, setProductError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [archivingOrder, setArchivingOrder] = useState(false);
  const [showEditProductsModal, setShowEditProductsModal] = useState(false);
  const [editingProducts, setEditingProducts] = useState({}); // { sku: quantity }
  const [editingProductsError, setEditingProductsError] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) fetchOrderProducts(selectedOrderId);
  }, [selectedOrderId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/orders');
      setOrders(res.data);
    } catch (err) {
      alert('Failed to fetch orders');
    }
    setLoading(false);
  };

  const fetchOrderProducts = useCallback(async (orderId) => {
    try {
      const res = await axios.get(`http://localhost:3001/api/orders/${orderId}/products`);
      setOrderProducts(res.data);
    } catch (err) {
      setOrderProducts([]);
    }
  }, []);

  const handleAddProductToOrder = async () => {
    setProductError("");
    setPlacingOrder(true);
    const products = Object.entries(productSelection)
      .filter(([sku, qty]) => Number(qty) > 0)
      .map(([sku, quantity]) => ({ sku, quantity: Number(quantity) }));
    if (!products.length) {
      setProductError("Select at least one product and quantity.");
      setPlacingOrder(false);
      return;
    }
    try {
      await axios.post(`http://localhost:3001/api/orders/${selectedOrderId}/products`, { products });
      setShowProductModal(false);
      setProductSelection({});
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      setProductError(err?.response?.data?.message || 'Failed to add products');
    }
    setPlacingOrder(false);
  };

  const openProductModal = async () => {
    setProductError("");
    setProductSelection({});
    try {
      const res = await axios.get('http://localhost:3001/api/inventory');
      setInventory(res.data);
      setShowProductModal(true);
    } catch (err) {
      alert('Failed to fetch inventory');
    }
  };

  const handleAddOrder = () => {
    setForm({
      order_id: '', name: '', shipped_to: '', order_date: '', expected_delivery: '', status: '',
      shipping_address: '', total_cost: '', payment_type: '', payment_method: '', account_name: '', remarks: '',
      telephone: '', cellphone: '', email_address: ''
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/orders', form);
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      alert('Failed to add order');
    }
  };

  // Edit order: open modal with selected order's data
  const handleEditOrder = () => {
    if (!selectedOrder) return;
    setForm({ ...selectedOrder });
    setShowEditModal(true);
  };

  // Save edited order
  const handleEditOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:3001/api/orders/${form.order_id}`, form);
      setShowEditModal(false);
      fetchOrders();
    } catch (err) {
      alert('Failed to update order');
    }
  };

  // Delete order: confirm and delete
  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    try {
      await axios.delete(`http://localhost:3001/api/orders/${selectedOrder.order_id}`);
      setShowDeleteConfirm(false);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (err) {
      alert('Failed to delete order');
    }
  };

  // Mark as Completed and Archive
  const handleMarkCompleted = async () => {
    if (!selectedOrder) return;
    setShowCompleteConfirm(true);
  };

  const handleCompleteConfirm = async () => {
    if (!selectedOrder) return;
    try {
      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to complete this action');
        return;
      }

      // First mark as completed
      await axios.put(`http://localhost:3001/api/orders/${selectedOrder.order_id}`, 
        { ...selectedOrder, status: 'Completed' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Then archive the order
      setArchivingOrder(true);
      await axios.post(
        `http://localhost:3001/api/orders/${selectedOrder.order_id}/archive`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      setShowCompleteConfirm(false);
      setSelectedOrderId(null);
      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to complete and archive order');
    }
    setArchivingOrder(false);
  };

  const handleEditProducts = () => {
    if (!selectedOrder) return;
    // Initialize editing products with current quantities
    const initialQuantities = {};
    orderProducts.forEach(p => {
      initialQuantities[p.sku] = p.quantity;
    });
    setEditingProducts(initialQuantities);
    setShowEditProductsModal(true);
  };

  const handleUpdateProducts = async () => {
    setEditingProductsError("");
    setUpdatingProducts(true);
    try {
      const products = Object.entries(editingProducts)
        .filter(([sku, qty]) => Number(qty) > 0)
        .map(([sku, quantity]) => ({ sku, quantity: Number(quantity) }));
      
      await axios.put(`http://localhost:3001/api/orders/${selectedOrderId}/products`, { products });
      setShowEditProductsModal(false);
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      setEditingProductsError(err?.response?.data?.message || 'Failed to update products');
    }
    setUpdatingProducts(false);
  };

  const handleRemoveProduct = async (sku) => {
    if (!selectedOrder) return;
    try {
      await axios.delete(`http://localhost:3001/api/orders/${selectedOrderId}/products/${sku}`);
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      alert('Failed to remove product');
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        {/* Action Bar */}
        <div className="order-action-bar">
          <button className="btn-edit">Edit</button>
          <button className="btn-delete">Delete</button>
          <button className="btn-create" onClick={handleAddOrder}>Add Order</button>
          <span className="selected-count">{orders.filter(o => o.selected).length} Selected</span>
        </div>

        {/* Filters */}
        <div className="order-filters">
          <span>Total Orders: {orders.length}</span>
          <select><option>All</option></select>
          <select><option>Category</option></select>
          <select><option>Filter by</option></select>
          <input className="order-search" type="text" placeholder="Search" />
        </div>

        <div className="order-details-layout">
          {/* Order List */}
          <div className="order-list">
            <div className="order-list-title">ORDERS</div>
            {loading ? <div>Loading...</div> : orders.map((o) => (
              <div
                className={`order-list-item${selectedOrderId === o.order_id ? " selected" : ""}`}
                key={o.order_id}
                onClick={() => setSelectedOrderId(o.order_id)}
                style={{cursor:'pointer'}}
              >
                <input type="checkbox" checked={selectedOrderId === o.order_id} readOnly />
                <div className="order-info">
                  <div className="order-name">{o.name}</div>
                  <div className="order-code">{o.order_id}</div>
                </div>
                <div className="order-price">{Number(o.total_cost).toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                <div className={`order-status status-${(o.status || '').toLowerCase().replace(/ /g,'-')}`}>{o.status}</div>
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
                        <span className={`order-status-badge status-${(selectedOrder.status||'').toLowerCase().replace(/ /g,'-')}`} style={{fontSize:18,marginTop:10,display:'inline-block'}}>{selectedOrder.status}</span>
                      </div>
                      <div style={{display:'flex',gap:12,alignItems:'center'}}>
                        <button title="Edit Order" className="icon-btn" style={{background:'#f3f3f3',border:'none',borderRadius:6,padding:8,cursor:'pointer'}} onClick={handleEditOrder}><FaEdit size={20} /></button>
                        <button title="Delete Order" className="icon-btn" style={{background:'#fbeaea',border:'none',borderRadius:6,padding:8,cursor:'pointer'}} onClick={()=>setShowDeleteConfirm(true)}><FaTrash size={20} color="#e74c3c" /></button>
                        <button title="Mark as Completed" className="icon-btn" style={{background:'#eafbe9',border:'none',borderRadius:6,padding:8,cursor:'pointer'}} onClick={handleMarkCompleted}><FaCheckCircle size={20} color="#27ae60" /></button>
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
                    <div style={{fontWeight:700,fontSize:16,marginBottom:12,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span>PRODUCTS</span>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={handleEditProducts} style={{padding:'4px 8px',borderRadius:4,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Edit</button>
                        <button onClick={openProductModal} style={{padding:'4px 8px',borderRadius:4,border:'1px solid #ddd',background:'#fff',cursor:'pointer',fontSize:13}}>Add</button>
                      </div>
                    </div>
                    {orderProducts.length === 0 ? (
                      <div style={{color:'#aaa'}}>No products added to this order yet.</div>
                    ) : (
                      <div>
                        {orderProducts.map((p, idx) => (
                          <div key={p.sku} style={{display:'flex',alignItems:'center',gap:16,padding:'10px 0',borderBottom:idx!==orderProducts.length-1?'1px solid #eee':'none'}}>
                            {p.image_data ? <img src={`data:image/jpeg;base64,${p.image_data}`} alt={p.name} style={{width:44,height:44,borderRadius:8,objectFit:'cover',border:'1px solid #eee'}} /> : <div style={{width:44,height:44,background:'#eee',borderRadius:8}} />}
                            <div style={{flex:1}}>
                              <div style={{fontWeight:600,fontSize:15}}>{p.name}</div>
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{color:'#888',fontWeight:500,fontSize:15}}>Qty: {p.quantity}</div>
                              <button onClick={() => handleRemoveProduct(p.sku)} style={{padding:4,border:'none',background:'none',cursor:'pointer',color:'#e74c3c'}}><FaTrash size={14} /></button>
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

        {/* Modal for Add Order */}
        {showModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:800,maxWidth:900,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Add Order</h2>
              <form onSubmit={handleFormSubmit} style={{display:'flex',flexDirection:'column',gap:24}}>
                {/* Order Info */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Order ID<input name="order_id" value={form.order_id} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Name<input name="name" value={form.name} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Status
                    <select name="status" value={form.status} onChange={handleFormChange} required className="modal-input">
                      <option value="">Select status</option>
                      <option value="To be pack">To be pack</option>
                      <option value="Ready to ship">Ready to ship</option>
                      <option value="Completed">Completed</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
                {/* Dates */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Order Date<input name="order_date" type="date" value={form.order_date} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Expected Delivery<input name="expected_delivery" type="date" value={form.expected_delivery} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Shipping */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Shipped To (Receiver name) <input name="shipped_to" value={form.shipped_to} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Shipping Address<input name="shipping_address" value={form.shipping_address} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Contact */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Telephone<input name="telephone" value={form.telephone} onChange={handleFormChange} className="modal-input" placeholder="(optional)" /></label>
                  <label style={{fontWeight:500}}>Cellphone<input name="cellphone" value={form.cellphone} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Email Address<input name="email_address" value={form.email_address} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Payment */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Total Cost<input name="total_cost" type="number" step="0.01" value={form.total_cost} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Payment Type
                    <select name="payment_type" value={form.payment_type} onChange={handleFormChange} className="modal-input" required>
                      <option value="">Select payment type</option>
                      <option value="50% paid">50% paid</option>
                      <option value="70% paid">70% paid</option>
                      <option value="100% Paid">100% Paid</option>
                    </select>
                  </label>
                  <label style={{fontWeight:500}}>Payment Method
                    <select name="payment_method" value={form.payment_method} onChange={handleFormChange} className="modal-input" required>
                      <option value="">Select payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="Online Banking">Online Banking</option>
                      <option value="E-Wallet">E-Wallet</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </label>
                  <label style={{fontWeight:500}}>Account Name<input name="account_name" value={form.account_name} onChange={handleFormChange} className="modal-input" /></label>
                </div>
                {/* Remarks */}
                <label style={{fontWeight:500}}>Remarks<input name="remarks" value={form.remarks} onChange={handleFormChange} className="modal-input" /></label>
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
                  <button type="button" onClick={()=>setShowModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                  <button type="submit" style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal for Add Product to Order */}
        {showProductModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:700,maxWidth:900,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Add Products to Order</h2>
              <div style={{maxHeight:400,overflowY:'auto',marginBottom:18}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f8f8f8'}}>
                      <th style={{textAlign:'left',padding:'8px'}}>Image</th>
                      <th style={{textAlign:'left',padding:'8px'}}>Name</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Unit Price</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Available</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Profit Margin %</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Est. Profit</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => {
                      const quantity = Number(productSelection[item.sku] || 0);
                      const margin = Number(profitMargins[item.sku] || 0);
                      const unitPrice = Number(item.unit_price || 0);
                      const estimatedProfit = (unitPrice * quantity * (margin / 100)).toFixed(2);
                      
                      return (
                        <tr key={item.sku}>
                          <td style={{padding:'8px'}}>{item.image_data ? <img src={`data:image/jpeg;base64,${item.image_data}`} alt={item.name} style={{width:40,height:40,borderRadius:6,objectFit:'cover'}} /> : <div style={{width:40,height:40,background:'#eee',borderRadius:6}} />}</td>
                          <td style={{padding:'8px'}}>{item.name}</td>
                          <td style={{padding:'8px',textAlign:'right'}}>₱{unitPrice.toFixed(2)}</td>
                          <td style={{padding:'8px',textAlign:'right'}}>{item.quantity}</td>
                          <td style={{padding:'8px',textAlign:'right'}}>
                            <input 
                              type="number" 
                              min={0} 
                              max={100}
                              value={profitMargins[item.sku] || ''} 
                              onChange={e => setProfitMargins(pm => ({...pm, [item.sku]: e.target.value}))} 
                              style={{width:60,padding:'4px',borderRadius:4,border:'1px solid #ccc'}} 
                            />
                          </td>
                          <td style={{padding:'8px',textAlign:'right'}}>
                            {quantity > 0 && margin > 0 ? `₱${estimatedProfit}` : '-'}
                          </td>
                          <td style={{padding:'8px',textAlign:'right'}}>
                            <input 
                              type="number" 
                              min={0} 
                              max={item.quantity} 
                              value={productSelection[item.sku] || ''} 
                              onChange={e => setProductSelection(ps => ({...ps, [item.sku]: e.target.value}))} 
                              style={{width:60,padding:'4px',borderRadius:4,border:'1px solid #ccc'}} 
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <div style={{fontWeight:500}}>
                  Total Estimated Profit: ₱{
                    inventory.reduce((total, item) => {
                      const quantity = Number(productSelection[item.sku] || 0);
                      const margin = Number(profitMargins[item.sku] || 0);
                      const unitPrice = Number(item.unit_price || 0);
                      return total + (unitPrice * quantity * (margin / 100));
                    }, 0).toFixed(2)
                  }
                </div>
              </div>
              {productError && <div style={{color:'red',marginBottom:8}}>{productError}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={()=>setShowProductModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                <button type="button" onClick={handleAddProductToOrder} style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}} disabled={placingOrder}>{placingOrder ? 'Placing...' : 'Place Order'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {showEditModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:800,maxWidth:900,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Edit Order</h2>
              <form onSubmit={handleEditOrderSubmit} style={{display:'flex',flexDirection:'column',gap:24}}>
                {/* Order Info */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Order ID<input name="order_id" value={form.order_id} onChange={handleFormChange} required className="modal-input" disabled /></label>
                  <label style={{fontWeight:500}}>Name<input name="name" value={form.name} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Status
                    <select name="status" value={form.status} onChange={handleFormChange} required className="modal-input">
                      <option value="">Select status</option>
                      <option value="To be pack">To be pack</option>
                      <option value="Ready to ship">Ready to ship</option>
                      <option value="Completed">Completed</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
                {/* Dates */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Order Date<input name="order_date" type="date" value={form.order_date} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Expected Delivery<input name="expected_delivery" type="date" value={form.expected_delivery} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Shipping */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Shipped To (Receiver name) <input name="shipped_to" value={form.shipped_to} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Shipping Address<input name="shipping_address" value={form.shipping_address} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Contact */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Telephone<input name="telephone" value={form.telephone} onChange={handleFormChange} className="modal-input" placeholder="(optional)" /></label>
                  <label style={{fontWeight:500}}>Cellphone<input name="cellphone" value={form.cellphone} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Email Address<input name="email_address" value={form.email_address} onChange={handleFormChange} required className="modal-input" /></label>
                </div>
                {/* Payment */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:8}}>
                  <label style={{fontWeight:500}}>Total Cost<input name="total_cost" type="number" step="0.01" value={form.total_cost} onChange={handleFormChange} required className="modal-input" /></label>
                  <label style={{fontWeight:500}}>Payment Type
                    <select name="payment_type" value={form.payment_type} onChange={handleFormChange} className="modal-input" required>
                      <option value="">Select payment type</option>
                      <option value="50% paid">50% paid</option>
                      <option value="70% paid">70% paid</option>
                      <option value="100% Paid">100% Paid</option>
                    </select>
                  </label>
                  <label style={{fontWeight:500}}>Payment Method
                    <select name="payment_method" value={form.payment_method} onChange={handleFormChange} className="modal-input" required>
                      <option value="">Select payment method</option>
                      <option value="Cash">Cash</option>
                      <option value="Online Banking">Online Banking</option>
                      <option value="E-Wallet">E-Wallet</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </label>
                  <label style={{fontWeight:500}}>Account Name<input name="account_name" value={form.account_name} onChange={handleFormChange} className="modal-input" /></label>
                </div>
                {/* Remarks */}
                <label style={{fontWeight:500}}>Remarks<input name="remarks" value={form.remarks} onChange={handleFormChange} className="modal-input" /></label>
                <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:8}}>
                  <button type="button" onClick={()=>setShowEditModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                  <button type="submit" style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Products Modal */}
        {showEditProductsModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:700,maxWidth:900,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Edit Products</h2>
              <div style={{maxHeight:400,overflowY:'auto',marginBottom:18}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f8f8f8'}}>
                      <th style={{textAlign:'left',padding:'8px'}}>Image</th>
                      <th style={{textAlign:'left',padding:'8px'}}>Name</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Available</th>
                      <th style={{textAlign:'right',padding:'8px'}}>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderProducts.map(item => (
                      <tr key={item.sku}>
                        <td style={{padding:'8px'}}>{item.image_data ? <img src={`data:image/jpeg;base64,${item.image_data}`} alt={item.name} style={{width:40,height:40,borderRadius:6,objectFit:'cover'}} /> : <div style={{width:40,height:40,background:'#eee',borderRadius:6}} />}</td>
                        <td style={{padding:'8px'}}>{item.name}</td>
                        <td style={{padding:'8px',textAlign:'right'}}>{item.quantity}</td>
                        <td style={{padding:'8px',textAlign:'right'}}>
                          <input type="number" min={0} max={item.quantity} value={editingProducts[item.sku]||''} onChange={e => setEditingProducts(ps => ({...ps, [item.sku]: e.target.value}))} style={{width:60,padding:'4px',borderRadius:4,border:'1px solid #ccc'}} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editingProductsError && <div style={{color:'red',marginBottom:8}}>{editingProductsError}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={()=>setShowEditProductsModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                <button type="button" onClick={handleUpdateProducts} style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}} disabled={updatingProducts}>{updatingProducts ? 'Updating...' : 'Update Products'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Order Confirm Modal */}
        {showDeleteConfirm && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:400,maxWidth:500,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Delete Order</h2>
              <div style={{marginBottom:18}}>Are you sure you want to delete this order?</div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={()=>setShowDeleteConfirm(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                <button type="button" onClick={handleDeleteOrder} style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#e74c3c',color:'#fff',fontWeight:600,cursor:'pointer'}}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Order Confirm Modal */}
        {showCompleteConfirm && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:400,maxWidth:500,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Complete Order</h2>
              <div style={{marginBottom:18}}>
                <p>Are you sure you want to mark this order as completed and archive it?</p>
                <p style={{color:'#666',fontSize:14,marginTop:8}}>This will:</p>
                <ul style={{color:'#666',fontSize:14,marginTop:4,paddingLeft:20}}>
                  <li>Mark the order as completed</li>
                  <li>Deduct products from inventory</li>
                  <li>Move the order to order history</li>
                  <li>Remove it from active orders</li>
                </ul>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" onClick={()=>setShowCompleteConfirm(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                <button type="button" onClick={handleCompleteConfirm} style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#27ae60',color:'#fff',fontWeight:600,cursor:'pointer'}} disabled={archivingOrder}>
                  {archivingOrder ? 'Processing...' : 'Complete & Archive'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 