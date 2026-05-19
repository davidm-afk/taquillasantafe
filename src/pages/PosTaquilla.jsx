import React from 'react';
import Sidebar from '../components/Sidebar';
import CartSidebar from '../components/CartSidebar';
import ProductCard from '../components/ProductCard';
import PaymentModal from '../components/PaymentModal';
import { taquillaProducts } from '../data/products';

const PosTaquilla = () => {
  const [showPayment, setShowPayment] = React.useState(false);

  const handleCheckout = () => {
    setShowPayment(true);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar area="Taquilla" />
      
      <div style={{ flex: 1, padding: '20px 20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h1 className="text-gradient-orange" style={{ margin: '0 0 20px 0', fontSize: '2rem' }}>Taquilla</h1>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Entradas</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            {taquillaProducts.entradas.map((product, idx) => (
              <ProductCard key={`ent-${idx}`} product={product} colorClass="text-gradient-orange" />
            ))}
          </div>

          <h3 style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>Adicionales</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
            gap: '20px'
          }}>
            {taquillaProducts.adicionales.map((product, idx) => (
              <ProductCard key={`adi-${idx}`} product={product} colorClass="text-gradient-orange" />
            ))}
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
