import React, { createContext, useState } from "react";

export const SalesContext = createContext();

export const SalesProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);

  const addOrder = (order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
  };

  return (
    <SalesContext.Provider value={{ orders, addOrder }}>
      {children}
    </SalesContext.Provider>
  );
};
