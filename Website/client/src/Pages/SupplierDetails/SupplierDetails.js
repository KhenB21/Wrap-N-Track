/* eslint-disable no-undef */
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../Components/Sidebar/Sidebar";
import TopBar from "../../Components/TopBar";
import api from '../../api';
import "./SupplierDetails.css";
import usePermissions from '../../hooks/usePermissions';

const tabs = ["Overview", "Order History", "Ongoing orders"];

function generateSupplierOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SO${timestamp}${random}`;
}

function getProfilePictureUrl() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return "/placeholder-profile.png";
  if (user.profile_picture_data) {
    return `data:image/jpeg;base64,${user.profile_picture_data}`;
  }
  return "/placeholder-profile.png";
}

export default function SupplierDetails() {
  const { checkPermission } = usePermissions();

  useEffect(() => {
    checkPermission('suppliers');
  }, []);

  const [activeTab, setActiveTab] = useState(0);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set());
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [supplierOrders, setSupplierOrders] = useState({
    ongoing: [],
    completed: []
  });
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [editForm, setEditForm] = useState({
    name: '',
    email_address: '',
    telephone: '',
    cellphone: '',
    description: '',
    province: '',
    city_municipality: '',
    barangay: '',
    street_address: '',
    zip_code: ''
  });
  const [orderForm, setOrderForm] = useState({
    supplier_order_id: '',
    status: 'Waiting',
    products: [],
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
    remarks: ''
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOngoingOrderModal, setShowOngoingOrderModal] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariation, setSelectedVariation] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [showProductInputs, setShowProductInputs] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [productInputs, setProductInputs] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Phone number formatting and validation functions
  const formatPhoneNumber = (value) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format for Philippine phone numbers
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    if (phoneNumber.length <= 10) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return true; // Optional field
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    // Philippine phone numbers: 10-11 digits (landline: 10, mobile: 11)
    return cleanNumber.length >= 10 && cleanNumber.length <= 11;
  };

  const handlePhoneChange = (field, value) => {
    const formatted = formatPhoneNumber(value);
    setEditForm({...editForm, [field]: formatted});
  };

  const fetchSupplierProducts = useCallback(async (supplierId) => {
    if (!selectedSupplier) {
      console.log('No supplier selected');
      return;
    }
    console.log('Fetching products for supplier:', selectedSupplier.name);
    try {
      const response = await api.get(`/api/suppliers/${supplierId}/products`);
      console.log('Fetched products:', response.data);
      setSupplierProducts(response.data);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setError('Failed to fetch supplier products');
    }
  }, [selectedSupplier]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    // Filter suppliers based on search term and category
    let filtered = suppliers;
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cellphone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }
    
    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, selectedCategory]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found in localStorage');
        setError('Not authenticated. Please log in.');
        return;
      }
      
      console.log('Fetching customers with token:', token);
  const response = await api.get('/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('API Response:', response.data);
      console.log('Number of customers received:', response.data.length);
      setSuppliers(response.data);
      setFilteredSuppliers(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching customers:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load customers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierOrders = useCallback(async (supplierId) => {
    if (!selectedSupplier) {
      console.log('No supplier selected');
      return;
    }

    console.log('Fetching orders for supplier:', selectedSupplier.name);
    try {
      // Fetch ongoing orders from supplier_orders table
  const ongoingResponse = await api.get(`/api/supplier-orders/supplier/${selectedSupplier.supplier_id}`);
      console.log('Ongoing orders response:', ongoingResponse.data);

      // Fetch completed orders from supplier_order_history table
  const completedResponse = await api.get(`/api/supplier-orders/history/supplier/${selectedSupplier.supplier_id}`);
      console.log('Completed orders response:', completedResponse.data);

      // Set the orders in state
      setSupplierOrders({
        ongoing: ongoingResponse.data,
        completed: completedResponse.data
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    }
  }, [selectedSupplier]);

  useEffect(() => {
    if (selectedSupplier) {
      console.log('Selected supplier changed, fetching orders for:', selectedSupplier.name);
      fetchSupplierOrders(selectedSupplier.supplier_id);
    }
  }, [selectedSupplier, fetchSupplierOrders]);

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: '',
      email_address: '',
      telephone: '',
      cellphone: '',
      description: '',
      province: '',
      city_municipality: '',
      barangay: '',
      street_address: '',
      zip_code: ''
    });
    setError(null);
  };

  const handleAddOrder = () => {
    if (!selectedSupplier) {
      setError("Please select a supplier first.");
      return;
    }
    setIsAddingOrder(true);
    setOrderForm({
      supplier_order_id: generateSupplierOrderId(),
      status: 'Waiting',
      products: [],
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: '',
      remarks: ''
    });
    setOrderItems([]);
    setProductInputs([]);
    setShowProductInputs(false);
    setSelectedProduct('');
    setSelectedVariation('');
    setSelectedQuantity('');
    fetchSupplierProducts(selectedSupplier.supplier_id);
    setShowOngoingOrderModal(true);
  };

  const handleInputChange = (id, field, value) => {
    // For quantity field, ensure it's a positive number
    if (field === 'quantity') {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 1) {
        value = '';
      } else if (numValue > 9999) {
        value = '9999';
      }
    }

    setProductInputs(productInputs.map(input => 
      input.id === id ? { ...input, [field]: value } : input
    ));
  };

  const handleAddProductInput = () => {
    setProductInputs([...productInputs, { 
      id: Date.now(),
      product: '',
      variation: '',
      quantity: ''
    }]);
  };

  const handleAddProductToOrder = (input) => {
    if (!input.product || !input.variation || !input.quantity) {
      setError("Please fill in all product details");
      return;
    }

    const product = supplierProducts.find(p => p.sku === input.product);
    if (!product) {
      setError("Selected product not found");
      return;
    }

    // Check if product with same variation already exists
    const existingItem = orderItems.find(
      item => item.product_id === input.product && item.variation === input.variation
    );

    if (existingItem) {
      // Update quantity of existing item
      setOrderItems(orderItems.map(item => 
        item.product_id === input.product && item.variation === input.variation
          ? { ...item, quantity: item.quantity + parseInt(input.quantity) }
          : item
      ));
    } else {
      // Add new item
      const newItem = {
        product_id: input.product,
        product_name: product.name,
        variation: input.variation,
        quantity: parseInt(input.quantity)
      };
      setOrderItems([...orderItems, newItem]);
    }
    
    // Remove the input row after adding the product
    setProductInputs(productInputs.filter(p => p.id !== input.id));
  };

  const handleKeyPress = (event, input) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddProductToOrder(input);
    }
  };

  const handleRemoveProduct = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleRemoveProductInput = (id) => {
    setProductInputs(productInputs.filter(p => p.id !== id));
  };

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      setError("Please add at least one product to the order");
      return;
    }

    if (!orderForm.expected_delivery) {
      setError("Please select an expected delivery date");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const orderData = {
        supplier_order_id: orderForm.supplier_order_id,
        supplier_id: selectedSupplier.supplier_id,
        status: orderForm.status,
        order_date: orderForm.order_date,
        expected_delivery: orderForm.expected_delivery,
        remarks: orderForm.remarks,
        items: orderItems
      };

      console.log('Saving order with data:', JSON.stringify(orderData, null, 2));
      console.log('Order items:', JSON.stringify(orderItems, null, 2));

      let response;
      if (isAddingOrder) {
  response = await api.post(`/api/supplier-orders`, orderData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Order creation response:', JSON.stringify(response.data, null, 2));
        
        setSupplierOrders(prev => ({
          ...prev,
          ongoing: [...prev.ongoing, response.data]
        }));
      } else {
  response = await api.put(`/api/supplier-orders/${orderForm.supplier_order_id}`, orderData, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Order update response:', response.data);
        
        if (orderForm.status === 'Received') {
          // Move to order history
          setSupplierOrders(prev => ({
            ongoing: prev.ongoing.filter(o => o.supplier_order_id !== orderForm.supplier_order_id),
            completed: [...prev.completed, response.data]
          }));
        } else {
          // Update in ongoing orders
        setSupplierOrders(prev => ({
          ...prev,
          ongoing: prev.ongoing.map(o => 
            o.supplier_order_id === orderForm.supplier_order_id ? response.data : o
          )
        }));
        }
      }

      setIsAddingOrder(false);
      setIsEditingOrder(false);
      setShowOngoingOrderModal(false);
      setError(null);
      
      // Reset form data
      setOrderForm({
        supplier_order_id: '',
        status: 'Waiting',
        products: [],
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: '',
        remarks: ''
      });
      setOrderItems([]);
      setShowProductInputs(false);
    } catch (error) {
      console.error('Error saving order:', error);
      setError(error.response?.data?.message || 'Failed to save order');
    }
  };

  const handleEditOrder = async (order) => {
    try {
      console.log('Fetching items for order:', order.supplier_order_id);
      // Fetch order items based on whether it's a completed or ongoing order
      const endpoint = activeTab === 1 
        ? `/api/supplier-orders/history/${order.supplier_order_id}/items`
        : `/api/supplier-orders/${order.supplier_order_id}/items`;
      
      const itemsResponse = await api.get(endpoint);
      console.log('Order items response:', itemsResponse.data);
      const items = itemsResponse.data;

      setIsAddingOrder(false);
      setIsEditingOrder(true);
      setOrderForm({
        supplier_order_id: order.supplier_order_id,
        status: order.status || 'Received',
        order_date: order.order_date,
        expected_delivery: order.expected_delivery,
        remarks: order.remarks || ''
      });
      setOrderItems(items);
      setProductInputs([]);
      setShowOngoingOrderModal(true);
    } catch (error) {
      console.error('Error fetching order items:', error);
      setError('Failed to fetch order items');
    }
  };

  const handleDeleteOrder = async (orderId, event) => {
    event.stopPropagation(); // Prevent triggering the order edit
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
  await api.delete(`/api/supplier-orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update the orders state
      setSupplierOrders(prev => ({
        ...prev,
        ongoing: prev.ongoing.filter(o => o.supplier_order_id !== orderId)
      }));

      setError(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      setError(error.response?.data?.message || 'Failed to delete order');
    }
  };

  const validateForm = () => {
    if (!editForm.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!editForm.email_address.trim()) {
      setError('Email is required');
      return false;
    }
    if (editForm.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email_address)) {
      setError('Invalid email format');
      return false;
    }
    if (editForm.telephone && !validatePhoneNumber(editForm.telephone)) {
      setError('Invalid telephone number format. Please use Philippine format: (XXX) XXX-XXXX');
      return false;
    }
    if (editForm.cellphone && !validatePhoneNumber(editForm.cellphone)) {
      setError('Invalid cellphone number format. Please use Philippine format: (XXX) XXX-XXXX');
      return false;
    }
    if (!editForm.province.trim()) {
      setError('Province is required');
      return false;
    }
    if (!editForm.city_municipality.trim()) {
      setError('City/Municipality is required');
      return false;
    }
    if (!editForm.barangay.trim()) {
      setError('Barangay is required');
      return false;
    }
    if (!editForm.street_address.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!editForm.zip_code.trim()) {
      setError('ZIP code is required');
      return false;
    }
    return true;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      
      // Prepare data for database - clean phone numbers
      const supplierData = {
        ...editForm,
        telephone: editForm.telephone ? editForm.telephone.replace(/\D/g, '') : '',
        cellphone: editForm.cellphone ? editForm.cellphone.replace(/\D/g, '') : ''
      };
      
      const response = await api.post(`/api/suppliers`, supplierData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSuppliers([...suppliers, response.data]);
      setIsAdding(false);
      setEditForm({
        name: '',
        email_address: '',
        telephone: '',
        cellphone: '',
        description: '',
        province: '',
        city_municipality: '',
        barangay: '',
        street_address: '',
        zip_code: ''
      });
      setError(null);
    } catch (error) {
      console.error('Error adding supplier:', error);
      setError(error.response?.data?.message || 'Failed to add supplier');
    }
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({
      name: supplier.name,
      email_address: supplier.email_address,
      telephone: supplier.telephone ? formatPhoneNumber(supplier.telephone) : '',
      cellphone: supplier.cellphone ? formatPhoneNumber(supplier.cellphone) : '',
      description: supplier.description || '',
      province: supplier.province || '',
      city_municipality: supplier.city_municipality || '',
      barangay: supplier.barangay || '',
      street_address: supplier.street_address || '',
      zip_code: supplier.zip_code || ''
    });
    setIsEditing(true);
    setError(null);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        const token = localStorage.getItem('token');
  await api.delete(`/api/suppliers/${supplierId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setSuppliers(suppliers.filter(s => s.supplier_id !== supplierId));
        setSelectedSupplier(null);
        setError(null);
      } catch (error) {
        console.error('Error deleting supplier:', error);
        setError(error.response?.data?.message || 'Failed to delete supplier');
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      
      // Prepare data for database - clean phone numbers
      const supplierData = {
        ...editForm,
        telephone: editForm.telephone ? editForm.telephone.replace(/\D/g, '') : '',
        cellphone: editForm.cellphone ? editForm.cellphone.replace(/\D/g, '') : ''
      };
      
      const response = await api.put(`/api/suppliers/${selectedSupplier.supplier_id}`, supplierData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSuppliers(suppliers.map(s => 
        s.supplier_id === response.data.supplier_id ? response.data : s
      ));
      setSelectedSupplier(response.data);
      setIsEditing(false);
      setError(null);
    } catch (error) {
      console.error('Error updating supplier:', error);
      setError(error.response?.data?.message || 'Failed to update supplier');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditForm({
      name: '',
      email_address: '',
      telephone: '',
      cellphone: '',
      description: '',
      province: '',
      city_municipality: '',
      barangay: '',
      street_address: '',
      zip_code: ''
    });
    setError(null);
  };

  const handleSupplierSelect = (supplier, event) => {
    if (event.shiftKey && selectedSuppliers.size > 0) {
      // Get the index of the last selected supplier
      const lastSelectedIndex = filteredSuppliers.findIndex(
        s => s.supplier_id === Array.from(selectedSuppliers).pop()
      );
      const currentIndex = filteredSuppliers.findIndex(
        s => s.supplier_id === supplier.supplier_id
      );
      
      // Select all suppliers between the last selected and current
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      
      const newSelected = new Set(selectedSuppliers);
      for (let i = start; i <= end; i++) {
        newSelected.add(filteredSuppliers[i].supplier_id);
      }
      setSelectedSuppliers(newSelected);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection for Ctrl/Cmd + click
      const newSelected = new Set(selectedSuppliers);
      if (newSelected.has(supplier.supplier_id)) {
        newSelected.delete(supplier.supplier_id);
      } else {
        newSelected.add(supplier.supplier_id);
      }
      setSelectedSuppliers(newSelected);
    } else {
      // Single selection
      setSelectedSuppliers(new Set([supplier.supplier_id]));
      setSelectedSupplier(supplier);
    }
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.size === filteredSuppliers.length && filteredSuppliers.length > 0) {
      setSelectedSuppliers(new Set());
      setSelectedSupplier(null);
    } else {
      const allIds = new Set(filteredSuppliers.map(s => s.supplier_id));
      setSelectedSuppliers(allIds);
      if (filteredSuppliers.length === 1) {
        setSelectedSupplier(filteredSuppliers[0]);
      }
    }
  };

  const renderForm = () => (
    <div className="compact-form">
      {error && <div className="error-message">{error}</div>}
      
      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              placeholder="Supplier name"
              required
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={editForm.email_address}
              onChange={(e) => setEditForm({...editForm, email_address: e.target.value})}
              placeholder="Email address"
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Telephone</label>
            <input
              type="tel"
              value={editForm.telephone}
              onChange={(e) => handlePhoneChange('telephone', e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              maxLength="15"
            />
          </div>
          <div className="form-group">
            <label>Cellphone</label>
            <input
              type="tel"
              value={editForm.cellphone}
              onChange={(e) => handlePhoneChange('cellphone', e.target.value)}
              placeholder="(XXX) XXX-XXXX"
              maxLength="15"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm({...editForm, description: e.target.value})}
            placeholder="Brief description (optional)"
            rows="2"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="form-section">
        <h3 className="section-title">Address</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Province *</label>
            <input
              type="text"
              value={editForm.province}
              onChange={(e) => setEditForm({...editForm, province: e.target.value})}
              placeholder="Province"
              required
            />
          </div>
          <div className="form-group">
            <label>City/Municipality *</label>
            <input
              type="text"
              value={editForm.city_municipality}
              onChange={(e) => setEditForm({...editForm, city_municipality: e.target.value})}
              placeholder="City/Municipality"
              required
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Barangay *</label>
            <input
              type="text"
              value={editForm.barangay}
              onChange={(e) => setEditForm({...editForm, barangay: e.target.value})}
              placeholder="Barangay"
              required
            />
          </div>
          <div className="form-group">
            <label>ZIP Code *</label>
            <input
              type="text"
              value={editForm.zip_code}
              onChange={(e) => setEditForm({...editForm, zip_code: e.target.value})}
              placeholder="ZIP Code"
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Street Address *</label>
          <input
            type="text"
            value={editForm.street_address}
            onChange={(e) => setEditForm({...editForm, street_address: e.target.value})}
            placeholder="Street address"
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-save" onClick={isAdding ? handleSaveAdd : handleSaveEdit}>
          {isAdding ? 'Add Supplier' : 'Save Changes'}
        </button>
        <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );

  const renderSupplierProducts = () => {
    if (!supplierProducts.length) {
      return <div className="no-results">No orders found</div>;
    }

    return (
      <div className="supplier-products-grid">
        {supplierProducts.map((product) => (
          <div 
            key={product.supplier_product_id} 
            className="product-card"
          >
            {product.image_data && (
              <img 
                src={`data:image/jpeg;base64,${product.image_data}`} 
                alt={product.name}
                className="product-image"
              />
            )}
            <div className="product-info">
              <h3>{product.name}</h3>
              <p>SKU: {product.sku}</p>
              <p>Price: ₱{product.price}</p>
              <p>Stock: {product.stock}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-xl font-bold">Order #{selectedOrder.order_id}</h2>
            <button className="modal-close" onClick={() => setShowOrderModal(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="modal-section">
              <h3>Order Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><span className="text-gray-600">Date:</span> {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                  <p><span className="text-gray-600">Status:</span> {selectedOrder.status}</p>
                  <p><span className="text-gray-600">Total Cost:</span> ₱{selectedOrder.total_cost}</p>
                  <p><span className="text-gray-600">Payment Type:</span> {selectedOrder.payment_type}</p>
                  {selectedOrder.expected_delivery && (
                    <p><span className="text-gray-600">Expected Delivery:</span> {new Date(selectedOrder.expected_delivery).toLocaleDateString()}</p>
                  )}
                  <p><span className="text-gray-600">Package:</span> {selectedOrder.package_name}</p>
                </div>
                <div>
                  <h3>Supplier Details</h3>
                  <p><span className="text-gray-600">Name:</span> {selectedOrder?.name || 'Not provided'}</p>
                  <p><span className="text-gray-600">Email:</span> {selectedOrder?.email_address || 'Not provided'}</p>
                  <p><span className="text-gray-600">Phone:</span> {selectedOrder?.telephone || selectedOrder?.cellphone || 'Not provided'}</p>
                  <p><span className="text-gray-600">Shipping Address:</span> {selectedOrder?.shipping_address || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Products</h3>
              <div className="space-y-2">
                {loadingProducts ? (
                  <div className="text-center py-4">Loading products...</div>
                ) : orderProducts.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-image-container">
                      {product.image_data && (
                        <img 
                          src={`data:image/jpeg;base64,${product.image_data}`} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                    </div>
                    <div className="product-details">
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-sku">SKU: {product.sku}</span>
                      </div>
                      <div className="product-quantity">
                        <div className="quantity">Qty: {product.quantity || 1}</div>
                        {product.unit_price && (
                          <div className="price">₱{product.unit_price} each</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrder.remarks && (
              <div className="modal-section">
                <h3>Remarks</h3>
                <p className="text-gray-600">{selectedOrder.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSupplierOrders = () => {
    const orders = activeTab === 1 ? supplierOrders.completed : supplierOrders.ongoing;

    return (
      <div className="orders-grid2">
        {orders.map((order) => (
          <div 
            key={order.supplier_order_id} 
            className="order-tab"
            onClick={() => handleEditOrder(order)}
          >
            <div className="order-tab-header">
              <div className="order-id">Order {order.supplier_order_id}</div>
              <div className="order-actions">
                <div className={`order-status ${activeTab === 1 ? 'received' : (order.status || 'waiting').toLowerCase()}`}>
                  {activeTab === 1 ? 'Received' : (order.status || 'Waiting')}
              </div>
                <button 
                  className="delete-order-btn"
                  onClick={(e) => handleDeleteOrder(order.supplier_order_id, e)}
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="order-tab-content">
              <div className="order-date">Date: {new Date(order.order_date).toLocaleDateString()}</div>
              <div className="order-delivery">Expected: {new Date(order.expected_delivery).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOngoingOrderModal = () => {
    return (
      <div className="modal-suppliers">
        <div className="modal-content">
          <div className="modal-header">
            <h2>{isAddingOrder ? 'Add New Order' : 'Edit Order'}</h2>
            <button onClick={() => {
              setIsAddingOrder(false);
              setIsEditingOrder(false);
              setShowOngoingOrderModal(false);
            }}>×</button>
          </div>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label>Supplier Order ID:</label>
              <input 
                type="text" 
                value={orderForm.supplier_order_id}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Status:</label>
              <select 
                value={orderForm.status}
                onChange={(e) => setOrderForm({...orderForm, status: e.target.value})}
              >
                <option value="Waiting">Waiting</option>
                <option value="Received">Received</option>
              </select>
            </div>
            <div className="form-group">
              <label>Order Date:</label>
              <input 
                type="date" 
                value={orderForm.order_date}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Expected Delivery:</label>
              <input 
                type="date" 
                value={orderForm.expected_delivery}
                onChange={(e) => setOrderForm({...orderForm, expected_delivery: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Products:</label>
              <div className="products-section">
                {orderItems.map((item, index) => (
                  <div key={index} className="product-item">
                    <span>{item.product_name} - {item.variation} (Qty: {item.quantity})</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveProduct(index)}
                      className="remove-product-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={handleAddProductInput}
                  className="add-product-btn"
                >
                  Add Product
                </button>
                {productInputs.map((input) => (
                  <div key={input.id} className="product-inputs">
                    <select
                      value={input.product}
                      onChange={(e) => handleInputChange(input.id, 'product', e.target.value)}
                    >
                      <option key="default" value="">Select Product</option>
                      {supplierProducts && supplierProducts.map(product => (
                        <option key={product.sku} value={product.sku}>
                          {product.name} - {product.sku}
                        </option>
                      ))}
                    </select>
                    <select
                      value={input.variation}
                      onChange={(e) => handleInputChange(input.id, 'variation', e.target.value)}
                    >
                      <option key="default" value="">Select Variation</option>
                      <option key="small" value="Small">Small</option>
                      <option key="medium" value="Medium">Medium</option>
                      <option key="large" value="Large">Large</option>
                    </select>
                    <input 
                      type="number" 
                      value={input.quantity}
                      onChange={(e) => handleInputChange(input.id, 'quantity', e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, input)}
                      placeholder="Quantity"
                      min="1"
                      max="9999"
                      style={{ width: '80px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddProductToOrder(input)}
                      className="add-product-btn"
                    >
                      Add
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveProductInput(input.id)}
                      className="remove-input-btn"
                    >
                      −
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Remarks:</label>
              <textarea 
                value={orderForm.remarks}
                onChange={(e) => setOrderForm({...orderForm, remarks: e.target.value})}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={() => {
              setIsAddingOrder(false);
              setIsEditingOrder(false);
              setShowOngoingOrderModal(false);
            }}>Cancel</button>
            <button onClick={handleSaveOrder} className="btn-primary">
              {isAddingOrder ? 'Add Order' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Calculate statistics
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active' || !s.status).length,
    inactive: suppliers.filter(s => s.status === 'inactive').length,
    selected: selectedSuppliers.size
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="dashboard-main">
        <TopBar avatarUrl={getProfilePictureUrl()} />
        
        <div className="suppliers-page">
          {/* Header Section */}
          <div className="suppliers-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="page-title">
                  <span className="title-icon">🏢</span>
                  Supplier Management
                </h1>
                <p className="page-subtitle">Manage your supplier database</p>
              </div>
              <div className="header-actions">
                <button 
                  className="btn-primary"
                  onClick={handleAdd}
                >
                  <span className="btn-icon">+</span>
                  Add Supplier
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">📊</div>
              <div className="stat-content">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total Suppliers</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon active">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.active}</div>
                <div className="stat-label">Active</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon inactive">⏸️</div>
              <div className="stat-content">
                <div className="stat-number">{stats.inactive}</div>
                <div className="stat-label">Inactive</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon selected">🎯</div>
              <div className="stat-content">
                <div className="stat-number">{stats.selected}</div>
                <div className="stat-label">Selected</div>
              </div>
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="suppliers-controls">
            <div className="controls-left">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="All">All Categories</option>
                <option value="Local">Local</option>
                <option value="National">National</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="controls-right">
              {selectedSuppliers.size > 0 && (
                <button
                  className="btn-danger"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete ${selectedSuppliers.size} supplier(s)?`)) {
                      Array.from(selectedSuppliers).forEach(handleDelete);
                    }
                  }}
                >
                  <span className="btn-icon">🗑️</span>
                  Delete Selected ({selectedSuppliers.size})
                </button>
              )}
            </div>
          </div>

          {/* Supplier List */}
          <div className="suppliers-content">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
                <button onClick={fetchSuppliers} className="retry-btn">Retry</button>
              </div>
            )}

            {filteredSuppliers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏢</div>
                <h3>No suppliers found</h3>
                <p>
                  {searchTerm || selectedCategory !== 'All' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first supplier'
                  }
                </p>
                {!searchTerm && selectedCategory === 'All' && (
                  <button className="btn-primary" onClick={handleAdd}>
                    Add First Supplier
                  </button>
                )}
              </div>
            ) : (
              <div className="suppliers-grid">
                {filteredSuppliers.map((supplier) => (
                  <div 
                    key={supplier.supplier_id}
                    className={`supplier-card ${selectedSuppliers.has(supplier.supplier_id) ? 'selected' : ''}`}
                    onClick={(e) => handleSupplierSelect(supplier, e)}
                  >
                    <div className="card-header">
                      <input 
                        type="checkbox" 
                        checked={selectedSuppliers.has(supplier.supplier_id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSupplierSelect(supplier, e);
                        }}
                        className="card-checkbox"
                      />
                      <div className="supplier-avatar">
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="supplier-info">
                        <h3 className="supplier-name">{supplier.name}</h3>
                        <p className="supplier-id">#{supplier.supplier_id}</p>
                      </div>
                      <div className="card-actions">
                        <button 
                          className="action-btn edit-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(supplier);
                          }}
                          title="Edit Supplier"
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.supplier_id);
                          }}
                          title="Delete Supplier"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-icon">📧</span>
                        <span className="info-text">{supplier.email_address}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-icon">📞</span>
                        <span className="info-text">{supplier.telephone || supplier.cellphone || 'No phone'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-icon">📍</span>
                        <span className="info-text">{supplier.city_municipality}, {supplier.province}</span>
                      </div>
                    </div>
                    
                    <div className="card-footer">
                      <span className="status-badge active">Active</span>
                      <span className="date-added">Added: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {(isAdding || isEditing) && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {isAdding ? 'Add New Supplier' : 'Edit Supplier'}
                </h2>
                <button className="modal-close" onClick={handleCancel}>×</button>
              </div>
              <div className="modal-body">
                {renderForm()}
              </div>
            </div>
          </div>
        )}

        {/* Add the modal render at the end of the component */}
        {showOngoingOrderModal && renderOngoingOrderModal()}
        {showOrderModal && renderOrderModal()}
      </div>
    </div>
  );
}