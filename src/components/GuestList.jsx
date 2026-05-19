import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const GuestList = () => {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Actualizar el temporizador local cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Consulta los registros de ventas de las últimas 12 horas para filtrar en tiempo real
    const q = query(
      collection(db, 'ventas'),
      where('exitTimestamp', '>', Date.now() - 12 * 60 * 60 * 1000)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const active = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(g => g.exitTimestamp && g.exitTimestamp > now)
        .sort((a, b) => a.exitTimestamp - b.exitTimestamp);

      setGuests(active);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener invitados activos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [now]);

  const formatRemaining = (exitTimestamp) => {
    const diff = exitTimestamp - now;
    if (diff <= 0) return "Tiempo cumplido";
    const totalSecs = Math.floor(diff / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };

  return (
    <div className="neu-box" style={{ padding: '25px', marginTop: '30px', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '12px' }}>
        <h2 className="text-gradient-blue" style={{ margin: 0, fontSize: '1.6rem' }}>
          ⏱️ Invitados Activos ({guests.length})
        </h2>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          En tiempo real
        </span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Cargando invitados...</p>
      ) : guests.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No hay invitados activos en el parque.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {guests.map((g) => {
            const isClosing = (g.exitTimestamp - now) < 10 * 60 * 1000; // menos de 10 min
            return (
              <div
                key={g.id}
                className="neu-box"
                style={{
                  padding: '15px',
                  borderRadius: '12px',
                  borderLeft: `5px solid ${isClosing ? 'var(--accent-danger)' : 'var(--accent-success)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'var(--bg-color)'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{g.entradas || 'Entrada'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Salida:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {new Date(g.exitTimestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Tiempo restante:</span>
                  <strong style={{
                    color: isClosing ? 'var(--accent-danger)' : 'var(--accent-success)',
                    fontSize: '0.95rem'
                  }}>
                    {formatRemaining(g.exitTimestamp)}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GuestList;
