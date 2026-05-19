import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usuariosPermitidos } from '../data/users';

const Login = () => {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!nombre) {
      setError('Por favor selecciona tu nombre.');
      return;
    }
    const user = login(nombre, pin);
    if (user) {
      if (user.rol === 'Taquilla') navigate('/taquilla');
      else if (user.rol === 'Cafeteria') navigate('/cafeteria');
      else if (user.rol === 'Admin') navigate('/admin');
    } else {
      setError('PIN incorrecto o usuario no válido.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="neu-box" style={{ padding: '3rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <img 
          src="/img/logo en png.png" 
          alt="Sky Zone Logo" 
          style={{ width: '180px', marginBottom: '20px' }} 
        />
        <h2 className="text-gradient-blue" style={{ margin: '0 0 5px 0', fontSize: '2rem' }}>SISTEMA POS</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase' }}>Sucursal Santa Fe</p>
        
        <form onSubmit={handleLogin}>
          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>USUARIO</label>
            <select 
              className="neu-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            >
              <option value="" disabled>Selecciona tu nombre</option>
              {Object.keys(usuariosPermitidos).map((userKey) => (
                <option key={userKey} value={userKey}>{userKey} ({usuariosPermitidos[userKey].rol})</option>
              ))}
            </select>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>PIN DE ACCESO</label>
            <input 
              type="password"
              className="neu-input"
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
            />
          </div>

          {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

          <button type="submit" className="neu-button" style={{ width: '100%', marginTop: '1rem', color: 'var(--accent-blue)', fontSize: '1.1rem' }}>
            ENTRAR AL SISTEMA
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
