import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { orderAPI } from '../services/api';

const OrdersContext = createContext();

// Action types
const ORDERS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ORDERS: 'SET_ORDERS',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  SET_ERROR: 'SET_ERROR',
  SET_SELECTED_ORDER: 'SET_SELECTED_ORDER',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
};

// Reducer
const ordersReducer = (state, action) => {
  switch (action.type) {
    case ORDERS_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case ORDERS_ACTIONS.SET_ORDERS:
      return {
        ...state,
        orders: action.payload,
        loading: false,
        error: null,
      };

    case ORDERS_ACTIONS.ADD_ORDER:
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };

    case ORDERS_ACTIONS.UPDATE_ORDER:
      const updatedOrders = state.orders.map(order =>
        order.order_id === action.payload.order_id ? action.payload : order
      );
      return {
        ...state,
        orders: updatedOrders,
        selectedOrder: state.selectedOrder?.order_id === action.payload.order_id 
          ? action.payload 
          : state.selectedOrder,
      };

    case ORDERS_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case ORDERS_ACTIONS.SET_SELECTED_ORDER:
      return {
        ...state,
        selectedOrder: action.payload,
      };

    case ORDERS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Provider component
export const OrdersProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ordersReducer, initialState);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      dispatch({ type: ORDERS_ACTIONS.SET_LOADING, payload: true });
      const response = await orderAPI.getUserOrders();
      
      // Backend returns array directly from /api/orders
      let orders = [];
      if (Array.isArray(response)) {
        orders = response;
      } else if (response && response.orders && Array.isArray(response.orders)) {
        orders = response.orders;
      } else if (response && response.data && Array.isArray(response.data)) {
        orders = response.data;
      }
      
      // Transform orders to ensure proper structure
      orders = orders.map(order => ({
        ...order,
        order_id: order.order_id,
        customer_name: order.name || order.customer_name || 'Unknown',
        total_cost: parseFloat(order.total_cost || 0),
        order_date: order.order_date,
        status: order.status || 'Pending'
      }));
      
      dispatch({ type: ORDERS_ACTIONS.SET_ORDERS, payload: orders });
    } catch (error) {
      console.error('Error loading orders:', error);
      dispatch({ 
        type: ORDERS_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to load orders' 
      });
    }
  }, []);

  // Don't load orders on mount - only load after authentication
  // This prevents network errors from blocking app initialization
  // useEffect(() => {
  //   loadOrders();
  // }, [loadOrders]);

  // Get order by ID
  const getOrder = async (orderId) => {
    try {
      dispatch({ type: ORDERS_ACTIONS.SET_LOADING, payload: true });
      const response = await orderAPI.getOrder(orderId);
      
      if (response.success && response.order) {
        dispatch({ type: ORDERS_ACTIONS.SET_SELECTED_ORDER, payload: response.order });
        return response.order;
      } else {
        dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: response.message || 'Order not found' });
        return null;
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: error.message || 'Failed to fetch order' });
      return null;
    }
  };

  // Create order
  const createOrder = async (orderData) => {
    try {
      dispatch({ type: ORDERS_ACTIONS.SET_LOADING, payload: true });
      const response = await orderAPI.createOrder(orderData);
      
      if (response.success && response.order) {
        dispatch({ type: ORDERS_ACTIONS.ADD_ORDER, payload: response.order });
        return { success: true, order: response.order };
      } else {
        dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: response.message || 'Failed to create order' });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error creating order:', error);
      dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: error.message || 'Failed to create order' });
      return { success: false, message: error.message };
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    try {
      dispatch({ type: ORDERS_ACTIONS.SET_LOADING, payload: true });
      const response = await orderAPI.updateOrderStatus(orderId, status);
      
      if (response.success && response.order) {
        dispatch({ type: ORDERS_ACTIONS.UPDATE_ORDER, payload: response.order });
        return { success: true, order: response.order };
      } else {
        dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: response.message || 'Failed to update order' });
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      dispatch({ type: ORDERS_ACTIONS.SET_ERROR, payload: error.message || 'Failed to update order' });
      return { success: false, message: error.message };
    }
  };

  // Get order history
  const getOrderHistory = async (filters = {}) => {
    try {
      dispatch({ type: ORDERS_ACTIONS.SET_LOADING, payload: true });
      const response = await orderAPI.getOrderHistory(filters);
      
      if (response.success && response.orders) {
        dispatch({ type: ORDERS_ACTIONS.SET_ORDERS, payload: response.orders });
      } else {
        dispatch({ type: ORDERS_ACTIONS.SET_ORDERS, payload: response || [] });
      }
    } catch (error) {
      console.error('Error loading order history:', error);
      dispatch({ 
        type: ORDERS_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to load order history' 
      });
    }
  };

  // Add order (for local state management)
  const addOrder = (order) => {
    dispatch({ type: ORDERS_ACTIONS.ADD_ORDER, payload: order });
  };

  // Set selected order
  const setSelectedOrder = (order) => {
    dispatch({ type: ORDERS_ACTIONS.SET_SELECTED_ORDER, payload: order });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: ORDERS_ACTIONS.CLEAR_ERROR });
  };

  // Get orders by status
  const getOrdersByStatus = (status) => {
    return state.orders.filter(order => order.status === status);
  };

  // Get recent orders
  const getRecentOrders = (limit = 5) => {
    return state.orders
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
      .slice(0, limit);
  };

  const value = {
    // State
    ...state,
    
    // Actions
    loadOrders,
    getOrder,
    createOrder,
    updateOrderStatus,
    getOrderHistory,
    addOrder,
    setSelectedOrder,
    clearError,
    getOrdersByStatus,
    getRecentOrders,
  };

  return (
    <OrdersContext.Provider value={value}>
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};