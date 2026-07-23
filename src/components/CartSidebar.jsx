import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import TicketResumen from './TicketResumen';

const CartSidebar = ({ onCheckout, titleColorClass = "text-gradient-blue", enableMultiCart = false }) => {
  const { 
    cart, 
    clearCart, 
    total, 
    carts, 
    activeCartId, 
    createCart, 
    switchCart, 
    deleteCart,
    removeItem,
    updateQty
  } = useCart();

  const { user } = useAuth();
  const [expandedId, setExpandedId] = React.useState(null);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [showNewCartModal, setShowNewCartModal] = React.useState(false);
  const [newCartName, setNewCartName] = React.useState('');

  const handlePrintSummary = () => {
    setIsPrinting(true);
    setTimeout(() => {
      document.body.classList.add('print-ticket');
      window.print();
      document.body.classList.remove('print-ticket');
      setIsPrinting(false);
    }, 100);
  };

  // Al agregar un producto, si estamos en modo multicarrito y minimizados, expandir el carrito activo
  React.useEffect(() => {
    if (enableMultiCart && expandedId === null && cart.length > 0) {
      setExpandedId(activeCartId);
    }
  }, [cart.length, activeCartId, enableMultiCart]);

  const handleNewCart = () => {
    setShowNewCartModal(true);
  };

  const handleCreateCartSubmit = (e) => {
    e.preventDefault();
    if (newCartName && newCartName.trim()) {
      const newId = createCart(newCartName.trim());
      setExpandedId(newId);
      setNewCartName('');
      setShowNewCartModal(false);
    }
  };

  const handleDeleteCart = (id, name) => {
    if (window.confirm(`¿Seguro que quieres eliminar la cuenta "${name}"?`)) {
      deleteCart(id);
      if (expandedId === id) {
        setExpandedId(null);
      }
    }
  };

  const handleCompleteOrder = () => {
    onCheckout();
    // Cerramos la vista expandida al cobrar la cuenta
    setExpandedId(null);
  };

  const renderNewCartModal = () => {
    if (!showNewCartModal) return null;
    return (
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="neu-box animate-fade-in" style={{ padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
          <h3 className={titleColorClass} style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>Nueva Cuenta / Mesa</h3>
          <form onSubmit={handleCreateCartSubmit}>
            <input
              type="text"
              placeholder="Ej. Mesa 4, Cuenta Juan, Bar..."
              className="neu-input"
              value={newCartName}
              onChange={(e) => setNewCartName(e.target.value)}
              style={{ marginBottom: '20px', width: '100%', fontSize: '1rem' }}
              autoFocus
              required
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="neu-button"
                onClick={() => { setShowNewCartModal(false); setNewCartName(''); }}
                style={{ flex: 1, padding: '10px', color: 'var(--text-muted)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="neu-button"
                style={{ flex: 1, padding: '10px', color: 'var(--accent-blue)', fontWeight: 'bold' }}
              >
                Crear Cuenta
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Renderizado del Selector de Cuentas (Minimizado)
  if (enableMultiCart && expandedId === null) {
    return (
      <>
        <div className="neu-box" style={{ 
          width: '350px', 
          margin: '20px 20px 20px 0', 
          padding: '20px',
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: 'calc(100vh - 40px)'
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={titleColorClass} style={{ margin: 0, fontSize: '1.5rem' }}>Cuentas Activas</h2>
            </div>
            <button 
              className="neu-button" 
              onClick={handleNewCart}
              style={{ width: '100%', padding: '12px', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '20px', cursor: 'pointer' }}
            >
              ➕ NUEVA CUENTA
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
              {Object.keys(carts).map(id => {
                const c = carts[id];
                const cTotal = c.items.reduce((acc, item) => acc + item.precio * item.qty, 0);
                const totalItems = c.items.reduce((acc, item) => acc + item.qty, 0);
                const isActive = id === activeCartId;
                return (
                  <div 
                    key={id}
                    className="neu-box animate-fade-in"
                    onClick={() => {
                      switchCart(id);
                      setExpandedId(id);
                    }}
                    style={{
                      padding: '15px 20px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      border: isActive ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      background: isActive ? 'var(--bg-color)' : 'rgba(255,255,255,0.01)',
                      boxShadow: isActive ? 'var(--shadow-inset)' : 'var(--shadow-flat)'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: isActive ? 'bold' : 'normal' }}>
                        {c.name}
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                        ${cTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </strong>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCart(id, c.name);
                        }}
                        style={{
                          color: 'var(--accent-danger)',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          padding: '4px'
                        }}
                        title="Eliminar Cuenta"
                      >
                        ✕
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {renderNewCartModal()}
      </>
    );
  }

  // Renderizado del Detalle del Carrito (Expandido o Taquilla)
  return (
    <div className="neu-box" style={{ 
      width: '350px', 
      margin: '20px 20px 20px 0', 
      padding: '20px',
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: 'calc(100vh - 40px)'
    }}>
      <div>
        {enableMultiCart ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--bg-color)', paddingBottom: '12px' }}>
            <button 
              className="neu-button" 
              onClick={() => setExpandedId(null)}
              style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              ⬅️ Minimizar
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {carts[expandedId]?.name || 'Principal'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className={titleColorClass} style={{ margin: 0, fontSize: '1.5rem' }}>Carrito</h2>
            <button className="neu-button" onClick={clearCart} style={{ padding: '10px', color: 'var(--accent-danger)' }} title="Vaciar Carrito">
              <Trash2 size={20} />
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', maxHeight: enableMultiCart ? 'calc(100vh - 290px)' : 'calc(100vh - 250px)' }}>
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
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>${item.precio} c/u</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '5px' }}>
                    <button 
                      className="neu-button" 
                      style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }} 
                      onClick={() => updateQty(item.nombre, -1)}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.85rem', minWidth: '15px', textAlign: 'center', fontWeight: 'bold' }}>
                      {item.qty}
                    </span>
                    <button 
                      className="neu-button" 
                      style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-blue)' }} 
                      onClick={() => updateQty(item.nombre, 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', minWidth: '60px', textAlign: 'right' }}>
                    ${(item.precio * item.qty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                  <button 
                    onClick={() => removeItem(item.nombre)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--accent-danger)', 
                      cursor: 'pointer', 
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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
          onClick={handleCompleteOrder}
          disabled={cart.length === 0}
          style={{ 
            width: '100%', 
            padding: '15px', 
            fontSize: '1.1rem', 
            color: cart.length > 0 ? 'var(--accent-blue)' : 'var(--text-muted)',
            cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
            marginBottom: enableMultiCart ? '12px' : '0'
          }}
        >
          COMPLETAR ORDEN
        </button>
        {enableMultiCart && (
          <button 
            className="neu-button" 
            onClick={handlePrintSummary}
            disabled={cart.length === 0}
            style={{ 
              width: '100%', 
              padding: '15px', 
              fontSize: '1.1rem', 
              color: cart.length > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
              cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🖨️ IMPRIMIR RESUMEN
          </button>
        )}
      </div>

      {isPrinting && (
        <TicketResumen 
          accountName={carts[expandedId]?.name || 'Principal'} 
          cart={cart} 
          total={total} 
          user={user} 
        />
      )}

      {renderNewCartModal()}
    </div>
  );
};

export default CartSidebar;
