import React, { createContext, useState, useEffect } from 'react';
import { getInventory, deleteInventoryItem, saveInventoryItem } from '../api/inventory';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await getInventory();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const saveItem = async (itemData) => {
    try {
      await saveInventoryItem(itemData);
      await fetchInventory(); // Refresh the list to get the latest data
    } catch (error) {
      console.error('Failed to save inventory item:', error);
      throw error; // Re-throw to allow the form to handle it (e.g., show a message)
    }
  };

  const removeItem = async (itemToRemove) => {
    try {
      await deleteInventoryItem(itemToRemove.sku);
      setItems((prev) => prev.filter((item) => item.sku !== itemToRemove.sku));
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      // Optionally, show an error message to the user
    }
  };

  return (
    <InventoryContext.Provider value={{ items, loading, saveItem, removeItem, fetchInventory }}>
      {children}
    </InventoryContext.Provider>
  );
};