import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [carts, setCarts] = useState({
    default: { name: 'Principal', items: [] }
  });
  const [activeCartId, setActiveCartId] = useState('default');

  const activeCart = carts[activeCartId] || carts.default || { name: 'Principal', items: [] };
  const cart = Array.isArray(activeCart.items) ? activeCart.items : [];

  const addItem = (item) => {
    setCarts((prevCarts) => {
      const active = prevCarts[activeCartId] || { name: 'Principal', items: [] };
      const prev = active.items;
      const existing = prev.find((i) => i.nombre === item.nombre);
      let newItems;
      if (existing) {
        newItems = prev.map((i) =>
          i.nombre === item.nombre ? { ...i, qty: i.qty + 1 } : i
        );
      } else {
        newItems = [...prev, { ...item, qty: 1 }];
      }
      return {
        ...prevCarts,
        [activeCartId]: { ...active, items: newItems }
      };
    });
  };

  const removeItem = (nombre) => {
    setCarts((prevCarts) => {
      const active = prevCarts[activeCartId] || { name: 'Principal', items: [] };
      const newItems = active.items.filter((i) => i.nombre !== nombre);
      return {
        ...prevCarts,
        [activeCartId]: { ...active, items: newItems }
      };
    });
  };

  const updateQty = (nombre, delta) => {
    setCarts((prevCarts) => {
      const active = prevCarts[activeCartId] || { name: 'Principal', items: [] };
      const newItems = active.items.map((i) => {
        if (i.nombre === nombre) {
          const newQty = Math.max(0, i.qty + delta);
          return { ...i, qty: newQty };
        }
        return i;
      }).filter((i) => i.qty > 0);
      return {
        ...prevCarts,
        [activeCartId]: { ...active, items: newItems }
      };
    });
  };

  const clearCart = () => {
    setCarts((prevCarts) => {
      const active = prevCarts[activeCartId] || { name: 'Principal', items: [] };
      return {
        ...prevCarts,
        [activeCartId]: { ...active, items: [] }
      };
    });
  };

  // Métodos multicarrito
  const createCart = (name) => {
    const id = `cart_${Date.now()}`;
    setCarts((prev) => ({
      ...prev,
      [id]: { name: name.trim(), items: [] }
    }));
    setActiveCartId(id);
    return id;
  };

  const switchCart = (id) => {
    if (carts[id]) {
      setActiveCartId(id);
    }
  };

  const deleteCart = (id) => {
    setCarts((prev) => {
      const copy = { ...prev };
      delete copy[id];
      // Si borramos todo y no queda nada, recreamos el Principal
      if (Object.keys(copy).length === 0) {
        copy.default = { name: 'Principal', items: [] };
      }
      return copy;
    });

    const cartIds = Object.keys(carts);
    if (activeCartId === id) {
      const remainingIds = cartIds.filter((cid) => cid !== id);
      if (remainingIds.length > 0) {
        setActiveCartId(remainingIds[0]);
      } else {
        setActiveCartId('default');
      }
    }
  };

  const total = cart.reduce((acc, item) => acc + item.precio * item.qty, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addItem, 
      removeItem, 
      updateQty, 
      clearCart, 
      total,
      carts,
      activeCartId,
      createCart,
      switchCart,
      deleteCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
