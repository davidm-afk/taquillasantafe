import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, X } from 'lucide-react';
import { cafeteriaProducts } from '../data/products';

const ProductCard = ({ product, colorClass = "text-gradient-blue" }) => {
  const { cart, addItem, updateQty } = useCart();
  const [showDrinkModal, setShowDrinkModal] = useState(false);
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState('');

  const cartItem = cart.find(item => item.nombre === product.nombre);
  const qty = cartItem ? cartItem.qty : 0;

  const handleAddItem = () => {
    if (product.nombre === "Combo Hamburguesa") {
      setShowDrinkModal(true);
      return;
    }

    if (product.precioAbierto) {
      setShowCustomPriceModal(true);
      return;
    }

    addItem(product);
  };

  const handleCustomPriceSubmit = (e) => {
    e.preventDefault();
    const price = parseFloat(customPriceInput);
    if (!isNaN(price) && price >= 0) {
      addItem({ ...product, precio: price });
      setShowCustomPriceModal(false);
      setCustomPriceInput('');
    }
  };

  const isSkySocks = product.nombre === "SkySocks";
  return (
    <div className="neu-box" style={{ 
      padding: '15px', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      gridColumn: isSkySocks ? 'span 2' : 'auto'
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {product.imagen && (
          <img 
            src={product.imagen?.startsWith('/') ? '.' + product.imagen : product.imagen} 
            alt={product.nombre} 
            style={{ 
              width: '45px', 
              height: '45px', 
              objectFit: 'contain', 
              borderRadius: '8px',
              padding: '4px',
              background: 'rgba(255, 255, 255, 0.3)',
              boxShadow: 'var(--shadow-inset)'
            }} 
          />
        )}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{product.nombre}</h4>
          {product.subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '-2px 0 6px 0', lineHeight: '1.2' }}>
              {product.subtitle}
            </p>
          )}
          <span className={colorClass} style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            {product.precioAbierto && qty > 0 ? `$${cartItem.precio}` : product.precioAbierto ? 'Precio Abierto' : `$${product.precio}`}
          </span>
          {product.incCalcetas !== undefined && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0' }}>
              {product.incCalcetas > 0 ? `Incluye ${product.incCalcetas} calcetas` : 'Base'}
            </p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '15px' }}>
        {product.nombre === "SkySocks" ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '8px', 
            width: '100%' 
          }}>
            {["XS", "S", "M", "L", "XL", "XXL", "XXXL"].map(talla => {
              const sizeName = `${product.nombre} (${talla})`;
              const cartItemTalla = cart.find(item => item.nombre === sizeName);
              const tallaQty = cartItemTalla ? cartItemTalla.qty : 0;
              return (
                <button
                  key={talla}
                  className="neu-button"
                  onClick={() => {
                    if (tallaQty > 0) {
                      updateQty(sizeName, 1);
                    } else {
                      addItem({ ...product, nombre: sizeName });
                    }
                  }}
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    position: 'relative',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '0'
                  }}
                >
                  {talla}
                  {tallaQty > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'var(--accent-orange)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      {tallaQty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            {qty === 0 ? (
              <button 
                className="neu-button" 
                style={{ width: '100%', padding: '10px', color: 'var(--text-main)' }}
                onClick={handleAddItem}
              >
                Agregar
              </button>
            ) : (
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="neu-button" style={{ padding: '10px' }} onClick={() => updateQty(product.nombre, -1)}>
                  <Minus size={16} />
                </button>
                <strong style={{ fontSize: '1.2rem' }}>{qty}</strong>
                <button className="neu-button" style={{ padding: '10px', color: 'var(--accent-blue)' }} onClick={() => updateQty(product.nombre, 1)}>
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDrinkModal && (
        <div className="modal-overlay">
          <div className="neu-box animate-fade-in" style={{ padding: '20px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              className="neu-button" 
              style={{ position: 'absolute', top: '15px', right: '15px', padding: '8px' }}
              onClick={() => setShowDrinkModal(false)}
            >
              <X size={18} />
            </button>
            <h2 className="text-gradient-blue" style={{ marginTop: 0, marginBottom: '20px' }}>Seleccionar Bebida</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>¿Qué bebida desea el cliente para su Combo Hamburguesa?</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' }}>
              {cafeteriaProducts.bebidas
                .filter(b => !b.nombre.includes("Garrafon") && !b.nombre.includes("hielo") && !b.nombre.includes("sabor")) // Filtramos garrafones y vasos sueltos
                .map(bebida => (
                <button
                  key={bebida.nombre}
                  className="neu-button"
                  style={{ padding: '12px', fontSize: '0.9rem', fontWeight: 'bold' }}
                  onClick={() => {
                    addItem({ ...product, nombre: `${product.nombre} (${bebida.nombre})`, originalName: product.nombre, drinkOption: bebida.nombre });
                    setShowDrinkModal(false);
                  }}
                >
                  {bebida.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCustomPriceModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="neu-box animate-fade-in" style={{ padding: '30px', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
            <h3 className={colorClass} style={{ margin: '0 0 15px 0', fontSize: '1.3rem' }}>Precio de {product.nombre}</h3>
            <form onSubmit={handleCustomPriceSubmit}>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>$</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0.00"
                  className="neu-input"
                  value={customPriceInput}
                  onChange={(e) => setCustomPriceInput(e.target.value)}
                  style={{ paddingLeft: '35px', width: '100%', fontSize: '1.2rem', textAlign: 'center' }}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="neu-button"
                  onClick={() => { setShowCustomPriceModal(false); setCustomPriceInput(''); }}
                  style={{ flex: 1, padding: '10px', color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="neu-button"
                  style={{ flex: 1, padding: '10px', color: 'var(--accent-blue)', fontWeight: 'bold' }}
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
