import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { usuariosPermitidos } from '../data/users';

// ─── Ticket de Arqueo (portal al body, visible solo al imprimir) ─────────────
const TicketArqueo = ({ data, area }) => {
  if (!data) return null;
  const ahora = new Date();
  const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

  return createPortal(
    <div id="ticketArqueo" style={{ display: 'none' }}>
      <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
        <h1 style={{ margin: '0 0 2px 0', fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>SKY ZONE</h1>
        <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Sucursal Santa Fe</p>
        <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>REPORTE DE ARQUEO DE CAJA</p>
        <p style={{ margin: '0 0 4px 0', fontSize: '9px', textTransform: 'uppercase' }}>ÁREA: {area}</p>
      </div>
      <div style={{ borderBottom: '2px double #000', margin: '6px 0' }} />
      <div style={{ fontSize: '9px', fontFamily: 'monospace', lineHeight: 1.5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FECHA:</span><span>{ahora.toLocaleDateString('es-MX')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>HORA:</span><span>{ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>CAJERO:</span><span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{data.cajero || 'Desconocido'}</span>
        </div>
      </div>
      <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}>1. EFECTIVO</p>
      <div style={{ fontSize: '9.5px', fontFamily: 'monospace', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Registrado en sistema:</span><span>${fmt(data.efectivoRegistrado)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Contado en realidad:</span><span>${fmt(data.efectivoReal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '2px' }}>
          <span>Diferencia:</span>
          <span>
            {Math.abs(data.difEfectivo) < 0.01
              ? '$0.00 (Sin diferencia)'
              : data.difEfectivo > 0
              ? `+$${fmt(data.difEfectivo)} (Positiva / Sobrante)`
              : `-$${fmt(Math.abs(data.difEfectivo))} (Negativa / Faltante)`}
          </span>
        </div>
      </div>
      <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />

      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}>2. TARJETA (TERMINAL)</p>
      <div style={{ fontSize: '9.5px', fontFamily: 'monospace', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Registrado en sistema:</span><span>${fmt(data.tarjetaRegistrada)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Real en terminal:</span><span>${fmt(data.tarjetaReal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '2px' }}>
          <span>Diferencia:</span>
          <span>
            {Math.abs(data.difTarjeta) < 0.01
              ? '$0.00 (Sin diferencia)'
              : data.difTarjeta > 0
              ? `+$${fmt(data.difTarjeta)} (Positiva / Sobrante)`
              : `-$${fmt(Math.abs(data.difTarjeta))} (Negativa / Faltante)`}
          </span>
        </div>
      </div>
      <div style={{ borderBottom: '2px double #000', margin: '8px 0' }} />

      {/* TOTALES GENERALES */}
      <div style={{ fontSize: '9.5px', fontFamily: 'monospace', lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Registrado:</span>
          <span>${fmt(data.efectivoRegistrado + data.tarjetaRegistrada)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Real:</span>
          <span>${fmt(data.efectivoReal + data.tarjetaReal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10.5px', marginTop: '2px' }}>
          <span>Diferencia Neta:</span>
          <span>
            {Math.abs(data.difEfectivo + data.difTarjeta) < 0.01
              ? '$0.00'
              : (data.difEfectivo + data.difTarjeta) > 0
              ? `+$${fmt(data.difEfectivo + data.difTarjeta)} (Positiva)`
              : `-$${fmt(Math.abs(data.difEfectivo + data.difTarjeta))} (Negativa)`}
          </span>
        </div>
      </div>
      <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

      {data.notas ? (
        <>
          <p style={{ margin: '0 0 2px 0', fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold' }}>OBSERVACIONES:</p>
          <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{data.notas}</p>
          <div style={{ borderBottom: '1px dashed #000', margin: '6px 0' }} />
        </>
      ) : null}

      {/* FIRMAS DE CONFORMIDAD */}
      <div style={{ marginTop: '22px', fontSize: '9px', fontFamily: 'monospace' }}>
        <p style={{ textAlign: 'center', fontSize: '8.5px', fontWeight: 'bold', margin: '0 0 16px 0', textTransform: 'uppercase' }}>
          Firmas de Enterado y Conformidad
        </p>
        <div style={{ marginBottom: '26px', textAlign: 'center' }}>
          <div style={{ height: '35px' }}></div>
          <div style={{ borderBottom: '1px solid #000', width: '85%', margin: '0 auto 4px auto' }} />
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold' }}>FIRMA CAJERO</p>
          <span style={{ fontSize: '8px', color: '#333' }}>{data.cajero || ''}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '35px' }}></div>
          <div style={{ borderBottom: '1px solid #000', width: '85%', margin: '0 auto 4px auto' }} />
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold' }}>FIRMA ADMINISTRACIÓN</p>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '8px', fontFamily: 'monospace', color: '#444' }}>
        <p style={{ margin: 0 }}>* Documento generado por sistema POS SKY ZONE *</p>
        <p style={{ margin: 0 }}>{ahora.toLocaleDateString('es-MX')} {ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>,
    document.body
  );
};

// ─── Modal Principal de Arqueo ────────────────────────────────────────────────
const ArqueoModal = ({ area, cajeroNombre, onClose }) => {
  const [step, setStep] = useState('password'); // 'password' | 'arqueo'
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  const [loadingTotales, setLoadingTotales] = useState(false);
  const [efectivoRegistrado, setEfectivoRegistrado] = useState(0);
  const [tarjetaRegistrada, setTarjetaRegistrada] = useState(0);

  const [efectivoReal, setEfectivoReal] = useState('');
  const [tarjetaReal, setTarjetaReal] = useState('');
  const [notas, setNotas] = useState('');

  const [arqueoData, setArqueoData] = useState(null);
  const [printed, setPrinted] = useState(false);

  const cargarTotales = async () => {
    setLoadingTotales(true);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      // Consulta de un solo rango para evitar errores de índices compuestos en Firestore
      const q = query(
        collection(db, 'ventas'),
        where('timestamp', '>=', start.getTime()),
        where('timestamp', '<=', end.getTime())
      );
      const snapshot = await getDocs(q);
      let ef = 0, tgt = 0;
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        if (!area || d.area === area) {
          const ventaTotal = parseFloat(d.total || d.Total || 0);
          const metodo = (d.metodoPago || d['Método de Pago'] || '').toLowerCase();

          if (d.pagoEfectivo !== undefined) {
            ef += parseFloat(d.pagoEfectivo || 0);
            tgt += parseFloat(d.pagoTarjeta || 0) + parseFloat(d.pagoDebito || 0) + parseFloat(d.pagoCredito || 0);
          } else if (metodo === 'efectivo') {
            ef += ventaTotal;
          } else if (metodo === 'tarjeta' || metodo === 'debito' || metodo === 'credito') {
            tgt += ventaTotal;
          }
        }
      });
      setEfectivoRegistrado(ef);
      setTarjetaRegistrada(tgt);
    } catch (err) {
      console.error('Error al cargar totales del arqueo:', err);
    } finally {
      setLoadingTotales(false);
    }
  };

  const handleVerificarPassword = (e) => {
    e.preventDefault();
    const adminUser = usuariosPermitidos['Admin'];
    if (adminUser && password === adminUser.pin) {
      setPassError('');
      setStep('arqueo');
      cargarTotales();
    } else {
      setPassError('Contraseña de administrador incorrecta.');
      setPassword('');
    }
  };

  const efReal = efectivoReal !== '' ? parseFloat(efectivoReal) || 0 : null;
  const tgtReal = tarjetaReal !== '' ? parseFloat(tarjetaReal) || 0 : null;

  const difEfectivo = efReal !== null ? efReal - efectivoRegistrado : 0;
  const difTarjeta = tgtReal !== null ? tgtReal - tarjetaRegistrada : 0;

  const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });

  const colorDif = (dif) => {
    if (Math.abs(dif) < 0.01) return 'var(--accent-success)';
    if (dif > 0) return 'var(--accent-blue)';
    return 'var(--accent-danger)';
  };

  const textoDif = (dif) => {
    if (Math.abs(dif) < 0.01) return '✅ $0.00 (Sin diferencia)';
    if (dif > 0) return `📈 +$${fmt(dif)} (Positiva / Sobrante)`;
    return `📉 -$${fmt(Math.abs(dif))} (Negativa / Faltante)`;
  };

  const handleImprimir = () => {
    const data = {
      cajero: cajeroNombre,
      efectivoRegistrado,
      efectivoReal: efReal !== null ? efReal : 0,
      difEfectivo,
      tarjetaRegistrada,
      tarjetaReal: tgtReal !== null ? tgtReal : 0,
      difTarjeta,
      notas,
    };
    setArqueoData(data);
    setPrinted(false);
    setTimeout(() => {
      document.body.classList.add('print-arqueo');
      window.print();
      document.body.classList.remove('print-arqueo');
      setPrinted(true);
    }, 150);
  };

  return (
    <>
      <TicketArqueo data={arqueoData} area={area} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 10500,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '20px',
      }}>

        {/* Paso 1: Contraseña de Administrador */}
        {step === 'password' && (
          <div className="neu-box" style={{
            padding: '35px', width: '100%', maxWidth: '420px',
            background: 'var(--bg-color)', borderRadius: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔐</div>
            <h2 style={{ margin: '0 0 6px 0', color: 'var(--accent-blue)', fontSize: '1.4rem' }}>
              Autorización de Arqueo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 24px 0', lineHeight: 1.4 }}>
              Esta función requiere autorización de la administración.<br />
              Ingresa la contraseña de administrador para continuar.
            </p>
            <form onSubmit={handleVerificarPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  🔑 CONTRASEÑA ADMIN
                </label>
                <input
                  type="password"
                  className="neu-input"
                  placeholder="Ingresa la contraseña de admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {passError && (
                <p style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', margin: 0, fontWeight: 'bold' }}>
                  ❌ {passError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="neu-button" onClick={onClose}
                  style={{ flex: 1, padding: '12px', color: 'var(--text-muted)' }}>
                  Cancelar
                </button>
                <button type="submit" className="neu-button"
                  style={{ flex: 2, padding: '12px', color: 'var(--accent-success)', fontWeight: 'bold' }}>
                  ✅ Verificar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Paso 2: Pestaña / Pantalla de Arqueo */}
        {step === 'arqueo' && (
          <div className="neu-box" style={{
            padding: '30px', width: '100%', maxWidth: '850px',
            background: 'var(--bg-color)', borderRadius: '20px',
            maxHeight: '92vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--accent-blue)', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>⚖️</span> <span>Arqueo de Caja</span>
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Caja: <strong style={{ color: 'var(--text-main)' }}>{area}</strong> • Cajero: <strong style={{ color: 'var(--text-main)' }}>{cajeroNombre || 'Operador'}</strong> • {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button className="neu-button" onClick={onClose}
                style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer' }}>
                ✖
              </button>
            </div>

            {loadingTotales ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>⏳</p>
                <p style={{ margin: 0 }}>Cargando montos registrados en el sistema...</p>
              </div>
            ) : (
              <>
                {/* FILA 1: EFECTIVO */}
                <div className="neu-box" style={{ padding: '18px 20px', borderRadius: '14px', marginBottom: '18px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💵</span> <span>Efectivo</span>
                    </h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: '15px', alignItems: 'flex-start' }}>
                    {/* Efectivo Registrado */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Efectivo Registrado
                      </label>
                      <div className="neu-input" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontWeight: 'bold', fontSize: '1.15rem', color: 'var(--accent-success)',
                        pointerEvents: 'none', height: '46px', padding: '0 12px'
                      }}>
                        <span>$</span><span>{fmt(efectivoRegistrado)}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Calculado en sistema
                      </span>
                    </div>

                    {/* Efectivo Contado en Realidad */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Efectivo Real Contado
                      </label>
                      <input 
                        type="number" 
                        className="neu-input" 
                        placeholder="0.00"
                        value={efectivoReal} 
                        onChange={(e) => setEfectivoReal(e.target.value)}
                        min="0" 
                        step="0.01"
                        style={{ fontSize: '1.15rem', fontWeight: 'bold', height: '46px', width: '100%', boxSizing: 'border-box' }} 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Monto físico en cajón
                      </span>
                    </div>

                    {/* Diferencia a la derecha */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Diferencia de Efectivo
                      </label>
                      {efectivoReal !== '' ? (
                        <div style={{
                          height: '46px', padding: '0 12px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', color: colorDif(difEfectivo), fontSize: '0.86rem',
                          background: `${colorDif(difEfectivo)}15`,
                          border: `1.5px solid ${colorDif(difEfectivo)}50`,
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {textoDif(difEfectivo)}
                        </div>
                      ) : (
                        <div style={{
                          height: '46px', padding: '0 12px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)', fontSize: '0.82rem',
                          border: '1px dashed rgba(150,150,150,0.3)',
                          boxSizing: 'border-box'
                        }}>
                          Ingresa el monto contado
                        </div>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        {efectivoReal !== '' && difEfectivo > 0 && 'Diferencia positiva (sobrante en caja)'}
                        {efectivoReal !== '' && difEfectivo < 0 && 'Diferencia negativa (faltante en caja)'}
                        {efectivoReal !== '' && Math.abs(difEfectivo) < 0.01 && 'Monto exacto cuadrado'}
                        {efectivoReal === '' && 'Esperando conteo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FILA 2: TARJETA */}
                <div className="neu-box" style={{ padding: '18px 20px', borderRadius: '14px', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💳</span> <span>Tarjeta (Terminal Bancaria)</span>
                    </h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.25fr', gap: '15px', alignItems: 'flex-start' }}>
                    {/* Tarjeta Registrada */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Tarjeta Registrada
                      </label>
                      <div className="neu-input" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontWeight: 'bold', fontSize: '1.15rem', color: 'var(--accent-blue)',
                        pointerEvents: 'none', height: '46px', padding: '0 12px'
                      }}>
                        <span>$</span><span>{fmt(tarjetaRegistrada)}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Calculado en sistema
                      </span>
                    </div>

                    {/* Tarjeta Real en Terminal */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Tarjeta Real en Terminal
                      </label>
                      <input 
                        type="number" 
                        className="neu-input" 
                        placeholder="0.00"
                        value={tarjetaReal} 
                        onChange={(e) => setTarjetaReal(e.target.value)}
                        min="0" 
                        step="0.01"
                        style={{ fontSize: '1.15rem', fontWeight: 'bold', height: '46px', width: '100%', boxSizing: 'border-box' }} 
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Cierre / Lote de la terminal
                      </span>
                    </div>

                    {/* Diferencia a la derecha */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Diferencia de Tarjeta
                      </label>
                      {tarjetaReal !== '' ? (
                        <div style={{
                          height: '46px', padding: '0 12px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', color: colorDif(difTarjeta), fontSize: '0.86rem',
                          background: `${colorDif(difTarjeta)}15`,
                          border: `1.5px solid ${colorDif(difTarjeta)}50`,
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {textoDif(difTarjeta)}
                        </div>
                      ) : (
                        <div style={{
                          height: '46px', padding: '0 12px', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)', fontSize: '0.82rem',
                          border: '1px dashed rgba(150,150,150,0.3)',
                          boxSizing: 'border-box'
                        }}>
                          Ingresa el reporte de terminal
                        </div>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        {tarjetaReal !== '' && difTarjeta > 0 && 'Diferencia positiva (sobrante en terminal)'}
                        {tarjetaReal !== '' && difTarjeta < 0 && 'Diferencia negativa (faltante en terminal)'}
                        {tarjetaReal !== '' && Math.abs(difTarjeta) < 0.01 && 'Monto exacto cuadrado'}
                        {tarjetaReal === '' && 'Esperando reporte'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                    📝 Observaciones o Justificación (opcional)
                  </label>
                  <textarea 
                    className="neu-input" 
                    placeholder="Escribe aquí observaciones o detalles relevantes sobre el arqueo..."
                    value={notas} 
                    onChange={(e) => setNotas(e.target.value)}
                    rows={2} 
                    style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} 
                  />
                </div>

                {/* RESUMEN GLOBAL */}
                {(efectivoReal !== '' || tarjetaReal !== '') && (
                  <div style={{
                    padding: '16px 20px', marginBottom: '20px', borderRadius: '14px',
                    background: 'rgba(0,180,216,0.05)', border: '1.5px dashed rgba(0,180,216,0.35)',
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                      📋 Resumen General del Arqueo
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '0.86rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>TOTAL SISTEMA</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          ${fmt(efectivoRegistrado + tarjetaRegistrada)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>TOTAL REAL REPORTADO</span>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>
                          ${fmt((efReal || 0) + (tgtReal || 0))}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DIFERENCIA NETA</span>
                        <strong style={{ fontSize: '1.05rem', color: colorDif(difEfectivo + difTarjeta) }}>
                          {Math.abs(difEfectivo + difTarjeta) < 0.01 
                            ? '✅ $0.00' 
                            : (difEfectivo + difTarjeta) > 0 
                            ? `📈 +$${fmt(difEfectivo + difTarjeta)} (Positiva)` 
                            : `📉 -$${fmt(Math.abs(difEfectivo + difTarjeta))} (Negativa)`}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div style={{ display: 'flex', gap: '14px' }}>
                  <button 
                    type="button"
                    className="neu-button" 
                    onClick={onClose}
                    style={{ flex: 1, padding: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    Cerrar
                  </button>
                  <button 
                    type="button"
                    className="neu-button" 
                    onClick={handleImprimir}
                    style={{ 
                      flex: 2, 
                      padding: '14px', 
                      color: 'var(--accent-success)', 
                      fontWeight: 'bold', 
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    🖨️ {printed ? 'Reimprimir Ticket de Arqueo' : 'Finalizar e Imprimir Ticket'}
                  </button>
                </div>

                {printed && (
                  <p style={{ textAlign: 'center', color: 'var(--accent-success)', fontSize: '0.85rem', marginTop: '12px', fontWeight: 'bold' }}>
                    ✅ Ticket de arqueo impreso. Cajero y administración deben firmar de enterados.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ArqueoModal;
