import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import TicketImpresion from './TicketImpresion';
import { db } from '../config/firebase';
import { collection, addDoc, doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { taquillaProducts } from '../data/products';

// Helper function to update daily inventory for beverage sales
const updateInventoryForSales = async (cartItems) => {
  try {
    // Get local date in YYYY-MM-DD format (CDMX time offset -6 hours)
    const today = new Date();
    const tzOffset = -6; // Central Time CDMX (approx)
    const localTime = new Date(today.getTime() + tzOffset * 3600 * 1000);
    const yyyy = localTime.getUTCFullYear();
    const mm = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(localTime.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const getInventoryItemsToDiscount = (item) => {
      const baseName = item.originalName || item.nombre;
      const qty = parseInt(item.qty) || 1;
      let insumos = [];

      switch (baseName) {
        // Bebidas
        case "Coca cola": insumos.push({ nombre: "Coca Cola Original", qty: 1 }); break;
        case "Coca Light": insumos.push({ nombre: "Coca Cola Light", qty: 1 }); break;
        case "Coca Zero": insumos.push({ nombre: "Coca Cola Zero", qty: 1 }); break;
        case "Sprite": insumos.push({ nombre: "Sprite", qty: 1 }); break;
        case "Fanta": insumos.push({ nombre: "Fanta", qty: 1 }); break;
        case "Mundet": insumos.push({ nombre: "Mundet", qty: 1 }); break;
        case "Fresca": insumos.push({ nombre: "Fresca", qty: 1 }); break;
        case "Delaware Punch": insumos.push({ nombre: "Delaware Punch", qty: 1 }); break;
        case "Jugo Valle": insumos.push({ nombre: "Jugo del Valle", qty: 1 }); break;
        case "Fuze Tea": insumos.push({ nombre: "Fuze Tea", qty: 1 }); break;
        case "Topochico": insumos.push({ nombre: "Topo chico", qty: 1 }); break;
        case "Powerade": insumos.push({ nombre: "Powerade sabores", qty: 1 }); break;
        case "Agua": insumos.push({ nombre: "Agua Ciel 600 ml", qty: 1 }); break;
        case "Agua chica": insumos.push({ nombre: "Agua Ciel 350 ml", qty: 1 }); break;
        case "Agua de sabor": insumos.push({ nombre: "Vaso desechable 1Lt", qty: 1 }); break;
        case "Garrafon Agua Simple": insumos.push({ nombre: "Garrafon 19 lt", qty: 1 }); break;
        case "Garrafon Agua Sabor": insumos.push({ nombre: "Garrafon 19 lt", qty: 1 }); break;
        case "Vaso con hielo": insumos.push({ nombre: "Vaso desechable 0.5Lt", qty: 1 }); break;

        // Comida
        case "Palomitas": insumos.push({ nombre: "Maíz Palomero Schettino", qty: 1 }); break;
        case "Pizza": insumos.push({ nombre: "Pizza Congelada", qty: 1 }); break;
        case "Nuggets": 
          insumos.push({ nombre: "Nuggets", qty: 1 }); 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          break;
        case "Burguer Sencilla": 
        case "Hamburguesa especial": 
          insumos.push({ nombre: "Pan para hamburguesa", qty: 1 }); 
          insumos.push({ nombre: "Carne para hamburguesa", qty: 1 }); 
          insumos.push({ nombre: "Queso amarillo", qty: 1 }); 
          break;
        case "Hotdog (2)": 
        case "Hotdog pizza": 
          insumos.push({ nombre: "Pan hot dogs", qty: 2 }); 
          insumos.push({ nombre: "Salchichas", qty: 2 }); 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          break;
        case "Chicken Tenders": 
          insumos.push({ nombre: "Chiken tenders", qty: 1 }); 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          break;
        case "Papas Francesa": 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          break;
        case "Dedos Queso": 
          insumos.push({ nombre: "Dedos de queso", qty: 1 }); 
          insumos.push({ nombre: "Vaso condimentero", qty: 1 }); 
          break;
        case "Boneless": 
          insumos.push({ nombre: "Boneless", qty: 1 }); 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          insumos.push({ nombre: "Vaso condimentero", qty: 1 }); 
          break;
        case "Crazy Papas": 
          insumos.push({ nombre: "Charola de carton", qty: 1 }); 
          break;
        case "Vaso Loco": 
          insumos.push({ nombre: "Vaso desechable 6OZ", qty: 1 }); 
          break;
        case "Helado Frozen": 
          insumos.push({ nombre: "Vaso Frozen", qty: 1 }); 
          break;
        case "Charola de verdura": 
        case "Charola de verdura especial": 
        case "Extra queso amarillo": 
          insumos.push({ nombre: "Vaso condimentero", qty: 1 }); 
          break;
        
        // Combos
        case "Combo Hamburguesa":
          insumos.push({ nombre: "Pan para hamburguesa", qty: 1 }); 
          insumos.push({ nombre: "Carne para hamburguesa", qty: 1 }); 
          insumos.push({ nombre: "Queso amarillo", qty: 1 }); 
          insumos.push({ nombre: "Papas a la francesa", qty: 1 }); 
          if (item.drinkOption) {
            const drinkInsumos = getInventoryItemsToDiscount({ nombre: item.drinkOption, qty: 1 });
            insumos = insumos.concat(drinkInsumos);
          }
          break;
        case "Combo SkyFriends":
          insumos.push({ nombre: "Boneless", qty: 1 });
          insumos.push({ nombre: "Nuggets", qty: 1 });
          insumos.push({ nombre: "Dedos de queso", qty: 1 });
          insumos.push({ nombre: "Papas a la francesa", qty: 2 });
          insumos.push({ nombre: "Vaso condimentero", qty: 1 });
          break;
      }

      return insumos.map(ins => ({ ...ins, qty: ins.qty * qty }));
    };

    const salesToApply = [];
    cartItems.forEach(item => {
      const insumos = getInventoryItemsToDiscount(item);
      insumos.forEach(ins => {
        const existing = salesToApply.find(s => s.nombre === ins.nombre);
        if (existing) {
          existing.qty += ins.qty;
        } else {
          salesToApply.push(ins);
        }
      });
    });

    if (salesToApply.length === 0) return; // No mapped items sold

    const docRef = doc(db, 'inventario', dateStr);
    const docSnap = await getDoc(docRef);

    let inventoryData;
    if (docSnap.exists()) {
      inventoryData = docSnap.data();
    } else {
      // Initialize if it doesn't exist
      const prevQuery = query(collection(db, 'inventario'), orderBy('fecha', 'desc'), limit(1));
      const prevSnap = await getDocs(prevQuery);
      
      let previousProducts = {};
      if (!prevSnap.empty) {
        previousProducts = prevSnap.docs[0].data().productos || {};
      }

      const allProductNames = [
        "Nuggets", "Chiken tenders", "Boneless", "Dedos de queso", "Carne para hamburguesa",
        "Pan para hamburguesa", "Queso amarillo", "Pizza Congelada", "Queso", "Pepperoni",
        "Papas a la francesa", "Salchichas", "Pan hot dogs", "Maíz Palomero Schettino", "Papas Ojuela",
        "Frozen Fresas Con Crema", "Frozen Fruta Del Dragón", "Frozen Fruit Circle",
        "Frozen Cookies And Cream", "Frozen Ositos", "Frozen Algodón De Azúcar",
        "Coca Cola Original", "Coca Cola Zero", "Coca Cola Light", "Sprite", "Mundet", "Fresca",
        "Fanta", "Delaware Punch", "Fuze Tea", "Powerade sabores", "Jugo del Valle", "Garrafon 19 lt",
        "Agua Ciel 600 ml", "Agua Ciel 350 ml", "Topo chico", "salsa valentina", "salsa maggi", "salsa chamoy",
        "Aceite", "Gomita Mango Enchilada", "Gomita pandita", "Gomita frituta", "Gomita lombriz",
        "Gomita lombriz azucarada", "Gomita lombriz enchilada", "Cacahuate enchilado",
        "Cacahuate salado", "Cacahuate japones", "Miguelito", "Plato para Pizza", "Plato Pastelero",
        "Cuchara desechables", "Tenedores desechables", "Paquete Servilletas", "Toallas Sanitas",
        "Toalla de Papel Marli", "Papel Higiénico Marli", "Papel encerado", "Cloro",
        "Jabón para Manos", "Salvo Líquido Trastes", "Fabuloso Lavanda", "Aromatizante Glade",
        "Servibolsa Extra Jumbo", "Servibolsa Grande", "Fibra de trastes", "Vaso coleccionable SZ",
        "Charola de carton", "Vaso desechable 1Lt", "Vaso desechable 0.5Lt", "Vaso desechable 6OZ",
        "Vaso condimentero", "Vaso Frozen"
      ];

      const initialProducts = {};
      allProductNames.forEach(prod => {
        const prev = previousProducts[prod] || {};
        const prevFinal = prev.final !== undefined ? parseInt(prev.final) || 0 : 0;
        initialProducts[prod] = {
          inicial: prevFinal,
          entrada: 0,
          merma: 0,
          cortesia: 0,
          venta: 0,
          final: prevFinal
        };
      });

      inventoryData = {
        fecha: dateStr,
        productos: initialProducts
      };
    }

    // Apply the beverage sales to inventory data
    salesToApply.forEach(sale => {
      const prodData = inventoryData.productos[sale.nombre] || {
        inicial: 0,
        entrada: 0,
        merma: 0,
        cortesia: 0,
        venta: 0,
        final: 0
      };
      
      prodData.venta = (parseInt(prodData.venta) || 0) + sale.qty;
      prodData.final = (parseInt(prodData.inicial) || 0) + 
                       (parseInt(prodData.entrada) || 0) - 
                       (parseInt(prodData.merma) || 0) - 
                       (parseInt(prodData.cortesia) || 0) - 
                       prodData.venta;
      
      inventoryData.productos[sale.nombre] = prodData;
    });

    await setDoc(docRef, inventoryData);
  } catch (err) {
    console.error("Error adjusting inventory during checkout:", err);
  }
};

const PaymentModal = ({ area, onClose }) => {
  const { cart, total, clearCart } = useCart();
  const { user } = useAuth();
  
  const [metodo, setMetodo] = useState('Efectivo');
  const [recibido, setRecibido] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const numRecibido = parseFloat(recibido) || 0;
  const isMixto = metodo === 'Efectivo' && numRecibido > 0 && numRecibido < total;

  const cashPaid = isMixto ? numRecibido : (metodo === 'Efectivo' && numRecibido >= total ? total : 0);
  const cardPaid = isMixto ? total - numRecibido : (metodo === 'Tarjeta' ? total : 0);
  const cambio = isMixto ? 0 : (metodo === 'Efectivo' && numRecibido >= total ? numRecibido - total : 0);

  const handleConfirm = async () => {
    if (metodo === 'Efectivo' && numRecibido <= 0) {
      alert("Por favor, ingresa un monto recibido en efectivo válido.");
      return;
    }

    setLoading(true);

    // Preparar objeto para Firebase
    let resumenEntradasList = [];
    let resumenAdicionalesList = [];
    let resumenCafeteriaList = [];

    cart.forEach(item => {
      if (area === 'Taquilla') {
        const prodEntrada = taquillaProducts.entradas.find(p => p.nombre === item.nombre);
        const isEntrada = prodEntrada || item.isEntrada || (item.incCalcetas && item.incCalcetas > 0);
        const incCalcetas = prodEntrada ? prodEntrada.incCalcetas : (item.incCalcetas || 0);

        if (isEntrada) {
          const suffix = incCalcetas > 0 ? ` (+${incCalcetas} calcetas)` : '';
          resumenEntradasList.push(`${item.qty}x ${item.nombre}${suffix} ($${item.precio})`);
        } else {
          resumenAdicionalesList.push(`${item.qty}x ${item.nombre} ($${item.precio})`);
        }
      } else {
        resumenCafeteriaList.push(`${item.qty}x ${item.nombre} ($${item.precio})`);
      }
    });
    
    const ventaData = {
      area: area,
      cajero: user?.nombre || 'Desconocido',
      total: total,
      metodoPago: isMixto ? 'Mixto' : metodo,
      pagoEfectivo: cashPaid,
      pagoTarjeta: cardPaid,
      fecha: new Date().toISOString(),
      timestamp: Date.now()
    };
    // Calcular hora de salida automática basada en la duración del ticket (CDMX)
    if (area === 'Taquilla') {
      // Obtener la mayor duración (en minutos) de los productos en el carrito
      let maxDuration = 0;
      cart.forEach(item => {
        const prod = taquillaProducts.entradas.find(p => p.nombre === item.nombre);
        if (prod && prod.duration) {
          // Si hay varias entradas, consideramos la mayor duración
          maxDuration = Math.max(maxDuration, prod.duration);
        }
      });

      if (maxDuration > 0) {
        const exitDate = new Date(Date.now() + maxDuration * 60 * 1000);
        ventaData.exitHour = exitDate.getHours();
        ventaData.exitMinute = exitDate.getMinutes();
        ventaData.exitTimestamp = exitDate.getTime();
      } else {
        // SKY PASS o APOYO sin límite de tiempo
        ventaData.exitHour = null;
        ventaData.exitMinute = null;
        ventaData.exitTimestamp = null;
      }
    }

    if (area === 'Taquilla') {
      ventaData.entradas = resumenEntradasList.join(" | ") || "Ninguna";
      ventaData.adicionales = resumenAdicionalesList.join(" | ") || "Ninguno";
    } else {
      ventaData.productos = resumenCafeteriaList.join(" | ") || "Ninguno";
    }

    try {
      await updateInventoryForSales(cart);
      await addDoc(collection(db, 'ventas'), ventaData);
      
      // Imprimir el ticket de manera sincrona después de enviar a Firebase
      document.body.classList.add('print-ticket');
      window.print();
      document.body.classList.remove('print-ticket');
      
      setSuccess(true);
      setTimeout(() => {
        clearCart();
        onClose();
      }, 2000);
    } catch (error) {
      alert("Error de conexión al guardar la venta.");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="neu-box" style={{ padding: '2rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        {!success ? (
          <>
            <h2 className="text-gradient-blue" style={{ marginTop: 0 }}>Finalizar Cobro</h2>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-main)' }}>
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <button 
                type="button" 
                className={metodo === 'Efectivo' ? 'neu-button' : 'neu-box'} 
                onClick={() => setMetodo('Efectivo')}
                style={{ flex: 1, padding: '15px', cursor: 'pointer', border: metodo === 'Efectivo' ? '2px solid var(--accent-success)' : 'none' }}
              >
                💵 Efectivo
              </button>
              <button 
                type="button" 
                className={metodo === 'Tarjeta' ? 'neu-button' : 'neu-box'} 
                onClick={() => setMetodo('Tarjeta')}
                style={{ flex: 1, padding: '15px', cursor: 'pointer', border: metodo === 'Tarjeta' ? '2px solid var(--accent-success)' : 'none' }}
              >
                💳 Tarjeta
              </button>
            </div>

            {metodo === 'Efectivo' && (
              <>
                <div className="neu-box" style={{ padding: '15px', marginBottom: '20px', textAlign: 'left' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Monto recibido en efectivo:</label>
                  <input
                    type="number"
                    className="neu-input"
                    style={{ marginTop: '10px', fontSize: '1.2rem', textAlign: 'center' }}
                    placeholder="$0.00"
                    value={recibido}
                    onChange={(e) => setRecibido(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirm();
                      }
                    }}
                  />

                  {isMixto ? (
                    <div className="neu-box animate-fade-in" style={{ marginTop: '15px', padding: '12px', borderLeft: '4px solid var(--accent-warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>💵 Pago en Efectivo:</span>
                        <strong style={{ color: 'var(--text-main)' }}>${cashPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>💳 Restante con Tarjeta:</span>
                        <strong style={{ color: 'var(--accent-warning)' }}>${cardPaid.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="text-gradient-blue" style={{ fontSize: '0.8rem', fontWeight: 'bold', marginTop: '8px', textAlign: 'center', textTransform: 'uppercase' }}>
                        ⚡ Se cobrará con método Mixto ⚡
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vuelto (Cambio):</span>
                      <strong style={{ fontSize: '1.2rem', color: cambio >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        ${cambio > 0 ? cambio.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                      </strong>
                    </div>
                  )}
                </div>
              </>
            )}

            <button 
              className="neu-button" 
              onClick={handleConfirm}
              disabled={loading}
              style={{ width: '100%', marginBottom: '10px', color: 'var(--accent-success)' }}
            >
              {loading ? "PROCESANDO..." : "CONFIRMAR E IMPRIMIR"}
            </button>

            <button 
              className="neu-button" 
              onClick={onClose}
              disabled={loading}
              style={{ width: '100%', color: 'var(--accent-danger)' }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <div>
            <h2 style={{ color: 'var(--accent-success)' }}>✓ Venta Exitosa</h2>
            <p style={{ color: 'var(--text-muted)' }}>Ticket enviado a imprimir.</p>
          </div>
        )}

      </div>

      <TicketImpresion 
        user={user} 
        cart={cart} 
        total={total} 
        method={isMixto ? 'Mixto' : metodo} 
        received={recibido} 
        change={cambio > 0 ? cambio : 0} 
        pagoEfectivo={cashPaid}
        pagoTarjeta={cardPaid}
      />
    </div>
  );
};

export default PaymentModal;
