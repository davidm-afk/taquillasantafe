import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ products = [], onSelect, placeholder = "Buscar producto...", accentColorClass = "text-gradient-blue" }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = products.filter(product =>
      product.nombre.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query, products]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onSelect(product);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: '500px', marginBottom: '25px', zIndex: 50 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: '15px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <Search size={20} />
        </span>
        
        <input
          type="text"
          className="neu-input"
          style={{ paddingLeft: '50px', paddingRight: '45px', fontSize: '1rem', height: '50px' }}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{
              position: 'absolute',
              right: '15px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Floating results dropdown */}
      {isOpen && results.length > 0 && (
        <div 
          className="neu-box animate-fade-in" 
          style={{
            position: 'absolute',
            top: '58px',
            left: 0,
            width: '100%',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '10px',
            background: 'var(--bg-color)',
            boxShadow: 'var(--shadow-hover)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {results.map((product, idx) => (
            <div
              key={`${product.nombre}-${idx}`}
              onClick={() => handleSelect(product)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 15px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                margin: '2px 0'
              }}
              className="search-item"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {product.imagen && (
                  <img 
                    src={product.imagen} 
                    alt={product.nombre} 
                    style={{ 
                      width: '28px', 
                      height: '28px', 
                      objectFit: 'contain', 
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.4)',
                      padding: '2px'
                    }} 
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                    {product.nombre}
                  </span>
                  {product.subtitle && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {product.subtitle}
                    </span>
                  )}
                </div>
              </div>
              <span className={accentColorClass} style={{ fontWeight: 'bold' }}>
                {product.precioAbierto ? 'Precio Abierto' : `$${product.precio}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div 
          className="neu-box" 
          style={{
            position: 'absolute',
            top: '58px',
            left: 0,
            width: '100%',
            padding: '15px',
            background: 'var(--bg-color)',
            borderRadius: '16px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          No se encontraron productos
        </div>
      )}
    </div>
  );
};

export default SearchBar;
