import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs
} from 'firebase/firestore';

// Productos semilla iniciales (solo se cargan si Firestore está vacío)
import { taquillaProducts, cafeteriaProducts } from '../data/products';

const ProductosContext = createContext();

// Estructura de seed para Firestore
const buildSeed = () => {
  const seed = [];

  // Taquilla - Entradas
  taquillaProducts.entradas.forEach(p => {
    seed.push({ area: 'Taquilla', categoria: 'Entradas', nombre: p.nombre, precio: p.precio, emoji: p.emoji || '🎟️', subtitle: p.subtitle || '', activo: true, duration: p.duration || 0, incCalcetas: p.incCalcetas || 0, precioAbierto: p.precioAbierto || false });
  });

  // Taquilla - Adicionales
  taquillaProducts.adicionales.forEach(p => {
    seed.push({ area: 'Taquilla', categoria: 'Adicionales', nombre: p.nombre, precio: p.precio, emoji: p.emoji || '➕', subtitle: p.subtitle || '', activo: true, precioAbierto: p.precioAbierto || false });
  });

  // Cafetería - Bebidas
  cafeteriaProducts.bebidas.forEach(p => {
    seed.push({ area: 'Cafeteria', categoria: 'Bebidas', nombre: p.nombre, precio: p.precio, emoji: '🥤', subtitle: p.subtitle || '', activo: true });
  });

  // Cafetería - Comida
  cafeteriaProducts.comida.forEach(p => {
    seed.push({ area: 'Cafeteria', categoria: 'Comida', nombre: p.nombre, precio: p.precio, emoji: '🍔', subtitle: p.subtitle || '', activo: true });
  });

  // Cafetería - Combos
  cafeteriaProducts.combos.forEach(p => {
    seed.push({ area: 'Cafeteria', categoria: 'Combos', nombre: p.nombre, precio: p.precio, emoji: '🍱', subtitle: p.subtitle || '', activo: true });
  });

  // Eventos - Paquetes (simplificados: nombre libre + precio fijo)
  const paquetesEventos = [
    { nombre: 'VIP L-J', precio: 0, emoji: '⭐', subtitle: 'Lunes a Jueves', activo: true },
    { nombre: 'VIP V-D', precio: 0, emoji: '⭐', subtitle: 'Viernes a Domingo', activo: true },
    { nombre: 'Platinum L-J', precio: 0, emoji: '💎', subtitle: 'Lunes a Jueves', activo: true },
    { nombre: 'Platinum V-D', precio: 0, emoji: '💎', subtitle: 'Viernes a Domingo', activo: true },
    { nombre: 'NTP $6299', precio: 6299, emoji: '🎉', subtitle: 'Niños Todo el Parque', activo: true },
    { nombre: 'NTP $6100', precio: 6100, emoji: '🎉', subtitle: 'Niños Todo el Parque', activo: true },
    { nombre: 'Grupos', precio: 0, emoji: '👥', subtitle: 'Precio especial grupos', activo: true },
    { nombre: 'Evento Privado', precio: 0, emoji: '🏛️', subtitle: 'Cierre de parque', activo: true },
  ];
  paquetesEventos.forEach(p => {
    seed.push({ area: 'Eventos', categoria: 'Paquetes', ...p });
  });

  return seed;
};

export const ProductosProvider = ({ children }) => {
  const [productos, setProductos] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  // Escucha en tiempo real la colección 'productos'
  useEffect(() => {
    const ref = collection(db, 'productos');
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.empty) {
        // Sembrar datos iniciales si está vacío
        const seed = buildSeed();
        for (const item of seed) {
          await addDoc(ref, item);
        }
      } else {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProductos(docs);
        setLoadingProductos(false);
      }
    });
    return () => unsub();
  }, []);

  const agregarProducto = useCallback(async (productoData) => {
    await addDoc(collection(db, 'productos'), { ...productoData, activo: true });
  }, []);

  const editarProducto = useCallback(async (id, cambios) => {
    await updateDoc(doc(db, 'productos', id), cambios);
  }, []);

  const toggleActivo = useCallback(async (id, estadoActual) => {
    await updateDoc(doc(db, 'productos', id), { activo: !estadoActual });
  }, []);

  const eliminarProducto = useCallback(async (id) => {
    await deleteDoc(doc(db, 'productos', id));
  }, []);

  // Helpers para obtener productos por área y categoría
  const getByArea = useCallback((area) => productos.filter(p => p.area === area), [productos]);
  const getActivos = useCallback((area) => productos.filter(p => p.area === area && p.activo !== false), [productos]);

  return (
    <ProductosContext.Provider value={{
      productos, loadingProductos,
      agregarProducto, editarProducto, toggleActivo, eliminarProducto,
      getByArea, getActivos
    }}>
      {children}
    </ProductosContext.Provider>
  );
};

export const useProductos = () => useContext(ProductosContext);
