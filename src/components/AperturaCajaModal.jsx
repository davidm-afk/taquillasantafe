import React, { useEffect, useState } from 'react';
import { useCaja } from '../context/CajaContext';

// Devuelve la clave de localStorage para saber si ya se preguntó hoy
const getStorageKey = (rol) => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const today = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
  return `caja_preguntada_${rol}_${today}`;
};

const COLORES_ROL = {
  Taquilla: 'var(--accent-orange)',
  Cafeteria: 'var(--accent-blue)',
  Eventos: '#a855f7',
};

const ICONOS_ROL = {
  Taquilla: '🎟️',
  Cafeteria: '☕',
  Eventos: '🎪',
};

const AperturaCajaModal = ({ rol }) => {
  const { isCajaAbierta, abrirCaja } = useCaja();
  const [visible, setVisible] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  useEffect(() => {
    if (!rol) return;
    // Solo mostrar si la caja no está ya abierta y no se ha preguntado hoy
    const key = getStorageKey(rol);
    const yaPreguntada = localStorage.getItem(key);
    if (!yaPreguntada && !isCajaAbierta(rol)) {
      setVisible(true);
    }
  }, [rol, isCajaAbierta]);

  const handleAbrir = async () => {
    setAbriendo(true);
    try {
      await abrirCaja(rol);
      localStorage.setItem(getStorageKey(rol), 'si');
    } catch (e) {
      console.error('Error al abrir caja:', e);
    }
    setVisible(false);
    setAbriendo(false);
  };

  const handleNoAbrir = () => {
    localStorage.setItem(getStorageKey(rol), 'no');
    setVisible(false);
  };

  if (!visible) return null;

  const color = COLORES_ROL[rol] || 'var(--accent-blue)';
  const icono = ICONOS_ROL[rol] || '🏪';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        background: 'var(--bg-color)',
        borderRadius: '20px',
        padding: '2.5rem',
        maxWidth: '420px',
        width: '90%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-light)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Ícono */}
        <div style={{
          fontSize: '3.5rem',
          marginBottom: '1rem',
          lineHeight: 1,
        }}>
          {icono}
        </div>

        {/* Título */}
        <h2 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.5rem',
          fontWeight: 800,
          color: color,
          letterSpacing: '-0.5px',
        }}>
          Apertura de Caja
        </h2>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          marginBottom: '0.25rem',
        }}>
          ¿Deseas abrir la caja de
        </p>
        <p style={{
          color: 'var(--text-main)',
          fontWeight: 700,
          fontSize: '1.2rem',
          marginBottom: '1.75rem',
        }}>
          {rol} — {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            id="btn-abrir-caja-si"
            onClick={handleAbrir}
            disabled={abriendo}
            style={{
              flex: 1,
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {abriendo ? 'Abriendo...' : '✅ Sí, abrir caja'}
          </button>

          <button
            id="btn-abrir-caja-no"
            onClick={handleNoAbrir}
            disabled={abriendo}
            style={{
              flex: 1,
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            ❌ No por ahora
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default AperturaCajaModal;
