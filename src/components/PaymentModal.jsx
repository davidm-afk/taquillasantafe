import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import TicketImpresion from './TicketImpresion';

const scriptURL = 'https://script.google.com/macros/s/AKfycbw8q6RdD1E7n-l9tCG9FnGgxsRLxuzuzs1WNAGRnu0nGkMDDXLLQq6v9-feKlo_a4d8/exec';

const PaymentModal = ({ area, onClose }) => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  
  const [metodo, setMetodo] = useState('Efectivo');
  const [recibido, setRecibido] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const cambio = (parseFloat(recibido) || 0) - total;

  const handleConfirm = async () => {
    if (metodo === 'Efectivo' && (parseFloat(recibido) || 0) < total) {
      alert("El pago recibido es insuficiente.");
      return;
    }

    setLoading(true);

    // Preparar FormData para Google Apps Script
    const formData = new FormData();
    formData.append('tipoRegistro', area);
    formData.append('cajeroFinal', user?.nombre || 'Desconocido');
    formData.append('totalFinal', total);
    formData.append('metodoPagoFinal', metodo);

    // Formatear resumen
    let resumen = cart.map(item => `${item.qty}x ${item.nombre} ($${item.precio})`);
    
    if (area === 'Taquilla') {
      formData.append('resumenEntradas', resumen.join(" | ") || "Ninguna");
      formData.append('resumenAdicionales', "Ninguno"); // Simplify for now
    } else {
      formData.append('resumenProductos', resumen.join(" | ") || "Ninguno");
    }

    try {
      // Intentar enviar datos al script de Google
      await fetch(scriptURL, { method: 'POST', body: formData, mode: 'no-cors' });
      
      // Imprimir el ticket de manera sincrona después de enviar a GAS (modo no-cors no da response detallada)
      window.print();
      
      setSuccess(true);
      setTimeout(() => {
        clearCart();
        onClose();
      }, 2000);
    } catch (error) {
      alert("Error de conexión al guardar la venta.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="neu-box" style={{ padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        {!success ? (
          <>
            <h2 className="text-gradient-blue" style={{ marginTop: 0 }}>Finalizar Cobro</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button 
                type="button" 
                className={metodo === 'Efectivo' ? 'neu-button' : 'neu-box'} 
                onClick={() => setMetodo('Efectivo')}
                style={{ flex: 1, padding: '15px', cursor: 'pointer', border: metodo === 'Efectivo' ? '2px solid var(--accent-success)' : 'none' }}
              >
                💵 Efectivo
              </button>
              <button 
                type="button" 
                className={metodo === 'Tarjeta' ? 'neu-button' : 'neu-box'} 
                onClick={() => setMetodo('Tarjeta')}
                style={{ flex: 1, padding: '15px', cursor: 'pointer', border: metodo === 'Tarjeta' ? '2px solid var(--accent-success)' : 'none' }}
              >
                💳 Tarjeta
              </button>
            </div>

            {metodo === 'Efectivo' && (
              <div className="neu-box" style={{ padding: '15px', marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Monto recibido del cliente:</label>
                <input 
                  type="number" 
                  className="neu-input" 
                  style={{ marginTop: '10px', fontSize: '1.2rem', textAlign: 'center' }} 
                  placeholder="$0.00"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vuelto (Cambio):</span>
                  <strong style={{ fontSize: '1.2rem', color: cambio >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                    ${cambio > 0 ? cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                  </strong>
                </div>
              </div>
            )}

            <button 
              className="neu-button" 
              onClick={handleConfirm}
              disabled={loading}
              style={{ width: '100%', marginBottom: '10px', color: 'var(--accent-success)' }}
            >
              {loading ? "PROCESANDO..." : "CONFIRMAR E IMPRIMIR"}
            </button>

            <button 
              className="neu-button" 
              onClick={onClose}
              disabled={loading}
              style={{ width: '100%', color: 'var(--accent-danger)' }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <div>
            <h2 style={{ color: 'var(--accent-success)' }}>✓ Venta Exitosa</h2>
            <p style={{ color: 'var(--text-muted)' }}>Ticket enviado a imprimir.</p>
          </div>
        )}

      </div>

      <TicketImpresion 
        user={user} 
        cart={cart} 
        total={total} 
        method={metodo} 
        received={recibido} 
        change={cambio > 0 ? cambio : 0} 
      />
    </div>
  );
};

export default PaymentModal;
