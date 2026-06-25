import React from 'react';
import Sidebar from '../components/Sidebar';
import CartSidebar from '../components/CartSidebar';
import ProductCard from '../components/ProductCard';
import PaymentModal from '../components/PaymentModal';
import SearchBar from '../components/SearchBar';
import { cafeteriaProducts } from '../data/products';
import { useCart } from '../context/CartContext';

const PosCafeteria = () => {
  const [showPayment, setShowPayment] = React.useState(false);
  const { addItem } = useCart();

  const [customName, setCustomName] = React.useState('');
  const [customPrice, setCustomPrice] = React.useState('');

  const allCafeteriaProducts = React.useMemo(() => {
    return [
      ...cafeteriaProducts.bebidas,
      ...cafeteriaProducts.comida,
      ...cafeteriaProducts.combos
    ];
  }, []);

  const handleSelectProduct = (product) => {
    if (product.nombre === "Combo Hamburguesa") {
      const drinks = cafeteriaProducts.bebidas.filter(b => !b.nombre.includes("Garrafon") && !b.nombre.includes("hielo") && !b.nombre.includes("sabor"));
      const drinkNames = drinks.map(d => d.nombre).join(", ");
      const selectedDrink = window.prompt(`Seleccione la bebida para el combo:\n${drinkNames}`, "Coca cola");
      if (selectedDrink === null) return; // Cancelado
      
      const foundDrink = drinks.find(d => d.nombre.toLowerCase() === selectedDrink.trim().toLowerCase());
      if (foundDrink) {
        addItem({ ...product, nombre: `${product.nombre} (${foundDrink.nombre})`, originalName: product.nombre, drinkOption: foundDrink.nombre });
      } else {
        alert("Bebida no válida. Inténtelo de nuevo.");
      }
      return;
    }

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

  const handleCheckout = () => {
    setShowPayment(true);
  };

  const handleCustomAdd = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert("Por favor ingrese el nombre del producto.");
      return;
    }
    const price = parseFloat(customPrice);
    if (isNaN(price) || price < 0) {
      alert("Por favor ingrese un precio válido.");
      return;
    }

    addItem({
      nombre: customName.trim(),
      precio: price
    });

    // Reset fields
    setCustomName('');
    setCustomPrice('');
    alert(`"${customName.trim()}" agregado al carrito por $${price}.`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar area="Cafeteria" />
      
      <div style={{ flex: 1, padding: '20px 20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h1 className="text-gradient-blue" style={{ margin: '0 0 15px 0', fontSize: '2rem' }}>Cafetería</h1>
        
        <SearchBar 
          products={allCafeteriaProducts} 
          onSelect={handleSelectProduct} 
          placeholder="Buscar bebida, comida o combo..." 
          accentColorClass="text-gradient-blue"
        />
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Bebidas</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {cafeteriaProducts.bebidas.map((product, idx) => (
              <ProductCard key={`beb-${idx}`} product={product} colorClass="text-gradient-blue" />
            ))}
          </div>
 
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Snacks y Comida</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {cafeteriaProducts.comida.map((product, idx) => (
              <ProductCard key={`com-${idx}`} product={product} colorClass="text-gradient-blue" />
            ))}
          </div>
 
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Combos</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {cafeteriaProducts.combos.map((product, idx) => (
              <ProductCard key={`combo-${idx}`} product={product} colorClass="text-gradient-blue" />
            ))}
          </div>

          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Otros Productos</h3>
          <div className="neu-box" style={{ padding: '20px', maxWidth: '450px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Agregar Producto Personalizado / Abierto</h4>
            <form onSubmit={handleCustomAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>NOMBRE DEL PRODUCTO</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Gelatina" 
                    className="neu-input" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>PRECIO ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="neu-input" 
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ marginTop: '5px' }}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="neu-button" 
                style={{ padding: '12px', color: 'var(--accent-blue)', fontWeight: 'bold', marginTop: '5px' }}
              >
                ➕ AGREGAR AL CARRITO
              </button>
            </form>
          </div>
        </div>
      </div>
 
      <CartSidebar onCheckout={handleCheckout} titleColorClass="text-gradient-blue" enableMultiCart={true} />
 
      {showPayment && (
        <PaymentModal area="Cafeteria" onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
};
 
export default PosCafeteria;
