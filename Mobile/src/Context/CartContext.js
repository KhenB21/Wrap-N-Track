import React, { createContext, useContext, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);

  const toggleFavorite = (item) => {
    if (!item.id) {
      console.error("Item must have a unique id to be added to favorites.");
      return;
    }
    setFavoriteItems((prev) => {
      const isFavorite = prev.some((favItem) => favItem.id === item.id);
      if (isFavorite) {
        return prev.filter((favItem) => favItem.id !== item.id);
      } else {
        return [
          ...prev,
          {
            ...item,
            price: item.price || "₱1,500",
            quantity: item.quantity || 1,
          },
        ];
      }
    });
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        setCartItems,
        favoriteItems,
        setFavoriteItems,
        toggleFavorite,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
