import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../api';

const CartContext = createContext();

// Cart actions
const CART_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CART: 'SET_CART',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  SET_ERROR: 'SET_ERROR',
  SET_ITEM_COUNT: 'SET_ITEM_COUNT'
};

// Initial state
const initialState = {
  items: [],
  itemCount: 0,
  total: 0,
  loading: false,
  error: null
};

// Cart reducer
function cartReducer(state, action) {
  switch (action.type) {
    case CART_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case CART_ACTIONS.SET_CART:
      return {
        ...state,
        items: action.payload.items || [],
        itemCount: action.payload.itemCount || 0,
        total: action.payload.total || 0,
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.ADD_ITEM:
      return {
        ...state,
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        itemCount: 0,
        total: 0,
        loading: false,
        error: null
      };
    
    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    
    case CART_ACTIONS.SET_ITEM_COUNT:
      return {
        ...state,
        itemCount: action.payload
      };
    
    default:
      return state;
  }
}

// Cart provider component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart on mount (only for customers)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('customer') || 'null');
    if (user && user.source === 'customer') {
      loadCart();
    }
  }, []);

  // Load cart from server
  const loadCart = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.get('/api/cart');
      
      if (response.data.success) {
        dispatch({
          type: CART_ACTIONS.SET_CART,
          payload: {
            items: response.data.cart,
            itemCount: response.data.totals.itemCount,
            total: response.data.totals.cartTotal
          }
        });
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      dispatch({
        type: CART_ACTIONS.SET_ERROR,
        payload: 'Failed to load cart'
      });
    }
  };

  // Add item to cart
  const addToCart = async (sku, quantity = 1) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.post('/api/cart/add', { sku, quantity });
      
      if (response.data.success) {
        dispatch({ type: CART_ACTIONS.ADD_ITEM });
        await loadCart(); // Reload cart to get updated data
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add item to cart';
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Update item quantity in cart
  const updateCartItem = async (sku, quantity) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.put('/api/cart/update', { sku, quantity });
      
      if (response.data.success) {
        dispatch({ type: CART_ACTIONS.UPDATE_ITEM });
        await loadCart(); // Reload cart to get updated data
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update cart item';
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Remove item from cart
  const removeFromCart = async (sku) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.delete('/api/cart/remove', { data: { sku } });
      
      if (response.data.success) {
        dispatch({ type: CART_ACTIONS.REMOVE_ITEM });
        await loadCart(); // Reload cart to get updated data
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error removing item from cart:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove item from cart';
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.delete('/api/cart/clear');
      
      if (response.data.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      const errorMessage = error.response?.data?.message || 'Failed to clear cart';
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Checkout cart
  const checkout = async (checkoutData) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await api.post('/api/cart/checkout', checkoutData);
      
      if (response.data.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        return { 
          success: true, 
          message: response.data.message,
          orderId: response.data.orderId,
          totalCost: response.data.totalCost
        };
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      const errorMessage = error.response?.data?.message || 'Failed to process checkout';
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, message: errorMessage };
    }
  };

  // Get cart item count (for badge)
  const getCartCount = async () => {
    try {
      const response = await api.get('/api/cart/count');
      if (response.data.success) {
        dispatch({ 
          type: CART_ACTIONS.SET_ITEM_COUNT, 
          payload: response.data.itemCount 
        });
        return response.data.itemCount;
      }
    } catch (error) {
      console.error('Error getting cart count:', error);
      return 0;
    }
  };

  // Check if item is in cart
  const isInCart = (sku) => {
    return state.items.some(item => item.sku === sku);
  };

  // Get item quantity in cart
  const getItemQuantity = (sku) => {
    const item = state.items.find(item => item.sku === sku);
    return item ? item.quantity : 0;
  };

  const value = {
    // State
    items: state.items,
    itemCount: state.itemCount,
    total: state.total,
    loading: state.loading,
    error: state.error,
    
    // Actions
    loadCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    checkout,
    getCartCount,
    isInCart,
    getItemQuantity
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
