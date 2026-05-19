import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addItem = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.nombre === item.nombre);
      if (existing) {
        return prev.map((i) =>
          i.nombre === item.nombre ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (nombre) => {
    setCart((prev) => prev.filter((i) => i.nombre !== nombre));
  };

  const updateQty = (nombre, delta) => {
    setCart((prev) => {
      return prev.map((i) => {
        if (i.nombre === nombre) {
          const newQty = Math.max(0, i.qty + delta);
          return { ...i, qty: newQty };
        }
        return i;
      }).filter((i) => i.qty > 0);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((acc, item) => acc + item.precio * item.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
