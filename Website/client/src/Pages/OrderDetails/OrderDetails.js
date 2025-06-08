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
  }
};

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

export default function OrderDetails() {




  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [form, setForm] = useState({
    order_id: '', name: '', shipped_to: '', order_date: '', expected_delivery: '', status: '',
    shipping_address: '', total_cost: '0.00', payment_type: '', payment_method: '', account_name: '', remarks: '',
    telephone: '', cellphone: '', email_address: '', package_name: '', carlo_products: [], 
    order_quantity: 0,
    approximate_budget: 0.00,
    // Add new fields for wedding and custom orders
    order_type: 'regular', // 'regular', 'wedding', or 'custom'
    wedding_details: {
      wedding_style: '',
      wedding_date: '',
      guest_count: 0,
      color_scheme: '',
      special_requests: ''
    },
    custom_details: {
      box_style: '',
      box_size: '',
      box_color: '',
      contents: [],
      accessories: [],
      personalization_details: {},
      quantity: 1
    }
  });
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
  const [showProductModal, setShowProductModal] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [carloProducts, setCarloProducts] = useState([]);
  const [orderProducts, setOrderProducts] = useState([]);
  const [productSelection, setProductSelection] = useState({}); // { sku: quantity }
  const [profitMargins, setProfitMargins] = useState({}); // { sku: margin }
  const [placingOrder, setPlacingOrder] = useState(false);
  const [productError, setProductError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [archivingOrder, setArchivingOrder] = useState(false);
  const [showEditProductsModal, setShowEditProductsModal] = useState(false);
  const [order, setOrder] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [error, setError] = useState(null);
  const [isOrderFulfillable, setIsOrderFulfillable] = useState(false);

  // Delete order: confirm and delete
  const handleDeleteOrder = async () => {
    console.log('selectedOrder:', selectedOrder);
    if (!selectedOrder || !selectedOrder.order_id) {
      alert('Order ID is missing. Cannot delete order.');
      return;
    }
    try {
      // Use customerToken if present, otherwise fallback to token
      const token = localStorage.getItem('customerToken') || localStorage.getItem('token');
      const response = await api.delete(`/api/orders/${selectedOrder.order_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.success) {
        setShowCompleteConfirm(false);
        setSelectedOrderId(null); // Close the order details modal
        fetchOrders();
      } else {
        alert('Failed to delete order: ' + response.data.message);
      }
    } catch (err) {
      console.error('Delete order error:', err);
      alert('Failed to delete order: ' + (err.response?.data?.message || err.message));
    }
  };

  // Mark as Completed/Cancelled and Archive
  const handleMarkCompleted = async () => {
    if (!selectedOrder) return;
    setShowCompleteConfirm(true);
    setSelectedOrderId(null); // Close the order details modal
  };

  
  const [editingProducts, setEditingProducts] = useState({}); // { sku: quantity }
  const [editingProductsError, setEditingProductsError] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState(false);
  const [productDetailsByName, setProductDetailsByName] = useState({}); // { name: { image_data, name } }
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [orderStockIssues, setOrderStockIssues] = useState({}); // { order_id: [product names] }

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:3001/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const orders = response.data;
      console.log('Fetched orders:', orders);

      // For each wedding order, fetch additional details
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        if (order.order_type === 'wedding') {
          try {
            const weddingResponse = await axios.get(`http://localhost:3001/api/wedding-orders/${order.order_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            return {
              ...order,
              wedding_details: weddingResponse.data
            };
          } catch (error) {
            console.error('Error fetching wedding details:', error);
            return order;
          }
        }
        return order;
      }));

      setOrders(ordersWithDetails);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders');
    }
  };

  const fetchOrderProducts = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://localhost:3001/api/orders/${orderId}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('No data received from server');
      }

      setOrderProducts(response.data);
      console.log('Order products fetched successfully:', response.data);
    } catch (error) {
      console.error('Error fetching order products:', error);
      setOrderProducts([]); // Reset products on error
      setError(error.message || 'Failed to fetch order products');
    }
  };

  // Initialize orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch order products when an order is selected
  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderProducts(selectedOrderId);
    }
  }, [selectedOrderId]);

  // Handle Carlo products when an order is selected
  useEffect(() => {
    if (selectedOrderId) {
      const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
      if (selectedOrder && selectedOrder.package_name === "Carlo") {
        axios.get('http://localhost:3001/api/inventory')
          .then(res => {
            const inventoryItems = res.data;
            const matchedProducts = defaultProductNames.map(name => {
              const matchingItem = inventoryItems.find(item => 
                item.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(item.name.toLowerCase())
              );
              
              return matchingItem ? {
                name: matchingItem.name,
                image_data: matchingItem.image_data,
                quantity: selectedOrder.order_quantity,
                sku: matchingItem.sku
              } : {
                name: name,
                quantity: selectedOrder.order_quantity
              };
            });
            setCarloProducts(matchedProducts);
          })
          .catch(err => {
            console.error('Failed to fetch inventory:', err);
            setCarloProducts(defaultProductNames.map(name => ({
              name: name,
              quantity: selectedOrder.order_quantity
            })));
          });
      } else {
        setCarloProducts([]);
      }
    }
  }, [selectedOrderId, orders]);

useEffect(() => {
    console.log("Checking structure of orderProducts after API fetch:", JSON.stringify(orderProducts, null, 2));
}, [orderProducts]);


  // Fetch stock issues for all orders after fetching orders
  useEffect(() => {
    async function fetchStockIssues() {
      if (!orders.length) return;
      const issues = {};
      for (const order of orders) {
        // Try to get stock_issue_products from backend (if available)
        // For demo, assume backend returns this in the order object (if not, skip)
        if (order.stock_issue_products && order.stock_issue_products.length > 0) {
          issues[order.order_id] = order.stock_issue_products;
        }
      }
      setOrderStockIssues(issues);
    }
    fetchStockIssues();
  }, [orders]);




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
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3001/api/orders/${selectedOrderId}/products`, 
        { products },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
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
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setInventory(res.data);
      setShowProductModal(true);
    } catch (err) {
      alert('Failed to fetch inventory');
    }
  };

  const handleAddOrder = async () => {
    setForm({
      order_id: generateOrderId(),
      name: '', 
      shipped_to: '', 
      order_date: '', 
      expected_delivery: '', 
      status: '',
      shipping_address: '', 
      total_cost: '0.00', 
      payment_type: '', 
      payment_method: '', 
      account_name: '', 
      remarks: '',
      telephone: '', 
      cellphone: '', 
      email_address: ''
    });
    setProductSelection({});
    setProfitMargins({});
    setProductError("");
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3001/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setInventory(res.data);
      setShowModal(true);
    } catch (err) {
      alert('Failed to fetch inventory');
    }
  };

  const calculateTotalCost = (selection) => {
    return inventory.reduce((total, item) => {
      const quantity = Number(selection[item.sku] || 0);
      const unitPrice = Number(item.unit_price || 0);
      return total + (unitPrice * quantity);
    }, 0).toFixed(2);
  };

  const handleProductSelection = (sku, value) => {
    // Find the inventory item to ensure we're using the correct SKU
    const inventoryItem = inventory.find(item => item.sku === sku);
    if (!inventoryItem) {
      console.error(`No inventory item found for SKU: ${sku}`);
      return;
    }

    const newSelection = { ...productSelection, [inventoryItem.sku]: value };
    setProductSelection(newSelection);
    setForm(prev => ({ ...prev, total_cost: calculateTotalCost(newSelection) }));
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to complete this action');
        return;
      }

      const orderData = {
        ...form,
        products: Object.entries(productSelection).map(([sku, quantity]) => ({
          sku,
          quantity,
          profit_margin: profitMargins[sku] || 0
        }))
      };

      // Add order type specific data
      if (form.order_type === 'wedding') {
        orderData.wedding_details = form.wedding_details;
      } else if (form.order_type === 'custom') {
        orderData.custom_details = form.custom_details;
      }

      const response = await axios.post('http://localhost:3001/api/orders', orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        // If the order is not in Pending status, adjust inventory
        if (form.status !== 'Pending') {
          for (const product of orderData.products) {
            await axios.post('http://localhost:3001/api/inventory/adjust', {
              sku: product.sku,
              quantity: product.quantity,
              operation: 'subtract'
            }, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          }
        }
      }
      
      if (response.data.success) {
        // Only archive if the order is being marked as completed or cancelled for the first time
        if ((form.status === 'Completed' || form.status === 'Cancelled') && 
            selectedOrder?.status !== 'Completed' && 
            selectedOrder?.status !== 'Cancelled') {
          try {
            // Add a small delay to ensure the update is processed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Archive the order
            await axios.post(
              `http://localhost:3001/api/orders/${encodeURIComponent(form.order_id)}/archive`,
              {},
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (archiveErr) {
            console.error('Error archiving order:', archiveErr);
            alert('Order status was updated but failed to archive: ' + (archiveErr.response?.data?.message || archiveErr.message));
          }
        }
        setShowEditModal(false);
        fetchOrders();
      } else {
        throw new Error(response.data.message || 'Failed to update order');
      }
    } catch (err) {
      console.error('Update order error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        if (err.response.status === 401) {
          alert('Your session has expired. Please log in again.');
          // Clear the invalid token
          localStorage.removeItem('token');
          // Optionally redirect to login page
          window.location.href = '/login';
        } else {
          alert('Failed to update order: ' + (err.response.data.message || err.message));
        }
      } else {
        alert('Failed to update order: ' + err.message);
      }
    }
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

      // First check if we have enough stock for all products
      const insufficientStock = [];
      for (const product of orderProducts) {
        const inventoryItem = inventory.find(i => i.sku === product.sku);
        if (inventoryItem && inventoryItem.quantity < product.quantity) {
          insufficientStock.push(product.name);
        }
      }

      if (insufficientStock.length > 0) {
        setOrderStockIssues(prev => ({
          ...prev,
          [selectedOrder.order_id]: insufficientStock
        }));
        throw new Error(`Not enough stock for: ${insufficientStock.join(', ')}`);
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

      // Deduct quantities from inventory
      for (const product of orderProducts) {
        await api.put(`/api/inventory/${product.sku}/adjust`, {
          quantity: product.quantity,
          operation: 'subtract'
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      // Then archive the order
      setArchivingOrder(true);
      try {
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
      } catch (archiveErr) {
        console.error('Error archiving order:', archiveErr);
        alert('Failed to archive order: ' + (archiveErr.response?.data?.message || archiveErr.message));
      }
    } catch (err) {
      console.error('Error completing order:', err);
      alert('Failed to complete order: ' + (err.response?.data?.message || err.message));
    } finally {
      setArchivingOrder(false);
    }
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
      const token = localStorage.getItem('token');
      const products = Object.entries(editingProducts)
        .filter(([sku, qty]) => Number(qty) > 0)
        .map(([sku, quantity]) => ({ sku, quantity: Number(quantity) }));
      
      await axios.put(`http://localhost:3001/api/orders/${selectedOrderId}/products`, 
        { products },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
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
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/orders/${selectedOrderId}/products/${sku}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      fetchOrderProducts(selectedOrderId);
    } catch (err) {
      alert('Failed to remove product');
    }
  };

  // Helper function to normalize status strings
  const normalizeStatus = (status) => (status ? status.trim().toLowerCase() : '');

  // Filter orders by status with proper mapping
  const pendingOrders = orders.filter(order => normalizeStatus(order.status) === 'pending');
  const toBePackOrders = orders.filter(order => {
    const normalizedStatus = normalizeStatus(order.status);
    return normalizedStatus === 'to be pack' || 
           (normalizedStatus !== 'pending' && 
            !['ready to ship', 'en route', 'completed'].includes(normalizedStatus));
  });
  const readyToDeliverOrders = orders.filter(order => normalizeStatus(order.status) === 'ready to ship');
  const enRouteOrders = orders.filter(order => normalizeStatus(order.status) === 'en route');
  const completedOrders = orders.filter(order => normalizeStatus(order.status) === 'completed');

  // Update the product selection in the edit modal table
  const renderProductTable = () => {
    // Filter products based on package name
    const filteredInventory = form.package_name === 'Carlo' 
      ? inventory.filter(item => defaultProductNames.some(name => 
          item.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(item.name.toLowerCase())
        ))
      : inventory;

    return (
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead style={{position:'sticky',top:0,background:'#f8f8f8',zIndex:1}}>
          <tr>
            <th style={{textAlign:'left',padding:'8px'}}>Image</th>
            <th style={{textAlign:'left',padding:'8px'}}>Name</th>
            <th style={{textAlign:'right',padding:'8px'}}>Unit Price</th>
            <th style={{textAlign:'right',padding:'8px'}}>Available</th>
            <th style={{textAlign:'right',padding:'8px'}}>Profit Margin %</th>
            <th style={{textAlign:'right',padding:'8px'}}>Est. Profit</th>
            <th style={{textAlign:'right',padding:'8px'}}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {filteredInventory.map(item => {
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
    );
  };

  const renderOrderDetails = () => {
    if (!selectedOrder) return null;

    // Determine overall fulfillability based on the state variable
    const fulfillableStatus = isOrderFulfillable ? 'text-green' : 'text-red';

    return (
      <div className="order-details">
        <div className="order-info">
          <div className="info-section">
            <h3>Order Information</h3>
            <p><strong>Order ID:</strong> {selectedOrder.order_id}</p>
            <p><strong>Order Date:</strong> {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
            <p><strong>Order Type:</strong> {selectedOrder.order_type ? selectedOrder.order_type.charAt(0).toUpperCase() + selectedOrder.order_type.slice(1) : 'Regular'}</p>
            <p><strong>Total Amount:</strong> ${selectedOrder.total_cost}</p>
            <p><strong>Status:</strong> {selectedOrder.status}</p>
            <p><strong>Contact Number:</strong> {selectedOrder.cellphone || 'N/A'}</p>
            <p><strong>Order Quantity (Gift Boxes):</strong> {selectedOrder.order_quantity !== undefined ? selectedOrder.order_quantity : 'N/A'}</p>
            <p><strong>Expected Delivery Date:</strong> {selectedOrder.expected_delivery_date ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString() : 'Not specified'}</p>
            <p><strong>Package Name:</strong> {selectedOrder.package_name}</p>
            <p><strong>Payment Type:</strong> {selectedOrder.payment_type}</p>
            <p><strong>Payment Method:</strong> {selectedOrder.payment_method}</p>
            <p><strong>Account Name:</strong> {selectedOrder.account_name}</p>
            <p><strong>Shipped To:</strong> {selectedOrder.shipped_to}</p>
            <p><strong>Shipping Address:</strong> {selectedOrder.shipping_address}</p>
            <p><strong>Telephone:</strong> {selectedOrder.telephone}</p>
            <p><strong>Email:</strong> {selectedOrder.email_address}</p>
            {selectedOrder.remarks && <p><strong>Remarks:</strong> {selectedOrder.remarks}</p>}
          </div>

          {/* Products Section */}
          {selectedOrder.products && selectedOrder.products.length > 0 && (
            <div className="info-section products-section">
              <h3>Products</h3>
              <div className="products-list">
                {selectedOrder.products.map((product, index) => {
                  // Find the corresponding inventory item
                  const inventoryItem = inventory.find(item => item.sku === product.sku);
                  const availableQuantity = inventoryItem ? Number(inventoryItem.quantity || 0) : 0;
                  const requiredQuantity = Number(product.quantity || 0);
                  const isInStock = availableQuantity >= requiredQuantity;

                  return (
                    <div key={product.sku || index} className="product-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                      {product.image_data && (
                        <img 
                          src={`data:image/jpeg;base64,${product.image_data}`} 
                          alt={product.name} 
                          style={{ width: '70px', height: '70px', marginRight: '20px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                        />
                      )}
                      <div className="product-details">
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#333' }}>{product.name}</p>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>SKU: {product.sku}</p>
                        <p style={{ margin: '0', fontSize: '0.9em', color: isInStock ? '#555' : 'red' }}>
                          Quantity: {requiredQuantity}
                          {!isInStock && (
                            <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '5px' }}>(NOT ENOUGH STOCK)</span>
                          )}
                        </p>
                        {product.unit_price && <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: '#555' }}>Price: ${parseFloat(product.unit_price).toFixed(2)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedOrder.order_type === 'wedding' && selectedOrder.wedding_details && (
            <div className="info-section">
              <h3>Wedding Details</h3>
              <p><strong>Wedding Style:</strong> {selectedOrder.wedding_details.wedding_style}</p>
              <p><strong>Wedding Date:</strong> {new Date(selectedOrder.wedding_details.wedding_date).toLocaleDateString()}</p>
              <p><strong>Guest Count:</strong> {selectedOrder.wedding_details.guest_count}</p>
              {selectedOrder.wedding_details.color_scheme && (
                <p><strong>Color Scheme:</strong> {selectedOrder.wedding_details.color_scheme}</p>
              )}
              {selectedOrder.wedding_details.special_requests && (
                <p><strong>Special Requests:</strong> {selectedOrder.wedding_details.special_requests}</p>
              )}
            </div>
          )}

          {selectedOrder.products && selectedOrder.products.length > 0 && (
            <div className="info-section">
              <h3>Products</h3>
              <div className="order-items">
                {selectedOrder.products.map((product, index) => (
                  <div key={index} className="order-item">
                    {product.image_data && (
                      <img src={`data:image/jpeg;base64,${product.image_data}`} alt={product.name} />
                    )}
                    <div className="item-details">
                      <h4>{product.name}</h4>
                      <p><strong>SKU:</strong> {product.sku}</p>
                      <p><strong>Quantity:</strong> {product.quantity}</p>
                      {product.profit_margin && (
                        <p><strong>Profit Margin:</strong> {product.profit_margin}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleEditOrder = () => {
    if (!selectedOrder) return;
    setForm({
      ...selectedOrder,
      order_date: selectedOrder.order_date ? new Date(selectedOrder.order_date).toISOString().split('T')[0] : '',
      expected_delivery: selectedOrder.expected_delivery ? new Date(selectedOrder.expected_delivery).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleEditOrderSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to complete this action');
        return;
      }

      const orderData = {
        ...form,
        products: Object.entries(productSelection).map(([sku, quantity]) => ({
          sku,
          quantity,
          profit_margin: profitMargins[sku] || 0
        }))
      };

      // Add order type specific data
      if (form.order_type === 'wedding') {
        orderData.wedding_details = form.wedding_details;
      } else if (form.order_type === 'custom') {
        orderData.custom_details = form.custom_details;
      }

      const response = await axios.put(`http://localhost:3001/api/orders/${form.order_id}`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // Only archive if the order is being marked as completed or cancelled for the first time
        if ((form.status === 'Completed' || form.status === 'Cancelled') && 
            selectedOrder?.status !== 'Completed' && 
            selectedOrder?.status !== 'Cancelled') {
          try {
            // Add a small delay to ensure the update is processed
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Archive the order
            await axios.post(
              `http://localhost:3001/api/orders/${encodeURIComponent(form.order_id)}/archive`,
              {},
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (archiveErr) {
            console.error('Error archiving order:', archiveErr);
            alert('Order status was updated but failed to archive: ' + (archiveErr.response?.data?.message || archiveErr.message));
          }
        }
        setShowEditModal(false);
        fetchOrders();
      } else {
        throw new Error(response.data.message || 'Failed to update order');
      }
    } catch (err) {
      console.error('Update order error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        if (err.response.status === 401) {
          alert('Your session has expired. Please log in again.');
          // Clear the invalid token
          localStorage.removeItem('token');
          // Optionally redirect to login page
          window.location.href = '/login';
        } else {
          alert('Failed to update order: ' + (err.response.data.message || err.message));
        }
      } else {
        alert('Failed to update order: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if order is fulfillable based on inventory
  useEffect(() => {
    if (!selectedOrder || !inventory || inventory.length === 0) {
      setIsOrderFulfillable(false);
      return;
    }

    let fulfillable = true;
    for (const orderProduct of selectedOrder.products) {
      const inventoryItem = inventory.find(item => item.sku === orderProduct.sku);
      if (!inventoryItem || Number(inventoryItem.quantity || 0) < Number(orderProduct.quantity || 0)) {
        fulfillable = false;
        break;
      }
    }
    setIsOrderFulfillable(fulfillable);

  }, [selectedOrder, inventory]);

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
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
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
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
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
                    <span>₱{Number(order.total_cost).toLocaleString()}</span>
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
                        <span>₱{Number(order.total_cost).toLocaleString()}</span>
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
                        <span>₱{Number(order.total_cost).toLocaleString()}</span>
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
                  {productError && <div style={{color:'red',marginBottom:8}}>{productError}</div>}
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
        {selectedOrder && (
          <div className="modal-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#0008',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div className="modal order-details-modal-two-col" style={{background:'#fff',padding:0,borderRadius:18,minWidth:600,maxWidth:900,width:'98vw',boxShadow:'0 8px 32px rgba(44,62,80,0.10), 0 2px 12px rgba(74,144,226,0.06)',position:'relative',display:'flex',gap:0}}>
              <button onClick={()=>setSelectedOrderId(null)} className="order-modal-close" style={{position:'absolute',top:18,right:24,fontSize:26,color:'#aaa',background:'none',border:'none',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'color 0.2s, background 0.2s',zIndex:2}}>&times;</button>
              <div className="order-details-modal-content" style={{display:'flex',flexDirection:'row',width:'100%'}}>
                <div className="order-details-modal-info-col" style={{flex:1.2,padding:'40px 36px 40px 48px'}}>
                  <h2 style={{marginBottom:24,fontFamily:'Cormorant Garamond,serif',fontWeight:700,fontSize:32,color:'#2c3e50'}}>Order Details</h2>
                  {orderStockIssues[selectedOrder.order_id] && orderStockIssues[selectedOrder.order_id].length > 0 && (
                    <div style={{color:'#b94a48',background:'#fff3cd',border:'1px solid #ffeeba',borderRadius:6,padding:'8px 12px',marginBottom:18,fontSize:15}}>
                      ⚠️ Not enough stock for: {orderStockIssues[selectedOrder.order_id].join(', ')}
                    </div>
                  )}
                  <div style={{marginBottom:12}}><b>Name:</b> {selectedOrder.name}</div>
                  <div style={{marginBottom:12}}><b>Email Address:</b> {selectedOrder.email_address || '-'}</div>
                  <div style={{marginBottom:12}}><b>Contact Number:</b> {selectedOrder.cellphone || '-'}</div>
                  <div style={{marginBottom:12}}><b>Order Quantity:</b> {selectedOrder.order_quantity || selectedOrder.products?.reduce((total, p) => total + p.quantity, 0) || '-'}</div>
                  <div style={{marginBottom:12}}><b>Date of Event:</b> {selectedOrder.expected_delivery || '-'}</div>
                  <div style={{marginBottom:12}}><b>Shipping Location:</b> {selectedOrder.shipping_address || '-'}</div>
                  <div style={{marginBottom:12}}><b>Status:</b> {selectedOrder.status}</div>
                  <div style={{marginBottom:12}}><b>Order ID:</b> {selectedOrder.order_id}</div>
                  <div style={{marginBottom:12}}><b>Date Ordered:</b> {selectedOrder.order_date}</div>
                  <div style={{marginBottom:12}}><b>Package Name:</b> {selectedOrder.package_name || '-'}</div>
                  
                  {/* Action Buttons */}
                  <div style={{display:'flex',gap:10,marginTop:24}}>
                    <button 
                      onClick={handleEditOrder}
                      style={{
                        padding:'7px 18px',
                        borderRadius:6,
                        border:'none',
                        background:'#6c63ff',
                        color:'#fff',
                        fontWeight:600,
                        cursor:'pointer',
                        display:'flex',
                        alignItems:'center',
                        gap:6
                      }}
                    >
                      <FaEdit /> Edit Order
                    </button>
                    <button 
                      disabled={!selectedOrder || !selectedOrder.order_id}
                      onClick={() => {
                        if (!selectedOrder || !selectedOrder.order_id) {
                          alert('No order selected or order ID missing.');
                          return;
                        }
                        if (window.confirm('Are you sure you want to delete this order?')) {
                          handleDeleteOrder();
                        }
                      }}
                      style={{
                        padding:'7px 18px',
                        borderRadius:6,
                        border:'1px solid #e74c3c',
                        background:'#fff',
                        color:'#e74c3c',
                        fontWeight:600,
                        cursor:'pointer',
                        display:'flex',
                        alignItems:'center',
                        gap:6
                      }}
                    >
                      <FaTrash /> Delete
                    </button>
                    {selectedOrder.status !== 'Completed' && (
                      <button 
                        onClick={handleMarkCompleted}
                        style={{
                          padding:'7px 18px',
                          borderRadius:6,
                          border:'none',
                          background:'#27ae60',
                          color:'#fff',
                          fontWeight:600,
                          cursor:'pointer',
                          display:'flex',
                          alignItems:'center',
                          gap:6
                        }}
                      >
                        <FaCheckCircle /> Complete
                      </button>
                    )}
                  </div>
                </div>

                <div className="order-details-modal-products-col" style={{flex:1,background:'#f8f9fa',borderLeft:'1.5px solid #ececec',borderRadius:'0 18px 18px 0',padding:'40px 32px 40px 32px',display:'flex',flexDirection:'column',alignItems:'flex-start',minWidth:220,maxWidth:340}}>
                  <h3 style={{fontSize:22,fontFamily:'Cormorant Garamond,serif',color:'#2c3e50',marginBottom:14,fontWeight:700,letterSpacing:'0.04em',borderBottom:'1.5px solid #ece9e6',paddingBottom:6,width:'100%'}}>What's Inside</h3>
                  {loadingProductDetails ? (
                    <div style={{color:'#888',fontSize:16}}>Loading products...</div>
                  ) : selectedOrder.package_name === "Carlo" && carloProducts.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                      {carloProducts.map((product, idx) => {
                        const inInventory = inventory.some(
                          item =>
                            (product.sku && item.sku === product.sku) ||
                            item.name.toLowerCase() === product.name.toLowerCase()
                        );
                        return (
                          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                            {product.image_data ? (
                              <img 
                                src={`data:image/jpeg;base64,${product.image_data}`} 
                                alt={product.name} 
                                style={{ 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: 8, 
                                  objectFit: 'cover', 
                                  background: '#eee', 
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)' 
                                }} 
                              />
                            ) : (
                              <div style={{ 
                                width: 48, 
                                height: 48, 
                                background: '#eee', 
                                borderRadius: 8, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#bbb', 
                                fontSize: 22 
                              }}>
                                ?
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'Lora,serif', color: '#333' }}>
                                {product.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: inInventory ? '#888' : '#e53935',
                                  fontWeight: inInventory ? 400 : 700,
                                  background: inInventory ? 'none' : '#fff0f0',
                                  borderRadius: inInventory ? 0 : 4,
                                  padding: inInventory ? 0 : '2px 8px',
                                  display: 'inline-block'
                                }}
                              >
                                Qty: {product.quantity}
                                {!inInventory && (
                                  <span style={{ marginLeft: 6, fontWeight: 600 }}>(Not in inventory)</span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : selectedOrder.products && selectedOrder.products.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
                      {selectedOrder.products.map((p, idx) => {
                        const inInventory = inventory.some(
                          item =>
                            (p.sku && item.sku === p.sku) ||
                            item.name.toLowerCase() === p.name.toLowerCase()
                        );
                        return (
                          <li key={p.sku || idx} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                            {p.image_data ? (
                              <img 
                                src={`data:image/jpeg;base64,${p.image_data}`} 
                                alt={p.name} 
                                style={{ 
                                  width: 48, 
                                  height: 48, 
                                  borderRadius: 8, 
                                  objectFit: 'cover', 
                                  background: '#eee', 
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)' 
                                }} 
                              />
                            ) : (
                              <div style={{ 
                                width: 48, 
                                height: 48, 
                                background: '#eee', 
                                borderRadius: 8, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: '#bbb', 
                                fontSize: 22 
                              }}>
                                ?
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 16, fontFamily: 'Lora,serif', color: '#333' }}>
                                {p.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  color: inInventory ? '#888' : '#e53935',
                                  fontWeight: inInventory ? 400 : 700,
                                  background: inInventory ? 'none' : '#fff0f0',
                                  borderRadius: inInventory ? 0 : 4,
                                  padding: inInventory ? 0 : '2px 8px',
                                  display: 'inline-block'
                                }}
                              >
                                Qty: {p.quantity}
                                {!inInventory && (
                                  <span style={{ marginLeft: 6, fontWeight: 600 }}>(Not in inventory)</span>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div style={{color:'#666',fontSize:15}}>No products added to this order yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 