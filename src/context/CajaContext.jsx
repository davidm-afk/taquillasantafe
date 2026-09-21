import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const CajaContext = createContext();

const getTodayStr = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
};

export const CajaProvider = ({ children }) => {
  // cajas: { Taquilla: true/false, Cafeteria: true/false, Eventos: true/false }
  const [cajasAbiertas, setCajasAbiertas] = useState({
    Taquilla: false,
    Cafeteria: false,
    Eventos: false,
  });

  // Escucha en tiempo real las 3 cajas del día de hoy
  useEffect(() => {
    const today = getTodayStr();
    const roles = ['Taquilla', 'Cafeteria', 'Eventos'];

    const unsubs = roles.map((rol) => {
      const ref = doc(db, 'cajas', `${rol}_${today}`);
      return onSnapshot(ref, (snap) => {
        setCajasAbiertas((prev) => ({
          ...prev,
          [rol]: snap.exists() && snap.data().abierta === true,
        }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, []);

  const abrirCaja = useCallback(async (rol) => {
    const today = getTodayStr();
    const ref = doc(db, 'cajas', `${rol}_${today}`);
    await setDoc(ref, {
      rol,
      fecha: today,
      apertura: Date.now(),
      abierta: true,
    });
  }, []);

  const isCajaAbierta = useCallback(
    (rol) => cajasAbiertas[rol] === true,
    [cajasAbiertas]
  );

  return (
    <CajaContext.Provider value={{ cajasAbiertas, abrirCaja, isCajaAbierta }}>
      {children}
    </CajaContext.Provider>
  );
};

export const useCaja = () => useContext(CajaContext);
