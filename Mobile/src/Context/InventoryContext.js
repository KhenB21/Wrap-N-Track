import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { inventoryAPI } from '../services/api';

const InventoryContext = createContext();

// Action types
const INVENTORY_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_INVENTORY: 'SET_INVENTORY',
  SET_ERROR: 'SET_ERROR',
  SET_SELECTED_PRODUCTS: 'SET_SELECTED_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  REMOVE_PRODUCT: 'REMOVE_PRODUCT',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  SET_CATEGORY_FILTER: 'SET_CATEGORY_FILTER',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
};

// Initial state
const initialState = {
  inventory: [],
  selectedProducts: [],
  quantities: {},
  loading: false,
  error: null,
  categoryFilter: null,
  searchQuery: '',
  filteredInventory: [],
};

// Reducer
const inventoryReducer = (state, action) => {
  switch (action.type) {
    case INVENTORY_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case INVENTORY_ACTIONS.SET_INVENTORY:
      return {
        ...state,
        inventory: action.payload,
        filteredInventory: action.payload,
        loading: false,
        error: null,
      };

    case INVENTORY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case INVENTORY_ACTIONS.SET_SELECTED_PRODUCTS:
      return {
        ...state,
        selectedProducts: action.payload,
      };

    case INVENTORY_ACTIONS.ADD_PRODUCT:
      const productToAdd = action.payload;
      const isAlreadySelected = state.selectedProducts.some(p => p.sku === productToAdd.sku);
      
      if (isAlreadySelected) {
        return state;
      }

      return {
        ...state,
        selectedProducts: [...state.selectedProducts, productToAdd],
        quantities: {
          ...state.quantities,
          [productToAdd.sku]: 1,
        },
      };

    case INVENTORY_ACTIONS.REMOVE_PRODUCT:
      const skuToRemove = action.payload;
      return {
        ...state,
        selectedProducts: state.selectedProducts.filter(p => p.sku !== skuToRemove),
        quantities: {
          ...state.quantities,
          [skuToRemove]: undefined,
        },
      };

    case INVENTORY_ACTIONS.UPDATE_QUANTITY:
      const { sku, quantity } = action.payload;
      return {
        ...state,
        quantities: {
          ...state.quantities,
          [sku]: Math.max(1, quantity),
        },
      };

    case INVENTORY_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selectedProducts: [],
        quantities: {},
      };

    case INVENTORY_ACTIONS.SET_CATEGORY_FILTER:
      const category = action.payload;
      const filteredByCategory = category 
        ? state.inventory.filter(item => item.category === category)
        : state.inventory;
      
      return {
        ...state,
        categoryFilter: category,
        filteredInventory: filteredByCategory,
      };

    case INVENTORY_ACTIONS.SET_SEARCH_QUERY:
      const query = action.payload.toLowerCase();
      const filteredBySearch = state.inventory.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
      
      return {
        ...state,
        searchQuery: query,
        filteredInventory: filteredBySearch,
      };

    default:
      return state;
  }
};

// Provider component
export const InventoryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  // Load inventory from API
  const loadInventory = useCallback(async () => {
    try {
      dispatch({ type: INVENTORY_ACTIONS.SET_LOADING, payload: true });
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
      
      dispatch({ type: INVENTORY_ACTIONS.SET_INVENTORY, payload: inventory });
    } catch (error) {
      console.error('Error loading inventory:', error);
      dispatch({ 
        type: INVENTORY_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to load inventory' 
      });
    }
  }, []);

  // Load inventory on mount - remove loadInventory from dependencies to prevent infinite loop
  useEffect(() => {
    loadInventory();
  }, []); // Empty dependency array - only run once on mount

  // Load inventory by category
  const loadInventoryByCategory = async (category) => {
    try {
      dispatch({ type: INVENTORY_ACTIONS.SET_LOADING, payload: true });
      const response = await inventoryAPI.getInventoryByCategory(category);
      
      if (response.success && response.inventory) {
        dispatch({ type: INVENTORY_ACTIONS.SET_INVENTORY, payload: response.inventory });
      } else {
        dispatch({ type: INVENTORY_ACTIONS.SET_INVENTORY, payload: response });
      }
    } catch (error) {
      console.error('Error loading inventory by category:', error);
      dispatch({ 
        type: INVENTORY_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to load inventory' 
      });
    }
  };

  // Search inventory
  const searchInventory = async (query) => {
    try {
      dispatch({ type: INVENTORY_ACTIONS.SET_LOADING, payload: true });
      const response = await inventoryAPI.searchInventory(query);
      
      if (response.success && response.inventory) {
        dispatch({ type: INVENTORY_ACTIONS.SET_INVENTORY, payload: response.inventory });
      } else {
        dispatch({ type: INVENTORY_ACTIONS.SET_INVENTORY, payload: response });
      }
    } catch (error) {
      console.error('Error searching inventory:', error);
      dispatch({ 
        type: INVENTORY_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to search inventory' 
      });
    }
  };

  // Product selection actions
  const addProduct = (product) => {
    dispatch({ type: INVENTORY_ACTIONS.ADD_PRODUCT, payload: product });
  };

  const removeProduct = (sku) => {
    dispatch({ type: INVENTORY_ACTIONS.REMOVE_PRODUCT, payload: sku });
  };

  const toggleProduct = (product) => {
    const isSelected = state.selectedProducts.some(p => p.sku === product.sku);
    if (isSelected) {
      removeProduct(product.sku);
    } else {
      addProduct(product);
    }
  };

  const updateQuantity = (sku, quantity) => {
    dispatch({ type: INVENTORY_ACTIONS.UPDATE_QUANTITY, payload: { sku, quantity } });
  };

  const clearSelection = () => {
    dispatch({ type: INVENTORY_ACTIONS.CLEAR_SELECTION });
  };

  const setCategoryFilter = (category) => {
    dispatch({ type: INVENTORY_ACTIONS.SET_CATEGORY_FILTER, payload: category });
  };

  const setSearchQuery = (query) => {
    dispatch({ type: INVENTORY_ACTIONS.SET_SEARCH_QUERY, payload: query });
  };

  // Get available categories
  const getCategories = () => {
    const categories = [...new Set(state.inventory.map(item => item.category))];
    return categories.filter(Boolean).sort();
  };

  // Get total selected items
  const getTotalSelectedItems = () => {
    return Object.values(state.quantities).reduce((total, qty) => total + qty, 0);
  };

  // Get total price
  const getTotalPrice = () => {
    return state.selectedProducts.reduce((total, product) => {
      const quantity = state.quantities[product.sku] || 1;
      return total + (product.unit_price * quantity);
    }, 0);
  };

  // Delete product
  const deleteProduct = async (sku) => {
    try {
      dispatch({ type: INVENTORY_ACTIONS.SET_LOADING, payload: true });
      await inventoryAPI.deleteProduct(sku);
      // Remove from local state
      dispatch({ type: INVENTORY_ACTIONS.REMOVE_PRODUCT, payload: sku });
    } catch (error) {
      console.error('Error deleting product:', error);
      dispatch({ 
        type: INVENTORY_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to delete product' 
      });
      throw error;
    }
  };

  // Add stock
  const addStock = async (sku, quantity) => {
    try {
      dispatch({ type: INVENTORY_ACTIONS.SET_LOADING, payload: true });
      await inventoryAPI.addStock(sku, quantity);
      // Refresh inventory
      await loadInventory();
    } catch (error) {
      console.error('Error adding stock:', error);
      dispatch({ 
        type: INVENTORY_ACTIONS.SET_ERROR, 
        payload: error.message || 'Failed to add stock' 
      });
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: INVENTORY_ACTIONS.SET_ERROR, payload: null });
  };

  const value = {
    // State
    ...state,
    
    // Actions
    fetchInventory: loadInventory, // Alias for compatibility
    loadInventory,
    loadInventoryByCategory,
    searchInventory,
    addProduct,
    removeProduct,
    toggleProduct,
    updateQuantity,
    clearSelection,
    setCategoryFilter,
    setSearchQuery,
    getCategories,
    getTotalSelectedItems,
    getTotalPrice,
    deleteProduct,
    addStock,
    clearError,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

// Custom hook to use inventory context
export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export default InventoryContext;
