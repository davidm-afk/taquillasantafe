import React from 'react';
import { createPortal } from 'react-dom';

const TicketResumen = ({ accountName, cart, total, user }) => {
  const hoy = new Date();

  // Desglose de impuestos (IVA 16%)
  const iva = total - (total / 1.16);
  const subtotal = total - iva;

  return createPortal(
    <div id="ticketImpresion" style={{ display: 'none' }}>
      {/* Cabecera Principal */}
      <div className="ticket-center">
        <h1 style={{ margin: '0 0 2px 0', fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'monospace' }}>SKY ZONE</h1>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Sucursal Santa Fe</p>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '11px', color: '#000' }}>*** RESUMEN DE CONSUMO ***</p>
        <p style={{ margin: '4px 0', fontSize: '8.5px', lineHeight: 1.2, color: '#000', fontFamily: 'monospace' }}>
          SKY ZONE SANTA FE<br />
          Prol. Paseo de la Reforma 400, Santa Fe, Zedec Sta Fé,<br />
          Álvaro Obregón, 01210 Ciudad de México, CDMX
        </p>
      </div>

      <div className="ticket-line" style={{ borderBottom: '2px double #000', margin: '8px 0' }}></div>

      {/* Metadatos de la Cuenta */}
      <div style={{ fontSize: '10px', fontFamily: 'monospace', lineHeight: '1.4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>CUENTA: <strong>{accountName || 'Sin Nombre'}</strong></span>
          <span>CAJA: <strong>01</strong></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FECHA: {hoy.toLocaleDateString('es-MX')}</span>
          <span>HORA: {hoy.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div>Cajero: <span style={{ textTransform: 'uppercase' }}>{user?.nombre || 'Desconocido'}</span></div>
      </div>

      <div className="ticket-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Encabezado de Tabla de Artículos */}
      <div style={{ fontSize: '9px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        <span>CANT / DESCRIPCIÓN</span>
        <span>IMPORTE</span>
      </div>
      <div className="ticket-line" style={{ borderBottom: '1px solid #000', margin: '2px 0 6px 0' }}></div>

      {/* Listado de Artículos */}
      <div style={{ margin: '5px 0' }}>
        {cart.map((item, idx) => (
          <div key={idx} style={{ fontSize: '11px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontFamily: 'monospace' }}>
            <span style={{ flex: 1, paddingRight: '10px', wordBreak: 'break-word' }}>
              {item.qty}x {item.nombre}
            </span>
            <span style={{ fontWeight: 'bold', minWidth: '70px', textAlign: 'right' }}>
              ${(item.precio * item.qty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      <div className="ticket-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Totales y Desglose Financiero */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10px', fontFamily: 'monospace' }}>
        <div className="ticket-item">
          <span>Subtotal:</span>
          <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="ticket-item" style={{ color: '#333' }}>
          <span>IVA Incluido (16%):</span>
          <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="ticket-line" style={{ borderBottom: '1px solid #000', margin: '4px 0' }}></div>

        <div className="ticket-item" style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0' }}>
          <span>TOTAL:</span>
          <span>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="ticket-line" style={{ borderBottom: '1px solid #000', margin: '4px 0' }}></div>
      </div>

      {/* Aclaración de Carácter Informativo */}
      <div className="ticket-center" style={{ fontSize: '9px', lineHeight: 1.3, margin: '15px 0', border: '1px dashed #000', padding: '6px', borderRadius: '4px' }}>
        <strong>DOCUMENTO NO VÁLIDO COMO COMPROBANTE FISCAL</strong><br />
        Este es un pre-ticket informativo de los productos consumidos en su cuenta.
      </div>

      <div className="ticket-line" style={{ borderBottom: '2px double #000', margin: '10px 0' }}></div>

      {/* Mensaje de Despedida */}
      <div className="ticket-center" style={{ marginTop: '10px', fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3' }}>
        <p style={{ margin: '0 0 2px 0', textTransform: 'uppercase' }}>¡Gracias por volar con nosotros!</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', fontStyle: 'italic' }}>H A V E   F U N ,   F L Y   S A F E !</p>
      </div>
    </div>,
    document.body
  );
};

export default TicketResumen;
