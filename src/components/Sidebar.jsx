import React from 'react';
import { LogOut, Home, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ area }) => {
  const { user, logout } = useAuth();

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
        
        <button className="neu-button" style={{ padding: '15px', borderRadius: '50%', color: 'var(--accent-blue)' }} title="Inicio">
          <Home size={24} />
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
