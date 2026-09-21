import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

const CajaContext = createContext();

const getTodayStr = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
};

export const CajaProvider = ({ children }) => {
  // cajas: { Taquilla: { abierta: true }, Cafeteria: null, Eventos: null }
  const [cajasData, setCajasData] = useState({
    Taquilla: null,
    Cafeteria: null,
    Eventos: null,
  });

  // Escucha en tiempo real las 3 cajas del día de hoy
  useEffect(() => {
    const today = getTodayStr();
    const roles = ['Taquilla', 'Cafeteria', 'Eventos'];

    const unsubs = roles.map((rol) => {
      const ref = doc(db, 'cajas', `${rol}_${today}`);
      return onSnapshot(ref, (snap) => {
        setCajasData((prev) => ({
          ...prev,
          [rol]: snap.exists() ? snap.data() : null,
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
  const cerrarCaja = useCallback(async (rol, resumenCierre) => {
    const today = getTodayStr();
    const ref = doc(db, 'cajas', `${rol}_${today}`);
    await setDoc(ref, {
      cierre: Date.now(),
      abierta: false,
      resumenCierre
    }, { merge: true });
  }, []);
  const isCajaAbierta = useCallback(
    (rol) => cajasData[rol] && cajasData[rol].abierta === true,
    [cajasData]
  );

  return (
    <CajaContext.Provider value={{ cajasData, abrirCaja, cerrarCaja, isCajaAbierta }}>
      {children}
    </CajaContext.Provider>
  );
};

export const useCaja = () => useContext(CajaContext);
