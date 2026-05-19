import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import GuestList from '../components/GuestList';

const AdminDashboard = () => {
  const { logout } = useAuth();

  // Format today's date as YYYY-MM-DD for the date input default
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  const todayStr = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [area, setArea] = useState('Taquilla');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editingVenta, setEditingVenta] = useState(null);

  useEffect(() => {
    setLoading(true);

    // Create local timezone bounds in milliseconds
    const [yyyy, mm, dd] = date.split('-');
    const localStart = new Date(yyyy, parseInt(mm) - 1, dd, 0, 0, 0, 0).getTime();
    const localEnd = new Date(yyyy, parseInt(mm) - 1, dd, 23, 59, 59, 999).getTime();

    // Query using the numeric timestamp to completely avoid string timezone mismatches
    const q = query(
      collection(db, 'ventas'),
      where('timestamp', '>=', localStart),
      where('timestamp', '<=', localEnd)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(data => data.area === area); // Local filter by area

      setData(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setError('Error al conectar con Firebase. Revisa la consola.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date, area]);

  // Procesamiento de métricas
  let totalEfectivo = 0;
  let totalTarjeta = 0;

  // Taquilla stats
  let totalSaltadores = 0;
  let totalCalcetas = 0;
  let desgloseEntradas = {};
  let desgloseAdicionales = {};

  // Cafe stats
  let totalArticulosCafe = 0;
  let desgloseCafe = {};

  if (data) {
    data.forEach(venta => {
      // El backend devuelve llaves como 'total', 'metodoPago', 'productos', 'resumenEntradas', 'resumenAdicionales'
      // Ajustamos dependiendo de cómo venía en el original
      const ventaTotal = parseFloat(venta.total || venta.Total || 0);
      const metodo = venta.metodoPago || venta['Método de Pago'] || '';

      if (metodo.toLowerCase() === 'efectivo') totalEfectivo += ventaTotal;
      else totalTarjeta += ventaTotal;

      if (area === 'Taquilla') {
        const entradasStr = venta.entradas || venta.resumenEntradas || '';
        if (entradasStr && entradasStr !== 'Ninguna') {
          entradasStr.split(' | ').forEach(item => {
            const matchQty = item.match(/^(\d+)x/);
            const qty = matchQty ? parseInt(matchQty[1]) : 0;
            let nombre = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').trim();

            if (qty > 0) {
              totalSaltadores += qty;
              desgloseEntradas[nombre] = (desgloseEntradas[nombre] || 0) + qty;

              const matchCalc = item.match(/\(\+(\d+)\s+calcetas/);
              if (matchCalc) {
                totalCalcetas += parseInt(matchCalc[1]) * qty;
              }
            }
          });
        }

        const adicStr = venta.adicionales || venta.resumenAdicionales || '';
        if (adicStr && adicStr !== 'Ninguno') {
          adicStr.split(' | ').forEach(item => {
            const matchQty = item.match(/^(\d+)x/);
            const qty = matchQty ? parseInt(matchQty[1]) : 0;
            let nombre = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').trim();
            if (qty > 0) {
              if (nombre.includes('SkySocks') || nombre.includes('calcetas')) totalCalcetas += qty;
              desgloseAdicionales[nombre] = (desgloseAdicionales[nombre] || 0) + qty;
            }
          });
        }
      } else {
        const prodStr = venta.productos || venta.resumenProductos || '';
        if (prodStr && prodStr !== 'Ninguno') {
          prodStr.split(' | ').forEach(item => {
            const matchQty = item.match(/^(\d+)x/);
            const qty = matchQty ? parseInt(matchQty[1]) : 0;
            let nombre = item.replace(/^\d+x\s+/, '').replace(/\(\$.*\)/, '').trim();
            if (qty > 0) {
              totalArticulosCafe += qty;
              desgloseCafe[nombre] = (desgloseCafe[nombre] || 0) + qty;
            }
          });
        }
      }
    });
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar permanentemente esta venta de los registros de Firebase?")) {
      try {
        await deleteDoc(doc(db, 'ventas', id));
        alert("Venta eliminada exitosamente.");
      } catch (err) {
        console.error("Error al eliminar venta:", err);
        alert("Error al intentar eliminar la venta de Firebase.");
      }
    }
  };

  return (
    <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="text-gradient-blue" style={{ margin: 0, fontSize: '2rem' }}>Resumen de ventas</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Panel Administrativo</p>
        </div>
        <button
          className="neu-button"
          onClick={logout}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-danger)' }}
        >
          <LogOut size={20} /> Salir
        </button>
      </div>

      {/* Filtros */}
      <div className="neu-box" style={{ padding: '20px', marginBottom: '30px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>FECHA</label>
          <input
            type="date"
            className="neu-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '200px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>ÁREA</label>
          <select
            className="neu-input"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="Taquilla">Taquilla</option>
            <option value="Cafeteria">Cafetería</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <h3>Cargando reporte...</h3>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--accent-danger)' }}>
          <h3>{error}</h3>
        </div>
      ) : data ? (
        <>
          {/* Tarjetas Principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL GLOBAL</p>
              <h2 className="text-gradient-blue" style={{ margin: 0, fontSize: '2.5rem' }}>
                ${(totalEfectivo + totalTarjeta).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>EFECTIVO</p>
              <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent-success)' }}>
                ${totalEfectivo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontWeight: 'bold' }}>TARJETA</p>
              <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--accent-warning)' }}>
                ${totalTarjeta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h2>
            </div>
          </div>

          {/* Desglose Específico */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {area === 'Taquilla' ? (
              <>
                <div className="neu-box" style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid var(--bg-color)', paddingBottom: '10px' }}>
                    Entradas (Total: {totalSaltadores})
                  </h3>
                  {Object.keys(desgloseEntradas).length === 0 ? <p>No hay ventas</p> : null}
                  {Object.keys(desgloseEntradas).map(k => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{k}</span>
                      <strong>{desgloseEntradas[k]}</strong>
                    </div>
                  ))}
                </div>
                <div className="neu-box" style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid var(--bg-color)', paddingBottom: '10px' }}>
                    Adicionales y Calcetas (Total Calcetas Vendidas: {totalCalcetas})
                  </h3>
                  {Object.keys(desgloseAdicionales).length === 0 ? <p>No hay adicionales</p> : null}
                  {Object.keys(desgloseAdicionales).map(k => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>{k}</span>
                      <strong>{desgloseAdicionales[k]}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="neu-box" style={{ padding: '20px', gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 15px 0', borderBottom: '2px solid var(--bg-color)', paddingBottom: '10px' }}>
                  Productos de Cafetería (Total Vendidos: {totalArticulosCafe})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {Object.keys(desgloseCafe).length === 0 ? <p>No hay ventas</p> : null}
                  {Object.keys(desgloseCafe).map(k => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-color)', borderRadius: '8px', boxShadow: 'var(--shadow-inset)' }}>
                      <span>{k}</span>
                      <strong>{desgloseCafe[k]}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {area === 'Taquilla' && <GuestList />}

          {/* Tabla de Registro de Ventas del Día */}
          <div className="neu-box" style={{ padding: '25px', marginTop: '30px', textAlign: 'left' }}>
            <h2 className="text-gradient-blue" style={{ marginTop: 0, fontSize: '1.6rem', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '12px' }}>
              📊 Registro de Ventas del Día
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-color)' }}>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Cajero</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Detalle</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Método</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Total</th>
                    <th style={{ padding: '12px 8px', color: 'var(--text-muted)', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay registros de ventas para este día.
                      </td>
                    </tr>
                  ) : (
                    data.map((venta) => (
                      <tr key={venta.id} style={{ borderBottom: '1px solid var(--bg-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{venta.cajero}</td>
                        <td style={{ padding: '12px 8px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {venta.entradas || venta.productos || 'Ninguno'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{venta.metodoPago}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                          ${parseFloat(venta.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => setEditingVenta(venta)}
                            className="neu-button"
                            style={{ padding: '6px 12px', marginRight: '10px', fontSize: '0.85rem', color: 'var(--accent-blue)', cursor: 'pointer' }}
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(venta.id)}
                            className="neu-button"
                            style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--accent-danger)', cursor: 'pointer' }}
                          >
                            🗑️ Borrar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {editingVenta && (
        <EditVentaModal
          venta={editingVenta}
          onClose={() => setEditingVenta(null)}
        />
      )}
    </div>
  );
};

// Componente Modal de Edición de Ventas
const EditVentaModal = ({ venta, onClose }) => {
  const [cajero, setCajero] = useState(venta.cajero || '');
  const [totalVal, setTotalVal] = useState(venta.total || '');
  const [metodoPago, setMetodoPago] = useState(venta.metodoPago || 'Efectivo');
  const [detalle, setDetalle] = useState(venta.entradas || venta.productos || '');
  const [exitHour, setExitHour] = useState(venta.exitHour !== null && venta.exitHour !== undefined ? venta.exitHour : '');
  const [exitMinute, setExitMinute] = useState(venta.exitMinute !== null && venta.exitMinute !== undefined ? venta.exitMinute : '');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updateData = {
        cajero,
        total: parseFloat(totalVal) || 0,
        metodoPago,
      };

      if (venta.area === 'Taquilla') {
        updateData.entradas = detalle;
        if (exitHour !== '' && exitMinute !== '') {
          const exitDate = new Date();
          exitDate.setHours(parseInt(exitHour, 10), parseInt(exitMinute, 10), 0, 0);
          updateData.exitHour = parseInt(exitHour, 10);
          updateData.exitMinute = parseInt(exitMinute, 10);
          updateData.exitTimestamp = exitDate.getTime();
        } else {
          updateData.exitHour = null;
          updateData.exitMinute = null;
          updateData.exitTimestamp = null;
        }
      } else {
        updateData.productos = detalle;
      }

      await updateDoc(doc(db, 'ventas', venta.id), updateData);
      alert("Venta actualizada con éxito.");
      onClose();
    } catch (err) {
      console.error("Error al actualizar venta:", err);
      alert("Hubo un error al guardar los cambios en Firebase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
      <div className="neu-box" style={{ padding: '30px', width: '90%', maxWidth: '500px', background: 'var(--bg-color)', borderRadius: '16px' }}>
        <h2 className="text-gradient-blue" style={{ marginTop: 0, marginBottom: '20px' }}>✏️ Editar Registro de Venta</h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>CAJERO</label>
            <input
              type="text"
              className="neu-input"
              value={cajero}
              onChange={(e) => setCajero(e.target.value)}
              required
              style={{ marginTop: '5px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>DETALLE (BOLETOS / PRODUCTOS)</label>
            <input
              type="text"
              className="neu-input"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              required
              style={{ marginTop: '5px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL ($)</label>
              <input
                type="number"
                step="0.01"
                className="neu-input"
                value={totalVal}
                onChange={(e) => setTotalVal(e.target.value)}
                required
                style={{ marginTop: '5px' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>MÉTODO DE PAGO</label>
              <select
                className="neu-input"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ marginTop: '5px' }}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>
          </div>

          {venta.area === 'Taquilla' && (
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>HORA DE SALIDA MANUAL (HH:MM)</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="HH"
                  min="0"
                  max="23"
                  className="neu-input"
                  value={exitHour}
                  onChange={(e) => setExitHour(e.target.value)}
                  style={{ width: '70px', textAlign: 'center' }}
                />
                <span>:</span>
                <input
                  type="number"
                  placeholder="MM"
                  min="0"
                  max="59"
                  className="neu-input"
                  value={exitMinute}
                  onChange={(e) => setExitMinute(e.target.value)}
                  style={{ width: '70px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(dejar vacío si es SKY PASS o APOYO)</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button
              type="submit"
              className="neu-button"
              disabled={submitting}
              style={{ flex: 1, color: 'var(--accent-success)' }}
            >
              {submitting ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
            <button
              type="button"
              className="neu-button"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: 1, color: 'var(--accent-danger)' }}
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
