import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductos } from '../context/ProductosContext';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Save, X } from 'lucide-react';

const AREAS = ['Taquilla', 'Cafeteria', 'Eventos'];
const CATEGORIAS = {
  Taquilla: ['Entradas', 'Adicionales'],
  Cafeteria: ['Bebidas', 'Comida', 'Combos'],
  Eventos: ['Paquetes'],
};
const EMOJIS_DEFAULT = {
  Entradas: '🎟️', Adicionales: '➕', Bebidas: '🥤', Comida: '🍔', Combos: '🍱', Paquetes: '🎉'
};

// ---- Modal de Agregar / Editar ----
const ProductoModal = ({ area, onClose, productoEdit = null, onSave }) => {
  const cats = CATEGORIAS[area] || ['General'];
  const [nombre, setNombre] = useState(productoEdit?.nombre || '');
  const [precio, setPrecio] = useState(productoEdit?.precio ?? '');
  const [categoria, setCategoria] = useState(productoEdit?.categoria || cats[0]);
  const [emoji, setEmoji] = useState(productoEdit?.emoji || EMOJIS_DEFAULT[cats[0]] || '📦');
  const [subtitle, setSubtitle] = useState(productoEdit?.subtitle || '');
  const [precioAbierto, setPrecioAbierto] = useState(productoEdit?.precioAbierto || false);
  const [tipoCobro, setTipoCobro] = useState(productoEdit?.tipoCobro || 'total');
  const [incluyePastel, setIncluyePastel] = useState(productoEdit?.incluyePastel || false);
  const [incluyeDecoracion, setIncluyeDecoracion] = useState(productoEdit?.incluyeDecoracion || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    await onSave({
      area, nombre: nombre.trim(), precio: parseFloat(precio) || 0,
      categoria, emoji, subtitle, precioAbierto,
      tipoCobro, incluyePastel, incluyeDecoracion
    });
    onClose();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="neu-box" style={{ width:420, padding:'28px', background:'var(--bg-color)' }}>
        <h3 style={{ marginTop:0, color:'var(--accent-blue)' }}>{productoEdit ? 'Editar Artículo' : 'Nuevo Artículo'} — {area}</h3>

        <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>CATEGORÍA</label>
        <select className="neu-input" value={categoria} onChange={e => { setCategoria(e.target.value); setEmoji(EMOJIS_DEFAULT[e.target.value] || '📦'); }} style={{ width:'100%', marginBottom:14 }}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>

        <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>NOMBRE DEL ARTÍCULO *</label>
        <input className="neu-input" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: VIP L-J" style={{ width:'100%', marginBottom:14 }} />

        <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>SUBTÍTULO (opcional)</label>
        <input className="neu-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ej: Lunes a Jueves" style={{ width:'100%', marginBottom:14 }} />

        <div style={{ display:'flex', gap:14, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>PRECIO ($)</label>
            <input className="neu-input" type="number" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" disabled={precioAbierto} style={{ width:'100%' }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>EMOJI</label>
            <input className="neu-input" value={emoji} onChange={e => setEmoji(e.target.value)} style={{ width:'100%' }} />
          </div>
        </div>

        {(area === 'Taquilla') && (
          <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, cursor:'pointer', fontSize:'0.9rem' }}>
            <input type="checkbox" checked={precioAbierto} onChange={e => setPrecioAbierto(e.target.checked)} />
            Precio abierto (el cajero ingresa el monto manualmente)
          </label>
        )}

        {(area === 'Eventos') && (
          <div className="neu-box" style={{ padding: '15px', marginBottom: '14px', background: 'var(--bg-color)' }}>
            <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:8, color: 'var(--accent-blue)' }}>⚙️ CONFIGURACIÓN DE EVENTO</label>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize:'0.8rem', fontWeight:'bold', display:'block', marginBottom:4 }}>TIPO DE COBRO</label>
              <select className="neu-input" value={tipoCobro} onChange={e => setTipoCobro(e.target.value)} style={{ width:'100%' }}>
                <option value="total">Por Paquete Completo (Precio Cerrado)</option>
                <option value="por_saltador">Por Saltador (Multiplica por asistentes)</option>
              </select>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', fontSize:'0.9rem' }}>
              <input type="checkbox" checked={incluyePastel} onChange={e => setIncluyePastel(e.target.checked)} />
              Incluye Pastel (Cortesía)
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.9rem' }}>
              <input type="checkbox" checked={incluyeDecoracion} onChange={e => setIncluyeDecoracion(e.target.checked)} />
              Incluye Decoración
            </label>
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', marginTop:10 }}>
          <button className="neu-button" onClick={onClose} disabled={saving} style={{ display:'flex', alignItems:'center', gap:6 }}><X size={16}/>Cancelar</button>
          <button className="neu-button" onClick={handleSave} disabled={saving} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--accent-blue)' }}>
            <Save size={16}/>{saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Fila de producto ----
const ProductoFila = ({ prod, onEdit, onToggle, onDelete }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'var(--bg-color)', boxShadow:'var(--shadow-light)', marginBottom:8, opacity: prod.activo === false ? 0.5 : 1 }}>
    <span style={{ fontSize:'1.4rem', width:32, textAlign:'center' }}>{prod.emoji || '📦'}</span>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontWeight:'bold', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{prod.nombre}</div>
      {prod.subtitle && <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{prod.subtitle}</div>}
    </div>
    <div style={{ fontWeight:'bold', color:'var(--accent-blue)', minWidth:80, textAlign:'right' }}>
      {prod.precioAbierto ? 'Precio libre' : `$${prod.precio?.toLocaleString('es-MX') || '0'}`}
    </div>
    <div style={{ display:'flex', gap:6 }}>
      <button title="Editar" className="neu-button" onClick={() => onEdit(prod)} style={{ padding:'6px 10px', color:'var(--accent-blue)' }}><Pencil size={14}/></button>
      <button title={prod.activo === false ? 'Activar' : 'Ocultar'} className="neu-button" onClick={() => onToggle(prod.id, prod.activo !== false)} style={{ padding:'6px 10px', color: prod.activo === false ? 'green' : 'var(--text-muted)' }}>
        {prod.activo === false ? <Eye size={14}/> : <EyeOff size={14}/>}
      </button>
      <button title="Eliminar" className="neu-button" onClick={() => onDelete(prod.id, prod.nombre)} style={{ padding:'6px 10px', color:'var(--accent-danger)' }}><Trash2 size={14}/></button>
    </div>
  </div>
);

// ---- Página Principal ----
const AdminInventario = () => {
  const navigate = useNavigate();
  const { productos, loadingProductos, agregarProducto, editarProducto, toggleActivo, eliminarProducto } = useProductos();
  const [tabArea, setTabArea] = useState('Taquilla');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);

  const productosArea = productos.filter(p => p.area === tabArea);
  const categorias = CATEGORIAS[tabArea] || ['General'];

  const handleSave = async (data) => {
    if (editando) {
      await editarProducto(editando.id, data);
    } else {
      await agregarProducto(data);
    }
    setEditando(null);
  };

  const handleDelete = async (id, nombre) => {
    if (window.confirm(`¿Eliminar "${nombre}" permanentemente?`)) {
      await eliminarProducto(id);
    }
  };

  return (
    <div style={{ padding:'24px 32px', minHeight:'100vh', maxWidth:900, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <div>
          <button className="neu-button" onClick={() => navigate('/admin')} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <ArrowLeft size={16}/> Volver al Dashboard
          </button>
          <h1 className="text-gradient-blue" style={{ margin:0, fontSize:'2rem' }}>Inventario de Artículos</h1>
          <p style={{ margin:0, color:'var(--text-muted)' }}>Administra los artículos en venta de cada área</p>
        </div>
        <button className="neu-button" onClick={() => { setEditando(null); setShowModal(true); }} style={{ display:'flex', alignItems:'center', gap:8, color:'var(--accent-blue)', fontWeight:'bold', padding:'12px 20px' }}>
          <Plus size={18}/> Agregar Artículo
        </button>
      </div>

      {/* Tabs de Área */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {AREAS.map(a => (
          <button key={a} className="neu-button" onClick={() => setTabArea(a)} style={{ padding:'10px 22px', fontWeight: tabArea === a ? 'bold' : 'normal', color: tabArea === a ? 'var(--accent-blue)' : 'inherit', borderBottom: tabArea === a ? '2px solid var(--accent-blue)' : '2px solid transparent' }}>
            {a === 'Cafeteria' ? 'Cafetería' : a}
          </button>
        ))}
      </div>

      {loadingProductos ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>Cargando productos...</div>
      ) : (
        categorias.map(cat => {
          const items = productosArea.filter(p => p.categoria === cat);
          return (
            <div key={cat} className="neu-box" style={{ padding:'20px', marginBottom:20 }}>
              <h3 style={{ margin:'0 0 16px 0', borderBottom:'2px solid var(--bg-color)', paddingBottom:10 }}>
                {EMOJIS_DEFAULT[cat] || '📦'} {cat} <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontWeight:'normal' }}>({items.length} artículos)</span>
              </h3>
              {items.length === 0 ? (
                <p style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Sin artículos en esta categoría.</p>
              ) : (
                items.map(prod => (
                  <ProductoFila
                    key={prod.id}
                    prod={prod}
                    onEdit={p => { setEditando(p); setShowModal(true); }}
                    onToggle={toggleActivo}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          );
        })
      )}

      {showModal && (
        <ProductoModal
          area={tabArea}
          productoEdit={editando}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default AdminInventario;
