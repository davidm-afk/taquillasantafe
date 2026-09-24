import React, { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import TicketImpresion from './TicketImpresion';

const ReimpresionModal = ({ area, onClose, user }) => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenta, setSelectedVenta] = useState(null);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        // Fetch sales for today in this area
        const q = query(
          collection(db, 'ventas'),
          where('area', '==', area),
          where('timestamp', '>=', start.getTime()),
          where('timestamp', '<=', end.getTime()),
          orderBy('timestamp', 'desc'),
          limit(30)
        );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVentas(docs);
      } catch (error) {
        console.error("Error fetching ventas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  }, [area]);

  const handlePrint = () => {
    document.body.classList.add('print-ticket');
    window.print();
    document.body.classList.remove('print-ticket');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="neu-box" style={{ padding: '25px', width: '90%', maxWidth: selectedVenta ? '800px' : '600px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', gap: '20px' }}>
        
        {/* Left side: List of sales */}
        <div style={{ flex: selectedVenta ? 1 : 'none', width: selectedVenta ? 'auto' : '100%', minWidth: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="text-gradient-blue" style={{ margin: 0 }}>🔄 Reimpresión de Tickets</h2>
            {!selectedVenta && (
              <button className="neu-box" onClick={onClose} style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
                ✖
              </button>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '15px' }}>
            Mostrando los últimos 30 tickets generados hoy en {area}.
          </p>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando ventas...</p>
          ) : ventas.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay ventas registradas hoy en esta caja.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
              {ventas.map((venta) => (
                <div 
                  key={venta.id} 
                  className={selectedVenta?.id === venta.id ? 'neu-button' : 'neu-box'} 
                  onClick={() => setSelectedVenta(venta)}
                  style={{ 
                    padding: '15px', 
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    border: selectedVenta?.id === venta.id ? '2px solid var(--accent-blue)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: selectedVenta?.id === venta.id ? 'var(--accent-blue)' : 'var(--text-main)' }}>
                      ${parseFloat(venta.total || venta.Total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(venta.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Método: <strong style={{ color: 'var(--text-main)' }}>{venta.metodoPago || 'Efectivo'}</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Cajero: {venta.cajero || 'Desconocido'}</span>
                  </div>
                  {!venta.cart && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', marginTop: '5px' }}>
                      ⚠️ Ticket heredado (solo formato texto)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Ticket preview */}
        {selectedVenta && (
          <div style={{ flex: 1, borderLeft: '1px solid var(--bg-color)', paddingLeft: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Vista Previa</h3>
              <button className="neu-box" onClick={onClose} style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: 'var(--bg-color)', color: 'var(--text-muted)' }}>
                ✖
              </button>
            </div>
            
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-inset)', overflowY: 'auto', marginBottom: '20px', position: 'relative' }}>
               {/* Usamos el componente real para generar el HTML oculto, pero necesitamos una forma visual de verlo. 
                   El componente real está en un div id="ticketImpresion" oculto. */}
               <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: '40px' }}>
                 El ticket está listo para imprimirse. <br/>Haz clic en Imprimir para ver el formato final de la impresora térmica.
               </p>
            </div>

            <button 
              className="neu-button" 
              onClick={handlePrint}
              style={{ width: '100%', padding: '15px', color: 'var(--accent-success)', fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              🖨️ IMPRIMIR TICKET
            </button>
            <button 
              className="neu-box" 
              onClick={() => setSelectedVenta(null)}
              style={{ width: '100%', padding: '12px', color: 'var(--text-muted)', marginTop: '10px' }}
            >
              Volver a la lista
            </button>

            {/* Este es el componente que se imprimirá */}
            <TicketImpresion 
              user={{ nombre: selectedVenta.cajero }}
              cart={selectedVenta.cart || [{ nombre: selectedVenta.entradas || selectedVenta.productos || 'Productos (Versión Antigua)', qty: 1, precio: selectedVenta.total }]}
              total={selectedVenta.total}
              method={selectedVenta.metodoPago}
              received={selectedVenta.total} // Asumimos pago completo para reprints
              change={0}
              pagoEfectivo={selectedVenta.pagoEfectivo}
              pagoTarjeta={selectedVenta.pagoTarjeta}
              pagoDebito={selectedVenta.pagoDebito}
              pagoCredito={selectedVenta.pagoCredito}
              pagoTransferencia={selectedVenta.pagoTransferencia}
              transactionDate={selectedVenta.fecha}
              customFolio={selectedVenta.id.toUpperCase().substring(0, 8)}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ReimpresionModal;
