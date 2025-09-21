import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../Context/CartContext';
import { useAuth } from '../../Context/AuthContext';
import TopbarCustomer from '../../Components/TopbarCustomer';
import './CustomerCart.css';

export default function CustomerCart() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { 
    items, 
    itemCount, 
    total, 
    loading, 
    error, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    checkout 
  } = useCart();

  const [checkoutData, setCheckoutData] = useState({
    shipping_address: '',
    payment_method: '',
    payment_type: 'Online',
    remarks: '',
    expected_delivery: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/customer-login');
    }
  }, [isAuthenticated, navigate]);

  // Set default expected delivery date (7 days from now)
  useEffect(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    setCheckoutData(prev => ({
      ...prev,
      expected_delivery: futureDate.toISOString().split('T')[0]
    }));
  }, []);

  const handleQuantityChange = async (sku, newQuantity) => {
    if (newQuantity < 0) return;
    
    const result = await updateCartItem(sku, newQuantity);
    if (!result.success) {
      alert(result.message);
    }
  };

  const handleRemoveItem = async (sku, productName) => {
    if (window.confirm(`Remove "${productName}" from cart?`)) {
      const result = await removeFromCart(sku);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Clear entire cart? This action cannot be undone.')) {
      const result = await clearCart();
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const handleCheckout = async () => {
    if (!checkoutData.shipping_address.trim()) {
      setCheckoutError('Shipping address is required');
      return;
    }
    if (!checkoutData.payment_method.trim()) {
      setCheckoutError('Payment method is required');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');

    const result = await checkout(checkoutData);
    
    if (result.success) {
      alert(`Order placed successfully! Order ID: ${result.orderId}`);
      navigate('/customer-cart');
    } else {
      setCheckoutError(result.message);
    }
    
    setCheckoutLoading(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const getImageUrl = (imageData) => {
    if (imageData) {
      return `data:image/jpeg;base64,${imageData}`;
    }
    return '/placeholder-product.png';
  };

  if (!isAuthenticated || user?.source !== 'customer') {
    return null;
  }

  return (
    <div className="customer-cart-page">
      <TopbarCustomer />
      
      <div className="cart-container">
        <div className="cart-header">
          <h1>My Cart</h1>
          {itemCount > 0 && (
            <p className="cart-summary">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} • Total: {formatPrice(total)}
            </p>
          )}
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading cart...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Add some items to get started!</p>
            <button 
              className="continue-shopping-btn"
              onClick={() => navigate('/order')}
            >
              Continue Shopping
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="cart-content">
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.sku} className="cart-item">
                  <div className="item-image">
                    <img 
                      src={getImageUrl(item.image_data)} 
                      alt={item.product_name}
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                  </div>
                  
                  <div className="item-details">
                    <h3 className="item-name">{item.product_name}</h3>
                    <p className="item-description">{item.description}</p>
                    <p className="item-sku">SKU: {item.sku}</p>
                    <p className="item-price">{formatPrice(item.unit_price)} each</p>
                  </div>

                  <div className="item-quantity">
                    <label>Quantity:</label>
                    <div className="quantity-controls">
                      <button 
                        onClick={() => handleQuantityChange(item.sku, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="quantity-btn"
                      >
                        -
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button 
                        onClick={() => handleQuantityChange(item.sku, item.quantity + 1)}
                        className="quantity-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="item-total">
                    <p className="total-price">{formatPrice(item.total_price)}</p>
                    <button 
                      onClick={() => handleRemoveItem(item.sku, item.product_name)}
                      className="remove-btn"
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-actions">
              <button 
                onClick={handleClearCart}
                className="clear-cart-btn"
              >
                Clear Cart
              </button>
              
              <button 
                onClick={() => setShowCheckout(true)}
                className="checkout-btn"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {showCheckout && (
          <div className="checkout-modal-overlay">
            <div className="checkout-modal">
              <div className="checkout-header">
                <h2>Checkout</h2>
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="close-btn"
                >
                  ✕
                </button>
              </div>

              <div className="checkout-content">
                <div className="checkout-form">
                  <div className="form-group">
                    <label htmlFor="shipping_address">Shipping Address *</label>
                    <textarea
                      id="shipping_address"
                      value={checkoutData.shipping_address}
                      onChange={(e) => setCheckoutData(prev => ({
                        ...prev,
                        shipping_address: e.target.value
                      }))}
                      placeholder="Enter your complete shipping address"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="payment_method">Payment Method *</label>
                    <select
                      id="payment_method"
                      value={checkoutData.payment_method}
                      onChange={(e) => setCheckoutData(prev => ({
                        ...prev,
                        payment_method: e.target.value
                      }))}
                      required
                    >
                      <option value="">Select payment method</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="GCash">GCash</option>
                      <option value="PayMaya">PayMaya</option>
                      <option value="Cash on Delivery">Cash on Delivery</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="expected_delivery">Expected Delivery Date</label>
                    <input
                      type="date"
                      id="expected_delivery"
                      value={checkoutData.expected_delivery}
                      onChange={(e) => setCheckoutData(prev => ({
                        ...prev,
                        expected_delivery: e.target.value
                      }))}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="remarks">Special Instructions (Optional)</label>
                    <textarea
                      id="remarks"
                      value={checkoutData.remarks}
                      onChange={(e) => setCheckoutData(prev => ({
                        ...prev,
                        remarks: e.target.value
                      }))}
                      placeholder="Any special instructions for your order"
                      rows="2"
                    />
                  </div>
                </div>

                <div className="checkout-summary">
                  <h3>Order Summary</h3>
                  <div className="summary-details">
                    <div className="summary-row">
                      <span>Items ({itemCount})</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {checkoutError && (
                <div className="checkout-error">
                  {checkoutError}
                </div>
              )}

              <div className="checkout-actions">
                <button 
                  onClick={() => setShowCheckout(false)}
                  className="cancel-btn"
                  disabled={checkoutLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCheckout}
                  className="confirm-checkout-btn"
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
