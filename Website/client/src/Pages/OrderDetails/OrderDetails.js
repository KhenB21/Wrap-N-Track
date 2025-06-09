import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./OrderDetails.css";
import axios from "axios";
import { FaEdit, FaTrash, FaCheckCircle } from 'react-icons/fa';
import { defaultProductNames } from '../CustomerPOV/CarloPreview.js';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';

// Add these styles at the top of the file
const styles = {
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    background: '#fff',
    borderBottom: '1px solid #eee',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease'
  },
  primaryButton: {
    background: '#4a90e2',
    color: '#fff',
    '&:hover': {
      background: '#357abd'
    }
  },
  secondaryButton: {
    background: '#f5f5f5',
    color: '#333',
    '&:hover': {
      background: '#e8e8e8'
    }
  },
  columnsContainer: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    height: 'calc(100vh - 180px)',
    background: '#f8f9fa'
  },
  column: {
    flex: 1,
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column'
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0'
  },
  columnTitle: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '18px',
    fontWeight: 600
  },
  orderCount: {
    background: '#e9ecef',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    color: '#495057',
    fontWeight: 500
  },
  orderList: {
    overflowY: 'auto',
    height: 'calc(100% - 40px)',
    paddingRight: '8px',
    '&::-webkit-scrollbar': {
      width: '6px'
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '3px'
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#c1c1c1',
      borderRadius: '3px'
    }
  },
  orderCard: {
    background: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      borderColor: '#4a90e2'
    }
  },
  orderName: {
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '4px'
  },
  orderInfo: {
    color: '#6c757d',
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modal: {
    background: '#fff',
    padding: '32px',
    borderRadius: '12px',
    minWidth: '800px',
    maxWidth: '900px',
    width: '90vw',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
  },
  modalHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f0f0f0'
  },
  modalTitle: {
    margin: 0,
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: 600
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    display: 'inline-block'
  },
  orderDetailsModalContainer: {
    background:'#fff',
    padding:0,
    borderRadius:18,
    minWidth:900,
    maxWidth:1100,
    width:'70vw',
    boxShadow:'0 8px 32px rgba(44,62,80,0.10), 0 2px 12px rgba(74,144,226,0.06)',
    position:'relative',
    display:'flex',
    flexDirection:'row',
    alignItems:'stretch',
    maxHeight: '85vh',
    overflow: 'hidden',
  },
  orderDetailsColumnDefault: {
    flex:2,
    padding:'48px 36px 36px 64px',
    borderRight:'2px solid #e0e0e0',
    minWidth:420,
    display:'flex',
    flexDirection:'column',
    justifyContent:'center',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  whatsInsideColumnDefault: {
    flex:1.1,
    background:'#f8f9fa',
    borderRadius:'0 18px 18px 0',
    padding:'48px 32px 36px 32px',
    display:'flex',
    flexDirection:'column',
    alignItems:'flex-start',
    minWidth:300,
    maxWidth:340,
    justifyContent:'center',
    boxShadow:'inset 1px 0 0 #ececec',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  whatsInsideColumnLeft: {
    flex:1.1,
    background:'#f8f9fa',
    borderRadius:'18px 0 0 18px',
    padding:'48px 32px 36px 32px',
    display:'flex',
    flexDirection:'column',
    alignItems:'flex-start',
    minWidth:300,
    maxWidth:340,
    borderRight:'2px solid #e0e0e0',
    justifyContent:'center',
    boxShadow:'inset -1px 0 0 #ececec',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  orderDetailsColumnRight: {
    flex:2,
    padding:'48px 64px 36px 36px',
    minWidth:420,
    display:'flex',
    flexDirection:'column',
    justifyContent:'center',
    overflowY: 'auto',
    boxSizing: 'border-box',
  }
};

// Add at the very top of the file
console.log('OrderDetails.js loaded');

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/png;base64,${user.profile_picture_data}`;
  }
  if (user.profile_picture_path) {
    if (user.profile_picture_path.startsWith("http")) return user.profile_picture_path;
    return `${process.env.REACT_APP_API_URL || ''}${user.profile_picture_path}`;
  }
  return "/placeholder-profile.png";
}

function generateOrderId() {
  // Example: #CO + timestamp + random 3 digits
  const now = Date.now();
  const rand = Math.floor(Math.random() * 900) + 100;
  return `#CO${now}${rand}`;
}

const calculateOrderTotal = (order) => {
  if (order && order.products && order.products.length > 0) {
    return order.products.reduce((sum, product) => {
      const price = parseFloat(product.unit_price) || 0;
      // Use order_quantity from the main order for calculation if available and makes sense for the business logic
      // otherwise, use product.quantity if each product in a box can have different quantities (less likely for gift boxes)
      // For now, assuming each product's listed quantity IS the quantity per box, and order_quantity is the number of boxes.
      // If the goal is total value of ONE box, then product.quantity (as items per box) * unit_price, summed up.
      // If the goal is total value of ALL boxes, then (sum of (product.quantity_in_box * unit_price)) * order.order_quantity.
      // The current request implies total for the order based on products listed.
      // Let's assume product.quantity IS the total quantity for that product line in the order.
      const quantity = parseInt(product.quantity, 10) || 0; 
      return sum + (price * quantity);
    }, 0);
  }
  return 0;
};

const normalizeStatus = (status) => {
  if (typeof status !== 'string') return '';
  // Converts to lowercase, removes all spaces, and removes hyphens
  return status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
};

export default function OrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  // State variables
  const [pendingOrders, setPendingOrders] = useState([]);
  const [toBePackOrders, setToBePackOrders] = useState([]);
  const [readyToDeliverOrders, setReadyToDeliverOrders] = useState([]);
  const [enRouteOrders, setEnRouteOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    order_id: '',
    name: '',
    status: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address_line1: '',
    customer_address_line2: '',
    customer_city: '',
    customer_state: '',
    customer_zip: '',
    customer_country: '',
    total_cost: 0,
    notes: '',
    products: []
  });
  const [inventory, setInventory] = useState([]);
  const [productSelection, setProductSelection] = useState({}); 
  const [profitMargins, setProfitMargins] = useState({}); 
  const [showProductModal, setShowProductModal] = useState(false);
  const [productError, setProductError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [editingProducts, setEditingProducts] = useState(false); 
  const [editingProductsError, setEditingProductsError] = useState('');
  const [showEditProductsModal, setShowEditProductsModal] = useState(false);
  const [updatingProducts, setUpdatingProducts] = useState(false);
  const [archivingOrder, setArchivingOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Effect to generate order ID for new orders
  useEffect(() => {
    if (showModal && !form.order_id && !selectedOrder) { // Ensure it's for a new order
      setForm(prevForm => ({ ...prevForm, order_id: generateOrderId() }));
    }
  }, [showModal, form.order_id, selectedOrder]);

  // Function definitions (stubs)
  const handleAddOrder = () => { 
    console.log('handleAddOrder called'); 
    setForm({ // Reset form for new order
      order_id: generateOrderId(), name: '', status: 'Pending', customer_name: '', customer_email: '',
      customer_phone: '', customer_address_line1: '', customer_address_line2: '', customer_city: '',
      customer_state: '', customer_zip: '', customer_country: '', total_cost: 0, notes: '', products: []
    });
    setSelectedOrder(null); // Clear any selected order when adding new
    setShowModal(true); 
  };
  const handleFormSubmit = (e) => { e.preventDefault(); console.log('handleFormSubmit called', form); setShowModal(false); /* Add API call here */ };
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: type === 'checkbox' ? checked : value }));
    console.log('handleFormChange called', name, value);
  };
  const renderProductTable = () => { 
    console.log('renderProductTable called'); 
    if (!form.products || form.products.length === 0) {
        return <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No products added yet.</td></tr>;
    }
    return form.products.map((product, index) => (
        <tr key={index}>
            <td>{product.name}</td>
            <td>{product.quantity}</td>
            <td>{product.price}</td>
            <td>{product.quantity * product.price}</td>
            <td><button onClick={() => console.log('Remove product stub')}>Remove</button></td>
        </tr>
    ));
  };
  const handleProductSelection = (product, quantity) => { console.log('handleProductSelection called', product, quantity); };
  const handleAddProductToOrder = () => { 
    console.log('handleAddProductToOrder called'); 
    // This is a stub, actual logic would add selected product from inventory to form.products
    // For example: setForm(prev => ({...prev, products: [...prev.products, {name: 'Sample Product', quantity: 1, price: 100}]})); 
    setShowProductModal(false);
  };
  const handleEditOrderSubmit = (e) => { e.preventDefault(); console.log('handleEditOrderSubmit called', form); setShowEditModal(false); /* Add API call here */ };
  const handleUpdateProducts = () => { console.log('handleUpdateProducts called'); setShowEditProductsModal(false); /* Add API call here */ };
  const handleCompleteConfirm = () => { console.log('handleCompleteConfirm called'); setShowCompleteConfirm(false); /* Add API call here */ };
  const handleEditOrder = (orderToEdit) => { 
    console.log('handleEditOrder called', orderToEdit); 
    setForm(orderToEdit); // Populate form with selected order data
    setSelectedOrder(orderToEdit);
    setShowEditModal(true);
  };
  const handleCancelPendingOrder = async () => {
    if (!selectedOrder || !selectedOrder.order_id) {
      console.error('No order selected or order_id is missing.');
      alert('No order selected or order ID is missing.');
      return;
    }

    const normalizedStatus = normalizeStatus(selectedOrder.status);
    if (normalizedStatus !== 'pending' && normalizedStatus !== 'tobepack') {
      alert('Only orders with status "Pending" or "To Be Pack" can be cancelled.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to cancel order ${selectedOrder.order_id}? All products will go back to the inventory.`
    );

    if (confirmDelete) {
      try {
        const encodedOrderId = encodeURIComponent(selectedOrder.order_id);
        console.log(`Attempting to delete order: /api/orders/${encodedOrderId}`); 
        await api.delete(`/api/orders/${encodedOrderId}`);
        alert(`Order ${selectedOrder.order_id} cancelled successfully. Products have been restocked.`);
        fetchOrders(); // Refresh the orders list
        setSelectedOrderId(null); // Close the modal
        // If a different state controls modal visibility, adjust this line e.g. setShowOrderDetailsModal(false)
      } catch (error) {
        console.error('Error cancelling order:', error.response ? error.response.data : error.message);
        alert(`Failed to cancel order. ${error.response && error.response.data && error.response.data.message ? error.response.data.message : 'Please try again.'}`);
      }
    }
  };
  
  const fetchCustomerDetails = useCallback(async (email) => {
    if (!email) {
      setCustomerDetails(null);
      return;
    }
    console.log(`Fetching customer details for ${email}...`);
    try {
      const response = await api.get(`/api/customers/email/${encodeURIComponent(email)}`);
      setCustomerDetails(response.data);
      console.log('Customer details fetched:', response.data);
    } catch (error) {
      console.error(`Error fetching customer details for ${email}:`, error);
      setCustomerDetails(null); // Clear details on error
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    console.log('Attempting to fetch orders...');
    setLoading(true);
    try {
      console.log('Calling api.get("/api/orders")');
      const response = await api.get('/api/orders'); 
      console.log('API response received:', response);
      
      const allOrders = response.data;
      console.log('Orders data from response.data:', allOrders);

      // Log details for the specific order we're tracking
      const updatedOrderId = '#CO1749485124796'; // The ID from the user's log
      const specificOrder = allOrders.find(o => o.order_id === updatedOrderId);
      if (specificOrder) {
        console.log(`[TrackOrder] Found order ${updatedOrderId}:`, specificOrder);
        console.log(`[TrackOrder] Status: '${specificOrder.status}', Normalized: '${normalizeStatus(specificOrder.status)}'`);
      } else {
        console.log(`[TrackOrder] Order ${updatedOrderId} not found in fetched data.`);
      }

      if (!Array.isArray(allOrders)) {
        console.error('Error: response.data is not an array!', allOrders);
        setPendingOrders([]);
        setToBePackOrders([]);
        setReadyToDeliverOrders([]);
        setEnRouteOrders([]);
        setCompletedOrders([]);
        // Potentially set an error state to display to the user
      } else {
        console.log('Processing orders into categories...');
        setPendingOrders(allOrders.filter(o => normalizeStatus(o.status) === 'pending'));
        setToBePackOrders(allOrders.filter(o => normalizeStatus(o.status) === 'tobepack'));
        setReadyToDeliverOrders(allOrders.filter(o => normalizeStatus(o.status) === 'readytodeliver' || normalizeStatus(o.status) === 'confirmed'));
        setEnRouteOrders(allOrders.filter(o => normalizeStatus(o.status) === 'enroute'));
        setCompletedOrders(allOrders.filter(o => normalizeStatus(o.status) === 'completed'));
        console.log('Orders processed and state updated.');
      }
      // console.warn("fetchOrders is a stub. Implement actual API call and data processing."); // Removed as it's no longer a full stub
    } catch (error) {
      console.error("Error fetching or processing orders:", error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      // Clear orders on error to prevent displaying stale or incorrect data
      setPendingOrders([]);
      setToBePackOrders([]);
      setReadyToDeliverOrders([]);
      setEnRouteOrders([]);
      setCompletedOrders([]);
    } finally {
      setLoading(false);
      console.log('Finished fetchOrders attempt.');
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const fetchInventory = async () => {
      console.log('fetchInventory called - STUB');
      try {
        // const response = await api.get('/inventory'); // Replace with actual API call
        // setInventory(response.data);
        setInventory([]); // STUB: Remove this line
        console.warn("Inventory fetch is a stub. Implement actual API call.");
      } catch (error) {
        console.error("Error fetching inventory (stub):", error);
      }
    };
    fetchInventory();
  }, [fetchOrders]);

  useEffect(() => {
    if (selectedOrder && selectedOrder.email_address) {
      fetchCustomerDetails(selectedOrder.email_address);
    } else {
      setCustomerDetails(null); // Clear if no selected order or no email
    }
  }, [selectedOrder, fetchCustomerDetails]);

  useEffect(() => {
    if (selectedOrderId) {
      const allOrders = [...pendingOrders, ...toBePackOrders, ...readyToDeliverOrders, ...enRouteOrders, ...completedOrders];
      const order = allOrders.find(o => o.order_id === selectedOrderId);
      setSelectedOrder(order || null);
      if (order) {
        // When an order is selected for viewing, populate the form if an edit modal might use it
        // Or, ensure 'form' state is distinctly for 'add' or 'edit' operations
        // For now, we won't auto-populate 'form' here to keep 'add order' clean
      } else {
        // If order not found (e.g. after deletion/status change), clear selectedOrder
        // setSelectedOrder(null); // This might be too aggressive, depends on desired UX
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, pendingOrders, toBePackOrders, readyToDeliverOrders, enRouteOrders, completedOrders]);

  const isToBePacked = selectedOrder && normalizeStatus(selectedOrder.status) === normalizeStatus('To Be Packed');


  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        
        {/* Action Bar */}
        <div style={styles.actionBar}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{...styles.button, ...styles.primaryButton}} 
              onClick={handleAddOrder}
            >
              Add Order
            </button>
            <button 
              style={{...styles.button, ...styles.secondaryButton}} 
              onClick={() => setShowMoreModal(true)}
            >
              More
            </button>
          </div>
        </div>

        {/* Main Order Columns */}
        <div style={styles.columnsContainer}>
          {/* Pending Orders Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>Pending Orders</h3>
              <span style={styles.orderCount}>{pendingOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {pendingOrders.map(order => (
                <div 
                  key={order.order_id} 
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>
                      ₱{
                        (order.total_cost && Number(order.total_cost) > 0)
                          ? Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : calculateOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* To Be Pack Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>To Be Pack</h3>
              <span style={styles.orderCount}>{toBePackOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {toBePackOrders.map(order => (
                <div 
                  key={order.order_id} 
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>
                      ₱{
                        (order.total_cost && Number(order.total_cost) > 0)
                          ? Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : calculateOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready to Deliver Column */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h3 style={styles.columnTitle}>Ready for Deliver</h3>
              <span style={styles.orderCount}>{readyToDeliverOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {readyToDeliverOrders.map(order => (
                <div 
                  key={order.order_id} 
                  style={styles.orderCard}
                  onClick={() => setSelectedOrderId(order.order_id)}
                >
                  <div style={styles.orderName}>{order.name}</div>
                  <div style={styles.orderInfo}>
                    <span>{order.order_id}</span>
                    <span>
                      ₱{
                        (order.total_cost && Number(order.total_cost) > 0)
                          ? Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : calculateOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* More Modal */}
        {showMoreModal && (
          <div className="modal-backdrop" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Additional Order Statuses</h2>
              </div>
              
              {/* En Route Orders */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: '18px' }}>En Route Orders</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {enRouteOrders.map(order => (
                    <div 
                      key={order.order_id} 
                      style={styles.orderCard}
                      onClick={() => {
                        setSelectedOrderId(order.order_id);
                        setShowMoreModal(false);
                      }}
                    >
                      <div style={styles.orderName}>{order.name}</div>
                      <div style={styles.orderInfo}>
                        <span>{order.order_id}</span>
                        <span>
                      ₱{
                        (order.total_cost && Number(order.total_cost) > 0)
                          ? Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : calculateOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Orders */}
              <div>
                <h3 style={{ marginBottom: '16px', color: '#2c3e50', fontSize: '18px' }}>Completed Orders</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {completedOrders.map(order => (
                    <div 
                      key={order.order_id} 
                      style={styles.orderCard}
                      onClick={() => {
                        setSelectedOrderId(order.order_id);
                        setShowMoreModal(false);
                      }}
                    >
                      <div style={styles.orderName}>{order.name}</div>
                      <div style={styles.orderInfo}>
                        <span>{order.order_id}</span>
                        <span>
                      ₱{
                        (order.total_cost && Number(order.total_cost) > 0)
                          ? Number(order.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : calculateOrderTotal(order).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                    </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  onClick={() => setShowMoreModal(false)} 
                  style={{...styles.button, ...styles.primaryButton}}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Add Order */}
        {showModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{background:'#fff',padding:32,borderRadius:12,minWidth:1100,maxWidth:'95vw',width:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 style={{marginBottom:20}}>Add Order</h2>
              <form onSubmit={handleFormSubmit} style={{display:'flex',flexDirection:'row',gap:40,alignItems:'flex-start'}}>
                {/* Left: Order Details */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>
                      Order ID
                      <input 
                        name="order_id" 
                        value={form.order_id} 
                        readOnly 
                        className="modal-input" 
                        style={{backgroundColor: '#f8f9fa'}}
                      />
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Name<input name="name" value={form.name} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Status
                      <select name="status" value={form.status} onChange={handleFormChange} required className="modal-input">
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="To be pack">To be pack</option>
                        <option value="Ready to ship">Ready to ship</option>
                        <option value="En Route">En Route</option>
                        <option value="Completed">Completed</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Package Name
                      <select name="package_name" value={form.package_name} onChange={handleFormChange} required className="modal-input">
                        <option value="">Select package</option>
                        <option value="Carlo">Carlo</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Order Date<input name="order_date" type="date" value={form.order_date} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Expected Delivery<input name="expected_delivery" type="date" value={form.expected_delivery} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Shipped To (Receiver name) <input name="shipped_to" value={form.shipped_to} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Shipping Address<input name="shipping_address" value={form.shipping_address} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Telephone<input name="telephone" value={form.telephone} onChange={handleFormChange} className="modal-input" placeholder="(optional)" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Cellphone<input name="cellphone" value={form.cellphone} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Email Address<input name="email_address" value={form.email_address} onChange={handleFormChange} required className="modal-input" /></label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Total Cost
                      <input 
                        name="total_cost" 
                        type="number" 
                        step="0.01" 
                        value={form.total_cost} 
                        readOnly 
                        className="modal-input" 
                        style={{backgroundColor:'#f5f5f5'}}
                      />
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Payment Type
                      <select name="payment_type" value={form.payment_type} onChange={handleFormChange} className="modal-input" required>
                        <option value="">Select payment type</option>
                        <option value="50% paid">50% paid</option>
                        <option value="70% paid">70% paid</option>
                        <option value="100% Paid">100% Paid</option>
                      </select>
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Payment Method
                      <select name="payment_method" value={form.payment_method} onChange={handleFormChange} className="modal-input" required>
                        <option value="">Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Online Banking">Online Banking</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6}}>Account Name<input name="account_name" value={form.account_name} onChange={handleFormChange} className="modal-input" /></label>
                    {/* Remarks - span both columns */}
                    <label style={{fontWeight:500,display:'flex',flexDirection:'column',gap:6,gridColumn:'1 / span 2'}}>Remarks<input name="remarks" value={form.remarks} onChange={handleFormChange} className="modal-input" /></label>
                  </div>
                  {/* Form buttons */}
                  <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:24}}>
                    <button type="button" onClick={()=>setShowModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',background:'#fff',cursor:'pointer'}}>Cancel</button>
                    <button type="submit" style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}}>Save</button>
                  </div>
                </div>
                {/* Right: Products Section */}
                <div style={{flex:1.2,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:12,letterSpacing:1}}>PRODUCTS</div>
                  <div style={{maxHeight:400,overflowY:'auto',marginBottom:18,border:'1px solid #eee',borderRadius:8,padding:16}}>
                    {renderProductTable()}
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
                              onChange={e => handleProductSelection(item.sku, e.target.value)} 
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
          <div className={`modal-backdrop${showCompleteConfirm ? ' order-details-modal-dim' : ''}`} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{
              background:'#fff',
              borderRadius:16,
              maxWidth:1400,
              width:'99vw',
              minWidth:320,
              boxShadow:'0 8px 32px rgba(44,62,80,0.13)',
              display:'flex',
              flexDirection:'column',
              position:'relative',
              maxHeight:'95vh',
              overflow:'auto',
              padding:0
            }}>
              <div className="modal-header" style={{
                display:'flex',
                alignItems:'center',
                justifyContent:'space-between',
                padding:'28px 36px 18px 36px',
                borderBottom:'1.5px solid #ececec',
                background:'#fff',
                position:'sticky',
                top:0,
                zIndex:2
              }}>
                <h2 className="modal-title" style={{fontSize:28,fontWeight:700,margin:0,fontFamily:'Cormorant Garamond,serif',color:'#2c3e50'}}>Edit Order</h2>
                <button className="modal-close" type="button" onClick={() => setShowEditModal(false)} style={{fontSize:28,color:'#aaa',background:'none',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'color 0.2s, background 0.2s'}}>&times;</button>
              </div>
              <form onSubmit={handleEditOrderSubmit} style={{
                display:'flex',
                flexDirection:'row',
                gap:0,
                alignItems:'stretch',
                height:'100%',
                minHeight:400,
                overflow:'visible',
                background:'#fff'
              }}>
                {/* Left: Order Details */}
                <div style={{
                  flex:1.2,
                  minWidth:320,
                  padding:'32px 32px 32px 36px',
                  overflowY:'auto',
                  maxHeight:'calc(95vh - 80px)'
                }}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
                    <label>Order ID<input name="order_id" value={form.order_id} onChange={handleFormChange} required className="modal-input" disabled /></label>
                    <label>Name<input name="name" value={form.name} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Status
                      <select name="status" value={form.status} onChange={handleFormChange} required className="modal-input">
                        <option value="">Select status</option>
                        <option value="Pending">Pending</option>
                        <option value="To be pack">To be pack</option>
                        <option value="Ready to ship">Ready to ship</option>
                        <option value="En Route">En Route</option>
                        <option value="Completed">Completed</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </label>
                    <label>Package Name
                      <select name="package_name" value={form.package_name} onChange={handleFormChange} required className="modal-input">
                        <option value="">Select package</option>
                        <option value="Carlo">Carlo</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </label>
                    <label>Order Date<input name="order_date" type="date" value={form.order_date} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Expected Delivery<input name="expected_delivery" type="date" value={form.expected_delivery} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Shipped To (Receiver name) <input name="shipped_to" value={form.shipped_to} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Shipping Address<input name="shipping_address" value={form.shipping_address} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Telephone<input name="telephone" value={form.telephone} onChange={handleFormChange} className="modal-input" placeholder="(optional)" /></label>
                    <label>Cellphone<input name="cellphone" value={form.cellphone} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Email Address<input name="email_address" value={form.email_address} onChange={handleFormChange} required className="modal-input" /></label>
                    <label>Total Cost
                      <input 
                        name="total_cost" 
                        type="number" 
                        step="0.01" 
                        value={form.total_cost} 
                        readOnly 
                        className="modal-input" 
                        style={{backgroundColor:'#f5f5f5'}}
                      />
                    </label>
                    <label>Payment Type
                      <select name="payment_type" value={form.payment_type} onChange={handleFormChange} className="modal-input" required>
                        <option value="">Select payment type</option>
                        <option value="50% paid">50% paid</option>
                        <option value="70% paid">70% paid</option>
                        <option value="100% Paid">100% Paid</option>
                      </select>
                    </label>
                    <label>Payment Method
                      <select name="payment_method" value={form.payment_method} onChange={handleFormChange} className="modal-input" required>
                        <option value="">Select payment method</option>
                        <option value="Cash">Cash</option>
                        <option value="Online Banking">Online Banking</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </label>
                    <label>Account Name<input name="account_name" value={form.account_name} onChange={handleFormChange} className="modal-input" /></label>
                    {/* Remarks - span both columns */}
                    <label style={{gridColumn:'1 / span 2'}}>Remarks<input name="remarks" value={form.remarks} onChange={handleFormChange} className="modal-input" /></label>
                  </div>
                  {/* Footer Buttons */}
                  <div className="modal-footer" style={{width:'100%',marginTop:32,display:'flex',justifyContent:'flex-end',gap:12}}>
                    <button type="button" className="btn btn-secondary" onClick={()=>setShowEditModal(false)} style={{minWidth:100}}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{minWidth:100}}>Save</button>
                  </div>
                </div>
                {/* Divider */}
                <div style={{width:1,background:'#ececec',margin:'32px 0',borderRadius:1}}></div>
                {/* Right: Products Section */}
                <div style={{
                  flex:2,
                  minWidth:700,
                  maxWidth:900,
                  background:'#f8f9fa',
                  padding:'32px 32px 32px 32px',
                  display:'flex',
                  flexDirection:'column',
                  alignItems:'flex-start',
                  overflowY:'auto',
                  maxHeight:'calc(95vh - 80px)'
                }}>
                  <div style={{fontWeight:700,fontSize:18,marginBottom:16,letterSpacing:1,fontFamily:'Cormorant Garamond,serif',color:'#2c3e50'}}>PRODUCTS</div>
                  <div style={{marginBottom:18,border:'1px solid #eee',borderRadius:8,padding:0,width:'100%',background:'#fff',maxHeight:500,overflowY:'auto',overflowX:'hidden'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'auto'}}>
                      <thead style={{position:'sticky',top:0,zIndex:1,background:'#f8f8f8'}}>
                        <tr>
                          <th style={{textAlign:'left',padding:'8px',width:'80px'}}>Image</th>
                          <th style={{textAlign:'left',padding:'8px',width:'200px'}}>Name</th>
                          <th style={{textAlign:'right',padding:'8px',width:'120px'}}>Unit Price</th>
                          <th style={{textAlign:'right',padding:'8px',width:'100px'}}>Available</th>
                          <th style={{textAlign:'right',padding:'8px',width:'140px'}}>Profit Margin %</th>
                          <th style={{textAlign:'right',padding:'8px',width:'140px'}}>Est. Profit</th>
                          <th style={{textAlign:'right',padding:'8px',width:'120px'}}>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          (form.package_name === 'Carlo' 
                            ? inventory.filter(item => defaultProductNames.some(name => 
                                item.name.toLowerCase().includes(name.toLowerCase()) ||
                                name.toLowerCase().includes(item.name.toLowerCase())
                              ))
                            : inventory
                          ).map((item, idx) => {
                            const quantity = Number(productSelection[item.sku] || 0);
                            const margin = Number(profitMargins[item.sku] || 0);
                            const unitPrice = Number(item.unit_price || 0);
                            const estimatedProfit = (unitPrice * quantity * (margin / 100)).toFixed(2);
                            return (
                              <tr key={item.sku} style={{background: idx % 2 === 0 ? '#fafbfc' : '#fff', transition:'background 0.2s'}}>
                                <td style={{padding:'8px'}}>{item.image_data ? <img src={`data:image/jpeg;base64,${item.image_data}`} alt={item.name} style={{width:40,height:40,borderRadius:6,objectFit:'cover'}} /> : <div style={{width:40,height:40,background:'#eee',borderRadius:6}} />}</td>
                                <td style={{padding:'8px',fontWeight:600}}>{item.name}</td>
                                <td style={{padding:'8px',textAlign:'right'}}>₱{unitPrice.toFixed(2)}</td>
                                <td style={{padding:'8px',textAlign:'right'}}>{item.quantity}</td>
                                <td style={{padding:'8px',textAlign:'right'}}>
                                  <input 
                                    type="number" 
                                    min={0} 
                                    max={100}
                                    value={profitMargins[item.sku] || ''} 
                                    onChange={e => setProfitMargins(pm => ({...pm, [item.sku]: e.target.value}))} 
                                    style={{width:60,padding:'4px',borderRadius:4,border:'1px solid #ccc',textAlign:'right'}} 
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
                                    onChange={e => handleProductSelection(item.sku, e.target.value)} 
                                    style={{width:60,padding:'4px',borderRadius:4,border:'1px solid #ccc',textAlign:'right'}} 
                                  />
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                  <div style={{fontWeight:500,marginBottom:18}}>
                    Total Estimated Profit: ₱{
                      inventory.reduce((total, item) => {
                        const quantity = Number(productSelection[item.sku] || 0);
                        const margin = Number(profitMargins[item.sku] || 0);
                        const unitPrice = Number(item.unit_price || 0);
                        return total + (unitPrice * quantity * (margin / 100));
                      }, 0).toFixed(2)
                    }
                  </div>
                  {productError && <div className="error-message">{productError}</div>}
                </div>
              </form>
              <style>{`
                @media (max-width: 1100px) {
                  .modal { max-width: 99vw !important; width: 99vw !important; }
                  form { flex-direction: column !important; }
                  .modal-header { padding: 18px 12px 12px 12px !important; }
                  .modal-footer { flex-direction: column !important; gap: 8px !important; }
                  .modal > form > div { min-width: 0 !important; max-width: 100vw !important; }
                }
                .modal tbody tr:hover { background: #f0f4ff !important; }
              `}</style>
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

        {/* Order Details Modal for selectedOrder */}
        {selectedOrder && (() => {
          const isToBePacked = normalizeStatus(selectedOrder.status) === normalizeStatus('tobepack');

          const OrderDetailsSectionJSX = (
            <>
              <h2 style={{marginBottom:32,fontFamily:'Cormorant Garamond,serif',fontWeight:700,fontSize:36,color:'#2c3e50'}}>Order Details</h2>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Name:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.name || '-'}</span></div>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Email Address:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.email_address || '-'}</span></div>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Contact Number:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.cellphone || '-'}</span></div>
              <div style={{marginBottom:18, fontSize:18}}>
                <span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Total Number of Boxes:</span> 
                <span style={{fontWeight:400, marginLeft:6}}>{
                  (selectedOrder.order_quantity && selectedOrder.order_quantity > 0)
                    ? selectedOrder.order_quantity
                    : (selectedOrder.products && selectedOrder.products.length > 0 && selectedOrder.products[0].quantity > 0)
                      ? selectedOrder.products[0].quantity
                      : '-'
                }</span>
              </div>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Date of Event:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.expected_delivery ? (new Date(selectedOrder.expected_delivery).toLocaleDateString('en-US')) : '-'}</span></div>
              <div style={{marginBottom:18, fontSize:18}}>
                <span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Shipping Location:</span> 
                <span style={{fontWeight:400, marginLeft:6}}>{customerDetails && customerDetails.address ? customerDetails.address : 'Unknown Address'}</span>
              </div>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Status:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.status ? selectedOrder.status.toUpperCase() : '-'}</span></div>
              <div style={{marginBottom:18, fontSize:18}}>
                <span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Order ID:</span> 
                <span>{selectedOrder && selectedOrder.order_id ? selectedOrder.order_id : '-'}</span>
              </div>
              <div style={{marginBottom:18, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Date Ordered:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.order_date ? (new Date(selectedOrder.order_date).toLocaleDateString('en-US')) : '-'}</span></div>
              <div style={{marginBottom:32, fontSize:18}}><span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Package Name:</span> <span style={{fontWeight:400, marginLeft:6}}>{selectedOrder.package_name || '-'}</span></div>
              {/* Action Buttons */}
              <div style={{display:'flex',gap:18,marginTop:8, justifyContent:'center', alignItems:'center'}}>
                <button 
                  className="edit-btn"
                  style={{ ...styles.button, ...styles.primaryButton, marginRight: 16 }}
                  onClick={handleEditOrder}
                >
                  Edit Order
                </button>
                <button 
                  className="delete-btn"
                  style={{ ...styles.button, border: '1.5px solid #dc3545', color: '#dc3545', background: '#fff', marginRight: 16 }}
                  onClick={handleCancelPendingOrder}
                >
                  Cancel Order
                </button>
                {(normalizeStatus(selectedOrder.status) === normalizeStatus('pending') || normalizeStatus(selectedOrder.status) === normalizeStatus('tobepack')) && (
                <button
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: '#2ecc71', // Common green color for now
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease, transform 0.1s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.02em'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#27ae60'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2ecc71'}
                  onClick={async () => {
                    if (!selectedOrder) {
                      console.error("Action Error: selectedOrder is missing.", selectedOrder);
                      alert("Error: Order details are not available.");
                      return;
                    }

                    console.log('[OrderAction] Raw selectedOrder.order_id:', selectedOrder.order_id, 'Type:', typeof selectedOrder.order_id);
                    const orderIdToUse = selectedOrder.order_id ? String(selectedOrder.order_id).trim() : '';

                    if (!orderIdToUse) {
                      console.error("Action Error: Processed order_id is empty. Original selectedOrder:", selectedOrder);
                      alert("Error: Order ID is invalid or missing.");
                      return;
                    }

                    const currentStatus = normalizeStatus(selectedOrder.status);
                    let newStatus = '';
                    let confirmMessage = '';
                    let payload = { products: selectedOrder.products }; // Default payload with products

                    if (currentStatus === normalizeStatus('tobepack')) {
                      newStatus = 'Ready for Deliver';
                      confirmMessage = 'This order will be marked as Ready for Delivery. Proceed?';
                      payload.status = newStatus;
                    } else if (currentStatus === 'pending') {
                      newStatus = 'To Be Pack';
                      confirmMessage = 'Are you sure you want to confirm this order? This will finalize the details and prepare it for processing.';
                      // For pending, send all relevant fields from selectedOrder that can be updated.
                      // Avoid sending the entire selectedOrder if it contains UI-specific state not meant for the backend.
                      payload = {
                        ...payload, // a base payload that might include other common fields if necessary
                        account_name: selectedOrder.account_name,
                        name: selectedOrder.name,
                        order_date: selectedOrder.order_date,
                        expected_delivery: selectedOrder.expected_delivery,
                        status: newStatus,
                        package_name: selectedOrder.package_name,
                        payment_method: selectedOrder.payment_method,
                        payment_type: selectedOrder.payment_type,
                        shipped_to: selectedOrder.shipped_to,
                        shipping_address: selectedOrder.shipping_address,
                        remarks: selectedOrder.remarks,
                        telephone: selectedOrder.telephone,
                        cellphone: selectedOrder.cellphone,
                        email_address: selectedOrder.email_address,
                        order_quantity: selectedOrder.order_quantity,
                        // total_cost will be recalculated by backend, so no need to send it from here
                      };
                    } else {
                      alert('No action defined for this order status.');
                      return;
                    }

                    if (window.confirm(confirmMessage)) {
                      setLoading(true);
                      try {
                        const encodedOrderId = encodeURIComponent(orderIdToUse);
                        console.log(`Attempting to update order ${orderIdToUse} (encoded: ${encodedOrderId}) to status ${newStatus} with payload:`, payload);
                        const response = await api.put(
                          `/api/orders/${encodedOrderId}`,
                          payload
                        );
                        if (response.data) {
                          alert(`Order ${selectedOrder.order_id} status updated to ${newStatus}.`);
                          fetchOrders(); // Refresh all orders from the backend
                          setSelectedOrderId(null); // Close modal
                        } else {
                          console.error("Update successful but no data returned", response);
                          alert("Order status updated, but an issue occurred fetching new data. Please refresh.");
                        }
                      } catch (error) {
                        console.error(`Failed to update order status to ${newStatus}:`, error.response || error);
                        alert(`Failed to update order status. ${error.response?.data?.error || error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}>
                  {normalizeStatus(selectedOrder.status) === normalizeStatus('tobepack') ? 'Confirm Delivery' : 'Confirm Order'}
                </button>
              )}
            </div>
          </>
          );

          const WhatsInsideSectionJSX = (
            <>
              <h3 style={{fontSize:22,fontFamily:'Cormorant Garamond,serif',color:'#2c3e50',marginBottom:24,fontWeight:700,letterSpacing:'0.04em',borderBottom:'1.5px solid #ece9e6',paddingBottom:8,width:'100%'}}>What's Inside</h3>
              {selectedOrder.products && selectedOrder.products.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 'calc(100% - 70px)', overflowY: 'auto' }}>
                  {selectedOrder.products.map((product, idx) => {
                    const inventoryItem = inventory.find(item => item.name.toLowerCase() === product.name.toLowerCase());
                    return (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
                        {inventoryItem && inventoryItem.image_data ? (
                          <img 
                            src={`data:image/jpeg;base64,${inventoryItem.image_data}`} 
                            alt={product.name} 
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: '#eee', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} 
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, background: '#e0e0e0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 28, fontWeight: 700 }}>
                            ?
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'Lora,serif', color: '#333', marginBottom:2 }}>
                            {product.name}
                          </div>
                          <div style={{ fontSize: 14, color: '#888', fontWeight: 500, letterSpacing:1 }}>
                            QTY: <span style={{fontWeight:600}}>{selectedOrder.order_quantity || product.quantity}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{color:'#666',fontSize:15, textAlign: 'center', width: '100%', marginTop: '20px'}}>No products added to this order yet.</div>
              )}
            </>
          );

          return (
            <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={styles.orderDetailsModalContainer}>
                <button onClick={()=>setSelectedOrderId(null)} className="order-modal-close" style={{position:'absolute',top:24,right:32,fontSize:28,color:'#222',background:'none',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2}}>&times;</button>
                {isToBePacked ? (
                  <>
                    <div style={styles.whatsInsideColumnLeft}>
                      {WhatsInsideSectionJSX}
                    </div>
                    <div style={styles.orderDetailsColumnRight}>
                      {OrderDetailsSectionJSX}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.orderDetailsColumnDefault}>
                      {OrderDetailsSectionJSX}
                    </div>
                    <div style={styles.whatsInsideColumnDefault}>
                      {WhatsInsideSectionJSX}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        )()}
      </div>
    </div>
  );
}