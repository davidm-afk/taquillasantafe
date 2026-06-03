import React from 'react';
import { LogOut, Home, Sun, Moon, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ area }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = React.useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleHomeClick = () => {
    if (user?.rol === 'Taquilla') navigate('/taquilla');
    else if (user?.rol === 'Cafeteria') navigate('/cafeteria');
    else if (user?.rol === 'Admin') navigate('/admin');
    else if (user?.rol === 'Eventos') navigate('/eventos');
    else navigate('/');
  };

  return (
    <div className="neu-box" style={{ 
      width: '100px', 
      margin: '20px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px 0',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <img src="/img/logo2 en png.png" alt="Logo" style={{ width: '60px', opacity: 0.8 }} />
        
        <div style={{ width: '50px', height: '2px', backgroundColor: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)' }}></div>
        
        <button 
          className="neu-button" 
          onClick={handleHomeClick}
          style={{ padding: '15px', borderRadius: '50%', color: 'var(--accent-blue)', cursor: 'pointer' }} 
          title="Inicio"
        >
          <Home size={24} />
        </button>

        {(user?.rol === 'Taquilla' || user?.rol === 'Cafeteria' || user?.rol === 'Admin') && (
          <button 
            className="neu-button" 
            onClick={() => navigate('/inventario')}
            style={{ 
              padding: '15px', 
              borderRadius: '50%', 
              color: area === 'Inventario' ? 'var(--accent-success)' : 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }} 
            title="Inventario"
          >
            <Package size={24} />
          </button>
        )}

        <button 
          className="neu-button" 
          onClick={toggleTheme}
          style={{ 
            padding: '15px', 
            borderRadius: '50%', 
            color: theme === 'light' ? 'var(--text-main)' : 'var(--accent-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }} 
          title={theme === 'light' ? 'Activar Modo Oscuro' : 'Activar Modo Claro'}
        >
          {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{user?.nombre}</span>
        <button 
          className="neu-button" 
          onClick={logout}
          style={{ padding: '15px', borderRadius: '50%', color: 'var(--accent-danger)' }} 
          title="Cerrar Sesión"
        >
          <LogOut size={24} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
