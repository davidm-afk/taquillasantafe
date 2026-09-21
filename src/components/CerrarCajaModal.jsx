import React, { useState } from 'react';
import { useCaja } from '../context/CajaContext';
import { generarReporteCierre } from '../utils/generarReporteCierre';

const CerrarCajaModal = ({ area, totalesSistema, ventasData, onClose, onSuccess }) => {
  const { cerrarCaja } = useCaja();
  const [step, setStep] = useState(1); // 1: Conteo, 2: Confirmación
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para las denominaciones (cantidad de billetes/monedas)
  const [counts, setCounts] = useState({
    b1000: '', b500: '', b200: '', b100: '', b50: '', b20: '',
    m10: '', m5: '', m2: '', m1: '', m050: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Solo permitir números positivos
    if (value === '' || /^[0-9\b]+$/.test(value)) {
      setCounts(prev => ({ ...prev, [name]: value }));
    }
  };

  // Cálculo del total real contado
  const getSaldoReal = () => {
    const vals = {
      b1000: parseInt(counts.b1000 || 0) * 1000,
      b500: parseInt(counts.b500 || 0) * 500,
      b200: parseInt(counts.b200 || 0) * 200,
      b100: parseInt(counts.b100 || 0) * 100,
      b50: parseInt(counts.b50 || 0) * 50,
      b20: parseInt(counts.b20 || 0) * 20,
      m10: parseInt(counts.m10 || 0) * 10,
      m5: parseInt(counts.m5 || 0) * 5,
      m2: parseInt(counts.m2 || 0) * 2,
      m1: parseInt(counts.m1 || 0) * 1,
      m050: parseInt(counts.m050 || 0) * 0.5,
    };
    return Object.values(vals).reduce((a, b) => a + b, 0);
  };

  const saldoReal = getSaldoReal();
  const saldoReportado = totalesSistema.ef;
  const diferencia = saldoReal - saldoReportado;

  const handleNext = () => setStep(2);

  const handleConfirmarCierre = async () => {
    setIsProcessing(true);
    try {
      const resumenCierre = {
        saldoReal,
        saldoReportado,
        diferencia,
        desgloseBilletes: counts
      };

      // Guardar en Firestore
      await cerrarCaja(area, resumenCierre);

      // Generar PDF
      generarReporteCierre(area, ventasData, totalesSistema, resumenCierre);

      alert(`Caja de ${area} cerrada exitosamente. El PDF ha sido descargado.`);
      onSuccess(); // Actualiza el UI local
      onClose();
    } catch (err) {
      console.error("Error al cerrar caja:", err);
      alert("Hubo un error al cerrar la caja. Intenta de nuevo.");
      setIsProcessing(false);
    }
  };

  const renderInput = (label, name, multiplier) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
      <label style={{ flex: 1, fontWeight: 'bold' }}>{label}</label>
      <input 
        type="number"
        name={name}
        value={counts[name]}
        onChange={handleChange}
        placeholder="0"
        className="neu-input"
        style={{ width: '80px', textAlign: 'center', marginRight: '15px' }}
      />
      <div style={{ width: '80px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-muted)' }}>
        ${ (parseInt(counts[name] || 0) * multiplier).toLocaleString('es-MX', {minimumFractionDigits: 2}) }
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div className="neu-box" style={{ width: '450px', padding: '30px', backgroundColor: 'var(--bg-color)' }}>
        <h2 style={{ marginTop: 0, color: 'var(--accent-blue)', textAlign: 'center' }}>
          Cierre de Caja - {area}
        </h2>

        {step === 1 ? (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Ingresa la cantidad de billetes y monedas contados.
            </p>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
              <h4 style={{ borderBottom: '1px solid var(--text-muted)', paddingBottom: '5px' }}>Billetes</h4>
              {renderInput('$1,000', 'b1000', 1000)}
              {renderInput('$500', 'b500', 500)}
              {renderInput('$200', 'b200', 200)}
              {renderInput('$100', 'b100', 100)}
              {renderInput('$50', 'b50', 50)}
              {renderInput('$20', 'b20', 20)}

              <h4 style={{ borderBottom: '1px solid var(--text-muted)', paddingBottom: '5px', marginTop: '20px' }}>Monedas</h4>
              {renderInput('$10', 'm10', 10)}
              {renderInput('$5', 'm5', 5)}
              {renderInput('$2', 'm2', 2)}
              {renderInput('$1', 'm1', 1)}
              {renderInput('$0.50', 'm050', 0.5)}
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ fontSize: '1.2rem' }}>Total Contado: </span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--accent-blue)' }}>
                ${saldoReal.toLocaleString('es-MX', {minimumFractionDigits:2})}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
              <button className="neu-button" onClick={onClose} style={{ padding: '10px 20px' }}>Cancelar</button>
              <button className="neu-button" onClick={handleNext} style={{ padding: '10px 20px', backgroundColor: 'var(--accent-blue)', color: 'white' }}>
                Siguiente
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
              Verifica los totales antes de emitir el reporte definitivo de cierre.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fondo Contado (Real):</span>
                <strong>${saldoReal.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Esperado en Sistema:</span>
                <strong>${saldoReportado.toLocaleString('es-MX', {minimumFractionDigits: 2})}</strong>
              </div>
              
              <div style={{ height: '1px', backgroundColor: '#ccc', margin: '5px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', color: diferencia === 0 ? 'green' : (diferencia < 0 ? 'var(--accent-danger)' : 'var(--accent-blue)') }}>
                <strong>Diferencia:</strong>
                <strong>
                  {diferencia === 0 ? 'Sin Diferencia' : (diferencia > 0 ? `+ $${Math.abs(diferencia).toLocaleString()}` : `- $${Math.abs(diferencia).toLocaleString()}`)}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <button className="neu-button" onClick={() => setStep(1)} disabled={isProcessing} style={{ padding: '10px 20px' }}>
                Volver
              </button>
              <button className="neu-button" onClick={handleConfirmarCierre} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: 'var(--accent-danger)', color: 'white' }}>
                {isProcessing ? 'Procesando...' : 'Cerrar Caja'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CerrarCajaModal;
