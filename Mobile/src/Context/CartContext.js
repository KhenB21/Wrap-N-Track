import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { cartAPI } from "../services/api";

const CartContext = createContext();

// Action types
const CART_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_CART_ITEMS: 'SET_CART_ITEMS',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  SET_ERROR: 'SET_ERROR',
  SET_FAVORITES: 'SET_FAVORITES',
  TOGGLE_FAVORITE: 'TOGGLE_FAVORITE',
};

// Initial state
const initialState = {
  cartItems: [],
  favoriteItems: [],
  loading: false,
  error: null,
  totalItems: 0,
  totalPrice: 0,
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case CART_ACTIONS.SET_CART_ITEMS:
      const items = action.payload;
      const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalPrice = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
      
      return {
        ...state,
        cartItems: items,
        totalItems,
        totalPrice,
        loading: false,
        error: null,
      };

    case CART_ACTIONS.ADD_ITEM:
      const newItem = action.payload;
      const existingItemIndex = state.cartItems.findIndex(item => item.sku === newItem.sku);
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = state.cartItems.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: (item.quantity || 0) + (newItem.quantity || 1) }
            : item
        );
      } else {
        updatedItems = [...state.cartItems, { ...newItem, quantity: newItem.quantity || 1 }];
      }
      
      const newTotalItems = updatedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const newTotalPrice = updatedItems.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
      
      return {
        ...state,
        cartItems: updatedItems,
        totalItems: newTotalItems,
        totalPrice: newTotalPrice,
      };

    case CART_ACTIONS.REMOVE_ITEM:
      const skuToRemove = action.payload;
      const filteredItems = state.cartItems.filter(item => item.sku !== skuToRemove);
      const filteredTotalItems = filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const filteredTotalPrice = filteredItems.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
      
      return {
        ...state,
        cartItems: filteredItems,
        totalItems: filteredTotalItems,
        totalPrice: filteredTotalPrice,
      };

    case CART_ACTIONS.UPDATE_QUANTITY:
      const { sku, quantity } = action.payload;
      const updatedQuantityItems = state.cartItems.map(item =>
        item.sku === sku ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0);
      
      const updatedTotalItems = updatedQuantityItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const updatedTotalPrice = updatedQuantityItems.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
      
      return {
        ...state,
        cartItems: updatedQuantityItems,
        totalItems: updatedTotalItems,
        totalPrice: updatedTotalPrice,
      };

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        cartItems: [],
        totalItems: 0,
        totalPrice: 0,
      };

    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case CART_ACTIONS.SET_FAVORITES:
      return {
        ...state,
        favoriteItems: action.payload,
      };

    case CART_ACTIONS.TOGGLE_FAVORITE:
      const itemToToggle = action.payload;
      const isFavorite = state.favoriteItems.some(favItem => favItem.sku === itemToToggle.sku);
      
      if (isFavorite) {
        return {
          ...state,
          favoriteItems: state.favoriteItems.filter(favItem => favItem.sku !== itemToToggle.sku),
        };
      } else {
        return {
          ...state,
          favoriteItems: [...state.favoriteItems, itemToToggle],
        };
      }

    default:
      return state;
  }
};

// Provider component
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart items from API
  const loadCartItems = useCallback(async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.getCartItems();
      
      if (response.success && response.cart) {
        dispatch({ type: CART_ACTIONS.SET_CART_ITEMS, payload: response.cart });
      } else {
        dispatch({ type: CART_ACTIONS.SET_CART_ITEMS, payload: response || [] });
      }
    } catch (error) {
      console.error('Error loading cart items:', error);
      dispatch({ 
        type: CART_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to load cart items' 
      });
    }
  }, []);

  // Load cart items on mount
  useEffect(() => {
    loadCartItems();
  }, [loadCartItems]);

  // Add item to cart
  const addToCart = async (item) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.addToCart(item);
      
      if (response.success) {
        // Reload cart items to get updated data from server
        await loadCartItems();
      } else {
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: response.message || 'Failed to add item to cart' });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message || 'Failed to add item to cart' });
    }
  };

  // Remove item from cart
  const removeFromCart = async (sku) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.removeFromCart(sku);
      
      if (response.success) {
        dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: sku });
      } else {
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: response.message || 'Failed to remove item from cart' });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message || 'Failed to remove item from cart' });
    }
  };

  // Update item quantity
  const updateQuantity = async (sku, quantity) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.updateCartItem(sku, quantity);
      
      if (response.success) {
        dispatch({ type: CART_ACTIONS.UPDATE_QUANTITY, payload: { sku, quantity } });
      } else {
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: response.message || 'Failed to update quantity' });
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message || 'Failed to update quantity' });
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.clearCart();
      
      if (response.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
      } else {
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: response.message || 'Failed to clear cart' });
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message || 'Failed to clear cart' });
    }
  };

  // Checkout cart
  const checkout = async (checkoutData) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });
      const response = await cartAPI.checkout(checkoutData);
      
      if (response.success) {
        dispatch({ type: CART_ACTIONS.CLEAR_CART });
        return { success: true, orderId: response.orderId };
      } else {
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: response.message || 'Checkout failed' });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message || 'Checkout failed' });
      return { success: false, message: error.message };
    }
  };

  // Toggle favorite
  const toggleFavorite = (item) => {
    if (!item.sku) {
      console.error("Item must have a unique sku to be added to favorites.");
      return;
    }
    dispatch({ type: CART_ACTIONS.TOGGLE_FAVORITE, payload: item });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: CART_ACTIONS.SET_ERROR, payload: null });
  };

  const value = {
    // State
    ...state,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout,
    toggleFavorite,
    loadCartItems,
    clearError,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
