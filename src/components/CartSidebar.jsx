import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2 } from 'lucide-react';

const CartSidebar = ({ onCheckout, titleColorClass = "text-gradient-blue" }) => {
  const { cart, updateQty, removeItem, clearCart, total } = useCart();

  return (
    <div className="neu-box" style={{ 
      width: '350px', 
      margin: '20px 20px 20px 0', 
      padding: '20px',
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={titleColorClass} style={{ margin: 0, fontSize: '1.5rem' }}>Carrito</h2>
          <button className="neu-button" onClick={clearCart} style={{ padding: '10px', color: 'var(--accent-danger)' }} title="Vaciar Carrito">
            <Trash2 size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
          {cart.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '50px' }}>El carrito está vacío</p>
          ) : (
            cart.map((item, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 0',
                borderBottom: '1px solid rgba(163,177,198,0.3)'
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 600, fontSize: '0.9rem' }}>{item.nombre}</p>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${item.precio} x {item.qty}</span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>${item.precio * item.qty}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ paddingTop: '20px', borderTop: '2px solid var(--bg-color)', boxShadow: '0 -4px 6px -4px rgba(163,177,198,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Total:</span>
          <strong style={{ fontSize: '2rem' }}>${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
        </div>
        <button 
          className="neu-button" 
          onClick={onCheckout}
          disabled={cart.length === 0}
          style={{ 
            width: '100%', 
            padding: '15px', 
            fontSize: '1.1rem', 
            color: cart.length > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' 
          }}
        >
          COMPLETAR ORDEN
        </button>
      </div>
    </div>
  );
};

export default CartSidebar;
