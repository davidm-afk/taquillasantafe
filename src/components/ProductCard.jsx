import React from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus } from 'lucide-react';

const ProductCard = ({ product, colorClass = "text-gradient-blue" }) => {
  const { cart, addItem, updateQty } = useCart();
  
  const cartItem = cart.find(item => item.nombre === product.nombre);
  const qty = cartItem ? cartItem.qty : 0;

  const handleAddItem = () => {
    if (product.precioAbierto) {
      const inputVal = window.prompt(`Ingrese el precio para ${product.nombre}:`, "");
      if (inputVal === null) return; // Cancelado
      const price = parseFloat(inputVal);
      if (isNaN(price) || price < 0) {
        alert("Por favor ingrese un precio válido.");
        return;
      }
      addItem({ ...product, precio: price });
    } else {
      addItem(product);
    }
  };

  return (
    <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{product.nombre}</h4>
        <span className={colorClass} style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          {product.precioAbierto && qty > 0 ? `$${cartItem.precio}` : product.precioAbierto ? 'Precio Abierto' : `$${product.precio}`}
        </span>
        {product.incCalcetas !== undefined && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0' }}>
            {product.incCalcetas > 0 ? `Incluye ${product.incCalcetas} calcetas` : 'Base'}
          </p>
        )}
      </div>

      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    </div>
  );
};

export default ProductCard;
