import React, { createContext, useState } from "react";

export const SalesContext = createContext();

export const SalesProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);

  const addOrder = (order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
  };

  // Delete order by index or by unique id (if you have one)
  const deleteOrder = (orderToDelete) => {
    setOrders((prevOrders) =>
      prevOrders.filter((order) => order !== orderToDelete)
    );
  };

  return (
    <SalesContext.Provider value={{ orders, addOrder, deleteOrder }}>
      {children}
    </SalesContext.Provider>
  );
};
