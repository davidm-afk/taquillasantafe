import React, { createContext, useContext, useState, useEffect } from 'react';
import { usuariosPermitidos } from '../data/users';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('skyzone_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (nombre, pin) => {
    const validUser = usuariosPermitidos[nombre];
    if (validUser && validUser.pin === pin) {
      const userData = { nombre, rol: validUser.rol };
      setUser(userData);
      localStorage.setItem('skyzone_user', JSON.stringify(userData));
      return userData;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('skyzone_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
