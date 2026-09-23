import React from 'react';
import Sidebar from '../components/Sidebar';
import CartSidebar from '../components/CartSidebar';
import ProductCard from '../components/ProductCard';
import PaymentModal from '../components/PaymentModal';
import SearchBar from '../components/SearchBar';
import AperturaCajaModal from '../components/AperturaCajaModal';
import { useProductos } from '../context/ProductosContext';
import { useCart } from '../context/CartContext';

const PosTaquilla = () => {
  const [showPayment, setShowPayment] = React.useState(false);
  const { addItem } = useCart();
  const { getActivos } = useProductos();

  const [customName, setCustomName] = React.useState('');
  const [customPrice, setCustomPrice] = React.useState('');
  const [customType, setCustomType] = React.useState('entrada'); // 'entrada' o 'adicional'
  const [customSocks, setCustomSocks] = React.useState('0');

  // Reloj digital (Hora y Fecha actual)
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = time.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // Productos en tiempo real desde Firestore
  const entradas = getActivos('Taquilla').filter(p => p.categoria === 'Entradas');
  const adicionales = getActivos('Taquilla').filter(p => p.categoria === 'Adicionales');
  const allTaquillaProducts = [...entradas, ...adicionales];

  const handleSelectProduct = (product) => {
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
    const socksQty = parseInt(customSocks) || 0;

    addItem({
      nombre: customName.trim(),
      precio: price,
      isEntrada: customType === 'entrada',
      incCalcetas: socksQty
    });

    // Reset fields
    setCustomName('');
    setCustomPrice('');
    setCustomType('entrada');
    setCustomSocks('0');
    alert(`"${customName.trim()}" agregado al carrito.`);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AperturaCajaModal rol="Taquilla" />
      <Sidebar area="Taquilla" />
      
      <div style={{ flex: 1, padding: '20px 20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h1 className="text-gradient-orange" style={{ margin: '0 0 15px 0', fontSize: '2rem' }}>Taquilla</h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: 1, maxWidth: '500px' }}>
            <SearchBar 
              products={allTaquillaProducts} 
              onSelect={handleSelectProduct} 
              placeholder="Buscar entrada o adicional..." 
              accentColorClass="text-gradient-orange"
            />
          </div>
          
          <div className="neu-box" style={{ 
            padding: '10px 20px',
            borderRadius: '12px',
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '50px',
            minWidth: '220px',
            boxShadow: 'var(--shadow-light)',
            marginBottom: '25px',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              📅 {formattedDate}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-orange)', fontFamily: 'monospace' }}>
              ⏱️ {formattedTime}
            </span>
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Entradas</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {entradas.map((product, idx) => (
              <ProductCard key={`ent-${idx}`} product={product} colorClass="text-gradient-orange" />
            ))}
          </div>

          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Adicionales</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '35px'
          }}>
            {adicionales.map((product, idx) => (
              <ProductCard key={`adi-${idx}`} product={product} colorClass="text-gradient-orange" />
            ))}
          </div>

          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Otros Productos</h3>
          <div className="neu-box" style={{ padding: '20px', maxWidth: '600px', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Agregar Producto Personalizado / Abierto</h4>
            <form onSubmit={handleCustomAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 200px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>NOMBRE DEL PRODUCTO</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Entrada Especial" 
                    className="neu-input" 
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{ marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ flex: '1 1 100px' }}>
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
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TIPO DE PRODUCTO</label>
                  <select 
                    className="neu-input" 
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    style={{ marginTop: '5px' }}
                  >
                    <option value="entrada">Entrada / Boleto</option>
                    <option value="adicional">Adicional / Servicio</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>CALCETAS INCLUIDAS</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0" 
                    className="neu-input" 
                    value={customSocks}
                    onChange={(e) => setCustomSocks(e.target.value)}
                    style={{ marginTop: '5px' }}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="neu-button" 
                style={{ padding: '12px', color: 'var(--accent-orange)', fontWeight: 'bold', marginTop: '5px' }}
              >
                ➕ AGREGAR AL CARRITO
              </button>
            </form>
          </div>
        </div>
      </div>

      <CartSidebar onCheckout={handleCheckout} titleColorClass="text-gradient-orange" />
      
      {showPayment && (
        <PaymentModal area="Taquilla" onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
};

export default PosTaquilla;
