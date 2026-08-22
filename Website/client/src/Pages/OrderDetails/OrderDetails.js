/* eslint-disable no-undef */
import React, { useEffect, useState, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import "./OrderDetails.css";
import axios from "axios";
import { FaEdit, FaTrash, FaCheckCircle } from 'react-icons/fa';
import { defaultProductNames } from '../CustomerPOV/CarloPreview.js';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import PortalModal from '../../Components/Modal/PortalModal';
import OrderInvoiceSection from '../Invoices/OrderInvoiceSection';
import AddOrderModal from './AddOrderModal';

// Add these styles at the top of the file
const styles = {
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
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
    height: 'calc(100vh - 180px)'
  },
  column: {
    flex: 1,
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
    paddingBottom: '12px'
  },
  columnTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600
  },
  orderCount: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
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
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  orderName: {
    fontWeight: 600,
    marginBottom: '4px'
  },
  orderInfo: {
    fontSize: '13px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modal: {
    padding: '32px',
    borderRadius: '12px',
    minWidth: '800px',
    maxWidth: '900px',
    width: '90vw',
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)'
  },
  modalHeader: {
    marginBottom: '24px',
    paddingBottom: '16px'
  },
  modalTitle: {
    margin: 0,
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
    padding:0,
    borderRadius:20,
    minWidth:1040,
    maxWidth:1320,
    width:'86vw',
    boxShadow:'0 24px 64px rgba(15,23,42,0.28), 0 4px 16px rgba(15,23,42,0.10)',
    position:'relative',
    display:'flex',
    flexDirection:'row',
    alignItems:'stretch',
    maxHeight: '92vh',
    height: '92vh',
    overflow: 'hidden',
  },
  orderDetailsColumnDefault: {
    flex:2,
    padding:'40px 44px 40px 56px',
    minWidth:460,
    display:'flex',
    flexDirection:'column',
    justifyContent:'flex-start',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  whatsInsideColumnDefault: {
    flex:1.1,
    borderRadius:'0 20px 20px 0',
    padding:'40px 36px 40px 36px',
    display:'flex',
    flexDirection:'column',
    alignItems:'flex-start',
    minWidth:340,
    maxWidth:400,
    justifyContent:'flex-start',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  whatsInsideColumnLeft: {
    flex:1.1,
    borderRadius:'20px 0 0 20px',
    padding:'40px 36px 40px 36px',
    display:'flex',
    flexDirection:'column',
    alignItems:'flex-start',
    minWidth:340,
    maxWidth:400,
    justifyContent:'flex-start',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  orderDetailsColumnRight: {
    flex:2,
    padding:'40px 56px 40px 44px',
    minWidth:460,
    display:'flex',
    flexDirection:'column',
    justifyContent:'flex-start',
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
      // If the goal is total value of ALL boxes, then (sum of (product.quantity_in_box * unit_price)) * order.order_quantity
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

// Heuristically detect MIME type from base64 and construct a proper data URL
function buildDataUrlFromBase64(possibleBase64) {
  if (!possibleBase64) return null;
  // If it's already a data URL, return as-is
  if (typeof possibleBase64 === 'string' && possibleBase64.startsWith('data:')) {
    return possibleBase64;
  }
  const base64 = String(possibleBase64);
  // Common magic headers (base64) for quick detection
  // JPEG: /9j/ , PNG: iVBORw0KGgo , GIF: R0lGOD , WebP: UklGR
  let mime = 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) mime = 'image/png';
  else if (base64.startsWith('/9j/')) mime = 'image/jpeg';
  else if (base64.startsWith('R0lGOD')) mime = 'image/gif';
  else if (base64.startsWith('UklGR')) mime = 'image/webp';
  return `data:${mime};base64,${base64}`;
}

export default function OrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  // State variables
  const [selectedOrderInvoices, setSelectedOrderInvoices] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [toBePackOrders, setToBePackOrders] = useState([]);
  const [readyToDeliverOrders, setReadyToDeliverOrders] = useState([]);
  const [enRouteOrders, setEnRouteOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  // Removed "More" modal for now per request
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
  const [orderChallenge, setOrderChallenge] = useState(null);
  const [orderChallengeInput, setOrderChallengeInput] = useState('');
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
    setSelectedOrder(null); // Clear any selected order when adding new
    setShowModal(true); // AddOrderModal owns/resets its own form state on open
  };
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prevForm => ({ ...prevForm, [name]: type === 'checkbox' ? checked : value }));
    console.log('handleFormChange called', name, value);
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
  
  const handlePaymentMethodChange = async (newPaymentMethod) => {
    if (!selectedOrder || !selectedOrder.order_id) {
      console.error('No order selected or order_id is missing.');
      console.error('selectedOrder:', selectedOrder);
      return;
    }

    // Ensure order_id is properly formatted
    const orderId = selectedOrder.order_id;
    if (!orderId || orderId === '') {
      console.error('Order ID is empty or invalid:', orderId);
      toast.error('Invalid order ID. Please refresh and try again.');
      return;
    }

    console.log('Updating payment method for order:', orderId);
    console.log('New payment method:', newPaymentMethod);
    console.log('Current selected order:', selectedOrder);

    try {
      setLoading(true);
      const url = `/api/order-management/orders/${encodeURIComponent(orderId)}/status`;
      console.log('API URL:', url);
      console.log('API Base URL:', api.defaults.baseURL);
      console.log('Full URL:', `${api.defaults.baseURL}${url}`);
      
      const payload = {
        status: selectedOrder.status, // Keep current status
        payment_method: newPaymentMethod,
        notes: `Payment method updated to ${newPaymentMethod}`
      };
      console.log('Request payload:', payload);
      
      const response = await api.put(url, payload);
      console.log('API Response:', response.data);

      if (response.data.success) {
        console.log('Payment method update successful, updating local state...');
        
        // Update the selected order with new payment method immediately
        setSelectedOrder(prev => {
          const updated = {
            ...prev,
            payment_method: newPaymentMethod
          };
          console.log('Updated selected order:', updated);
          return updated;
        });
        
        // Refresh the orders list
        console.log('Refreshing orders list...');
        await fetchOrders();
        
        // The local state update above should be sufficient
        // The fetchOrders() call will refresh the orders list with updated data
        console.log('Payment method update completed successfully');
        
        toast.success('Payment method updated successfully');
      } else {
        console.error('API returned success: false', response.data);
        toast.error(`Failed to update payment method: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast.error('Failed to update payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (orderToEdit) => { 
    console.log('handleEditOrder called', orderToEdit); 
    setForm(orderToEdit); // Populate form with selected order data
    setSelectedOrder(orderToEdit);
    setShowEditModal(true);
  };
  const handleCancelPendingOrder = async () => {
    if (!selectedOrder || !selectedOrder.order_id) {
      console.error('No order selected or order_id is missing.');
      toast.error('No order selected or order ID is missing.');
      return;
    }

    const normalizedStatus = normalizeStatus(selectedOrder.status);
    if (normalizedStatus !== 'pending' && normalizedStatus !== 'orderplaced' && normalizedStatus !== 'tobepacked') {
      toast.error('Only orders with status "Pending" or "To Be Packed" can be cancelled.');
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
        toast.success(`Order ${selectedOrder.order_id} cancelled successfully. Products have been restocked.`);
        fetchOrders(); // Refresh the orders list
        setSelectedOrderId(null); // Close the modal
        // If a different state controls modal visibility, adjust this line e.g. setShowOrderDetailsModal(false)
      } catch (error) {
        console.error('Error cancelling order:', error.response ? error.response.data : error.message);
        toast.error(`Failed to cancel order. ${error.response && error.response.data && error.response.data.message ? error.response.data.message : 'Please try again.'}`);
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
        setPendingOrders(allOrders.filter(o => ['pending', 'orderplaced'].includes(normalizeStatus(o.status))));
        setToBePackOrders(allOrders.filter(o => normalizeStatus(o.status) === 'tobepacked'));
        setReadyToDeliverOrders(allOrders.filter(o => normalizeStatus(o.status) === 'readyfordelivery' || normalizeStatus(o.status) === 'confirmed'));
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
      try {
        const response = await api.get('/api/inventory');
        const payload = response?.data;
        const items = Array.isArray(payload) ? payload : (payload?.inventory || []);
        setInventory(items || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
        setInventory([]);
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
    setSelectedOrderInvoices([]);
  }, [selectedOrderId]);

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

  const openOrderChallenge = (config) => {
    setOrderChallengeInput('');
    setOrderChallenge(config);
  };

  const closeOrderChallenge = () => {
    setOrderChallenge(null);
    setOrderChallengeInput('');
  };

  const confirmOrderChallenge = async () => {
    if (!orderChallenge) return;
    if (orderChallengeInput.trim().toUpperCase() !== orderChallenge.challengeText) {
      toast.error(`Please type ${orderChallenge.challengeText} to continue.`);
      return;
    }

    try {
      await orderChallenge.onConfirm();
      closeOrderChallenge();
    } catch (error) {
      console.error('Order challenge action failed:', error);
    }
  };


  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        
        {/* Action Bar */}
        <div className="od-action-bar" style={styles.actionBar}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{...styles.button, ...styles.primaryButton}} 
              onClick={handleAddOrder}
            >
              Add Order
            </button>
            {/* More button removed */}
          </div>
        </div>

        {/* Main Order Columns */}
        <div className="od-columns-container" style={styles.columnsContainer}>
          {/* Pending Orders Column */}
          <div className="od-column" style={styles.column}>
            <div className="od-column-header" style={styles.columnHeader}>
              <h3 className="od-column-title" style={styles.columnTitle}>Pending Orders</h3>
              <span className="od-order-count" style={styles.orderCount}>{pendingOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="od-order-card" style={{ ...styles.orderCard, pointerEvents: 'none' }}>
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: '12px' }} />
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '30%', height: '12px' }} />
                    </div>
                  </div>
                ))
              ) : pendingOrders.length === 0 ? (
                <div className="od-empty-column" style={{ textAlign: 'center', padding: '20px', fontSize: '14px' }}>No orders found</div>
              ) : (
                pendingOrders.map(order => (
                  <div 
                    key={order.order_id} 
                    className="od-order-card"
                    style={styles.orderCard}
                    onClick={() => setSelectedOrderId(order.order_id)}
                  >
                    <div className="od-order-name" style={styles.orderName}>{order.name}</div>
                    <div className="od-order-info" style={styles.orderInfo}>
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
                ))
              )}
            </div>
          </div>

          {/* To Be Pack Column */}
          <div className="od-column" style={styles.column}>
            <div className="od-column-header" style={styles.columnHeader}>
              <h3 className="od-column-title" style={styles.columnTitle}>To Be Packed</h3>
              <span className="od-order-count" style={styles.orderCount}>{toBePackOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="od-order-card" style={{ ...styles.orderCard, pointerEvents: 'none' }}>
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: '12px' }} />
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '30%', height: '12px' }} />
                    </div>
                  </div>
                ))
              ) : toBePackOrders.length === 0 ? (
                <div className="od-empty-column" style={{ textAlign: 'center', padding: '20px', fontSize: '14px' }}>No orders found</div>
              ) : (
                toBePackOrders.map(order => (
                  <div 
                    key={order.order_id} 
                    className="od-order-card"
                    style={styles.orderCard}
                    onClick={() => setSelectedOrderId(order.order_id)}
                  >
                    <div className="od-order-name" style={styles.orderName}>{order.name}</div>
                    <div className="od-order-info" style={styles.orderInfo}>
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
                ))
              )}
            </div>
          </div>

          {/* Ready to Deliver Column */}
          <div className="od-column" style={styles.column}>
            <div className="od-column-header" style={styles.columnHeader}>
              <h3 className="od-column-title" style={styles.columnTitle}>Ready for Delivery</h3>
              <span className="od-order-count" style={styles.orderCount}>{readyToDeliverOrders.length}</span>
            </div>
            <div style={styles.orderList}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="od-order-card" style={{ ...styles.orderCard, pointerEvents: 'none' }}>
                    <div className="skeleton-shimmer skeleton-text" style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '40%', height: '12px' }} />
                      <div className="skeleton-shimmer skeleton-text" style={{ width: '30%', height: '12px' }} />
                    </div>
                  </div>
                ))
              ) : readyToDeliverOrders.length === 0 ? (
                <div className="od-empty-column" style={{ textAlign: 'center', padding: '20px', fontSize: '14px' }}>No orders found</div>
              ) : (
                readyToDeliverOrders.map(order => (
                  <div 
                    key={order.order_id} 
                    className="od-order-card"
                    style={styles.orderCard}
                    onClick={() => setSelectedOrderId(order.order_id)}
                  >
                    <div className="od-order-name" style={styles.orderName}>{order.name}</div>
                    <div className="od-order-info" style={styles.orderInfo}>
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* More modal removed */}

        {/* Modal for Add Order */}
        <AddOrderModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          inventory={inventory}
          onCreated={fetchOrders}
        />

        {/* Modal for Add Product to Order */}
        {showProductModal && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{padding:32,borderRadius:12,minWidth:700,maxWidth:900,width:'90vw',boxShadow:'0 4px 32px rgba(0,0,0,0.12)'}}>
              <h2 className="modal-title" style={{marginBottom:20}}>Add Products to Order</h2>
              <div style={{maxHeight:400,overflowY:'auto',marginBottom:18}}>
                <table className="od-product-table" style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr className="od-product-table-head-row">
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
                              className="od-small-input"
                              style={{width:60,padding:'4px'}}
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
                              className="od-small-input"
                              style={{width:60,padding:'4px'}}
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
              {productError && <div className="od-form-error" style={{marginBottom:8}}>{productError}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <button type="button" className="modal-close-btn" onClick={()=>setShowProductModal(false)} style={{padding:'7px 18px',borderRadius:6,border:'1px solid #bbb',cursor:'pointer'}}>Cancel</button>
                <button type="button" onClick={handleAddProductToOrder} style={{padding:'7px 18px',borderRadius:6,border:'none',background:'#6c63ff',color:'#fff',fontWeight:600,cursor:'pointer'}} disabled={placingOrder}>{placingOrder ? 'Placing...' : 'Place Order'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Order Modal */}
        {showEditModal && (
          <div className={`modal-backdrop${showCompleteConfirm ? ' order-details-modal-dim' : ''}`} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal" style={{
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
                position:'sticky',
                top:0,
                zIndex:2
              }}>
                <h2 className="modal-title" style={{fontSize:28,fontWeight:700,margin:0,fontFamily:'Cormorant Garamond,serif'}}>Edit Order</h2>
                <button className="modal-close" type="button" onClick={() => setShowEditModal(false)} style={{fontSize:28,background:'none',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'color 0.2s, background 0.2s'}}>&times;</button>
              </div>
              <form onSubmit={handleEditOrderSubmit} style={{
                display:'flex',
                flexDirection:'row',
                gap:0,
                alignItems:'stretch',
                height:'100%',
                minHeight:400,
                overflow:'visible'
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
                                    className="od-small-input"
                                    style={{width:60,padding:'4px',textAlign:'right'}}
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
                                    className="od-small-input"
                                    style={{width:60,padding:'4px',textAlign:'right'}}
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
                          <input type="number" min={0} max={item.quantity} value={editingProducts[item.sku]||''} onChange={e => setEditingProducts(ps => ({...ps, [item.sku]: e.target.value}))} className="od-small-input" style={{width:60,padding:'4px'}} />
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
          const isToBePacked = normalizeStatus(selectedOrder.status) === normalizeStatus('To Be Packed');
          // Resolve shipping address from several possible sources
          const statusNormalized = normalizeStatus(selectedOrder.status || '');
          const isConfirmed = statusNormalized.includes('confirm') || statusNormalized === 'confirmed';

          const resolvedAddress = (
            (selectedOrder.shipping_address && String(selectedOrder.shipping_address).trim() !== '') ? String(selectedOrder.shipping_address).trim() :
            (customerDetails && customerDetails.address && String(customerDetails.address).trim() !== '') ? String(customerDetails.address).trim() :
            ((selectedOrder.customer_address_line1 && String(selectedOrder.customer_address_line1).trim() !== '') ?
              [selectedOrder.customer_address_line1, selectedOrder.customer_address_line2, selectedOrder.customer_city, selectedOrder.customer_state, selectedOrder.customer_zip, selectedOrder.customer_country]
                .filter(Boolean).join(', ') :
              (selectedOrder.address ? String(selectedOrder.address).trim() : null)
            ) || 'Unknown Address'
          );

          // Reusable label/value field for the professional info-grid layout
          const InfoField = ({ label, value, valueColor, fullWidth }) => (
            <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
                {label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: valueColor || 'var(--text)' }}>
                {value}
              </div>
            </div>
          );

          const statusPillColors = isConfirmed
            ? { background: 'var(--brand-soft)', color: 'var(--success)' }
            : { background: 'var(--surface-muted)', color: 'var(--text-soft)' };

          const OrderDetailsSectionJSX = (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <h2 style={{ margin: 0, fontFamily: 'Cormorant Garamond,serif', fontWeight: 700, fontSize: 34, color: 'var(--text)', lineHeight: 1.1 }}>Order Details</h2>
                  <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                    {selectedOrder && selectedOrder.order_id ? selectedOrder.order_id : '-'}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0,
                  padding: '7px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: statusPillColors.background,
                  color: statusPillColors.color
                }}>
                  {selectedOrder.status ? selectedOrder.status : '-'}
                </span>
              </div>

              <h4 style={{marginBottom:16,fontWeight:700,fontSize:13,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--brand)'}}>Customer Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', marginBottom: 32 }}>
                <InfoField label="Name" value={selectedOrder.name || '-'} />
                <InfoField label="Contact Number" value={selectedOrder.cellphone || '-'} />
                <InfoField label="Email Address" value={selectedOrder.email_address || '-'} fullWidth />
              </div>

              <h4 style={{marginBottom:16,fontWeight:700,fontSize:13,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--brand)'}}>Order Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', marginBottom: 32 }}>
                <InfoField label="Total Number of Boxes" value={selectedOrder.order_quantity ?? selectedOrder.total_boxes ?? '-'} />
                <InfoField label="Date of Event" value={selectedOrder.expected_delivery ? (new Date(selectedOrder.expected_delivery).toLocaleDateString('en-US')) : '-'} />
                <InfoField label="Date Ordered" value={selectedOrder.order_date ? (new Date(selectedOrder.order_date).toLocaleDateString('en-US')) : '-'} />
                <InfoField
                  label="Shipping Location"
                  value={resolvedAddress}
                  valueColor={resolvedAddress === 'Unknown Address' ? 'var(--text-muted)' : 'var(--text)'}
                  fullWidth
                />
              </div>
              {/* Payment Method Section - Only show for Pending orders */}
              {normalizeStatus(selectedOrder.status) === normalizeStatus('pending') && (
                <div style={{marginBottom:32, fontSize:18}}>
                  <span style={{fontWeight:700, textTransform:'uppercase', letterSpacing:1}}>Payment Method:</span>
                  <select
                    value={selectedOrder.payment_method || ''} 
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    disabled={loading}
                    style={{
                      marginLeft: 6,
                      padding: '8px 12px',
                      fontSize: '16px',
                      border: '1px solid var(--input-border)',
                      borderRadius: '4px',
                      backgroundColor: loading ? 'var(--disabled-background)' : 'var(--input-background)',
                      color: 'var(--input-text)',
                      minWidth: '200px',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">Select payment method</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                  {loading && (
                    <span style={{marginLeft: 10, fontSize: '14px', color: 'var(--text-muted)'}}>
                      Updating...
                    </span>
                  )}
                </div>
              )}
              <OrderInvoiceSection order={selectedOrder} onInvoicesChange={setSelectedOrderInvoices} />

              {/* Action Buttons */}
              <div style={{display:'flex',gap:18,marginTop:20,paddingTop:24,borderTop:'1px solid var(--border)', justifyContent:'center', alignItems:'center'}}>
                <button 
                  className="edit-btn"
                  style={{ ...styles.button, ...styles.primaryButton, marginRight: 16 }}
                  onClick={handleEditOrder}
                >
                  Edit Order
                </button>
                <button
                  className="delete-btn"
                  style={{ ...styles.button, border: '1.5px solid var(--danger)', color: 'var(--danger)', background: 'var(--surface)', marginRight: 16 }}
                  onClick={handleCancelPendingOrder}
                >
                  Cancel Order
                </button>
                <button
                  style={{ ...styles.button, border: '1.5px solid var(--brand)', color: 'var(--brand)', background: 'var(--surface)', marginRight: 16 }}
                  onClick={() => navigate(`/delivery-tracking?orderId=${encodeURIComponent(selectedOrder.order_id)}`)}
                >
                  Delivery Tracking
                </button>
                {(() => {
                  const normalizedSelectedStatus = normalizeStatus(selectedOrder.status);
                  const isPendingLike = normalizedSelectedStatus === 'pending' || normalizedSelectedStatus === 'orderplaced';
                  const isToBePackedStatus = normalizedSelectedStatus === normalizeStatus('To Be Packed');
                  if (!isPendingLike && !isToBePackedStatus) return null;

                  const downPaymentInvoice = selectedOrderInvoices.find(
                    (inv) => inv.invoice_type === 'DOWN_PAYMENT' && inv.status !== 'CANCELLED'
                  );
                  const remainingBalanceInvoice = selectedOrderInvoices.find(
                    (inv) => inv.invoice_type === 'REMAINING_BALANCE' && inv.status !== 'CANCELLED'
                  );
                  const invoicesReady = !!downPaymentInvoice && downPaymentInvoice.status === 'PAID'
                    && !!remainingBalanceInvoice && remainingBalanceInvoice.status === 'PAID';
                  const blockedByInvoices = isPendingLike && !invoicesReady;

                  return (
                <button
                  disabled={blockedByInvoices}
                  title={blockedByInvoices ? 'Generate the down payment and remaining balance invoices and mark both as paid before moving this order to To Be Packed.' : undefined}
                  style={{
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontWeight: 700,
                    backgroundColor: blockedByInvoices ? '#a5d6b7' : '#2ecc71',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: blockedByInvoices ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.3s ease, transform 0.1s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    letterSpacing: '0.02em'
                  }}
                  onMouseOver={(e) => { if (!blockedByInvoices) e.currentTarget.style.backgroundColor = '#27ae60'; }}
                  onMouseOut={(e) => { if (!blockedByInvoices) e.currentTarget.style.backgroundColor = '#2ecc71'; }}
                  onClick={async () => {
                    if (blockedByInvoices) {
                      toast.error('Both the down payment and remaining balance invoices must be generated and marked as paid before this order can move to To Be Packed.');
                      return;
                    }
                    if (!selectedOrder) {
                      console.error("Action Error: selectedOrder is missing.", selectedOrder);
                      toast.error("Error: Order details are not available.");
                      return;
                    }

                    console.log('[OrderAction] Raw selectedOrder.order_id:', selectedOrder.order_id, 'Type:', typeof selectedOrder.order_id);
                    const orderIdToUse = selectedOrder.order_id ? String(selectedOrder.order_id).trim() : '';

                    if (!orderIdToUse) {
                      console.error("Action Error: Processed order_id is empty. Original selectedOrder:", selectedOrder);
                      toast.error("Error: Order ID is invalid or missing.");
                      return;
                    }

                    const currentStatus = normalizeStatus(selectedOrder.status);
                    let newStatus = '';
                    let confirmMessage = '';
                    const lightweightProducts = selectedOrder.products.map(p => ({
                        sku: p.sku,
                        quantity: p.quantity,
                        name: p.name,
                        profit_margin: p.profit_margin
                        // Add any other essential, non-image fields if necessary
                      }));
                      let payload = { products: lightweightProducts }; // Use lightweight products

                    if (currentStatus === normalizeStatus('To Be Packed')) {
                      // Delivery tracking info (mode, courier, tracking number/link) is filled
                      // separately on the Delivery Tracking page. Don't let an order move to
                      // Ready for Delivery until that's been done, or the customer sees a
                      // "Ready for Delivery" order with no way to know how it's actually shipping.
                      const isPickupDelivery = selectedOrder.delivery_type === 'PICKUP'
                        || selectedOrder.delivery_method === 'Customer Pick-up';
                      const hasDeliveryMethod = !!selectedOrder.delivery_method;
                      const hasCourierInfo = !!selectedOrder.courier_name
                        && (
                          !!selectedOrder.tracking_number
                          || (selectedOrder.tracking_link_available && !!selectedOrder.tracking_link)
                          || !!selectedOrder.tracking_unavailable_message
                        );
                      const deliveryInfoComplete = hasDeliveryMethod && (isPickupDelivery || hasCourierInfo);

                      if (!deliveryInfoComplete) {
                        toast.error(
                          'Delivery tracking info is not filled out yet for this order. ' +
                          'Go to Delivery Tracking and set the delivery mode' +
                          (isPickupDelivery ? '' : ', courier, and tracking number/link') +
                          ' before confirming.'
                        );
                        return;
                      }

                      newStatus = 'Ready for Delivery';
                      confirmMessage = 'This order will be marked as Ready for Delivery. Proceed?';
                      payload.status = newStatus;
                    } else if (currentStatus === 'pending' || currentStatus === 'orderplaced') {
                      newStatus = 'To Be Packed';
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
                      toast.error('No action defined for this order status.');
                      return;
                    }

                    openOrderChallenge({
                      title: newStatus === 'To Be Packed' ? 'Confirm Order' : 'Confirm Delivery',
                      message: confirmMessage,
                      challengeText: 'CONFIRM',
                      orderId: orderIdToUse,
                      nextStatus: newStatus,
                      onConfirm: async () => {
                        setLoading(true);
                        try {
                          const encodedOrderId = encodeURIComponent(orderIdToUse);
                          console.log(`Attempting to update order ${orderIdToUse} (encoded: ${encodedOrderId}) to status ${newStatus} with payload:`, payload);
                          const response = await api.put(
                            `/api/orders/${encodedOrderId}`,
                            payload
                          );
                          if (response.data) {
                            toast.success(`Order ${selectedOrder.order_id} status updated to ${newStatus}.`);
                            fetchOrders(); // Refresh all orders from the backend
                            setSelectedOrderId(null); // Close modal
                          } else {
                            console.error("Update successful but no data returned", response);
                            toast.error("Order status updated, but an issue occurred fetching new data. Please refresh.");
                          }
                        } catch (error) {
                          console.error(`Failed to update order status to ${newStatus}:`, error.response || error);
                          toast.error(`Failed to update order status. ${error.response?.data?.error || error.message}`);
                        } finally {
                          setLoading(false);
                        }
                      }
                    });
                  }}>
                  {normalizeStatus(selectedOrder.status) === normalizeStatus('To Be Packed') ? 'Confirm Delivery' : 'Confirm Order'}
                </button>
                  );
                })()}
              {(normalizeStatus(selectedOrder.status) === normalizeStatus('Ready for Delivery') || normalizeStatus(selectedOrder.status) === normalizeStatus('ready for deliver') || normalizeStatus(selectedOrder.status) === normalizeStatus('confirmed')) && (
                <button
                  style={{ padding:'12px 24px', fontSize:15, fontWeight:700, background:'#4caf50', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}
                  onClick={async ()=>{
                    try {
                      const encodedOrderId = encodeURIComponent(String(selectedOrder.order_id));
                      const response = await api.put(`/api/orders/${encodedOrderId}`, { status: 'Completed' });
                      toast.success('Order completed and moved to Order History.');
                      fetchOrders();
                      setSelectedOrderId(null);
                    } catch (e) {
                      toast.error('Failed to complete order.');
                    }
                  }}
                >Complete Order</button>
              )}
            </div>
          </>
          );

          const WhatsInsideSectionJSX = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <h3 style={{fontSize:20,fontFamily:'Cormorant Garamond,serif',color:'var(--text)',margin:0,fontWeight:700,letterSpacing:'0.02em'}}>What's Inside</h3>
                {selectedOrder.products && selectedOrder.products.length > 0 && (
                  <span style={{fontSize:12,fontWeight:700,color:'var(--text-muted)',background:'var(--surface-muted)',border:'1px solid var(--border)',borderRadius:999,padding:'3px 10px'}}>
                    {selectedOrder.products.length} item{selectedOrder.products.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {selectedOrder.products && selectedOrder.products.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', maxHeight: 'calc(100% - 70px)', overflowY: 'auto' }}>
                  {selectedOrder.products.map((product, idx) => {
                    const inventoryItem =
                      inventory.find(item => item.sku === product.sku) ||
                      inventory.find(item => (item.name || '').toLowerCase() === (product.name || '').toLowerCase());
                    const imageBase64 = (inventoryItem && inventoryItem.image_data) || product.image_data || null;
                    return (
                      <li
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          marginBottom: 12,
                          padding: '12px',
                          borderRadius: 10,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {imageBase64 ? (
                          <img
                            src={buildDataUrlFromBase64(imageBase64)}
                            alt={product.name}
                            style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: 'var(--surface-muted)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: 48, height: 48, background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>?
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.name}
                          </div>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: 0.5,
                              color: 'var(--brand)',
                              background: 'var(--brand-soft)',
                              borderRadius: 999,
                              padding: '2px 10px'
                            }}
                          >
                            QTY {product.quantity}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{color:'var(--text-muted)',fontSize:15, textAlign: 'center', width: '100%', marginTop: '20px'}}>No products added to this order yet.</div>
              )}
            </>
          );

          return (
            <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div className="od-details-modal" style={styles.orderDetailsModalContainer}>
                <button onClick={()=>setSelectedOrderId(null)} className="od-modal-close" style={{position:'absolute',top:20,right:20,fontSize:22,background:'var(--surface-muted)',border:'1px solid var(--border)',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2,lineHeight:1}}>&times;</button>
                {isToBePacked ? (
                  <>
                    <div className="od-whats-inside od-whats-inside-left" style={styles.whatsInsideColumnLeft}>
                      {WhatsInsideSectionJSX}
                    </div>
                    <div className="od-details-column od-details-column-plain" style={styles.orderDetailsColumnRight}>
                      {OrderDetailsSectionJSX}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="od-details-column" style={styles.orderDetailsColumnDefault}>
                      {OrderDetailsSectionJSX}
                    </div>
                    <div className="od-whats-inside" style={styles.whatsInsideColumnDefault}>
                      {WhatsInsideSectionJSX}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        )()}
        {orderChallenge && (
          <div
            className="modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.56)',
              zIndex: 4000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <div
              style={{
                width: 'min(520px, 96vw)',
                background: 'var(--surface-elevated)',
                borderRadius: 10,
                boxShadow: '0 20px 70px rgba(15,23,42,0.25)',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 24 }}>{orderChallenge.title}</h2>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', lineHeight: 1.45 }}>{orderChallenge.message}</p>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 12, color: 'var(--text-soft)', fontWeight: 700 }}>
                  Type <span style={{ color: 'var(--text)' }}>{orderChallenge.challengeText}</span> to continue.
                </div>
                <input
                  value={orderChallengeInput}
                  onChange={(e) => setOrderChallengeInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid var(--input-border)',
                    borderRadius: 6,
                    padding: '11px 12px',
                    fontSize: 16,
                    background: 'var(--input-background)',
                    color: 'var(--input-text)'
                  }}
                  placeholder={orderChallenge.challengeText}
                />
                <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                  Order ID: {orderChallenge.orderId} | New status: {orderChallenge.nextStatus}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 24px 22px' }}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={closeOrderChallenge}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.button,
                    background: orderChallengeInput.trim().toUpperCase() === orderChallenge.challengeText ? '#1f9d55' : '#94a3b8',
                    color: '#fff'
                  }}
                  onClick={confirmOrderChallenge}
                  disabled={loading || orderChallengeInput.trim().toUpperCase() !== orderChallenge.challengeText}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop />
    </div>
  );
}
