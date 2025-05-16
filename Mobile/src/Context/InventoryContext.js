import React, { createContext, useState } from 'react';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]); // Shared state for inventory items

  const addItem = (newItem) => {
    setItems((prevItems) => [...prevItems, newItem]);
  };

  const removeItem = (itemToRemove) => {
    setItems((prev) => prev.filter((item) => item !== itemToRemove));
  };

  return (
    <InventoryContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </InventoryContext.Provider>
  );
};