import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the web server API
// Using deployed DigitalOcean static app server
const getBaseURL = () => {
  // Always use production server (deployed on DigitalOcean)
  return 'https://staticwrapntrack-b3akc.ondigitalocean.app/wrap-n-track-website-server/api';
  
  // Uncomment below to use local server for development
  // if (Platform.OS === 'android') {
  //   return 'http://192.168.1.14:3001/api';
  // } else {
  //   return 'http://localhost:3001/api';
  // }
};

const BASE_URL = getBaseURL();

// Log the base URL for debugging
console.log('API Base URL:', BASE_URL);

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased timeout for production server
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token and logging
api.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`Full URL: ${config.baseURL}${config.url}`);
    console.log('Platform:', Platform.OS);
    
    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      try {
        // Clear stored auth data
        await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
        console.log('Token expired, cleared auth data');
      } catch (storageError) {
        console.error('Error clearing auth data:', storageError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to try multiple URLs
const tryMultipleUrls = async (endpoint, urls) => {
  for (const url of urls) {
    try {
      console.log(`Trying URL: ${url}${endpoint}`);
      const response = await axios.get(`${url}${endpoint}`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(`Success with URL: ${url}${endpoint}`);
      return response.data;
    } catch (error) {
      console.log(`Failed with URL: ${url}${endpoint}`, error.message);
      if (url === urls[urls.length - 1]) {
        // Last URL failed, throw the error
        throw error;
      }
    }
  }
};

// API endpoints
export const inventoryAPI = {
  // Get all inventory items (using public endpoint)
  getInventory: async () => {
    try {
      const response = await api.get('/public/inventory');
      // Backend returns array directly
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },

  // Get all inventory items (using public endpoint) - alias
  getAllInventory: async () => {
    try {
      const response = await api.get('/public/inventory');
      // Backend returns array directly
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },

  // Get inventory by category
  getInventoryByCategory: async (category) => {
    try {
      const response = await api.get(`/inventory?category=${category}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory by category:', error);
      throw error;
    }
  },

  // Get single inventory item by SKU
  getInventoryItem: async (sku) => {
    try {
      const response = await api.get(`/inventory/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error;
    }
  },

  // Search inventory items
  searchInventory: async (query) => {
    try {
      const response = await api.get(`/inventory?search=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error searching inventory:', error);
      throw error;
    }
  },

  // Add/Update inventory item (employee only)
  addInventoryItem: async (itemData) => {
    try {
      const response = await api.post('/inventory', itemData);
      return response.data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  },

  // Update inventory item
  updateInventoryItem: async (sku, itemData) => {
    try {
      const response = await api.put(`/inventory/${sku}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },

  // Adjust stock levels
  adjustStock: async (sku, adjustment) => {
    try {
      const response = await api.put(`/inventory/${sku}/adjust`, adjustment);
      return response.data;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  },

  // Delete inventory item
  deleteProduct: async (sku) => {
    try {
      const response = await api.delete(`/inventory/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },

  // Add stock to existing product
  addStock: async (sku, quantity) => {
    try {
      const response = await api.put(`/inventory/${sku}/add-stock`, { quantity });
      return response.data;
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  }
};

// Cart API endpoints
export const cartAPI = {
  // Add item to cart
  addToCart: async (item) => {
    try {
      const response = await api.post('/cart/add', item);
      return response.data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  // Get cart items
  getCartItems: async () => {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  },

  // Update cart item quantity
  updateCartItem: async (sku, quantity) => {
    try {
      const response = await api.put(`/cart/${sku}`, { quantity });
      return response.data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },

  // Remove item from cart
  removeFromCart: async (sku) => {
    try {
      const response = await api.delete(`/cart/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      const response = await api.delete('/cart');
      return response.data;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },

  // Checkout cart
  checkout: async (checkoutData) => {
    try {
      const response = await api.post('/cart/checkout', checkoutData);
      return response.data;
    } catch (error) {
      console.error('Error checking out cart:', error);
      throw error;
    }
  }
};

// Order API endpoints
export const orderAPI = {
  // Create order
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Get user orders (returns array directly)
  getUserOrders: async () => {
    try {
      const response = await api.get('/orders');
      // Backend returns array directly, not wrapped in success/data
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get order by ID
  getOrder: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.put(`/orders/${orderId}`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Get order history
  getOrderHistory: async (filters) => {
    try {
      const response = await api.get('/orders/history', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }
};

// Auth API endpoints
export const authAPI = {
  // Login (unified for both customers and employees)
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/customer/login', {
        username,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  // Customer registration
  register: async (userData) => {
    try {
      const response = await api.post('/auth/customer/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },

  // Email verification
  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/customer/verify', { token });
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  },

  // Logout (client-side only, server doesn't need logout endpoint)
  logout: async () => {
    // This is handled client-side by clearing the token
    return { success: true };
  },

  // Verify token
  verifyToken: async (token) => {
    try {
      const response = await api.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }
};

// Dashboard API endpoints
export const dashboardAPI = {
  // Get dashboard data
  getDashboardData: async (month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
    try {
      const response = await api.get('/dashboard/analytics', {
        params: { month, year }
      });
      // Handle nested data structure from backend
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Get available months
  getAvailableMonths: async () => {
    try {
      const response = await api.get('/dashboard/available-months');
      // Handle nested data structure
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching available months:', error);
      throw error;
    }
  },

  // Get sales reports
  getSalesReports: async (dateRange) => {
    try {
      const response = await api.get('/sales-reports', {
        params: dateRange
      });
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      throw error;
    }
  },

  // Get inventory reports
  getInventoryReports: async () => {
    try {
      const response = await api.get('/inventory-reports');
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory reports:', error);
      throw error;
    }
  }
};

// Customer API endpoints
export const customerAPI = {
  // Get all customers (returns array directly)
  getCustomers: async () => {
    try {
      const response = await api.get('/customers');
      // Backend returns array directly
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Get customer by ID
  getCustomer: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (customerId, data) => {
    try {
      const response = await api.put(`/customers/${customerId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }
};

// Supplier API endpoints
export const supplierAPI = {
  // Get all suppliers
  getSuppliers: async () => {
    try {
      const response = await api.get('/suppliers');
      return response.data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },

  // Get supplier by ID
  getSupplier: async (supplierId) => {
    try {
      const response = await api.get(`/suppliers/${supplierId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  },

  // Add supplier
  addSupplier: async (data) => {
    try {
      const response = await api.post('/suppliers', data);
      return response.data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  },

  // Update supplier
  updateSupplier: async (supplierId, data) => {
    try {
      const response = await api.put(`/suppliers/${supplierId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }
};




// Notification API endpoints
export const notificationAPI = {
  // Get notifications
  getNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};

export default api;
