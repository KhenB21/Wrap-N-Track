import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { dashboardAPI, inventoryAPI } from '../services/api';

// Action types
const DASHBOARD_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_ERROR: 'SET_ERROR',
  SET_SELECTED_MONTH: 'SET_SELECTED_MONTH',
  SET_SELECTED_YEAR: 'SET_SELECTED_YEAR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  REFRESH_DATA: 'REFRESH_DATA',
  UPDATE_INVENTORY_DATA: 'UPDATE_INVENTORY_DATA'
};

// Initial state
const initialState = {
  dashboardData: {
    inventory: {
      totalProducts: 0,
      totalUnits: 0,
      lowStockProducts: 0,
      replenishmentPending: 0
    },
    salesOverview: {
      totalRevenue: 0,
      totalOrders: 0,
      totalUnitsSold: 0,
      totalCustomers: 0
    },
    salesActivity: {
      toBePack: 0,
      toBeShipped: 0,
      outForDelivery: 0
    },
    topSellingProducts: [],
    recentActivity: []
  },
  availableMonths: [],
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
  loading: false,
  error: null,
  lastUpdated: null
};

// Reducer
const dashboardReducer = (state, action) => {
  switch (action.type) {
    case DASHBOARD_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };

    case DASHBOARD_ACTIONS.SET_DASHBOARD_DATA:
      return {
        ...state,
        dashboardData: action.payload,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      };

    case DASHBOARD_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case DASHBOARD_ACTIONS.SET_SELECTED_MONTH:
      return {
        ...state,
        selectedMonth: action.payload
      };

    case DASHBOARD_ACTIONS.SET_SELECTED_YEAR:
      return {
        ...state,
        selectedYear: action.payload
      };

    case DASHBOARD_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case DASHBOARD_ACTIONS.REFRESH_DATA:
      return {
        ...state,
        lastUpdated: new Date().toISOString()
      };

    case DASHBOARD_ACTIONS.UPDATE_INVENTORY_DATA:
      return {
        ...state,
        dashboardData: {
          ...state.dashboardData,
          inventory: {
            ...state.dashboardData.inventory,
            ...action.payload
          }
        }
      };

    default:
      return state;
  }
};

// Create context
const DashboardContext = createContext();

// Provider component
export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Fetch dashboard analytics
  const fetchDashboardData = useCallback(async (month, year) => {
    const targetMonth = month || state.selectedMonth;
    const targetYear = year || state.selectedYear;
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      
      const response = await dashboardAPI.getDashboardData(targetMonth, targetYear);
      
      // Handle both direct data response and success wrapper
      if (response.success !== false) {
        const data = response.data || response;
        
        // Transform the API response to match our expected structure
        const transformedData = {
          inventory: {
            totalProducts: 0, // Will be fetched separately
            totalUnits: 0,
            lowStockProducts: 0,
            replenishmentPending: 0
          },
          salesOverview: {
            totalRevenue: data.salesOverview?.total_revenue || 0,
            totalOrders: data.salesOverview?.total_orders || 0,
            totalUnitsSold: data.salesOverview?.total_units_sold || 0,
            totalCustomers: data.salesOverview?.total_customers || 0
          },
          salesActivity: data.salesActivity || {
            toBePack: 0,
            toBeShipped: 0,
            outForDelivery: 0
          },
          topSellingProducts: data.topSellingProducts || [],
          recentActivity: data.recentActivity || []
        };
        
        dispatch({ 
          type: DASHBOARD_ACTIONS.SET_DASHBOARD_DATA, 
          payload: transformedData 
        });
        
        // Also fetch inventory data
        fetchInventoryData();
      } else {
        dispatch({ 
          type: DASHBOARD_ACTIONS.SET_ERROR, 
          payload: response.message || 'Failed to fetch dashboard data' 
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Provide fallback data for development
      const fallbackData = {
        inventory: {
          totalProducts: 0,
          totalUnits: 0,
          lowStockProducts: 0,
          replenishmentPending: 0
        },
        salesOverview: {
          totalRevenue: 0,
          totalOrders: 0,
          totalUnitsSold: 0,
          totalCustomers: 0
        },
        salesActivity: {
          toBePack: 0,
          toBeShipped: 0,
          outForDelivery: 0
        },
        topSellingProducts: [],
        recentActivity: []
      };
      
      dispatch({ 
        type: DASHBOARD_ACTIONS.SET_DASHBOARD_DATA, 
        payload: fallbackData 
      });
      
      // Still set error for user awareness
      dispatch({ 
        type: DASHBOARD_ACTIONS.SET_ERROR, 
        payload: 'Using offline data - API not available' 
      });
    }
  }, [state.selectedMonth, state.selectedYear]);

  // Fetch inventory data for dashboard
  const fetchInventoryData = useCallback(async () => {
    try {
      const response = await inventoryAPI.getInventory();
      
      // Handle different response structures
      let inventory = [];
      if (response && Array.isArray(response)) {
        inventory = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        inventory = response.data;
      } else if (response && response.success !== false && response.data) {
        inventory = response.data;
      }
      
      const totalProducts = inventory.length || 0;
      const lowStockProducts = inventory.filter(item => (item.stock_quantity || item.quantity || 0) <= 10).length || 0;
      const totalUnits = inventory.reduce((sum, item) => sum + (item.stock_quantity || item.quantity || 0), 0);
      
      // Update inventory data in dashboard
      dispatch({ 
        type: DASHBOARD_ACTIONS.UPDATE_INVENTORY_DATA, 
        payload: {
          totalProducts,
          totalUnits,
          lowStockProducts,
          replenishmentPending: 0 // Could be calculated based on low stock
        }
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      // Don't set error for inventory data as it's not critical for dashboard
    }
  }, []);

  // Fetch available months
  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await dashboardAPI.getAvailableMonths();
      
      if (response.success) {
        dispatch({ 
          type: DASHBOARD_ACTIONS.SET_DASHBOARD_DATA, 
          payload: { 
            ...state.dashboardData, 
            availableMonths: response.data 
          } 
        });
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  }, [state.dashboardData]);

  // Update date range
  const updateDateRange = useCallback((month, year) => {
    dispatch({ type: DASHBOARD_ACTIONS.SET_SELECTED_MONTH, payload: month });
    dispatch({ type: DASHBOARD_ACTIONS.SET_SELECTED_YEAR, payload: year });
    fetchDashboardData(month, year);
  }, [fetchDashboardData]);

  // Refresh data
  const refreshData = useCallback(() => {
    dispatch({ type: DASHBOARD_ACTIONS.REFRESH_DATA });
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: DASHBOARD_ACTIONS.CLEAR_ERROR });
  }, []);

  // Get sales reports
  const getSalesReports = useCallback(async (startDate, endDate) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      
      const response = await dashboardAPI.getSalesReports(startDate, endDate);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch sales reports');
      }
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      dispatch({ 
        type: DASHBOARD_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to fetch sales reports' 
      });
      throw error;
    }
  }, []);

  // Get inventory reports
  const getInventoryReports = useCallback(async (startDate, endDate) => {
    try {
      dispatch({ type: DASHBOARD_ACTIONS.SET_LOADING, payload: true });
      
      const response = await dashboardAPI.getInventoryReports(startDate, endDate);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch inventory reports');
      }
    } catch (error) {
      console.error('Error fetching inventory reports:', error);
      dispatch({ 
        type: DASHBOARD_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to fetch inventory reports' 
      });
      throw error;
    }
  }, []);

  // Calculate trend indicators
  const getTrendIndicator = useCallback((current, previous) => {
    if (!previous || previous === 0) return { direction: 'neutral', percentage: 0 };
    
    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
    
    return { direction, percentage: Math.abs(percentage) };
  }, []);

  // Get status color for orders
  const getStatusColor = useCallback((status) => {
    const statusColors = {
      'Order Placed': '#17a2b8',
      'Order Paid': '#28a745',
      'To Be Packed': '#ffc107',
      'Order Shipped Out': '#007bff',
      'Ready for Delivery': '#6f42c1',
      'Order Received': '#20c997',
      'Completed': '#28a745',
      'Cancelled': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  // Format number
  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat('en-PH').format(num);
  }, []);

  // Format date
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  // Format time
  const formatTime = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const value = {
    ...state,
    fetchDashboardData,
    fetchInventoryData,
    fetchAvailableMonths,
    updateDateRange,
    refreshData,
    clearError,
    getSalesReports,
    getInventoryReports,
    getTrendIndicator,
    getStatusColor,
    formatCurrency,
    formatNumber,
    formatDate,
    formatTime
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
