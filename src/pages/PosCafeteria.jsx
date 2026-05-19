import React from 'react';
import Sidebar from '../components/Sidebar';
import CartSidebar from '../components/CartSidebar';
import ProductCard from '../components/ProductCard';
import PaymentModal from '../components/PaymentModal';
import { cafeteriaProducts } from '../data/products';

const PosCafeteria = () => {
  const [showPayment, setShowPayment] = React.useState(false);

  const handleCheckout = () => {
    setShowPayment(true);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar area="Cafeteria" />
      
      <div style={{ flex: 1, padding: '20px 20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h1 className="text-gradient-blue" style={{ margin: '0 0 20px 0', fontSize: '2rem' }}>Cafetería</h1>
        
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
            gap: '20px'
          }}>
            {cafeteriaProducts.combos.map((product, idx) => (
              <ProductCard key={`combo-${idx}`} product={product} colorClass="text-gradient-blue" />
            ))}
          </div>
        </div>
      </div>

      <CartSidebar onCheckout={handleCheckout} titleColorClass="text-gradient-blue" />

      {showPayment && (
        <PaymentModal area="Cafeteria" onClose={() => setShowPayment(false)} />
      )}
    </div>
  );
};

export default PosCafeteria;
