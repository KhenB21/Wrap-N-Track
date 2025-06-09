import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios'; // Using your centralized API instance
import Sidebar from '../../Components/Sidebar/Sidebar';
import './DeliveryTracking.css';
// Assuming you use react-icons, you might import specific icons like:
// import { FaTruck, FaBoxOpen, FaCheckCircle } from 'react-icons/fa';

const DeliveryTracking = () => {
  const location = useLocation();
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState(null);
  const [orders, setOrders] = useState([]); // For the list view
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // const fetchDeliveryOrders = useCallback(async () => {
  //   setLoading(true);
  //   setError('');
  //   try {
  //     const response = await api.get('/api/orders'); // Fetches all orders for now
  //     const deliveryRelevantOrders = response.data.filter(order => {
  //       const status = order.status ? order.status.toLowerCase().replace(/\s+/g, '').replace(/-/g, '') : '';
  //       return ['shipped', 'outfordelivery', 'confirmed', 'readytodeliver', 'tobepack'].includes(status) || order.tracking_number;
  //     });
  //     setOrders(deliveryRelevantOrders);
  //   } catch (err) {
  //     console.error("Error fetching delivery orders:", err);
  //     setError('Failed to load orders. ' + (err.response?.data?.message || err.message));
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  // useEffect(() => {
  //   // This effect is for fetching all delivery orders for the list view.
  //   // It's commented out until backend delivery data is ready.
  //   // if (!selectedOrderForDelivery) { // Only fetch if not viewing a single order
  //   //   fetchDeliveryOrders();
  //   // }
  // }, [fetchDeliveryOrders, selectedOrderForDelivery]);

  useEffect(() => {
    // This effect checks if an order object was passed via React Router's location.state.
    // This typically happens when navigating from the OrderDetails modal's 'Proceed to Delivery' button.
    // If an order is found in location.state, it's set to selectedOrderForDelivery to display the single delivery view.
    if (location.state && location.state.order) {
      setSelectedOrderForDelivery(location.state.order);
      setOrders([]); // Clear any orders meant for the list view, as we are focusing on a single delivery.
    } else {
      // If no order is passed in location.state (e.g., navigating directly via sidebar),
      // ensure selectedOrderForDelivery is null to show the list view.
      setSelectedOrderForDelivery(null);
      // If we were to re-enable fetchDeliveryOrders for the list view,
      // it would be called based on the other useEffect, or here if !location.state.order
      // For now, list view will be empty as fetchDeliveryOrders is globally commented.
    }
  }, [location.state]);

  const filteredOrders = orders.filter(order =>
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.name && order.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.tracking_number && order.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.logistics_company && order.logistics_company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getOrderStatusDisplay = (status) => {
    return status || 'N/A';
  };

  // Renders the detailed view for a single selected delivery.
  // This view is shown when selectedOrderForDelivery has data.
  const renderSingleOrderDeliveryView = () => {
    if (!selectedOrderForDelivery) return null;

    return (
      <div className="single-delivery-view-container">
        <div className="delivery-header-icon">
          <span role="img" aria-label="truck" style={{ fontSize: '50px' }}>🚚</span>
        </div>
        <h2>Order ID: {selectedOrderForDelivery.order_id}</h2>
        {/* TODO: Make Logistics Company an editable field or dynamic display later */}
        <div>Logistics Company: [Editable Field or Display]</div>
        
        <div className="customer-details-section">
          <h4>Customer Information</h4>
          <p>Name: {selectedOrderForDelivery.name || 'N/A'}</p>
          <p>Email: {selectedOrderForDelivery.email_address || 'N/A'}</p>
          <p>Contact: {selectedOrderForDelivery.cellphone || 'N/A'}</p>
          <p>Total Boxes: {selectedOrderForDelivery.order_quantity || (selectedOrderForDelivery.products && selectedOrderForDelivery.products[0]?.quantity) || 'N/A'}</p>
          <p>Event Date: {selectedOrderForDelivery.expected_delivery ? new Date(selectedOrderForDelivery.expected_delivery).toLocaleDateString() : 'N/A'}</p>
          <p>Shipping Location: {selectedOrderForDelivery.shipping_address || 'Unknown Address'}</p>
          <p>Status: {selectedOrderForDelivery.status || 'N/A'}</p>
          <p>Date Ordered: {selectedOrderForDelivery.order_date ? new Date(selectedOrderForDelivery.order_date).toLocaleDateString() : 'N/A'}</p>
          <p>Package Name: {selectedOrderForDelivery.package_name || 'N/A'}</p>
        </div>

        <div className="whats-inside-section">
          <h4>What's Inside</h4>
          {selectedOrderForDelivery.products && selectedOrderForDelivery.products.length > 0 ? (
            <ul>
              {selectedOrderForDelivery.products.map((product, idx) => (
                <li key={idx}>{product.name || 'Unnamed Product'} - QTY: {product.quantity || 0}</li>
              ))}
            </ul>
          ) : (
            <p>No product details available.</p>
          )}
        </div>
      </div>
    );
  };

  // Renders the list view for all delivery-relevant orders.
  // This view is shown when no specific order is selected for detailed view (i.e., selectedOrderForDelivery is null).
  // Currently, data fetching for this list is commented out.
  const renderListView = () => {
    return (
      <>
        <header className="delivery-tracking-header">
          <h1>Delivery Tracking</h1>
          <input
            type="text"
            placeholder="Search by Order ID, Customer, Tracking No., or Logistics Co."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="delivery-search-input"
          />
        </header>

        {loading && <p className="loading-message">Loading deliveries...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && filteredOrders.length === 0 && (
          <p className="no-results-message">No deliveries found matching your criteria.</p>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="delivery-orders-grid">
            {filteredOrders.map(order => (
              <div key={order.order_id} className="delivery-order-card">
                <h3>Order ID: {order.order_id}</h3>
                <p><strong>Customer:</strong> {order.name || 'N/A'}</p>
                <p><strong>Status:</strong> {getOrderStatusDisplay(order.status)}</p>
                <p><strong>Tracking Number:</strong> {order.tracking_number || 'N/A'}</p>
                <p><strong>Logistics Company:</strong> {order.logistics_company || 'N/A'}</p>
                <p><strong>Expected Delivery:</strong> {order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Shipping Address:</strong> {order.shipping_address || 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page-layout">
      <Sidebar />
      <div className="delivery-tracking-content">
        {/* Conditional rendering: Show single order view if an order is selected, otherwise show the list view. */}
        {selectedOrderForDelivery ? renderSingleOrderDeliveryView() : renderListView()}
      </div>
    </div>
  );
};

export default DeliveryTracking;
