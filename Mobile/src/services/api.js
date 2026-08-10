import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Base URL for the web server API
const getBaseURL = () => {
  // For web platform (react-native-web) — use window.location.hostname to detect
  // if the app is accessed from a real device over LAN (e.g. Samsung S10+ at 192.168.1.100:8081)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const webHost = window.location.hostname;
    if (webHost && webHost !== 'localhost' && webHost !== '127.0.0.1') {
      // Real device accessing via LAN IP — use same IP for API
      return `http://${webHost}:3001/api`;
    }
    // Local web dev
    return 'http://localhost:3001/api';
  }

  // When using Expo Go on a real Android phone (e.g. Samsung S10+ via QR code),
  // extract the dev machine's LAN IP from Constants (e.g., 192.168.1.100:8081 -> 192.168.1.100)
  const hostUri = Constants?.manifest?.hostUri || Constants?.expoConfig?.hostUri || '';
  const host = hostUri.split(':')[0];

  if (Platform.OS === 'android') {
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      // Real Android device connected via Expo Go (QR code / LAN tunnel)
      return `http://${host}:3001/api`;
    }
    // Android emulator: 10.0.2.2 routes to host machine's localhost
    return 'http://10.0.2.2:3001/api';
  }
  // iOS simulator
  return 'http://localhost:3001/api';
};

const BASE_URL = getBaseURL();

// Log the base URL for debugging
console.log('API Base URL:', BASE_URL);

// Same host as BASE_URL, just ws(s):// and /ws instead of http(s):// and /api —
// keeps the WebSocket URL in lockstep with wherever the REST API actually is,
// so real-time inventory sync (see InventoryContext) doesn't need its own
// host-detection logic.
export const getWsUrl = () => BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws';

// Logout handler — set by AuthContext so the interceptor can trigger a proper logout
let _logoutHandler = null;
export const setLogoutHandler = (fn) => { _logoutHandler = fn; };

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
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
    
    if (error.response?.status === 401) {
      if (_logoutHandler) {
        _logoutHandler();
      } else {
        try {
          await AsyncStorage.multiRemove(['authToken', 'userData', 'userType']);
          console.log('Token expired, cleared auth data');
        } catch (storageError) {
          console.error('Error clearing auth data:', storageError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

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
        throw error;
      }
    }
  }
};

export const inventoryAPI = {
  getInventory: async () => {
    try {
      const response = await api.get('/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },
  getAllInventory: async () => {
    try {
      const response = await api.get('/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  },
  getInventoryItems: async () => {
    try {
      const response = await api.get('/inventory');
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },
  getInventoryByCategory: async (category) => {
    try {
      const response = await api.get(`/inventory?category=${category}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory by category:', error);
      throw error;
    }
  },
  getInventoryItem: async (sku) => {
    try {
      const response = await api.get(`/inventory/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory item:', error);
      throw error;
    }
  },
  getInventoryItemById: async (id) => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching inventory item by id:', error);
      throw error;
    }
  },
  scanInventoryCode: async (code) => {
    try {
      const encodedCode = encodeURIComponent(String(code || '').trim());
      const response = await api.get(`/inventory/scan/${encodedCode}`);
      return response.data;
    } catch (error) {
      console.error('Error scanning inventory code:', error);
      throw error;
    }
  },
  searchInventory: async (query) => {
    try {
      const response = await api.get(`/inventory?search=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error searching inventory:', error);
      throw error;
    }
  },
  addInventoryItem: async (itemData) => {
    try {
      const response = await api.post('/inventory', itemData);
      return response.data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  },
  updateInventoryItem: async (sku, itemData) => {
    try {
      const response = await api.put(`/inventory/${sku}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  },
  adjustStock: async (sku, adjustment) => {
    try {
      const response = await api.put(`/inventory/${sku}/adjust`, adjustment);
      return response.data;
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  },
  deleteProduct: async (sku) => {
    try {
      const response = await api.delete(`/inventory/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },
  addStock: async (sku, quantity, reason = '') => {
    try {
      const response = await api.post('/inventory/add-stock', { sku, quantity, reason });
      return response.data;
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  },
  stockIn: async (productId, quantity, reason = '', source = 'manual') => {
    try {
      const response = await api.post('/inventory/add-stock', { sku: productId, quantity, reason, source });
      return response.data;
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  },
  stockOut: async (productId, quantity, reason = '', source = 'manual') => {
    try {
      const response = await api.post('/inventory/stock-out', { sku: productId, quantity, reason, source });
      return response.data;
    } catch (error) {
      console.error('Error removing stock:', error);
      throw error;
    }
  }
};

export const cartAPI = {
  addToCart: async (item) => {
    try {
      const response = await api.post('/cart/add', item);
      return response.data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },
  getCartItems: async () => {
    try {
      const response = await api.get('/cart');
      return response.data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  },
  updateCartItem: async (sku, quantity) => {
    try {
      const response = await api.put(`/cart/${sku}`, { quantity });
      return response.data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },
  removeFromCart: async (sku) => {
    try {
      const response = await api.delete(`/cart/${sku}`);
      return response.data;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },
  clearCart: async () => {
    try {
      const response = await api.delete('/cart');
      return response.data;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },
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

export const orderAPI = {
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },
  getUserOrders: async () => {
    try {
      const response = await api.get('/orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },
  getOrder: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },
  updateOrderStatus: async (orderId, status, extra = {}) => {
    try {
      const response = await api.put(`/order-management/orders/${orderId}/status`, {
        status,
        notes: extra.notes,
        payment_method: extra.payment_method,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },
  getOrderHistory: async (filters) => {
    try {
      const response = await api.get('/orders/history', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  }
};

export const authAPI = {
  login: async (username, password) => {
    try {
      const response = await api.post('/auth/customer/login', { username, password });
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },
  register: async (userData) => {
    try {
      const response = await api.post('/auth/customer/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },
  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/customer/verify', { token });
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  },
  logout: async () => {
    return { success: true };
  },
  verifyToken: async (token) => {
    try {
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  },
  changeCustomerPassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/customer/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error changing customer password:', error);
      throw error;
    }
  },
  changeEmployeePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/user/change-password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error changing employee password:', error);
      throw error;
    }
  },
  changePasswordWithCurrent: async (username, currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password-with-current', { username, currentPassword, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};

export const dashboardAPI = {
  getDashboardData: async (month = new Date().getMonth() + 1, year = new Date().getFullYear()) => {
    try {
      const response = await api.get('/dashboard/analytics', { params: { month, year } });
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },
  getAvailableMonths: async () => {
    try {
      const response = await api.get('/dashboard/available-months');
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching available months:', error);
      throw error;
    }
  },
  getSalesReports: async (dateRange) => {
    try {
      const response = await api.get('/sales-reports', { params: dateRange });
      if (response.data && response.data.success !== false) {
        return response.data.data || response.data;
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      throw error;
    }
  },
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

export const customerAPI = {
  getCustomers: async () => {
    try {
      const response = await api.get('/customers');
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },
  getCustomer: async (customerId) => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },
  addCustomer: async (data) => {
    try {
      const response = await api.post('/customers', data);
      return response.data;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },
  updateManagedCustomer: async (customerId, data) => {
    try {
      const response = await api.put(`/customers/${customerId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating managed customer:', error);
      throw error;
    }
  },
  deleteCustomer: async (customerId) => {
    try {
      const response = await api.delete(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },
  updateCustomer: async (customerId, data) => {
    try {
      const response = await api.put('/customer/profile', data);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },
  uploadProfilePicture: async (imageUri) => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const extension = filename.split('.').pop() || 'jpg';
      formData.append('profilePicture', {
        uri: imageUri,
        name: filename,
        type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      });
      const response = await api.post('/customer/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }
};

export const supplierAPI = {
  getSuppliers: async () => {
    try {
      const response = await api.get('/suppliers');
      return response.data;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }
  },
  getSupplier: async (supplierId) => {
    try {
      const response = await api.get(`/suppliers/${supplierId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      throw error;
    }
  },
  addSupplier: async (data) => {
    try {
      const response = await api.post('/suppliers', data);
      return response.data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  },
  updateSupplier: async (supplierId, data) => {
    try {
      const response = await api.put(`/suppliers/${supplierId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  },
  deleteSupplier: async (supplierId) => {
    try {
      const response = await api.delete(`/suppliers/${supplierId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }
};

export const customerOrderAPI = {
  getMyOrders: async () => {
    try {
      const response = await api.get('/customer-orders/orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  },
  getMyOrder: async (orderId) => {
    try {
      const response = await api.get(`/customer-orders/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer order:', error);
      throw error;
    }
  },
  getOrderTracking: async (orderId) => {
    try {
      const response = await api.get(`/customer-orders/tracking/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order tracking:', error);
      throw error;
    }
  },
};

export const invoiceAPI = {
  getOrderInvoices: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/invoices`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order invoices:', error);
      throw error;
    }
  },
  getInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },
  getPdfUrl: () => `${BASE_URL.replace('/api', '')}/api`,
};

export const notificationAPI = {
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },
};

export const deliveryAPI = {
  getDeliveries: async (filters = {}) => {
    const response = await api.get('/deliveries', { params: filters });
    return response.data;
  },
  getDelivery: async (orderId) => {
    const response = await api.get(`/deliveries/${encodeURIComponent(orderId)}`);
    return response.data;
  },
  getDeliveryHistory: async (orderId) => {
    const response = await api.get(`/deliveries/${encodeURIComponent(orderId)}/history`);
    return response.data;
  },
  getDeliveryModes: async () => {
    const response = await api.get('/deliveries/modes');
    return response.data;
  },
  updateDelivery: async (orderId, data) => {
    const response = await api.patch(`/deliveries/${encodeURIComponent(orderId)}`, data);
    return response.data;
  },
  uploadProof: async (orderId, imageUri) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'proof.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    formData.append('proof', {
      uri: imageUri,
      name: filename,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
    const response = await api.post(
      `/deliveries/${encodeURIComponent(orderId)}/proof`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};

export const accountManagementAPI = {
  getUsers: async (params = {}) => {
    const response = await api.get('/account-management/users', { params });
    return response.data;
  },
  getUser: async (userId) => {
    const response = await api.get(`/account-management/users/${userId}`);
    return response.data;
  },
  createUser: async (data) => {
    const response = await api.post('/account-management/users', data);
    return response.data;
  },
  updateUser: async (userId, data) => {
    const response = await api.put(`/account-management/users/${userId}`, data);
    return response.data;
  },
  archiveUser: async (userId) => {
    const response = await api.patch(`/account-management/users/${userId}/archive`);
    return response.data;
  },
  restoreUser: async (userId) => {
    const response = await api.patch(`/account-management/users/${userId}/restore`);
    return response.data;
  },
  resetPassword: async (userId, newPassword) => {
    const response = await api.patch(`/account-management/users/${userId}/reset-password`, { newPassword });
    return response.data;
  },
};

// Mirrors Website/server/routes/sales-reports.js — same endpoints the Web
// Sales Overview page (SalesReport.js) uses, so Mobile shows identical figures.
export const salesReportsAPI = {
  getOverview: async (startDate, endDate) => {
    const response = await api.get('/sales-reports/overview', { params: { startDate, endDate } });
    return response.data;
  },
  getTopProducts: async (startDate, endDate, limit = 8) => {
    const response = await api.get('/sales-reports/top-products', { params: { startDate, endDate, limit } });
    return response.data;
  },
  getTrends: async (startDate, endDate, groupBy = 'day') => {
    const response = await api.get('/sales-reports/trends', { params: { startDate, endDate, groupBy } });
    return response.data;
  },
  getRecent: async (limit = 10) => {
    const response = await api.get('/sales-reports/recent', { params: { limit } });
    return response.data;
  },
};

// Mirrors Website/server/routes/inventory-reports.js — same endpoints the Web
// Inventory Report page (InventoryReport.js) uses.
export const inventoryReportsAPI = {
  getSummary: async () => {
    const response = await api.get('/inventory-reports/summary');
    return response.data;
  },
  getLowStock: async () => {
    const response = await api.get('/inventory-reports/low-stock');
    return response.data;
  },
  getExpiring: async () => {
    const response = await api.get('/inventory-reports/expiring');
    return response.data;
  },
  getCategoryBreakdown: async () => {
    const response = await api.get('/inventory-reports/category-breakdown');
    return response.data;
  },
};

export default api;
