import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Search, Save, Calendar, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

const ALL_PRODUCTS = [
  "Nuggets", "Chiken tenders", "Boneless", "Dedos de queso", "Carne para hamburguesa",
  "Pan para hamburguesa", "Queso amarillo", "Pizza Congelada", "Queso", "Pepperoni",
  "Papas a la francesa", "Salchichas", "Pan hot dogs", "Maíz Palomero Schettino", "Papas Ojuela",
  "Frozen Fresas Con Crema", "Frozen Fruta Del Dragón", "Frozen Fruit Circle",
  "Frozen Cookies And Cream", "Frozen Ositos", "Frozen Algodón De Azúcar",
  "Coca Cola Original", "Coca Cola Zero", "Coca Cola Light", "Sprite", "Mundet", "Fresca",
  "Fanta", "Delaware Punch", "Fuze Tea", "Powerade sabores", "Jugo del Valle", "Garrafon 19 lt",
  "Agua Ciel 600 ml", "Topo chico", "salsa valentina", "salsa maggi", "salsa chamoy",
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

const getCategory = (name) => {
  const food = ["Nuggets", "Chiken tenders", "Boneless", "Dedos de queso", "Carne para hamburguesa", "Pan para hamburguesa", "Queso amarillo", "Pizza Congelada", "Queso", "Pepperoni", "Papas a la francesa", "Salchichas", "Pan hot dogs", "Maíz Palomero Schettino", "Papas Ojuela", "Aceite"];
  const frozen = ["Frozen Fresas Con Crema", "Frozen Fruta Del Dragón", "Frozen Fruit Circle", "Frozen Cookies And Cream", "Frozen Ositos", "Frozen Algodón De Azúcar"];
  const drinks = ["Coca Cola Original", "Coca Cola Zero", "Coca Cola Light", "Sprite", "Mundet", "Fresca", "Fanta", "Delaware Punch", "Fuze Tea", "Powerade sabores", "Jugo del Valle", "Garrafon 19 lt", "Agua Ciel 600 ml", "Topo chico"];
  const candy = ["Gomita Mango Enchilada", "Gomita pandita", "Gomita frituta", "Gomita lombriz", "Gomita lombriz azucarada", "Gomita lombriz enchilada", "Cacahuate enchilado", "Cacahuate salado", "Cacahuate japones", "Miguelito", "salsa valentina", "salsa maggi", "salsa chamoy"];
  const disposable = ["Plato para Pizza", "Plato Pastelero", "Cuchara desechables", "Tenedores desechables", "Paquete Servilletas", "Vaso coleccionable SZ", "Charola de carton", "Vaso desechable 1Lt", "Vaso desechable 0.5Lt", "Vaso desechable 6OZ", "Vaso condimentero", "Vaso Frozen"];
  const cleaning = ["Toallas Sanitas", "Toalla de Papel Marli", "Papel Higiénico Marli", "Papel encerado", "Cloro", "Jabón para Manos", "Salvo Líquido Trastes", "Fabuloso Lavanda", "Aromatizante Glade", "Servibolsa Extra Jumbo", "Servibolsa Grande", "Fibra de trastes"];

  if (food.includes(name)) return "Alimentos";
  if (frozen.includes(name)) return "Frozen";
  if (drinks.includes(name)) return "Bebidas";
  if (candy.includes(name)) return "Dulces y Salsas";
  if (disposable.includes(name)) return "Desechables";
  if (cleaning.includes(name)) return "Insumos y Limpieza";
  return "Otros";
};

const getLocalTodayStr = () => {
  const today = new Date();
  const tzOffset = -6; // Central Time CDMX (approx)
  const localTime = new Date(today.getTime() + tzOffset * 3600 * 1000);
  const yyyy = localTime.getUTCFullYear();
  const mm = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(localTime.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const Inventario = () => {
  const [selectedDate, setSelectedDate] = useState(getLocalTodayStr());
  const [productos, setProductos] = useState({});
  const [loadedProducts, setLoadedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Load inventory for selected date
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError(null);
      setSuccessMsg('');
      try {
        const docRef = doc(db, 'inventario', selectedDate);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data().productos || {};
          const merged = {};
          ALL_PRODUCTS.forEach(p => {
            if (data[p]) {
              merged[p] = {
                inicial: data[p].inicial !== undefined ? parseInt(data[p].inicial) || 0 : 0,
                entrada: data[p].entrada !== undefined ? parseInt(data[p].entrada) || 0 : 0,
                merma: data[p].merma !== undefined ? parseInt(data[p].merma) || 0 : 0,
                cortesia: data[p].cortesia !== undefined ? parseInt(data[p].cortesia) || 0 : 0,
                venta: data[p].venta !== undefined ? parseInt(data[p].venta) || 0 : 0,
                final: data[p].final !== undefined ? parseInt(data[p].final) || 0 : 0
              };
            } else {
              merged[p] = { inicial: 0, entrada: 0, merma: 0, cortesia: 0, venta: 0, final: 0 };
            }
          });
          setProductos(merged);
          setLoadedProducts(JSON.parse(JSON.stringify(merged)));
        } else {
          // Document does not exist. Fetch closest previous day's final inventory.
          const prevQuery = query(
            collection(db, 'inventario'),
            where('fecha', '<', selectedDate),
            orderBy('fecha', 'desc'),
            limit(1)
          );
          const prevSnap = await getDocs(prevQuery);
          
          let previousProducts = {};
          if (!prevSnap.empty) {
            previousProducts = prevSnap.docs[0].data().productos || {};
          }

          const initialized = {};
          ALL_PRODUCTS.forEach(p => {
            const prevFinal = previousProducts[p]?.final !== undefined 
              ? parseInt(previousProducts[p].final) || 0 
              : 0;
            initialized[p] = {
              inicial: prevFinal,
              entrada: 0,
              merma: 0,
              cortesia: 0,
              venta: 0,
              final: prevFinal
            };
          });
          setProductos(initialized);
          setLoadedProducts(JSON.parse(JSON.stringify(initialized)));
        }
      } catch (err) {
        console.error("Error loading inventory:", err);
        setError("Error al cargar el inventario: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [selectedDate]);

  // Save changes to Firestore
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg('');
    try {
      // Limpiar los valores antes de guardar en Firestore (asegurar que sean números enteros)
      const cleanedProductos = {};
      Object.keys(productos).forEach(name => {
        const p = productos[name];
        cleanedProductos[name] = {
          inicial: parseInt(p.inicial) || 0,
          entrada: parseInt(p.entrada) || 0,
          merma: parseInt(p.merma) || 0,
          cortesia: parseInt(p.cortesia) || 0,
          venta: parseInt(p.venta) || 0,
          final: parseInt(p.final) || 0
        };
      });

      const docRef = doc(db, 'inventario', selectedDate);
      await setDoc(docRef, {
        fecha: selectedDate,
        productos: cleanedProductos
      });
      setProductos(cleanedProductos);
      setLoadedProducts(JSON.parse(JSON.stringify(cleanedProductos)));
      setSuccessMsg('¡Inventario guardado correctamente!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error saving inventory:", err);
      setError("Error al guardar el inventario: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle changes in table inputs
  const handleValueChange = (productName, field, value) => {
    // Permitir guardar cadena vacía para que el usuario pueda borrar el input libremente
    const cleanValue = value === '' ? '' : (parseInt(value) || 0);
    setProductos(prev => {
      const updatedProd = {
        ...prev[productName],
        [field]: cleanValue
      };
      
      // Calcular Final usando valores numéricos
      const inicial = parseInt(updatedProd.inicial) || 0;
      const entrada = parseInt(updatedProd.entrada) || 0;
      const merma = parseInt(updatedProd.merma) || 0;
      const cortesia = parseInt(updatedProd.cortesia) || 0;
      const venta = parseInt(updatedProd.venta) || 0;
      
      updatedProd.final = inicial + entrada - merma - cortesia - venta;
      return {
        ...prev,
        [productName]: updatedProd
      };
    });
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIndex;

      if (e.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1);
      if (e.key === 'ArrowDown') nextRow = Math.min(filteredProductsList.length - 1, rowIndex + 1);
      if (e.key === 'ArrowLeft') nextCol = Math.max(0, colIndex - 1);
      if (e.key === 'ArrowRight') nextCol = Math.min(4, colIndex + 1);

      const nextInput = document.getElementById(`input-${nextRow}-${nextCol}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Adjust Date by +/- 1 day
  const adjustDate = (days) => {
    const currentDate = new Date(selectedDate + 'T00:00:00');
    currentDate.setDate(currentDate.getDate() + days);
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(productos) !== JSON.stringify(loadedProducts);
  }, [productos, loadedProducts]);

  // Totals calculations for cards
  const stats = useMemo(() => {
    let totalEntradas = 0;
    let totalMermas = 0;
    let totalCortesias = 0;
    let totalVentas = 0;

    Object.values(productos).forEach(p => {
      totalEntradas += p.entrada || 0;
      totalMermas += p.merma || 0;
      totalCortesias += p.cortesia || 0;
      totalVentas += p.venta || 0;
    });

    return { totalEntradas, totalMermas, totalCortesias, totalVentas };
  }, [productos]);

  // Categories definition
  const categories = ['Todos', 'Bebidas', 'Alimentos', 'Frozen', 'Dulces y Salsas', 'Desechables', 'Insumos y Limpieza'];

  // Filtered products list
  const filteredProductsList = useMemo(() => {
    return ALL_PRODUCTS.filter(name => {
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Todos' || getCategory(name) === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        /* Hide default number input styling */
        .inv-number-input::-webkit-outer-spin-button,
        .inv-number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .inv-number-input {
          -moz-appearance: textfield;
          text-align: center;
          border: none;
          background: var(--bg-color);
          box-shadow: var(--shadow-inset);
          border-radius: 8px;
          padding: 8px;
          width: 75px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-main);
          transition: all 0.2s ease;
        }
        .inv-number-input:focus {
          box-shadow: inset 3px 3px 6px rgba(163,177,198,0.8), inset -3px -3px 6px rgba(255,255,255,0.9);
          outline: 2px solid var(--accent-blue);
        }
        .inv-table-row {
          transition: background-color 0.2s ease;
        }
        .inv-table-row:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }
        [data-theme="dark"] .inv-table-row:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
        .category-pill {
          padding: 10px 18px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          border: none;
          background-color: var(--bg-color);
          color: var(--text-main);
          box-shadow: var(--shadow-light);
        }
        .category-pill:hover {
          box-shadow: var(--shadow-hover);
        }
        .category-pill.active {
          box-shadow: var(--shadow-active);
          color: var(--accent-blue);
        }
        .inv-header-cell {
          position: sticky;
          top: 0;
          background-color: var(--bg-color);
          z-index: 10;
          padding: 15px;
          border-bottom: 2px solid rgba(0,0,0,0.05);
          font-weight: bold;
          color: var(--text-muted);
          text-align: center;
        }
        [data-theme="dark"] .inv-header-cell {
          border-bottom: 2px solid rgba(255,255,255,0.05);
        }
      `}</style>

      <Sidebar area="Inventario" />

      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Top Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h1 className="text-gradient-blue" style={{ margin: '0 0 5px 0', fontSize: '2rem' }}>Inventario Diario</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control y control de stock de productos de cafetería e insumos</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <div className="animate-pulse" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--accent-warning)',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                <AlertCircle size={16} /> Cambios sin guardar
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="neu-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: hasUnsavedChanges ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-color)',
                border: hasUnsavedChanges ? '1px solid var(--accent-success)' : 'none',
                color: hasUnsavedChanges ? 'var(--accent-success)' : 'var(--text-main)',
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Inventario'}
            </button>
          </div>
        </div>

        {/* Date Selector and Search Bar */}
        <div className="neu-box" style={{ padding: '15px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          {/* Date Picker Component */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => adjustDate(-1)} className="neu-button" style={{ padding: '10px 15px' }} title="Día Anterior">
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              <Calendar size={18} style={{ color: 'var(--accent-blue)', position: 'absolute', left: '12px' }} />
              <input
                type="date"
                className="neu-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '180px', paddingLeft: '40px', fontSize: '0.95rem', fontWeight: 600 }}
              />
            </div>

            <button onClick={() => adjustDate(1)} className="neu-button" style={{ padding: '10px 15px' }} title="Siguiente Día">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '300px' }}>
            <Search size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '15px' }} />
            <input
              type="text"
              placeholder="Buscar producto..."
              className="neu-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '45px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="neu-box animate-fade-in" style={{ padding: '15px', marginBottom: '20px', borderLeft: '4px solid var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="neu-box animate-fade-in" style={{ padding: '15px', marginBottom: '20px', borderLeft: '4px solid var(--accent-success)', backgroundColor: 'rgba(16, 185, 129, 0.05)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '4px solid var(--accent-blue)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>PRODUCTOS LISTADOS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '5px' }}>{filteredProductsList.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {ALL_PRODUCTS.length}</span></span>
          </div>
          <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '4px solid var(--accent-success)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL ENTRADAS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-success)', marginTop: '5px' }}>{stats.totalEntradas}</span>
          </div>
          <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '4px solid var(--accent-danger)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL MERMAS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-danger)', marginTop: '5px' }}>{stats.totalMermas}</span>
          </div>
          <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '4px solid var(--accent-warning)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL CORTESÍAS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-warning)', marginTop: '5px' }}>{stats.totalCortesias}</span>
          </div>
          <div className="neu-box" style={{ padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '4px solid var(--accent-orange)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>TOTAL VENTAS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-orange)', marginTop: '5px' }}>{stats.totalVentas}</span>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '15px', flexShrink: 0 }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="neu-box" style={{ borderRadius: '15px', position: 'relative', overflow: 'visible', marginBottom: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '15px' }}>
              <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--bg-color)', borderTop: '4px solid var(--accent-blue)', borderRadius: '50%' }}></div>
              <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Cargando inventario de {selectedDate}...</span>
            </div>
          ) : filteredProductsList.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontWeight: 'bold' }}>
              No se encontraron productos coincidentes.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="inv-header-cell" style={{ textAlign: 'left', minWidth: '220px' }}>Producto</th>
                  <th className="inv-header-cell">Inicial</th>
                  <th className="inv-header-cell" style={{ color: 'var(--accent-success)' }}>Entrada (+)</th>
                  <th className="inv-header-cell" style={{ color: 'var(--accent-danger)' }}>Merma (-)</th>
                  <th className="inv-header-cell" style={{ color: 'var(--accent-warning)' }}>Cortesía (-)</th>
                  <th className="inv-header-cell" style={{ color: 'var(--accent-orange)' }}>Venta (-)</th>
                  <th className="inv-header-cell" style={{ color: 'var(--accent-blue)' }}>Final (=)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductsList.map((name, rowIndex) => {
                  const p = productos[name] || { inicial: 0, entrada: 0, merma: 0, cortesia: 0, venta: 0, final: 0 };
                  const isNegative = p.final < 0;

                  return (
                    <tr key={name} className="inv-table-row" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                      <td style={{ padding: '12px 15px', fontWeight: '600' }}>
                        <div>{name}</div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {getCategory(name)}
                        </span>
                      </td>

                      {/* Inicial */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          id={`input-${rowIndex}-0`}
                          type="number"
                          className="inv-number-input"
                          value={p.inicial}
                          onChange={(e) => handleValueChange(name, 'inicial', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                        />
                      </td>

                      {/* Entrada */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          id={`input-${rowIndex}-1`}
                          type="number"
                          className="inv-number-input"
                          style={{ color: 'var(--accent-success)' }}
                          value={p.entrada}
                          onChange={(e) => handleValueChange(name, 'entrada', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                        />
                      </td>

                      {/* Merma */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          id={`input-${rowIndex}-2`}
                          type="number"
                          className="inv-number-input"
                          style={{ color: 'var(--accent-danger)' }}
                          value={p.merma}
                          onChange={(e) => handleValueChange(name, 'merma', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                        />
                      </td>

                      {/* Cortesía */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          id={`input-${rowIndex}-3`}
                          type="number"
                          className="inv-number-input"
                          style={{ color: 'var(--accent-warning)' }}
                          value={p.cortesia}
                          onChange={(e) => handleValueChange(name, 'cortesia', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
                        />
                      </td>

                      {/* Venta */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <input
                          id={`input-${rowIndex}-4`}
                          type="number"
                          className="inv-number-input"
                          style={{ color: 'var(--accent-orange)' }}
                          value={p.venta}
                          onChange={(e) => handleValueChange(name, 'venta', e.target.value)}
                          onWheel={(e) => e.target.blur()}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, 4)}
                        />
                      </td>

                      {/* Final */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          minWidth: '60px',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 180, 216, 0.1)',
                          color: isNegative ? 'var(--accent-danger)' : 'var(--accent-blue)',
                          boxShadow: 'var(--shadow-inset)'
                        }}>
                          {p.final}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventario;
