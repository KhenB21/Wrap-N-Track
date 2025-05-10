import React, { createContext, useState } from 'react';

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]); // Shared state for inventory items

  const addItem = (newItem) => {
    setItems((prevItems) => [...prevItems, newItem]);
  };

  return (
    <InventoryContext.Provider value={{ items, addItem }}>
      {children}
    </InventoryContext.Provider>
  );
};