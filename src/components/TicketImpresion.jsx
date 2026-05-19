import React from 'react';
import { createPortal } from 'react-dom';

// Este componente está siempre oculto en pantalla normal (display: none),
// pero mediante CSS (en index.css) se hará visible únicamente al imprimir.
const TicketImpresion = ({ user, cart, total, method, received, change }) => {
  const hoy = new Date();

  // Generar un folio de venta único de alta fidelidad corporativa
  const yyyy = hoy.getFullYear();
  const mm = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const dd = hoy.getDate().toString().padStart(2, '0');
  const randomNum = React.useMemo(() => Math.floor(1000 + Math.random() * 9000), [total]); // Persistente por render
  const folio = `SZ-SF-${yyyy}${mm}${dd}-${randomNum}`;

  // Desglose de impuestos (IVA 16%) conforme a regulaciones mexicanas
  const iva = total - (total / 1.16);
  const subtotal = total - iva;

  return createPortal(
    <div id="ticketImpresion" style={{ display: 'none' }}>
      {/* Cabecera Principal */}
      <div className="ticket-center">
        <h1 style={{ margin: '0 0 2px 0', fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px', fontFamily: 'monospace' }}>SKY ZONE</h1>
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Sucursal Santa Fe</p>
        <p style={{ margin: '4px 0', fontSize: '8.5px', lineHeight: 1.2, color: '#000', fontFamily: 'monospace' }}>
          SKY ZONE SANTA FE<br />
          Prol. Paseo de la Reforma 400, Santa Fe, Zedec Sta Fé,<br />
          Álvaro Obregón, 01210 Ciudad de México, CDMX
        </p>
      </div>

      <div className="ticket-line" style={{ borderBottom: '2px double #000', margin: '8px 0' }}></div>

      {/* Metadatos de Transacción */}
      <div style={{ fontSize: '10px', fontFamily: 'monospace', lineHeight: '1.4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FOLIO: <strong>{folio}</strong></span>
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

        <div className="ticket-item">
          <span>Forma de Pago:</span>
          <strong style={{ textTransform: 'uppercase' }}>{method}</strong>
        </div>
        <div className="ticket-item">
          <span>Pago Recibido:</span>
          <span>${parseFloat(received || total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="ticket-item">
          <span>Cambio:</span>
          <strong style={{ fontSize: '11px' }}>${change.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <div className="ticket-line" style={{ borderBottom: '2px double #000', margin: '10px 0' }}></div>

      {/* Bloque de Contacto y Reservaciones */}
      <div className="ticket-center" style={{ fontSize: '9.5px', lineHeight: 1.3, padding: '4px', border: '1px dashed #000', borderRadius: '4px', margin: '10px 0' }}>
        <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>★ Reservaciones y Eventos ★</span>
        Para reservar tu evento privado, contáctanos<br />
        vía WhatsApp al siguiente número:<br />
        <strong>+52 55 5476 5425</strong>
      </div>

      <div className="ticket-line" style={{ borderBottom: '1px dashed #000', margin: '8px 0' }}></div>

      {/* Reglas de Seguridad */}
      <div style={{ fontSize: '8px', lineHeight: 1.2, color: '#111', marginTop: '6px', fontFamily: 'monospace' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', textAlign: 'center', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Reglas de Seguridad del Parque</p>
        <p style={{ margin: '0 0 3px 0' }}>1. Uso obligatorio de SkySocks en trampolines.</p>
        <p style={{ margin: '0 0 3px 0' }}>2. Respete las instrucciones del Staff en todo momento.</p>
        <p style={{ margin: '0 0 3px 0' }}>3. Prohibido saltar bajo la influencia de alcohol y/o drogas.</p>
        <p style={{ margin: '0 0 3px 0' }}>4. Saltadores que incumplan las reglas tras 3 avisos serán retirados 5 minutos sin derecho a reembolso o reposición de tiempo.</p>
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

export default TicketImpresion;
