import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Platform } from 'react-native';

export const InventoryContext = createContext();

const API_URL = Platform.select({
  ios: "http://localhost:3001",
  //   android: "http://10.0.2.2:3001", // if using emulator
  android: "http://192.168.100.34:3001", // if using physical device, change into pc's ip address
  default: "http://localhost:3001",
});

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventoryItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/inventory/items`);
      if (response.data.success) {
        setItems(response.data.items);
      } else {
        setError('Failed to fetch items: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      setError('Network or server error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const addItem = (newItem) => {
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const removeItem = (itemToRemove) => {
    setItems((prev) => prev.filter((item) => item.sku !== itemToRemove.sku));
  };

  return (
    <InventoryContext.Provider value={{ items, loading, error, addItem, removeItem, fetchInventoryItems }}>
      {children}
    </InventoryContext.Provider>
  );
};