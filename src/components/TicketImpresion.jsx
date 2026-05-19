import React from 'react';

// Este componente está siempre oculto en pantalla normal (display: none),
// pero mediante CSS (en index.css) se hará visible únicamente al imprimir.
const TicketImpresion = ({ user, cart, total, method, received, change }) => {
  const hoy = new Date();
  
  return (
    <div id="ticketImpresion" style={{ display: 'none' }}>
      <div className="ticket-center">
        <h2 style={{ margin: 0, fontSize: '16px' }}>SKY ZONE</h2>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Sucursal Santa Fe</p>
        <p style={{ margin: '3px 0', fontSize: '9px', lineHeight: 1.2 }}>
          Prol. P.º de la Reforma 400, Santa Fe, Zedec Sta Fé, Álvaro Obregón, 01210 Ciudad de México, CDMX
        </p>
        <p style={{ margin: 0 }}>{hoy.toLocaleString('es-MX')}</p>
      </div>
      
      <div className="ticket-line"></div>
      <p style={{ margin: 0 }}>Cajero: {user?.nombre || 'Desconocido'}</p>
      <div className="ticket-line"></div>
      
      <div>
        {cart.map((item, idx) => (
          <div key={idx} style={{ fontSize: '11px', marginBottom: '2px' }}>
            - {item.qty}x {item.nombre} ${item.precio * item.qty}
          </div>
        ))}
      </div>
      
      <div className="ticket-line"></div>
      <div className="ticket-item">
        <strong>TOTAL:</strong>
        <strong>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
      </div>
      <div className="ticket-item">
        Pago ({method}): 
        <span>${parseFloat(received || total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="ticket-item">
        Cambio: 
        <span>${change.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
      </div>
      
      <div className="ticket-center" style={{ marginTop: '15px' }}>
        <p style={{ margin: 0 }}>¡Gracias por tu visita!</p>
        <p style={{ margin: 0 }}>Conserva este ticket</p>
      </div>
    </div>
  );
};

export default TicketImpresion;
