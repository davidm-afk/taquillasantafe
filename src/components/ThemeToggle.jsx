import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const pathname = window.location.pathname;

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // El Sidebar ya incluye el toggle en todas las páginas autenticadas.
  // Solo mostramos el botón flotante en la pantalla de login.
  if (pathname !== '/') {
    return null;
  }

  return (
    <button 
      onClick={toggleTheme}
      className="neu-button"
      style={{
        position: 'fixed',
        bottom: '25px',
        left: '25px',
        zIndex: 9999,
        padding: '10px',
        borderRadius: '50%',
        width: '45px',
        height: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.3s ease',
        boxShadow: 'var(--shadow-light)'
      }}
      title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
    >
      {theme === 'light' ? (
        <Moon size={20} style={{ color: 'var(--text-main)' }} />
      ) : (
        <Sun size={20} style={{ color: 'var(--accent-warning)' }} />
      )}
    </button>
  );
};

export default ThemeToggle;
