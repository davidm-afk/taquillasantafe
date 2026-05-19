import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, RefreshCw } from 'lucide-react';

const scriptURL = 'https://script.google.com/macros/s/AKfycbw8q6RdD1E7n-l9tCG9FnGgxsRLxuzuzs1WNAGRnu0nGkMDDXLLQq6v9-feKlo_a4d8/exec';

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

  const fetchDatos = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      // El script original pasaba la fecha directamente en formato YYYY-MM-DD
      const res = await fetch(`${scriptURL}?date=${date}&sheetType=${area}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const json = await res.json();

      setData(json.data || []);
    } catch (err) {
      setError('Error al obtener los datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                totalCalcetas += parseInt(matchCalc[1]);
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
        <button className="neu-button" onClick={fetchDatos} style={{ marginTop: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={18} /> Actualizar
        </button>
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
                    Adicionales & Calcetas (Total Calc: {totalCalcetas})
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
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboard;
