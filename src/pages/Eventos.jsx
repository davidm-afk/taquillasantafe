import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Sidebar from '../components/Sidebar';
import { db } from '../config/firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Auxiliar: Analizar cadenas de fecha en ambos formatos (dd/mm/yyyy o yyyy-mm-dd)
const parseDateString = (fechaStr) => {
  if (!fechaStr) return null;
  if (fechaStr.includes('/')) {
    const [day, month, year] = fechaStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } else if (fechaStr.includes('-')) {
    const [year, month, day] = fechaStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
};

// Formateador de fecha a dd/mm/yyyy para visualización de alta fidelidad incluyendo el día de la semana
const formatFecha = (fechaStr) => {
  if (!fechaStr) return 'Sin fecha';
  
  let formattedDate = fechaStr;
  if (fechaStr.includes('-')) {
    const parts = fechaStr.split('-');
    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`; // Convertir a dd/mm/yyyy
  }
  
  return formattedDate; // e.g. "30/05/2026"
};

// Obtener etiqueta legible del día de la semana
const getDiaSemanaLabel = (fechaStr) => {
  if (!fechaStr) return '';
  const dateObj = parseDateString(fechaStr);
  if (!dateObj) return '';
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[dateObj.getDay()];
};

// Auto-formateador de entrada de fecha dd/mm/yyyy para inyección automática de slashes
const formatDatePickerInput = (value) => {
  const clean = value.replace(/\D/g, ''); // Remover todo lo que no sea dígito
  let formatted = '';
  if (clean.length > 0) {
    formatted += clean.substring(0, 2);
  }
  if (clean.length > 2) {
    formatted += '/' + clean.substring(2, 4);
  }
  if (clean.length > 4) {
    formatted += '/' + clean.substring(4, 8);
  }
  return formatted;
};

// Normalizar campo de catering: soporta string legacy o array nuevo
const normalizeToArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(v => v && v !== 'Sin definir');
  if (val === 'Sin definir') return [];
  return [val];
};

// Lista de paquetes estándar del parque
const paquetesEstandar = [
  'Sin definir', 'Platinum', 'VIP', 'NTP $6299', 'NTP $6100', 'Grupos', 'Evento Privado',
  'Grupos - Paquete A', 'Grupos - Paquete B', 'Grupos - Paquete C'
];

const staffVendedores = [
  'Sin definir', 'Isaac', 'Jeshua', 'Fernanda', 'David', 'Tania', 'Monserrat', 'Brigitte', 'Javier', 'Valentina', 'Sandy', 'Yunn'
];



// Función de cálculo de precios automática oficial
const calcularPrecioPaquete = (paquete, saltadoresCount, fechaStr) => {
  const saltadores = parseInt(saltadoresCount) || 0;
  if (saltadores <= 0) return 0;

  // Cálculos para sub-planes de Grupos (mínimo 5 personas)
  if (paquete === 'Grupos - Paquete A') {
    return Math.max(5, saltadores) * 220;
  }
  if (paquete === 'Grupos - Paquete B') {
    return Math.max(5, saltadores) * 260;
  }
  if (paquete === 'Grupos - Paquete C') {
    return Math.max(5, saltadores) * 399;
  }

  if (paquete !== 'VIP' && paquete !== 'Platinum' && paquete !== 'NTP $6299' && paquete !== 'NTP $6100') return 0;

  // Regla para NTP $6299: Mínimo 15 niños cobrando base de $6,299, extras a $420 c/u
  if (paquete === 'NTP $6299') {
    const basePrice = 6299;
    const baseJumpers = 15;
    if (saltadores <= baseJumpers) {
      return basePrice;
    } else {
      const extraJumpers = saltadores - baseJumpers;
      return basePrice + (extraJumpers * 420);
    }
  }

  // Regla para NTP $6100: Mínimo 15 niños cobrando base de $6,100, extras a $420 c/u
  if (paquete === 'NTP $6100') {
    const basePrice = 6100;
    const baseJumpers = 15;
    if (saltadores <= baseJumpers) {
      return basePrice;
    } else {
      const extraJumpers = saltadores - baseJumpers;
      return basePrice + (extraJumpers * 420);
    }
  }

  const dateObj = parseDateString(fechaStr);
  if (!dateObj) return 0;

  const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday

  // Lunes a Jueves = [1, 2, 3, 4]
  // Viernes a Domingo = [5, 6, 0]
  const esFinDeSemana = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

  if (paquete === 'VIP') {
    return esFinDeSemana ? saltadores * 999 : saltadores * 899;
  } else if (paquete === 'Platinum') {
    return esFinDeSemana ? saltadores * 1099 : saltadores * 999;
  }
  return 0;
};

// Estimación de recaudación contable (incluyendo extras, decoración y precio base manual)
const calcularTotalVenta = (ev) => {
  let totalBase = 0;
  if (ev.precioBaseManual !== undefined && ev.precioBaseManual !== null && ev.precioBaseManual !== '') {
    totalBase = parseFloat(ev.precioBaseManual) || 0;
  } else if (ev.paquete === 'VIP' || ev.paquete === 'Platinum' || ev.paquete === 'NTP $6299' || ev.paquete === 'NTP $6100' || (ev.paquete && ev.paquete.startsWith('Grupos'))) {
    totalBase = calcularPrecioPaquete(ev.paquete, ev.saltadores, ev.fecha);
  } else {
    // Valor de estimación estándar para otros paquetes: $350 por saltador
    totalBase = (parseInt(ev.saltadores) || 0) * 350;
  }

  const totalExtras = ev.extras ? ev.extras.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) : 0;
  const totalDecoracion = (ev.decoracionTipo === 'Personalizada') ? (parseFloat(ev.decoracionMonto) || 0) : 0;

  // Calcular precio del pastel
  let totalPastel = 0;
  if (ev.pastel && ev.pastel !== 'Sin definir') {
    const pastelGratis = ev.paquete === 'VIP' || ev.paquete === 'Platinum' || ev.paquete === 'Evento Privado';
    if (!pastelGratis) {
      if (ev.tamañoPastel === 'Chico') totalPastel = 699;
      else if (ev.tamañoPastel === 'Grande') totalPastel = 799;
      else if (ev.tamañoPastel === 'Rectangular') totalPastel = 899;
    }
  }

  // PAQUETES DE COMIDA PARA ADULTOS
  const costPaquete1 = (parseInt(ev.adultosPaquete1) || 0) * 180;
  const costPaquete2 = (parseInt(ev.adultosPaquete2) || 0) * 220;
  let costPaquete3 = 0;
  if (ev.adultosPaquete3 === '100 Tacos') costPaquete3 = (parseInt(ev.adultosPaquete3Qty) || 1) * 1950;
  else if (ev.adultosPaquete3 === '200 Tacos') costPaquete3 = (parseInt(ev.adultosPaquete3Qty) || 1) * 2650;
  else if (ev.adultosPaquete3 === '300 Tacos') costPaquete3 = (parseInt(ev.adultosPaquete3Qty) || 1) * 3350;

  return totalBase + totalExtras + totalDecoracion + totalPastel + costPaquete1 + costPaquete2 + costPaquete3;
};

const Eventos = () => {
  // Tab activa dentro del formulario de creación
  const [formTab, setFormTab] = useState('cliente');
  
  // Estados para el formulario de nueva reservación (18 campos opcionales)
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  
  const [fecha, setFecha] = useState(''); // Representado como dd/mm/yyyy
  const [festejado, setFestejado] = useState('');
  const [adultos, setAdultos] = useState('');
  const [saltadores, setSaltadores] = useState('');
  const [paquete, setPaquete] = useState('Sin definir');
  const [customPaquete, setCustomPaquete] = useState(''); // Estado para paquete manual
  const [espacio, setEspacio] = useState('Sin definir'); // Espacio designado
  
  const [pizza, setPizza] = useState([]);
  const [agua, setAgua] = useState([]);
  const [pastel, setPastel] = useState('Sin definir');
  
  const [horaLlegada, setHoraLlegada] = useState('');
  const [horaSalida, setHoraSalida] = useState(''); // Hora de salida
  
  // Estados para Conceptos Extras del Formulario de Creación
  const [extrasForm, setExtrasForm] = useState([]);
  const [nuevoExtraConceptoForm, setNuevoExtraConceptoForm] = useState('');
  const [nuevoExtraMontoForm, setNuevoExtraMontoForm] = useState('');
  const [horaGlow, setHoraGlow] = useState('');
  const [horaAlimentos, setHoraAlimentos] = useState('');
  const [horaPastel, setHoraPastel] = useState('');
  
  // Nuevos Estados para Vendedor, Decoración y Piñata
  const [vendedor, setVendedor] = useState('');
  const [decoracionTipo, setDecoracionTipo] = useState('No incluye');
  const [decoracionConcepto, setDecoracionConcepto] = useState('');
  const [decoracionMonto, setDecoracionMonto] = useState('');
  const [horaPinata, setHoraPinata] = useState('');
  const [cronogramaExtraForm, setCronogramaExtraForm] = useState([]);
  const [adultosPaquete1, setAdultosPaquete1] = useState('');
  const [adultosPaquete2, setAdultosPaquete2] = useState('');
  const [adultosPaquete3, setAdultosPaquete3] = useState('Sin definir');
  const [adultosPaquete3Qty, setAdultosPaquete3Qty] = useState('');
  const [tamañoPastel, setTamañoPastel] = useState('');
  const [notasExtra, setNotasExtra] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');
  
  // Estados para precio base manual
  const [isManualPrecioBase, setIsManualPrecioBase] = useState(false);
  const [manualPrecioBase, setManualPrecioBase] = useState('');

  // Listado de reservaciones y estado de carga
  const [eventosReservados, setEventosReservados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reservación seleccionada para edición
  const [editingReservacion, setEditingReservacion] = useState(null);

  // Reservación seleccionada para abonos/pagos parciales
  const [abonosReservacion, setAbonosReservacion] = useState(null);

  // Estado para la simulación del Calendario estilo Google Calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Estados para filtrar las métricas por período (día seleccionado, semana actual, mes actual o todo)
  const [metricPeriod, setMetricPeriod] = useState('mes'); // 'dia', 'semana', 'mes', 'todos'
  const [metricDate, setMetricDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Estado para la ficha A4 de reservación a imprimir
  const [printReservacionData, setPrintReservacionData] = useState(null);

  const handlePrintReservacion = (ev) => {
    setPrintReservacionData(ev);
    setTimeout(() => {
      document.body.classList.add('print-reservation');
      window.print();
      document.body.classList.remove('print-reservation');
      setPrintReservacionData(null);
    }, 200);
  };

  // Escuchar reservaciones en tiempo real desde Firestore
  useEffect(() => {
    const q = query(collection(db, 'reservaciones'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha (más próxima primero)
      docs.sort((a, b) => {
        if (!a.fecha) return 1;
        if (!b.fecha) return -1;
        return new Date(a.fecha) - new Date(b.fecha);
      });
      setEventosReservados(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCrearEvento = async (e) => {
    e.preventDefault();
    if (!cliente.trim()) {
      alert("Por favor ingresa al menos el nombre del cliente para identificar la reservación.");
      return;
    }

    let fechaDb = '';
    if (fecha.trim()) {
      // Validación del Formato dd/mm/yyyy
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(fecha.trim())) {
        alert("Por favor ingresa la fecha en formato DD/MM/YYYY (ejemplo: 30/05/2026).");
        return;
      }
      // Convertir de dd/mm/yyyy a yyyy-mm-dd para ordenación cronológica perfecta en Firestore
      const parts = fecha.trim().split('/');
      fechaDb = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Validación Anti-Empalme para espacios designados (excepto Cafetería y Sin definir) en el mismo día
    if (fechaDb && espacio && espacio !== 'Sin definir' && espacio !== 'Cafeteria') {
      const espacioOcupado = eventosReservados.some(ev => ev.fecha === fechaDb && ev.espacio === espacio);
      if (espacioOcupado) {
        alert(`⚠️ ADVERTENCIA: El espacio "${espacio}" ya se encuentra ocupado/reservado para el día ${fecha}. Por favor selecciona otro espacio o cambia la fecha.`);
        return;
      }
    }

    const finalPaquete = paquete === 'Otro (Elegir manualmente)' ? customPaquete.trim() : paquete;

    const reservacionData = {
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      codigoPostal: codigoPostal.trim(),
      fecha: fechaDb,
      festejado: festejado.trim(),
      adultos: parseInt(adultos) || 0,
      saltadores: parseInt(saltadores) || 0,
      paquete: finalPaquete,
      espacio: espacio,
      pizza: pizza,
      agua: agua,
      pastel: pastel,
      horaLlegada: horaLlegada,
      horaSalida: horaSalida,
      horaGlow: horaGlow,
      horaAlimentos: horaAlimentos,
      horaPastel: horaPastel,
      estado: "Pendiente",
      extras: extrasForm, // Guardar extras locales
      abonos: [], // Inicializar abonos vacíos
      vendedor: vendedor.trim(),
      decoracionTipo: decoracionTipo,
      decoracionConcepto: decoracionTipo === 'Personalizada' ? decoracionConcepto.trim() : '',
      decoracionMonto: decoracionTipo === 'Personalizada' ? (parseFloat(decoracionMonto) || 0) : 0,
      horaPinata: horaPinata,
      cronogramaExtra: cronogramaExtraForm,
      adultosPaquete1: parseInt(adultosPaquete1) || 0,
      adultosPaquete2: parseInt(adultosPaquete2) || 0,
      adultosPaquete3: adultosPaquete3,
      adultosPaquete3Qty: adultosPaquete3 !== 'Sin definir' ? (parseInt(adultosPaquete3Qty) || 1) : 0,
      tamañoPastel: tamañoPastel,
      notasExtra: notasExtra,
      precioBaseManual: isManualPrecioBase && manualPrecioBase !== '' ? (parseFloat(manualPrecioBase) || 0) : null,
      timestamp: Date.now()
    };

    try {
      await addDoc(collection(db, 'reservaciones'), reservacionData);
      
      // Limpiar estados
      setCliente('');
      setTelefono('');
      setEmail('');
      setCodigoPostal('');
      setFecha('');
      setFestejado('');
      setAdultos('');
      setSaltadores('');
      setPaquete('Sin definir');
      setCustomPaquete('');
      setEspacio('Sin definir');
      setPizza([]);
      setAgua([]);
      setPastel('Sin definir');
      setHoraLlegada('');
      setHoraSalida('');
      setHoraGlow('');
      setHoraAlimentos('');
      setHoraPastel('');
      setVendedor('');
      setDecoracionTipo('No incluye');
      setDecoracionConcepto('');
      setDecoracionMonto('');
      setHoraPinata('');
      setCronogramaExtraForm([]);
      setAdultosPaquete1('');
      setAdultosPaquete2('');
      setAdultosPaquete3('Sin definir');
      setAdultosPaquete3Qty('');
      setTamañoPastel('');
      setNotasExtra([]);
      setNuevaNota('');
      setIsManualPrecioBase(false);
      setManualPrecioBase('');
      setExtrasForm([]); // Limpiar extras
      setNuevoExtraConceptoForm('');
      setNuevoExtraMontoForm('');
      
      setFormTab('cliente'); // Regresar a la primera pestaña
      alert("¡Reservación agregada con éxito!");
    } catch (err) {
      console.error("Error creating reservation:", err);
      alert("Error al conectar con la base de datos.");
    }
  };

  // Convertir fecha de UI a formato apto para cálculo de precio (yyyy-mm-dd)
  const getFechaCalculo = () => {
    if (!fecha) return '';
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(fecha.trim())) return '';
    const parts = fecha.trim().split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Precio dinámico en el formulario de creación (base + extras + decoración + base manual)
  const precioFormularioBase = (paquete === 'VIP' || paquete === 'Platinum' || paquete === 'NTP $6299' || paquete === 'NTP $6100' || paquete.startsWith('Grupos')) 
    ? calcularPrecioPaquete(paquete, saltadores, getFechaCalculo()) 
    : (parseInt(saltadores) || 0) * 350; // Estimación estándar de $350 para otros paquetes

  const totalExtrasForm = extrasForm.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
  const totalDecoracionForm = (decoracionTipo === 'Personalizada') ? (parseFloat(decoracionMonto) || 0) : 0;
  const finalBaseForm = (isManualPrecioBase && manualPrecioBase !== '') ? (parseFloat(manualPrecioBase) || 0) : precioFormularioBase;

  // Calcular precio del pastel en el formulario
  let totalPastelForm = 0;
  if (pastel && pastel !== 'Sin definir') {
    const pastelGratis = paquete === 'VIP' || paquete === 'Platinum' || paquete === 'Evento Privado';
    if (!pastelGratis) {
      if (tamañoPastel === 'Chico') totalPastelForm = 699;
      else if (tamañoPastel === 'Grande') totalPastelForm = 799;
      else if (tamañoPastel === 'Rectangular') totalPastelForm = 899;
    }
  }

  const costPaquete1Form = (parseInt(adultosPaquete1) || 0) * 180;
  const costPaquete2Form = (parseInt(adultosPaquete2) || 0) * 220;
  let costPaquete3Form = 0;
  if (adultosPaquete3 === '100 Tacos') costPaquete3Form = (parseInt(adultosPaquete3Qty) || 1) * 1950;
  else if (adultosPaquete3 === '200 Tacos') costPaquete3Form = (parseInt(adultosPaquete3Qty) || 1) * 2650;
  else if (adultosPaquete3 === '300 Tacos') costPaquete3Form = (parseInt(adultosPaquete3Qty) || 1) * 3350;

  const precioFormulario = finalBaseForm + totalExtrasForm + totalDecoracionForm + totalPastelForm + costPaquete1Form + costPaquete2Form + costPaquete3Form;

  // Obtener reservaciones filtradas por período para las tarjetas de métricas
  const getFilteredEventsForMetrics = () => {
    if (metricPeriod === 'todos') {
      return eventosReservados;
    }
    
    if (metricPeriod === 'dia') {
      return eventosReservados.filter(ev => ev.fecha === metricDate);
    }
    
    if (metricPeriod === 'semana') {
      const start = new Date();
      const day = start.getDay();
      const diffToMonday = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diffToMonday);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      return eventosReservados.filter(ev => {
        const evDate = parseDateString(ev.fecha);
        return evDate && evDate >= start && evDate <= end;
      });
    }
    
    if (metricPeriod === 'mes') {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return eventosReservados.filter(ev => {
        const evDate = parseDateString(ev.fecha);
        return evDate && evDate >= start && evDate <= end;
      });
    }

    if (metricPeriod === 'mes_proximo') {
      const start = new Date();
      const nextMonthStart = new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
      const nextMonthEnd = new Date(start.getFullYear(), start.getMonth() + 2, 0, 23, 59, 59, 999);
      
      return eventosReservados.filter(ev => {
        const evDate = parseDateString(ev.fecha);
        return evDate && evDate >= nextMonthStart && evDate <= nextMonthEnd;
      });
    }
    
    return eventosReservados;
  };
  
  const metricEvents = getFilteredEventsForMetrics();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar area="Eventos" />
      
      <div style={{ flex: 1, padding: '20px 20px 20px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 className="text-gradient-blue" style={{ margin: '0 0 5px 0', fontSize: '2.2rem' }}>Eventos & Fiestas</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Gestión y Reservaciones Especiales • Sucursal Santa Fe</p>
          </div>
          <button
            type="button"
            className="neu-button"
            style={{ 
              padding: '12px 28px', 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              color: 'var(--accent-blue)', 
              minWidth: '200px', 
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
            onClick={() => setShowCalendar(true)}
          >
            📅 Calendario
          </button>
        </div>

        {/* Filtro de Período para Métricas */}
        <div className="neu-box" style={{ padding: '15px 20px', marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-color)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>📍 MOSTRAR RESUMEN POR:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={metricPeriod === 'dia' ? 'neu-button' : 'neu-box'}
                onClick={() => setMetricPeriod('dia')}
                style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 'bold', border: metricPeriod === 'dia' ? '2px solid var(--accent-blue)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                📅 Día Estimado
              </button>
              <button
                type="button"
                className={metricPeriod === 'semana' ? 'neu-button' : 'neu-box'}
                onClick={() => setMetricPeriod('semana')}
                style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 'bold', border: metricPeriod === 'semana' ? '2px solid var(--accent-blue)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🗓️ Semana Actual
              </button>
              <button
                type="button"
                className={metricPeriod === 'mes' ? 'neu-button' : 'neu-box'}
                onClick={() => setMetricPeriod('mes')}
                style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 'bold', border: metricPeriod === 'mes' ? '2px solid var(--accent-blue)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                📊 Mes Actual
              </button>
              <button
                type="button"
                className={metricPeriod === 'mes_proximo' ? 'neu-button' : 'neu-box'}
                onClick={() => setMetricPeriod('mes_proximo')}
                style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 'bold', border: metricPeriod === 'mes_proximo' ? '2px solid var(--accent-blue)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🔮 Mes Próximo
              </button>
              <button
                type="button"
                className={metricPeriod === 'todos' ? 'neu-button' : 'neu-box'}
                onClick={() => setMetricPeriod('todos')}
                style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 'bold', border: metricPeriod === 'todos' ? '2px solid var(--accent-blue)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                🌎 Todo Histórico
              </button>
            </div>
          </div>
          
          {metricPeriod === 'dia' && (
            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>ELEGIR FECHA:</span>
              <input
                type="date"
                className="neu-input"
                value={metricDate}
                onChange={(e) => setMetricDate(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '0.82rem', width: '160px', height: '36px', cursor: 'pointer' }}
              />
            </div>
          )}
        </div>

        {/* Tarjetas de Métricas Premium */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>RESERVAS REGISTRADAS</p>
            <h2 className="text-gradient-blue" style={{ margin: 0, fontSize: '2.2rem' }}>
              {metricEvents.length}
            </h2>
          </div>
          <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>SALTADORES TOTALES</p>
            <h2 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--accent-orange)' }}>
              {metricEvents.reduce((acc, curr) => acc + (parseInt(curr.saltadores) || 0), 0)}
            </h2>
          </div>
          <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>ADULTOS TOTALES</p>
            <h2 style={{ margin: 0, fontSize: '2.2rem', color: 'var(--accent-orange)' }}>
              {metricEvents.reduce((acc, curr) => acc + (parseInt(curr.adultos) || 0), 0)}
            </h2>
          </div>
          <div className="neu-box" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>RECAUDACIÓN ESTIMADA</p>
            <h2 className="text-gradient-blue" style={{ margin: 0, fontSize: '2.2rem' }}>
              ${metricEvents.reduce((acc, curr) => acc + calcularTotalVenta(curr), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          {/* Formulario de Nueva Reservación (Con Pestañas de Navegación) */}
          <div className="neu-box" style={{ padding: '25px', flex: '1', minWidth: '340px', alignSelf: 'flex-start' }}>
            <h3 className="text-gradient-blue" style={{ margin: '0 0 15px 0', fontSize: '1.4rem' }}>🎟️ Crear Reservación</h3>
            
            {/* Pestañas (Tabs) */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '1px solid var(--bg-color)', paddingBottom: '10px', overflowX: 'auto' }}>
              {['cliente', 'evento', 'catering', 'horarios', 'extras'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFormTab(tab)}
                  className={formTab === tab ? 'neu-button' : 'neu-box'}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    textTransform: 'uppercase',
                    color: formTab === tab ? 'var(--accent-blue)' : 'var(--text-muted)',
                    border: formTab === tab ? '1.5px solid var(--accent-blue)' : 'none'
                  }}
                >
                  {tab === 'cliente' ? '👤 Cliente' : tab === 'evento' ? '🎉 Evento' : tab === 'catering' ? '🍕 Comida' : tab === 'horarios' ? '⏰ Horas' : '➕ Extras'}
                </button>
              ))}
            </div>

            <form onSubmit={handleCrearEvento} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Contenido según la pestaña activa */}
              {formTab === 'cliente' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>👤 NOMBRE COMPLETO</label>
                    <input 
                      type="text" 
                      placeholder="Persona que hace la reservación" 
                      className="neu-input" 
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      style={{ marginTop: '5px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📞 NÚMERO DE TELÉFONO</label>
                    <input 
                      type="tel" 
                      placeholder="10 dígitos (opcional)" 
                      className="neu-input" 
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>✉️ CORREO ELECTRÓNICO</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@gmail.com (opcional)" 
                      className="neu-input" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📮 CÓDIGO POSTAL</label>
                    <input 
                      type="text" 
                      placeholder="C.P. (opcional)" 
                      className="neu-input" 
                      value={codigoPostal}
                      onChange={(e) => setCodigoPostal(e.target.value)}
                      style={{ marginTop: '5px' }}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>👤 NOMBRE DE VENDEDOR</label>
                    <select 
                      className="neu-input" 
                      value={vendedor || 'Sin definir'}
                      onChange={(e) => setVendedor(e.target.value)}
                      style={{ marginTop: '5px' }}
                    >
                      {staffVendedores.map((name) => (
                        <option key={name} value={name}>{name === 'Sin definir' ? 'Seleccionar vendedor' : name}</option>
                      ))}
                      {vendedor && !staffVendedores.includes(vendedor) && (
                        <option value={vendedor}>{vendedor}</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {formTab === 'evento' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📅 FECHA DEL EVENTO (DD/MM/YYYY)</label>
                    <input 
                      type="text" 
                      placeholder="DD/MM/YYYY (ej: 30/05/2026)" 
                      className="neu-input" 
                      value={fecha}
                      onChange={(e) => setFecha(formatDatePickerInput(e.target.value))}
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎁 PAQUETE</label>
                      <select 
                        className="neu-input"
                        value={paquete.startsWith('Grupos') ? 'Grupos' : paquete}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Grupos') {
                            setPaquete('Grupos - Paquete A');
                          } else {
                            setPaquete(val);
                          }
                          if (val === 'VIP' || val === 'Platinum') {
                            setDecoracionTipo('Neon');
                          } else {
                            setDecoracionTipo('No incluye');
                          }
                          setDecoracionConcepto('');
                          setDecoracionMonto('');
                        }}
                        style={{ marginTop: '5px' }}
                      >
                        <option value="Sin definir">Sin definir</option>
                        <option value="Platinum">Plan Platinum</option>
                        <option value="VIP">Plan VIP</option>
                        <option value="NTP $6299">Plan NTP $6299</option>
                        <option value="NTP $6100">Plan NTP $6100</option>
                        <option value="Grupos">Plan Grupos</option>
                        <option value="Evento Privado">Plan Evento Privado</option>
                        <option value="Otro (Elegir manualmente)">Nombre a elegir manualmente</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🏡 ESPACIO ASIGNADO</label>
                      <select 
                        className="neu-input"
                        value={espacio}
                        onChange={(e) => setEspacio(e.target.value)}
                        style={{ marginTop: '5px' }}
                      >
                        <option value="Sin definir">Sin definir</option>
                        <option value="salon 1">Salón 1</option>
                        <option value="salon 2">Salón 2</option>
                        <option value="salon 3">Salón 3</option>
                        <option value="Tapanco">Tapanco</option>
                        <option value="Cafeteria">Cafetería</option>
                      </select>
                    </div>
                  </div>

                  {paquete.startsWith('Grupos') && (
                    <div className="animate-fade-in">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📋 PLAN DE GRUPOS DETALLADO</label>
                      <select
                        className="neu-input"
                        value={paquete}
                        onChange={(e) => setPaquete(e.target.value)}
                        style={{ marginTop: '5px' }}
                      >
                        <option value="Grupos - Paquete A">A: 90 minutos de salto + SkySocks en $220 por persona</option>
                        <option value="Grupos - Paquete B">B: 2 horas de salto + SkySocks en $260 por persona</option>
                        <option value="Grupos - Paquete C">C: DayPass salto ilimitado + SkySocks en $399 por persona</option>
                      </select>
                      <p style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                        * Nota: Reservas a partir de 5 personas.
                      </p>
                    </div>
                  )}

                  {paquete === 'Otro (Elegir manualmente)' && (
                    <div className="animate-fade-in">
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ESPECIFICAR NOMBRE DE PAQUETE</label>
                      <input 
                        type="text" 
                        placeholder="Escribe el nombre del paquete" 
                        className="neu-input" 
                        value={customPaquete}
                        onChange={(e) => setCustomPaquete(e.target.value)}
                        style={{ marginTop: '5px' }}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎂 NOMBRE DEL FESTEJADO Y EDAD</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Sofía cumpliendo 8 (opcional)" 
                      className="neu-input" 
                      value={festejado}
                      onChange={(e) => setFestejado(e.target.value)}
                      style={{ marginTop: '5px' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>👥 ADULTOS APROX.</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 10 (opcional)" 
                        className="neu-input" 
                        value={adultos}
                        onChange={(e) => setAdultos(e.target.value)}
                        style={{ marginTop: '5px' }}
                        min="0"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🧒 SALTADORES</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 15 (opcional)" 
                        className="neu-input" 
                        value={saltadores}
                        onChange={(e) => setSaltadores(e.target.value)}
                        style={{ marginTop: '5px' }}
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎈 DECORACIÓN</label>
                    <select 
                      className="neu-input"
                      value={decoracionTipo}
                      onChange={(e) => {
                        setDecoracionTipo(e.target.value);
                        if (e.target.value !== 'Personalizada') {
                          setDecoracionConcepto('');
                          setDecoracionMonto('');
                        }
                      }}
                      style={{ marginTop: '5px' }}
                    >
                      <option value="Neon">Neon (Por defecto para VIP/Platinum)</option>
                      <option value="No incluye">No incluye</option>
                      <option value="Personalizada">Personalizada</option>
                    </select>
                  </div>

                  {decoracionTipo === 'Personalizada' && (
                    <div className="animate-fade-in" style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: 1.5 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Concepto de Decoración</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Temática Mario Bros" 
                          className="neu-input" 
                          value={decoracionConcepto}
                          onChange={(e) => setDecoracionConcepto(e.target.value)}
                          style={{ marginTop: '5px' }}
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Monto ($)</label>
                        <input 
                          type="number" 
                          placeholder="Ej. 1500" 
                          className="neu-input" 
                          value={decoracionMonto}
                          onChange={(e) => setDecoracionMonto(e.target.value)}
                          style={{ marginTop: '5px' }}
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  )}
                  

                </div>
              )}

              {formTab === 'catering' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🍕 ALIMENTOS PIZZA</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {['Pepperoni', 'Queso', 'Hawaiana', 'Mitad y Mitad'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPizza(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                          className={pizza.includes(opt) ? 'neu-button' : 'neu-box'}
                          style={{
                            padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px',
                            border: pizza.includes(opt) ? '1.5px solid var(--accent-success)' : 'none',
                            color: pizza.includes(opt) ? 'var(--accent-success)' : 'var(--text-muted)',
                            fontWeight: pizza.includes(opt) ? 'bold' : 'normal',
                          }}
                        >
                          {pizza.includes(opt) ? '✓ ' : ''}{opt}
                        </button>
                      ))}
                    </div>
                    {pizza.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0 0 0', fontStyle: 'italic' }}>
                        Seleccionado: {pizza.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🥤 SABOR DE AGUA</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {['Limón', 'Jamaica', 'Horchata', 'Natural'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAgua(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                          className={agua.includes(opt) ? 'neu-button' : 'neu-box'}
                          style={{
                            padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px',
                            border: agua.includes(opt) ? '1.5px solid var(--accent-blue)' : 'none',
                            color: agua.includes(opt) ? 'var(--accent-blue)' : 'var(--text-muted)',
                            fontWeight: agua.includes(opt) ? 'bold' : 'normal',
                          }}
                        >
                          {agua.includes(opt) ? '✓ ' : ''}{opt}
                        </button>
                      ))}
                    </div>
                    {agua.length > 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0 0 0', fontStyle: 'italic' }}>
                        Seleccionado: {agua.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎂 SABOR DE PASTEL</label>
                    <select 
                      className="neu-input"
                      value={pastel}
                      onChange={(e) => setPastel(e.target.value)}
                      style={{ marginTop: '5px' }}
                    >
                      <option value="Sin definir">Sin definir</option>
                      <option value="Oreo">Oreo</option>
                      <option value="Choco Xt">Choco Xt</option>
                      <option value="Fresa Pay">Fresa Pay</option>
                      <option value="Choco Fresa">Choco Fresa</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎂 TAMAÑO DEL PASTEL</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {['Chico', 'Grande', 'Rectangular'].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setTamañoPastel(prev => prev === size ? '' : size)}
                          className={tamañoPastel === size ? 'neu-button' : 'neu-box'}
                          style={{ padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px', border: tamañoPastel === size ? '1.5px solid var(--accent-warning)' : 'none', color: tamañoPastel === size ? 'var(--accent-warning)' : 'var(--text-muted)', fontWeight: tamañoPastel === size ? 'bold' : 'normal' }}
                        >
                          {tamañoPastel === size ? '✓ ' : ''}{size}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', borderTop: '1px solid var(--bg-color)', paddingTop: '15px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>🍔 PAQUETES DE COMIDA PARA ADULTOS (Opcional)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 2, fontSize: '0.8rem' }}>
                          <strong>Paquete 1:</strong> 2 Rebanadas de Pizza, Agua y Rebanada de pastel ($180 c/u)
                        </div>
                        <input 
                          type="number" 
                          placeholder="Cant." 
                          className="neu-input" 
                          value={adultosPaquete1}
                          onChange={(e) => setAdultosPaquete1(e.target.value)}
                          style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                          min="0"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 2, fontSize: '0.8rem' }}>
                          <strong>Paquete 2:</strong> Hamburguesa o Boneless, Agua y Rebanada de pastel ($220 c/u)
                        </div>
                        <input 
                          type="number" 
                          placeholder="Cant." 
                          className="neu-input" 
                          value={adultosPaquete2}
                          onChange={(e) => setAdultosPaquete2(e.target.value)}
                          style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                          min="0"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Paquete 3 (Tacos de Canasta)</label>
                          <select 
                            className="neu-input"
                            value={adultosPaquete3}
                            onChange={(e) => {
                              setAdultosPaquete3(e.target.value);
                              if (e.target.value !== 'Sin definir' && !adultosPaquete3Qty) {
                                setAdultosPaquete3Qty('1');
                              }
                            }}
                            style={{ marginTop: '3px', fontSize: '0.8rem', padding: '6px 12px' }}
                          >
                            <option value="Sin definir">No incluye tacos</option>
                            <option value="100 Tacos">100 Tacos + 4 Refrescos (2L) - $1,950</option>
                            <option value="200 Tacos">200 Tacos + 6 Refrescos (2L) - $2,650</option>
                            <option value="300 Tacos">300 Tacos + 6 Refrescos (2L) - $3,350</option>
                          </select>
                        </div>
                        {adultosPaquete3 !== 'Sin definir' && (
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cant. Paq.</label>
                            <input 
                              type="number" 
                              className="neu-input" 
                              value={adultosPaquete3Qty}
                              onChange={(e) => setAdultosPaquete3Qty(e.target.value)}
                              style={{ marginTop: '3px', fontSize: '0.8rem', padding: '6px 12px' }}
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {formTab === 'horarios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>⏰ HORA LLEGADA</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaLlegada}
                        onChange={(e) => setHoraLlegada(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🚪 HORA SALIDA</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaSalida}
                        onChange={(e) => setHoraSalida(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>✨ HORA SHOW GLOW</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaGlow}
                        onChange={(e) => setHoraGlow(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🍕 HORA ALIMENTOS</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaAlimentos}
                        onChange={(e) => setHoraAlimentos(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🍰 HORA DEL PASTEL</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaPastel}
                        onChange={(e) => setHoraPastel(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🪅 HORA DE PIÑATA</label>
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={horaPinata}
                        onChange={(e) => setHoraPinata(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '15px', borderTop: '1px solid var(--bg-color)', paddingTop: '15px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>⏰ CRONOGRAMA ADICIONAL (Opcional)</label>
                    {cronogramaExtraForm.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 10px 0' }}>No hay horas adicionales programadas.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                        {cronogramaExtraForm.map((item, idx) => (
                          <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Ej: Pastel 2, Comida 2, Glow 2" 
                              className="neu-input" 
                              value={item.concepto}
                              onChange={(e) => {
                                const updated = [...cronogramaExtraForm];
                                updated[idx].concepto = e.target.value;
                                setCronogramaExtraForm(updated);
                              }}
                              style={{ flex: 1.5, fontSize: '0.8rem', padding: '6px 12px' }}
                            />
                            <input 
                              type="time" 
                              className="neu-input" 
                              value={item.hora}
                              onChange={(e) => {
                                const updated = [...cronogramaExtraForm];
                                updated[idx].hora = e.target.value;
                                setCronogramaExtraForm(updated);
                              }}
                              style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                            />
                            <button
                              type="button"
                              className="neu-button"
                              onClick={() => {
                                setCronogramaExtraForm(cronogramaExtraForm.filter(x => x.id !== item.id));
                              }}
                              style={{ color: 'var(--accent-danger)', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="neu-button"
                      onClick={() => {
                        setCronogramaExtraForm([...cronogramaExtraForm, { id: Date.now() + Math.random(), concepto: '', hora: '' }]);
                      }}
                      style={{ fontSize: '0.8rem', padding: '6px 15px', color: 'var(--accent-blue)', fontWeight: 'bold' }}
                    >
                      ➕ Agregar hora adicional
                    </button>
                  </div>
                </div>
              )}

              {/* PESTAÑA 5: EXTRAS */}
              {formTab === 'extras' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>➕ Conceptos Extras del Evento</label>
                  
                  {extrasForm.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 10px 0' }}>
                      No hay conceptos extras agregados a esta reservación.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                      {extrasForm.map((ext, idx) => (
                        <div 
                          key={idx} 
                          className="neu-box animate-fade-in" 
                          style={{ 
                            padding: '8px 12px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: 'var(--bg-color)', 
                            boxShadow: 'var(--shadow-inset)',
                            borderRadius: '8px'
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{ext.concepto}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <strong style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
                              ${parseFloat(ext.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                const filtrados = extrasForm.filter((_, i) => i !== idx);
                                setExtrasForm(filtrados);
                              }}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                color: 'var(--accent-danger)', 
                                cursor: 'pointer', 
                                fontSize: '0.85rem',
                                padding: '2px'
                              }}
                              title="Eliminar extra"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', background: 'rgba(59, 130, 246, 0.02)', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(59, 130, 246, 0.2)', marginBottom: '5px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Concepto</label>
                      <input 
                        type="text" 
                        className="neu-input" 
                        placeholder="Ej. Renta de salón extra, descorche" 
                        value={nuevoExtraConceptoForm}
                        onChange={(e) => setNuevoExtraConceptoForm(e.target.value)}
                        style={{ marginTop: '5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Monto ($)</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="number" 
                          className="neu-input" 
                          placeholder="Ej. 1500" 
                          value={nuevoExtraMontoForm}
                          onChange={(e) => setNuevoExtraMontoForm(e.target.value)}
                          style={{ marginTop: '5px', flex: 1 }}
                          min="0"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!nuevoExtraConceptoForm.trim()) {
                              alert("Por favor escribe un concepto para el extra.");
                              return;
                            }
                            if (!nuevoExtraMontoForm || parseFloat(nuevoExtraMontoForm) <= 0) {
                              alert("Por favor ingresa un monto válido mayor a 0.");
                              return;
                            }
                            setExtrasForm([...extrasForm, { concepto: nuevoExtraConceptoForm.trim(), monto: parseFloat(nuevoExtraMontoForm) }]);
                            setNuevoExtraConceptoForm('');
                            setNuevoExtraMontoForm('');
                          }}
                          className="neu-button"
                          style={{ padding: '8px 15px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '5px' }}
                        >
                          ➕ Agregar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notas Extra */}
                  <div style={{ borderTop: '1px dashed rgba(59, 130, 246, 0.2)', paddingTop: '12px', marginTop: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📝 NOTAS EXTRA (aparecen en el PDF)</label>
                    {notasExtra.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
                        {notasExtra.map((nota, idx) => (
                          <div key={idx} className="neu-box animate-fade-in" style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem' }}>📝 {nota}</span>
                            <button type="button" onClick={() => setNotasExtra(notasExtra.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.85rem', padding: '2px' }}>🗑️</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        className="neu-input"
                        placeholder="Ej. Helado de limón de cortesía"
                        value={nuevaNota}
                        onChange={(e) => setNuevaNota(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!nuevaNota.trim()) return; setNotasExtra([...notasExtra, nuevaNota.trim()]); setNuevaNota(''); }}}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="neu-button"
                        onClick={() => { if (!nuevaNota.trim()) return; setNotasExtra([...notasExtra, nuevaNota.trim()]); setNuevaNota(''); }}
                        style={{ padding: '8px 14px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                      >
                        ➕ Agregar nota
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista Previa de Costo Automático con soporte de Extras (Visible en todo momento) */}
              {precioFormulario > 0 && (
                <div className="neu-box animate-fade-in" style={{ padding: '12px', borderLeft: '4px solid var(--accent-success)', background: 'rgba(16, 185, 129, 0.05)', fontSize: '0.85rem', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Costo Base ({paquete}):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isManualPrecioBase ? (
                        <input 
                          type="number" 
                          className="neu-input" 
                          style={{ width: '90px', padding: '3px 8px', height: '24px', fontSize: '0.8rem', textAlign: 'right' }}
                          value={manualPrecioBase}
                          onChange={(e) => setManualPrecioBase(e.target.value)}
                          placeholder="Monto"
                          min="0"
                        />
                      ) : (
                        <strong style={{ color: 'var(--text-main)' }}>
                          ${precioFormularioBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </strong>
                      )}
                      <button
                        type="button"
                        className="neu-button"
                        style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent-blue)', height: '22px', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                        onClick={() => {
                          if (!isManualPrecioBase) {
                            setManualPrecioBase(precioFormularioBase);
                          }
                          setIsManualPrecioBase(!isManualPrecioBase);
                        }}
                      >
                        {isManualPrecioBase ? 'Aceptar' : 'Editar cantidad'}
                      </button>
                    </div>
                  </div>
                  
                  {(paquete === 'NTP $6299' || paquete === 'NTP $6100') && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '10px' }}>
                      * Mínimo 15 niños.
                      {(parseInt(saltadores) || 0) > 15 && ` Extras: ${(parseInt(saltadores) || 0) - 15} x $420.`}
                    </div>
                  )}

                  {extrasForm.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed var(--bg-color)', paddingTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Conceptos Extras ({extrasForm.length}):</span>
                      <strong style={{ color: 'var(--text-main)' }}>${totalExtrasForm.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}

                  {pastel && pastel !== 'Sin definir' && totalPastelForm > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed var(--bg-color)', paddingTop: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Pastel ({tamañoPastel}):</span>
                      <strong style={{ color: 'var(--text-main)' }}>${totalPastelForm.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--accent-success)', borderTop: '1.5px solid var(--bg-color)', paddingTop: '6px', marginTop: '4px' }}>
                    <span>💰 COSTO ESTIMADO TOTAL:</span>
                    <span>${precioFormulario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="neu-button" 
                style={{ padding: '12px', color: 'var(--accent-blue)', fontWeight: 'bold', marginTop: '10px' }}
              >
                💾 GUARDAR RESERVACIÓN
              </button>
            </form>
          </div>

          {/* Listado de Reservaciones de la Semana en Curso */}
          <div className="neu-box" style={{ padding: '25px', flex: '2', minWidth: '400px' }}>
            <h3 className="text-gradient-blue" style={{ margin: '0 0 5px 0', fontSize: '1.4rem' }}>📅 Reservaciones de la Semana</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Mostrando los eventos programados para la semana en curso. Abre el <strong>Calendario</strong> para explorar la agenda completa.
            </p>
            
            {(() => {
              if (loading) {
                return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando reservaciones...</p>;
              }

              // Calcular límites de la semana actual (Lunes 00:00:00 a Domingo 23:59:59)
              const start = new Date();
              const day = start.getDay();
              const diffToMonday = start.getDate() - day + (day === 0 ? -6 : 1);
              start.setDate(diffToMonday);
              start.setHours(0, 0, 0, 0);
              
              const end = new Date(start);
              end.setDate(start.getDate() + 6);
              end.setHours(23, 59, 59, 999);

              const eventosSemana = eventosReservados.filter(ev => {
                const evDate = parseDateString(ev.fecha);
                return evDate && evDate >= start && evDate <= end;
              });

              if (eventosSemana.length === 0) {
                return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay reservaciones registradas para esta semana.</p>;
              }

              // Agrupar eventos por fecha
              const eventosPorDia = {};
              eventosSemana.forEach(ev => {
                if (!ev.fecha) return;
                if (!eventosPorDia[ev.fecha]) {
                  eventosPorDia[ev.fecha] = [];
                }
                eventosPorDia[ev.fecha].push(ev);
              });

              // Ordenar las fechas cronológicamente
              const fechasOrdenadas = Object.keys(eventosPorDia).sort();

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {fechasOrdenadas.map((fechaKey) => {
                    const eventosDia = eventosPorDia[fechaKey];
                    const diaSemana = getDiaSemanaLabel(fechaKey);
                    const fechaFormateada = formatFecha(fechaKey);

                    return (
                      <div key={fechaKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 className="text-gradient-orange" style={{ margin: '0 0 5px 0', fontSize: '1.15rem', fontWeight: 'bold', borderBottom: '2px dashed rgba(255, 107, 53, 0.3)', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          ⚡ {diaSemana} ({fechaFormateada})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {eventosDia.map((ev) => {
                            const totalEvento = calcularTotalVenta(ev);
                            const totalAbonado = ev.abonos ? ev.abonos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) : 0;
                            const saldoRestante = Math.max(0, totalEvento - totalAbonado);

                            return (
                              <div 
                                key={ev.id} 
                                className="neu-box" 
                                style={{ 
                                  padding: '20px', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '15px', 
                                  background: 'var(--bg-color)', 
                                  boxShadow: 'var(--shadow-inset)' 
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>{ev.cliente}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                      📅 <strong>{formatFecha(ev.fecha)}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '4px' }}>({getDiaSemanaLabel(ev.fecha)})</span> • Paquete: <strong>{ev.paquete}</strong> • Saltadores: <strong>{ev.saltadores || 0}</strong> • Adultos: <strong>{ev.adultos || 0}</strong>
                                    </p>
                                    
                                    {/* Cotización y Estado de Abonos */}
                                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                        💵 Costo Total: <strong>${totalEvento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                                      </div>
                                      {totalAbonado > 0 && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', gap: '8px' }}>
                                          <span>Abonado: <strong>${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
                                          <span style={{ color: saldoRestante === 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                            • Pendiente: <strong>${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                      {totalAbonado > 0 && saldoRestante === 0 ? (
                                        <span style={{ 
                                          fontSize: '0.7rem', 
                                          padding: '4px 8px', 
                                          borderRadius: '12px', 
                                          background: 'rgba(16, 185, 129, 0.2)',
                                          color: 'var(--accent-success)',
                                          fontWeight: 'bold',
                                          border: '1px solid var(--accent-success)'
                                        }}>
                                          LIQUIDADO
                                        </span>
                                      ) : (
                                        <span style={{ 
                                          fontSize: '0.7rem', 
                                          padding: '4px 8px', 
                                          borderRadius: '12px', 
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          color: 'var(--accent-danger)',
                                          fontWeight: 'bold',
                                          border: '1px solid var(--accent-danger)'
                                        }}>
                                          POR LIQUIDAR
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingReservacion(ev)}
                                        className="neu-button"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-blue)' }}
                                      >
                                        ✏️ Editar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAbonosReservacion(ev)}
                                        className="neu-button"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: 'bold' }}
                                      >
                                        💰 Abonar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePrintReservacion(ev)}
                                        className="neu-button"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-main)' }}
                                        title="Generar ficha PDF de reservación"
                                      >
                                        📄 PDF
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Desglose de Datos Opcionales (Coloreados si existen, gris con borde discontinuo si faltan) */}
                                <div style={{ borderTop: '1px solid var(--bg-color)', paddingTop: '10px' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Detalles de Reservación:
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    
                                    {/* Espacio Asignado */}
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      background: ev.espacio && ev.espacio !== 'Sin definir' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
                                      color: ev.espacio && ev.espacio !== 'Sin definir' ? 'var(--accent-blue)' : 'var(--accent-danger)', 
                                      border: ev.espacio && ev.espacio !== 'Sin definir' ? 'none' : '1px dashed rgba(239, 68, 68, 0.3)',
                                      fontWeight: ev.espacio && ev.espacio !== 'Sin definir' ? 'bold' : 'normal'
                                    }}>
                                      🏡 Espacio: {ev.espacio && ev.espacio !== 'Sin definir' ? (ev.espacio === 'salon 1' ? 'Salón 1' : ev.espacio === 'salon 2' ? 'Salón 2' : ev.espacio === 'salon 3' ? 'Salón 3' : ev.espacio === 'Cafeteria' ? 'Cafetería' : ev.espacio) : 'Sin asignar'}
                                    </span>

                                    {/* Teléfono */}
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      background: ev.telefono ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
                                      color: ev.telefono ? 'var(--accent-blue)' : 'var(--accent-danger)', 
                                      border: ev.telefono ? 'none' : '1px dashed rgba(239, 68, 68, 0.3)' 
                                    }}>
                                      📞 {ev.telefono ? ev.telefono : 'Teléfono Faltante'}
                                    </span>

                                    {/* Festejado */}
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      background: ev.festejado ? 'rgba(139, 92, 246, 0.1)' : 'rgba(107, 114, 128, 0.05)', 
                                      color: ev.festejado ? 'var(--accent-purple)' : 'var(--text-muted)', 
                                      border: ev.festejado ? 'none' : '1px dashed rgba(107, 114, 128, 0.3)' 
                                    }}>
                                      🎂 {ev.festejado ? `Festejad@: ${ev.festejado}` : 'Festejad@ Faltante'}
                                    </span>

                                    {/* Pizza - array-aware */}
                                    {(() => {
                                      const pizzaArr = Array.isArray(ev.pizza) ? ev.pizza : (ev.pizza && ev.pizza !== 'Sin definir' ? [ev.pizza] : []);
                                      const hasPizza = pizzaArr.length > 0;
                                      return (
                                        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', background: hasPizza ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.05)', color: hasPizza ? 'var(--accent-success)' : 'var(--accent-warning)', border: hasPizza ? 'none' : '1px dashed rgba(245, 158, 11, 0.3)' }}>
                                          🍕 Pizza: {hasPizza ? pizzaArr.join(', ') : 'Pendiente'}
                                        </span>
                                      );
                                    })()}

                                    {/* Agua - array-aware */}
                                    {(() => {
                                      const aguaArr = Array.isArray(ev.agua) ? ev.agua : (ev.agua && ev.agua !== 'Sin definir' ? [ev.agua] : []);
                                      const hasAgua = aguaArr.length > 0;
                                      return (
                                        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '8px', background: hasAgua ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.05)', color: hasAgua ? 'var(--accent-success)' : 'var(--accent-warning)', border: hasAgua ? 'none' : '1px dashed rgba(245, 158, 11, 0.3)' }}>
                                          🥤 Agua: {hasAgua ? aguaArr.join(', ') : 'Pendiente'}
                                        </span>
                                      );
                                    })()}

                                    {/* Pastel */}
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      background: ev.pastel && ev.pastel !== 'Sin definir' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.05)', 
                                      color: ev.pastel && ev.pastel !== 'Sin definir' ? 'var(--accent-success)' : 'var(--accent-warning)', 
                                      border: ev.pastel && ev.pastel !== 'Sin definir' ? 'none' : '1px dashed rgba(245, 158, 11, 0.3)' 
                                    }}>
                                      🍰 Pastel: {ev.pastel && ev.pastel !== 'Sin definir' ? ev.pastel : 'Pendiente'}
                                    </span>

                                    {/* Horarios */}
                                    <span style={{ 
                                      fontSize: '0.75rem', 
                                      padding: '4px 10px', 
                                      borderRadius: '8px', 
                                      background: ev.horaLlegada ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.05)', 
                                      color: ev.horaLlegada ? 'var(--accent-blue)' : 'var(--text-muted)', 
                                      border: ev.horaLlegada ? 'none' : '1px dashed rgba(107, 114, 128, 0.3)' 
                                    }}>
                                      ⏰ {ev.horaLlegada ? `Llegada: ${ev.horaLlegada}` : 'Horario sin definir'}
                                      {ev.horaSalida ? ` - Salida: ${ev.horaSalida}` : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modal Overlay para Edición y Rellenado */}
      {editingReservacion && (
        <EditReservacionModal 
          reservacion={editingReservacion} 
          eventosReservados={eventosReservados} // Pasar listado completo para validación anti-empalme
          onClose={() => setEditingReservacion(null)} 
        />
      )}

      {/* Modal Overlay para Gestión de Anticipos */}
      {abonosReservacion && (
        <AbonarLiquidarModal 
          reservacion={abonosReservacion} 
          onClose={() => setAbonosReservacion(null)} 
        />
      )}

      {/* Modal de Simulación de Google Calendar */}
      {showCalendar && (
        <GoogleCalendarModal
          eventosReservados={eventosReservados}
          calendarDate={calendarDate}
          setCalendarDate={setCalendarDate}
          onClose={() => setShowCalendar(false)}
          onEditEvent={(ev) => {
            setEditingReservacion(ev);
            setShowCalendar(false);
          }}
          onAbonarEvent={(ev) => {
            setAbonosReservacion(ev);
            setShowCalendar(false);
          }}
          onPrintEvent={(ev) => handlePrintReservacion(ev)}
        />
      )}

      {/* Elemento Portal de Impresión de Reservación en A4 */}
      {printReservacionData && (
        <PDFReservacionPrint event={printReservacionData} />
      )}
    </div>
  );
};

// Componente Modal de Edición de Reservación
const EditReservacionModal = ({ reservacion, eventosReservados, onClose }) => {
  const isEstandar = paquetesEstandar.includes(reservacion.paquete);

  const [cliente, setCliente] = useState(reservacion.cliente || '');
  const [telefono, setTelefono] = useState(reservacion.telefono || '');
  const [email, setEmail] = useState(reservacion.email || '');
  const [codigoPostal, setCodigoPostal] = useState(reservacion.codigoPostal || '');
  
  // Convertir de yyyy-mm-dd de Firestore a dd/mm/yyyy para la visualización del input
  const inicialFecha = reservacion.fecha && reservacion.fecha.includes('-')
    ? (() => {
        const parts = reservacion.fecha.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      })()
    : (reservacion.fecha || '');
  
  const [fecha, setFecha] = useState(inicialFecha);
  const [festejado, setFestejado] = useState(reservacion.festejado || '');
  const [adultos, setAdultos] = useState(reservacion.adultos || '');
  const [saltadores, setSaltadores] = useState(reservacion.saltadores || '');
  const [paquete, setPaquete] = useState(isEstandar ? (reservacion.paquete || 'Sin definir') : 'Otro (Elegir manualmente)');
  const [customPaquete, setCustomPaquete] = useState(isEstandar ? '' : (reservacion.paquete || ''));
  const [espacio, setEspacio] = useState(reservacion.espacio || 'Sin definir'); // Nuevo campo en edición
  
  const [pizza, setPizza] = useState(normalizeToArray(reservacion.pizza));
  const [agua, setAgua] = useState(normalizeToArray(reservacion.agua));
  const [pastel, setPastel] = useState(reservacion.pastel || 'Sin definir');
  
  const [horaLlegada, setHoraLlegada] = useState(reservacion.horaLlegada || '');
  const [horaSalida, setHoraSalida] = useState(reservacion.horaSalida || ''); // Nuevo campo en edición
  const [horaGlow, setHoraGlow] = useState(reservacion.horaGlow || '');
  const [horaAlimentos, setHoraAlimentos] = useState(reservacion.horaAlimentos || '');
  const [horaPastel, setHoraPastel] = useState(reservacion.horaPastel || '');
  
  // Nuevos Estados en Edición
  const [vendedor, setVendedor] = useState(reservacion.vendedor || '');
  const [decoracionTipo, setDecoracionTipo] = useState(reservacion.decoracionTipo || 'No incluye');
  const [decoracionConcepto, setDecoracionConcepto] = useState(reservacion.decoracionConcepto || '');
  const [decoracionMonto, setDecoracionMonto] = useState(reservacion.decoracionMonto || '');
  const [horaPinata, setHoraPinata] = useState(reservacion.horaPinata || '');
  const [cronogramaExtra, setCronogramaExtra] = useState(reservacion.cronogramaExtra || []);
  const [adultosPaquete1, setAdultosPaquete1] = useState(reservacion.adultosPaquete1 || '');
  const [adultosPaquete2, setAdultosPaquete2] = useState(reservacion.adultosPaquete2 || '');
  const [adultosPaquete3, setAdultosPaquete3] = useState(reservacion.adultosPaquete3 || 'Sin definir');
  const [adultosPaquete3Qty, setAdultosPaquete3Qty] = useState(reservacion.adultosPaquete3Qty || '');
  const [tamañoPastel, setTamañoPastel] = useState(reservacion.tamañoPastel || '');
  const [notasExtra, setNotasExtra] = useState(reservacion.notasExtra || []);
  const [nuevaNota, setNuevaNota] = useState('');
  
  // Estados para precio base manual
  const [isManualPrecioBase, setIsManualPrecioBase] = useState(reservacion.precioBaseManual !== undefined && reservacion.precioBaseManual !== null && reservacion.precioBaseManual !== '');
  const [manualPrecioBase, setManualPrecioBase] = useState(reservacion.precioBaseManual || '');
  
  const [estado, setEstado] = useState(reservacion.estado || 'Pendiente');
  const [submitting, setSubmitting] = useState(false);

  // Estados para Conceptos Extras
  const [extras, setExtras] = useState(reservacion.extras || []);
  const [nuevoExtraConcepto, setNuevoExtraConcepto] = useState('');
  const [nuevoExtraMonto, setNuevoExtraMonto] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!cliente.trim()) {
      alert("El nombre del cliente no puede estar vacío.");
      return;
    }

    let fechaDb = '';
    if (fecha.trim()) {
      // Validación del Formato dd/mm/yyyy
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(fecha.trim())) {
        alert("Por favor ingresa la fecha en formato DD/MM/YYYY (ejemplo: 30/05/2026).");
        return;
      }
      const parts = fecha.trim().split('/');
      fechaDb = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Validación Anti-Empalme para espacios designados (excepto Cafetería y Sin definir) en el mismo día
    if (fechaDb && espacio && espacio !== 'Sin definir' && espacio !== 'Cafeteria') {
      const espacioOcupado = eventosReservados.some(ev => ev.id !== reservacion.id && ev.fecha === fechaDb && ev.espacio === espacio);
      if (espacioOcupado) {
        alert(`⚠️ ADVERTENCIA: El espacio "${espacio}" ya se encuentra ocupado/reservado para el día ${fecha} por otro evento. Por favor selecciona otro espacio o cambia la fecha.`);
        return;
      }
    }

    setSubmitting(true);
    
    try {
      const finalPaquete = paquete === 'Otro (Elegir manualmente)' ? customPaquete.trim() : paquete;

      const updateData = {
        cliente: cliente.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        codigoPostal: codigoPostal.trim(),
        fecha: fechaDb,
        festejado: festejado.trim(),
        adultos: parseInt(adultos) || 0,
        saltadores: parseInt(saltadores) || 0,
        paquete: finalPaquete,
        espacio: espacio,
        pizza: pizza,
        agua: agua,
        pastel: pastel,
        horaLlegada: horaLlegada,
        horaSalida: horaSalida,
        horaGlow: horaGlow,
        horaAlimentos: horaAlimentos,
        horaPastel: horaPastel,
        estado: estado,
        extras: extras, // Guardar la lista de extras
        vendedor: vendedor.trim(),
        decoracionTipo: decoracionTipo,
        decoracionConcepto: decoracionTipo === 'Personalizada' ? decoracionConcepto.trim() : '',
        decoracionMonto: decoracionTipo === 'Personalizada' ? (parseFloat(decoracionMonto) || 0) : 0,
        horaPinata: horaPinata,
        cronogramaExtra: cronogramaExtra,
        adultosPaquete1: parseInt(adultosPaquete1) || 0,
        adultosPaquete2: parseInt(adultosPaquete2) || 0,
        adultosPaquete3: adultosPaquete3,
        adultosPaquete3Qty: adultosPaquete3 !== 'Sin definir' ? (parseInt(adultosPaquete3Qty) || 1) : 0,
        tamañoPastel: tamañoPastel,
        notasExtra: notasExtra,
        precioBaseManual: isManualPrecioBase && manualPrecioBase !== '' ? (parseFloat(manualPrecioBase) || 0) : null
      };

      await updateDoc(doc(db, 'reservaciones', reservacion.id), updateData);
      alert("¡Reservación actualizada correctamente en la base de datos!");
      onClose();
    } catch (err) {
      console.error("Error updating document:", err);
      alert("Error al intentar guardar los cambios.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar permanentemente esta reservación?")) {
      try {
        await deleteDoc(doc(db, 'reservaciones', reservacion.id));
        alert("Reservación eliminada exitosamente.");
        onClose();
      } catch (err) {
        console.error("Error deleting document:", err);
        alert("Error al eliminar la reservación.");
      }
    }
  };

  const getFechaCalculoModal = () => {
    if (!fecha) return '';
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(fecha.trim())) return '';
    const parts = fecha.trim().split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const precioCalculadoModal = (paquete === 'VIP' || paquete === 'Platinum' || paquete === 'NTP $6299' || paquete === 'NTP $6100' || (paquete && paquete.startsWith('Grupos')))
    ? calcularPrecioPaquete(paquete, saltadores, getFechaCalculoModal())
    : (parseInt(saltadores) || 0) * 350; // Tarifa estándar de $350 para otros paquetes

  const totalExtrasModal = extras.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
  const totalDecoracionModal = (decoracionTipo === 'Personalizada') ? (parseFloat(decoracionMonto) || 0) : 0;
  const finalBaseModal = (isManualPrecioBase && manualPrecioBase !== '') ? (parseFloat(manualPrecioBase) || 0) : precioCalculadoModal;

  // Calcular precio del pastel en el modal
  let totalPastelModal = 0;
  if (pastel && pastel !== 'Sin definir') {
    const pastelGratis = paquete === 'VIP' || paquete === 'Platinum' || paquete === 'Evento Privado';
    if (!pastelGratis) {
      if (tamañoPastel === 'Chico') totalPastelModal = 699;
      else if (tamañoPastel === 'Grande') totalPastelModal = 799;
      else if (tamañoPastel === 'Rectangular') totalPastelModal = 899;
    }
  }

  const costPaquete1Modal = (parseInt(adultosPaquete1) || 0) * 180;
  const costPaquete2Modal = (parseInt(adultosPaquete2) || 0) * 220;
  let costPaquete3Modal = 0;
  if (adultosPaquete3 === '100 Tacos') costPaquete3Modal = (parseInt(adultosPaquete3Qty) || 1) * 1950;
  else if (adultosPaquete3 === '200 Tacos') costPaquete3Modal = (parseInt(adultosPaquete3Qty) || 1) * 2650;
  else if (adultosPaquete3 === '300 Tacos') costPaquete3Modal = (parseInt(adultosPaquete3Qty) || 1) * 3350;

  const totalEventoModal = finalBaseModal + totalExtrasModal + totalDecoracionModal + totalPastelModal + costPaquete1Modal + costPaquete2Modal + costPaquete3Modal;

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', overflowY: 'auto', padding: '20px' }}>
      <div className="neu-box" style={{ padding: '30px', width: '100%', maxWidth: '650px', background: 'var(--bg-color)', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="text-gradient-blue" style={{ marginTop: 0, marginBottom: 0 }}>✏️ Editar / Rellenar Reservación</h2>
          <button 
            type="button" 
            onClick={handleDelete}
            className="neu-button"
            style={{ color: 'var(--accent-danger)', padding: '8px 15px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            🗑️ Eliminar Reserva
          </button>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          
          {/* SECCIÓN 1: DATOS DEL CLIENTE */}
          <div style={{ borderBottom: '1px solid var(--bg-color)', paddingBottom: '15px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👤 Datos del Cliente</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Nombre completo</label>
                <input type="text" className="neu-input" value={cliente} onChange={(e) => setCliente(e.target.value)} style={{ marginTop: '5px' }} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Teléfono</label>
                <input type="tel" className="neu-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ marginTop: '5px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Correo electrónico</label>
                <input type="email" className="neu-input" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginTop: '5px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Código Postal</label>
                <input type="text" className="neu-input" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} style={{ marginTop: '5px' }} maxLength={5} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Vendedor</label>
                <select 
                  className="neu-input" 
                  value={vendedor || 'Sin definir'}
                  onChange={(e) => setVendedor(e.target.value)}
                  style={{ marginTop: '5px' }}
                >
                  {staffVendedores.map((name) => (
                    <option key={name} value={name}>{name === 'Sin definir' ? 'Seleccionar vendedor' : name}</option>
                  ))}
                  {vendedor && !staffVendedores.includes(vendedor) && (
                    <option value={vendedor}>{vendedor}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL EVENTO */}
          <div style={{ borderBottom: '1px solid var(--bg-color)', paddingBottom: '15px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🎉 Datos del Evento</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Fecha del evento (DD/MM/YYYY)</label>
                <input type="text" placeholder="DD/MM/YYYY" className="neu-input" value={fecha} onChange={(e) => setFecha(formatDatePickerInput(e.target.value))} style={{ marginTop: '5px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Festejado y edad</label>
                <input type="text" className="neu-input" value={festejado} onChange={(e) => setFestejado(e.target.value)} style={{ marginTop: '5px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Adultos</label>
                  <input type="number" className="neu-input" value={adultos} onChange={(e) => setAdultos(e.target.value)} style={{ marginTop: '5px' }} min="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Saltadores</label>
                  <input type="number" className="neu-input" value={saltadores} onChange={(e) => setSaltadores(e.target.value)} style={{ marginTop: '5px' }} min="0" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Paquete de Fiesta</label>
                <select 
                  className="neu-input" 
                  value={paquete.startsWith('Grupos') ? 'Grupos' : paquete} 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Grupos') {
                      setPaquete('Grupos - Paquete A');
                    } else {
                      setPaquete(val);
                    }
                    if (val === 'VIP' || val === 'Platinum') {
                      setDecoracionTipo('Neon');
                    } else {
                      setDecoracionTipo('No incluye');
                    }
                    setDecoracionConcepto('');
                    setDecoracionMonto('');
                  }} 
                  style={{ marginTop: '5px' }}
                >
                  <option value="Sin definir">Sin definir</option>
                  <option value="Platinum">Plan Platinum</option>
                  <option value="VIP">Plan VIP</option>
                  <option value="NTP $6299">Plan NTP $6299</option>
                  <option value="NTP $6100">Plan NTP $6100</option>
                  <option value="Grupos">Plan Grupos</option>
                  <option value="Evento Privado">Plan Evento Privado</option>
                  <option value="Otro (Elegir manualmente)">Nombre a elegir manualmente</option>
                </select>
              </div>

              {paquete.startsWith('Grupos') && (
                <div className="animate-fade-in" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📋 Plan de Grupos Detallado</label>
                  <select
                    className="neu-input"
                    value={paquete}
                    onChange={(e) => setPaquete(e.target.value)}
                    style={{ marginTop: '5px' }}
                  >
                    <option value="Grupos - Paquete A">A: 90 minutos de salto + SkySocks en $220 por persona</option>
                    <option value="Grupos - Paquete B">B: 2 horas de salto + SkySocks en $260 por persona</option>
                    <option value="Grupos - Paquete C">C: DayPass salto ilimitado + SkySocks en $399 por persona</option>
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                    * Reserva a partir de 5 personas.
                  </p>
                </div>
              )}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🏡 Espacio Designado</label>
                <select className="neu-input" value={espacio} onChange={(e) => setEspacio(e.target.value)} style={{ marginTop: '5px' }}>
                  <option value="Sin definir">Sin definir</option>
                  <option value="salon 1">Salón 1</option>
                  <option value="salon 2">Salón 2</option>
                  <option value="salon 3">Salón 3</option>
                  <option value="Tapanco">Tapanco</option>
                  <option value="Cafeteria">Cafetería</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>🎈 Decoración</label>
                <select 
                  className="neu-input" 
                  value={decoracionTipo} 
                  onChange={(e) => {
                    setDecoracionTipo(e.target.value);
                    if (e.target.value !== 'Personalizada') {
                      setDecoracionConcepto('');
                      setDecoracionMonto('');
                    }
                  }} 
                  style={{ marginTop: '5px' }}
                >
                  <option value="Neon">Neon (Por defecto para VIP/Platinum)</option>
                  <option value="No incluye">No incluye</option>
                  <option value="Personalizada">Personalizada</option>
                </select>
              </div>

              {decoracionTipo === 'Personalizada' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1.5 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Concepto de Decoración</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Temática Mario Bros" 
                      className="neu-input" 
                      value={decoracionConcepto}
                      onChange={(e) => setDecoracionConcepto(e.target.value)}
                      style={{ marginTop: '5px' }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Monto ($)</label>
                    <input 
                      type="number" 
                      placeholder="Ej. 1500" 
                      className="neu-input" 
                      value={decoracionMonto}
                      onChange={(e) => setDecoracionMonto(e.target.value)}
                      style={{ marginTop: '5px' }}
                      min="0"
                      required
                    />
                  </div>
                </div>
              )}
              
              {paquete === 'Otro (Elegir manualmente)' && (
                <div className="animate-fade-in" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Especificar nombre del paquete:</label>
                  <input 
                    type="text" 
                    placeholder="Escribe el nombre del paquete" 
                    className="neu-input" 
                    value={customPaquete}
                    onChange={(e) => setCustomPaquete(e.target.value)}
                    style={{ marginTop: '5px' }}
                    required
                  />
                </div>
              )}
            </div>

            {/* Costo automático dinámico en edición con soporte de extras y precio manual */}
            <div className="neu-box animate-fade-in" style={{ marginTop: '15px', padding: '15px', borderLeft: '4px solid var(--accent-success)', background: 'rgba(16, 185, 129, 0.05)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--accent-success)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💰 Resumen de Cotización
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Costo Base ({paquete}):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isManualPrecioBase ? (
                    <input
                      type="number"
                      className="neu-input"
                      style={{ width: '100px', padding: '3px 8px', height: '26px', fontSize: '0.8rem', textAlign: 'right' }}
                      value={manualPrecioBase}
                      onChange={(e) => setManualPrecioBase(e.target.value)}
                      placeholder="Monto"
                      min="0"
                    />
                  ) : (
                    <strong style={{ color: 'var(--text-main)' }}>
                      ${precioCalculadoModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </strong>
                  )}
                  <button
                    type="button"
                    className="neu-button"
                    style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--accent-blue)', height: '22px', display: 'flex', alignItems: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (!isManualPrecioBase) {
                        setManualPrecioBase(precioCalculadoModal);
                      }
                      setIsManualPrecioBase(!isManualPrecioBase);
                    }}
                  >
                    {isManualPrecioBase ? 'Aceptar' : 'Editar cantidad'}
                  </button>
                </div>
              </div>

              {(paquete === 'NTP $6299' || paquete === 'NTP $6100') && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', paddingLeft: '10px' }}>
                  * Incluye hasta 15 niños.
                  {(parseInt(saltadores) || 0) > 15 && ` Niños extras: ${(parseInt(saltadores) || 0) - 15} x $420.`}
                </div>
              )}

               {extras.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed var(--bg-color)', paddingTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Conceptos Extras ({extras.length}):</span>
                  <strong style={{ color: 'var(--text-main)' }}>${totalExtrasModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}

              {pastel && pastel !== 'Sin definir' && totalPastelModal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', borderTop: '1px dashed var(--bg-color)', paddingTop: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pastel ({tamañoPastel}):</span>
                  <strong style={{ color: 'var(--text-main)' }}>${totalPastelModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--accent-success)', fontSize: '1rem', borderTop: '2px solid var(--bg-color)', paddingTop: '8px', marginTop: '6px' }}>
                <span>TOTAL DEL EVENTO:</span>
                <span>${totalEventoModal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ALIMENTOS Y BEBIDAS */}
          <div style={{ borderBottom: '1px solid var(--bg-color)', paddingBottom: '15px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🍕 Alimentos y Bebidas (Catering)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Pizza</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {['Pepperoni', 'Queso', 'Hawaiana', 'Mitad y Mitad'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPizza(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                      className={pizza.includes(opt) ? 'neu-button' : 'neu-box'}
                      style={{ padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px', border: pizza.includes(opt) ? '1.5px solid var(--accent-success)' : 'none', color: pizza.includes(opt) ? 'var(--accent-success)' : 'var(--text-muted)', fontWeight: pizza.includes(opt) ? 'bold' : 'normal' }}
                    >
                      {pizza.includes(opt) ? '✓ ' : ''}{opt}
                    </button>
                  ))}
                </div>
                {pizza.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0 0 0', fontStyle: 'italic' }}>Seleccionado: {pizza.join(', ')}</p>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Agua</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {['Limón', 'Jamaica', 'Horchata', 'Natural'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAgua(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                      className={agua.includes(opt) ? 'neu-button' : 'neu-box'}
                      style={{ padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px', border: agua.includes(opt) ? '1.5px solid var(--accent-blue)' : 'none', color: agua.includes(opt) ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: agua.includes(opt) ? 'bold' : 'normal' }}
                    >
                      {agua.includes(opt) ? '✓ ' : ''}{opt}
                    </button>
                  ))}
                </div>
                {agua.length > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '5px 0 0 0', fontStyle: 'italic' }}>Seleccionado: {agua.join(', ')}</p>}
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Pastel</label>
                <select className="neu-input" value={pastel} onChange={(e) => setPastel(e.target.value)} style={{ marginTop: '5px' }}>
                  <option value="Sin definir">Sin definir</option>
                  <option value="Oreo">Oreo</option>
                  <option value="Choco Xt">Choco Xt</option>
                  <option value="Fresa Pay">Fresa Pay</option>
                  <option value="Choco Fresa">Choco Fresa</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Tamaño del Pastel</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {['Chico', 'Grande', 'Rectangular'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTamañoPastel(prev => prev === size ? '' : size)}
                      className={tamañoPastel === size ? 'neu-button' : 'neu-box'}
                      style={{ padding: '7px 14px', fontSize: '0.78rem', cursor: 'pointer', borderRadius: '8px', border: tamañoPastel === size ? '1.5px solid var(--accent-warning)' : 'none', color: tamañoPastel === size ? 'var(--accent-warning)' : 'var(--text-muted)', fontWeight: tamañoPastel === size ? 'bold' : 'normal' }}
                    >
                      {tamañoPastel === size ? '✓ ' : ''}{size}
                    </button>
                  ))}
                </div>
              </div>

              {/* PAQUETES DE COMIDA PARA ADULTOS */}
              <div style={{ borderTop: '1px solid var(--bg-color)', paddingTop: '15px', marginTop: '15px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>🍔 Paquetes de Comida para Adultos (Opcional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paquete 1 Qty ($180)</label>
                    <input 
                      type="number" 
                      className="neu-input" 
                      value={adultosPaquete1} 
                      onChange={(e) => setAdultosPaquete1(e.target.value)} 
                      style={{ marginTop: '3px', fontSize: '0.8rem', padding: '5px 10px' }} 
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paquete 2 Qty ($220)</label>
                    <input 
                      type="number" 
                      className="neu-input" 
                      value={adultosPaquete2} 
                      onChange={(e) => setAdultosPaquete2(e.target.value)} 
                      style={{ marginTop: '3px', fontSize: '0.8rem', padding: '5px 10px' }} 
                      min="0"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paquete 3 (Tacos de Canasta)</label>
                    <select 
                      className="neu-input"
                      value={adultosPaquete3}
                      onChange={(e) => {
                        setAdultosPaquete3(e.target.value);
                        if (e.target.value !== 'Sin definir' && !adultosPaquete3Qty) {
                          setAdultosPaquete3Qty('1');
                        }
                      }}
                      style={{ marginTop: '3px', fontSize: '0.8rem', padding: '5px 10px' }}
                    >
                      <option value="Sin definir">No incluye tacos</option>
                      <option value="100 Tacos">100 Tacos + 4 Refrescos (2L) - $1,950</option>
                      <option value="200 Tacos">200 Tacos + 6 Refrescos (2L) - $2,650</option>
                      <option value="300 Tacos">300 Tacos + 6 Refrescos (2L) - $3,350</option>
                    </select>
                  </div>
                  {adultosPaquete3 !== 'Sin definir' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cant. Paq.</label>
                      <input 
                        type="number" 
                        className="neu-input" 
                        value={adultosPaquete3Qty}
                        onChange={(e) => setAdultosPaquete3Qty(e.target.value)}
                        style={{ marginTop: '3px', fontSize: '0.8rem', padding: '5px 10px' }}
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: HORARIOS Y ESTADO */}
          <div>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏰ Horarios e Indicadores</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Llegada</label>
                  <input type="time" className="neu-input" value={horaLlegada} onChange={(e) => setHoraLlegada(e.target.value)} style={{ marginTop: '5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Salida</label>
                  <input type="time" className="neu-input" value={horaSalida} onChange={(e) => setHoraSalida(e.target.value)} style={{ marginTop: '5px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Show Glow</label>
                  <input type="time" className="neu-input" value={horaGlow} onChange={(e) => setHoraGlow(e.target.value)} style={{ marginTop: '5px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Alimentos</label>
                  <input type="time" className="neu-input" value={horaAlimentos} onChange={(e) => setHoraAlimentos(e.target.value)} style={{ marginTop: '5px' }} />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Pastel</label>
                <input type="time" className="neu-input" value={horaPastel} onChange={(e) => setHoraPastel(e.target.value)} style={{ marginTop: '5px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Hora Piñata</label>
                <input type="time" className="neu-input" value={horaPinata} onChange={(e) => setHoraPinata(e.target.value)} style={{ marginTop: '5px' }} />
              </div>
            </div>

            {/* SECCIÓN 4.5: CRONOGRAMA ADICIONAL EN EDICIÓN */}
            <div style={{ borderTop: '1px solid var(--bg-color)', paddingTop: '15px', marginTop: '10px', marginBottom: '15px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>⏰ Cronograma Adicional</label>
              {cronogramaExtra.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 10px 0' }}>No hay horas adicionales programadas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  {cronogramaExtra.map((item, idx) => (
                    <div key={item.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        placeholder="Ej: Pastel 2, Comida 2, Glow 2" 
                        className="neu-input" 
                        value={item.concepto}
                        onChange={(e) => {
                          const updated = [...cronogramaExtra];
                          updated[idx].concepto = e.target.value;
                          setCronogramaExtra(updated);
                        }}
                        style={{ flex: 1.5, fontSize: '0.8rem', padding: '6px 12px' }}
                      />
                      <input 
                        type="time" 
                        className="neu-input" 
                        value={item.hora}
                        onChange={(e) => {
                          const updated = [...cronogramaExtra];
                          updated[idx].hora = e.target.value;
                          setCronogramaExtra(updated);
                        }}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '6px 12px' }}
                      />
                      <button
                        type="button"
                        className="neu-button"
                        onClick={() => {
                          setCronogramaExtra(cronogramaExtra.filter((_, i) => i !== idx));
                        }}
                        style={{ color: 'var(--accent-danger)', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="neu-button"
                onClick={() => {
                  setCronogramaExtra([...cronogramaExtra, { id: Date.now() + Math.random(), concepto: '', hora: '' }]);
                }}
                style={{ fontSize: '0.75rem', padding: '6px 15px', color: 'var(--accent-blue)', fontWeight: 'bold' }}
              >
                ➕ Agregar hora adicional
              </button>
            </div>
          </div>

          {/* SECCIÓN 5: CONCEPTOS EXTRAS */}
          <div style={{ borderTop: '2px solid var(--bg-color)', paddingTop: '15px', marginTop: '5px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>➕ Conceptos Extras</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none' }}>Suman al total final</span>
            </h4>
            
            {/* Lista de Extras */}
            {extras.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 15px 0' }}>
                No se han registrado conceptos extras.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                {extras.map((ext, idx) => (
                  <div 
                    key={idx} 
                    className="neu-box animate-fade-in" 
                    style={{ 
                      padding: '8px 12px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'var(--bg-color)', 
                      boxShadow: 'var(--shadow-inset)',
                      borderRadius: '8px'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{ext.concepto}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>
                        ${parseFloat(ext.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          const filtrados = extras.filter((_, i) => i !== idx);
                          setExtras(filtrados);
                        }}
                        style={{ 
                          border: 'none', 
                          background: 'none', 
                          color: 'var(--accent-danger)', 
                          cursor: 'pointer', 
                          fontSize: '0.9rem',
                          padding: '2px'
                        }}
                        title="Eliminar extra"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Formulario para Agregar Extra */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'rgba(59, 130, 246, 0.03)', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(59, 130, 246, 0.2)' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Concepto</label>
                <input 
                  type="text" 
                  className="neu-input" 
                  placeholder="Ej. Renta de salón extra, descorche" 
                  value={nuevoExtraConcepto}
                  onChange={(e) => setNuevoExtraConcepto(e.target.value)}
                  style={{ marginTop: '5px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Monto ($)</label>
                <input 
                  type="number" 
                  className="neu-input" 
                  placeholder="Ej. 1500" 
                  value={nuevoExtraMonto}
                  onChange={(e) => setNuevoExtraMonto(e.target.value)}
                  style={{ marginTop: '5px' }}
                  min="0"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!nuevoExtraConcepto.trim()) {
                    alert("Por favor escribe un concepto para el extra.");
                    return;
                  }
                  if (!nuevoExtraMonto || parseFloat(nuevoExtraMonto) <= 0) {
                    alert("Por favor ingresa un monto válido mayor a 0.");
                    return;
                  }
                  setExtras([...extras, { concepto: nuevoExtraConcepto.trim(), monto: parseFloat(nuevoExtraMonto) }]);
                  setNuevoExtraConcepto('');
                  setNuevoExtraMonto('');
                }}
                className="neu-button"
                style={{ padding: '9px 15px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '0.85rem' }}
              >
                ➕ Agregar
              </button>
            </div>
          </div>

          {/* SECCIÓN: NOTAS EXTRA */}
          <div style={{ borderTop: '2px solid var(--bg-color)', paddingTop: '15px', marginTop: '5px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📝 Notas Extra</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'none' }}>Aparecen en el PDF impreso</span>
            </h4>
            {notasExtra.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {notasExtra.map((nota, idx) => (
                  <div key={idx} className="neu-box animate-fade-in" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>📝 {nota}</span>
                    <button type="button" onClick={() => setNotasExtra(notasExtra.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="neu-input"
                placeholder="Ej. Helado de limón de cortesía"
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!nuevaNota.trim()) return; setNotasExtra([...notasExtra, nuevaNota.trim()]); setNuevaNota(''); }}}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="neu-button"
                onClick={() => { if (!nuevaNota.trim()) return; setNotasExtra([...notasExtra, nuevaNota.trim()]); setNuevaNota(''); }}
                style={{ padding: '9px 15px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              >
                ➕ Agregar nota
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
            <button
              type="submit"
              className="neu-button"
              disabled={submitting}
              style={{ flex: 1, color: 'var(--accent-success)', fontWeight: 'bold' }}
            >
              {submitting ? 'GUARDANDO...' : '💾 GUARDAR CAMBIOS'}
            </button>
            <button
              type="button"
              className="neu-button"
              onClick={onClose}
              disabled={submitting}
              style={{ flex: 1, color: 'var(--accent-danger)', fontWeight: 'bold' }}
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Modal de Gestión de Anticipos (Abonar/Liquidar)
const AbonarLiquidarModal = ({ reservacion, onClose }) => {
  const [abonos, setAbonos] = useState(reservacion.abonos || []);
  const [fechaAbono, setFechaAbono] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoAbono, setMontoAbono] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalEvento = calcularTotalVenta(reservacion);
  const totalAbonado = abonos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);
  const saldoRestante = Math.max(0, totalEvento - totalAbonado);

  const limpiarFechaReservacion = (fechaDb) => {
    if (!fechaDb) return '00000000';
    if (fechaDb.includes('-')) {
      const [yyyy, mm, dd] = fechaDb.split('-');
      return `${dd}${mm}${yyyy}`;
    }
    return fechaDb.replace(/[\/\-]/g, '');
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    if (!fechaAbono.trim()) {
      alert("Por favor ingresa la fecha del pago.");
      return;
    }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(fechaAbono.trim())) {
      alert("La fecha del abono debe estar en formato DD/MM/YYYY.");
      return;
    }
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0) {
      alert("Por favor ingresa un monto válido mayor a $0.00.");
      return;
    }
    if (monto > saldoRestante) {
      alert(`El monto ingresado ($${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) supera al saldo restante del evento ($${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}).`);
      return;
    }

    setSubmitting(true);
    
    // Generar Folio
    const fechaPagoLimpia = fechaAbono.trim().replace(/[\/\-]/g, '');
    const fechaRevLimpia = limpiarFechaReservacion(reservacion.fecha);
    const randomNum = Math.floor(100 + Math.random() * 900);
    const folio = `${fechaPagoLimpia}-${fechaRevLimpia}-${randomNum}`;

    const nuevoAbono = {
      folio,
      fecha: fechaAbono.trim(),
      metodoPago,
      monto
    };

    const nuevosAbonos = [...abonos, nuevoAbono];

    try {
      await updateDoc(doc(db, 'reservaciones', reservacion.id), {
        abonos: nuevosAbonos
      });
      setAbonos(nuevosAbonos);
      setMontoAbono('');
      alert(`¡Anticipo registrado correctamente!\nFolio generado: ${folio}`);
    } catch (err) {
      console.error("Error al registrar abono:", err);
      alert("Error al conectar con la base de datos.");
    } finally {
      setSubmitting(false);
    }
  };

  const eliminarAbono = async (idx, folio) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el abono con folio ${folio}?`)) {
      const filtrados = abonos.filter((_, i) => i !== idx);
      try {
        await updateDoc(doc(db, 'reservaciones', reservacion.id), {
          abonos: filtrados
        });
        setAbonos(filtrados);
        alert("Abono eliminado exitosamente.");
      } catch (err) {
        console.error("Error al eliminar abono:", err);
        alert("Hubo un error al eliminar el abono.");
      }
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', overflowY: 'auto', padding: '20px' }}>
      <div className="neu-box" style={{ padding: '30px', width: '100%', maxWidth: '650px', background: 'var(--bg-color)', borderRadius: '16px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '12px' }}>
          <h2 className="text-gradient-blue" style={{ marginTop: 0, marginBottom: 0, fontSize: '1.6rem' }}>💰 Registrar / Liquidar Anticipos</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="neu-button"
            style={{ padding: '8px 15px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            Cerrar [X]
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Cliente: {reservacion.cliente}</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            📅 Fecha Evento: <strong>{reservacion.fecha ? formatFecha(reservacion.fecha) : 'Sin fecha'}</strong> • Paquete: <strong>{reservacion.paquete}</strong>
          </p>
        </div>

        {/* Tarjetas de Saldos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
          <div className="neu-box" style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>COSTO TOTAL</span>
            <h4 style={{ margin: '5px 0 0 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              ${totalEvento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="neu-box" style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL ABONADO</span>
            <h4 style={{ margin: '5px 0 0 0', fontSize: '1.2rem', color: 'var(--accent-blue)' }}>
              ${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h4>
          </div>
          <div className="neu-box" style={{ padding: '12px', textAlign: 'center', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SALDO RESTANTE</span>
            <h4 style={{ margin: '5px 0 0 0', fontSize: '1.2rem', color: saldoRestante === 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              ${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        {/* Insignia de Liquidación */}
        {saldoRestante === 0 && (
          <div className="neu-box animate-fade-in" style={{ padding: '15px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', border: '2px solid var(--accent-success)', borderRadius: '12px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-success)', fontSize: '1.2rem', fontWeight: 'bold' }}>🎉 EVENTO TOTALMENTE LIQUIDADO</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>No se requieren abonos adicionales para esta reservación.</p>
          </div>
        )}

        {/* Historial de Abonos */}
        <div style={{ marginBottom: '25px' }}>
          <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.9rem' }}>
            📜 Historial de Abonos Registrados ({abonos.length})
          </h4>
          
          {abonos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', textAlign: 'center', padding: '15px', border: '1px dashed var(--bg-color)', borderRadius: '10px' }}>
              No se han registrado abonos para esta reservación.
            </p>
          ) : (
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--bg-color)', borderRadius: '10px', padding: '5px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--bg-color)', textAlign: 'left' }}>
                    <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Folio del Pago</th>
                    <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Fecha</th>
                    <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Método</th>
                    <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Monto</th>
                    <th style={{ padding: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {abonos.map((ab, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--bg-color)' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{ab.folio}</td>
                      <td style={{ padding: '8px' }}>{ab.fecha}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          borderRadius: '8px', 
                          background: ab.metodoPago === 'Efectivo' 
                            ? 'rgba(16, 185, 129, 0.1)' 
                            : ab.metodoPago === 'Tarjeta' 
                              ? 'rgba(245, 158, 11, 0.1)' 
                              : ab.metodoPago === 'Transferencia'
                                ? 'rgba(139, 92, 246, 0.1)'
                                : ab.metodoPago === 'Link de Pago'
                                  ? 'rgba(6, 182, 212, 0.1)'
                                  : 'rgba(59, 130, 246, 0.1)',
                          color: ab.metodoPago === 'Efectivo' 
                            ? 'var(--accent-success)' 
                            : ab.metodoPago === 'Tarjeta' 
                              ? 'var(--accent-warning)' 
                              : ab.metodoPago === 'Transferencia'
                                ? '#8b5cf6'
                                : ab.metodoPago === 'Link de Pago'
                                  ? '#06b6d4'
                                  : 'var(--accent-blue)',
                          fontWeight: 'bold'
                        }}>
                          {ab.metodoPago}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>
                        ${parseFloat(ab.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => eliminarAbono(idx, ab.folio)}
                          style={{ border: 'none', background: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '1rem' }}
                          title="Eliminar registro"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Formulario de Registro (Solo si el saldo es mayor a 0) */}
        {saldoRestante > 0 && (
          <div className="neu-box" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.02)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
            <h4 style={{ color: 'var(--accent-blue)', margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.9rem' }}>
              ✍️ Registrar Nuevo Abono
            </h4>
            <form onSubmit={registrarAbono} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>📅 FECHA DEL ABONO</label>
                  <input 
                    type="text" 
                    className="neu-input" 
                    value={fechaAbono}
                    onChange={(e) => setFechaAbono(e.target.value)}
                    style={{ marginTop: '5px' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>💳 MÉTODO DE PAGO</label>
                  <select 
                    className="neu-input"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    style={{ marginTop: '5px' }}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Link de Pago">Link de Pago</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', borderTop: '1px solid var(--bg-color)', paddingTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>💰 MONTO A ABONAR ($)</label>
                  <input 
                    type="number" 
                    className="neu-input" 
                    placeholder={`Ingresa el monto (Monto máximo disponible: $${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`}
                    value={montoAbono}
                    onChange={(e) => setMontoAbono(e.target.value)}
                    style={{ marginTop: '5px', width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="neu-button"
                  disabled={submitting}
                  style={{ padding: '12px 25px', color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '0.95rem', minWidth: '160px', height: '44px' }}
                >
                  {submitting ? 'Guardando...' : '💾 Registrar Abono'}
                </button>
              </div>
            </form>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              * Se generará automáticamente un número de folio concatenado al registrar.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// Componente de Simulación de Google Calendar
const GoogleCalendarModal = ({ 
  eventosReservados, 
  calendarDate, 
  setCalendarDate, 
  onClose, 
  onEditEvent, 
  onAbonarEvent,
  onPrintEvent
}) => {
  const [selectedEventDetail, setSelectedEventDetail] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const prevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const goToday = () => {
    setCalendarDate(new Date());
  };

  // Matemática de grilla mensual (42 celdas)
  const firstDayIndexRaw = new Date(year, month, 1).getDay();
  const firstDayIndex = firstDayIndexRaw === 0 ? 6 : firstDayIndexRaw - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const dayCells = [];

  // Días previos
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    dayCells.push({
      day: prevTotalDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    });
  }

  // Días actuales
  for (let i = 1; i <= totalDays; i++) {
    dayCells.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    });
  }

  // Días posteriores
  const remainingCells = 42 - dayCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    dayCells.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    });
  }

  const pad = (n) => String(n).padStart(2, '0');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const getBadgeStyles = (paquete) => {
    switch (paquete) {
      case 'VIP':
        return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' };
      case 'Platinum':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'NTP $6299':
      case 'NTP $6100':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'Grupos':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'Evento Privado':
        return { bg: 'rgba(107, 114, 128, 0.2)', color: 'var(--text-main)', border: '1px solid var(--text-muted)' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)' };
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="neu-box animate-fade-in" style={{ padding: '25px', width: '95vw', maxWidth: '1200px', height: '90vh', background: 'var(--bg-color)', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header de Calendario */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h2 className="text-gradient-blue" style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📅 Calendario de Eventos
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={prevMonth} className="neu-button" style={{ padding: '6px 12px', fontWeight: 'bold' }}>&lt;</button>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', minWidth: '150px', textAlign: 'center' }}>
                {meses[month]} {year}
              </span>
              <button onClick={nextMonth} className="neu-button" style={{ padding: '6px 12px', fontWeight: 'bold' }}>&gt;</button>
              <button onClick={goToday} className="neu-button" style={{ padding: '6px 15px', fontWeight: 'bold', marginLeft: '10px', fontSize: '0.85rem' }}>Hoy</button>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="neu-button"
            style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-danger)' }}
          >
            Cerrar [X]
          </button>
        </div>

        {/* Nombres de días de la semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px', textAlign: 'center', marginBottom: '8px' }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
            <div key={i} style={{ fontWeight: 'bold', fontSize: '0.85rem', color: i === 5 || i === 6 ? 'var(--accent-blue)' : 'var(--text-muted)', paddingBottom: '5px' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grilla del Calendario (Días del mes) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: 'repeat(6, minmax(130px, 1fr))', gap: '5px', flex: 1, overflowY: 'auto' }}>
          {dayCells.map((cell, idx) => {
            const cellDateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
            const isToday = cellDateStr === todayStr;
            const cellEvents = eventosReservados.filter(ev => ev.fecha === cellDateStr);

            return (
              <div 
                key={idx} 
                className="neu-box"
                onClick={() => {
                  if (cellEvents.length > 0) {
                    setSelectedDayEvents({
                      dateLabel: `${cell.day} de ${meses[cell.month]} ${cell.year}`,
                      events: cellEvents
                    });
                  }
                }}
                style={{ 
                  padding: '8px', 
                  background: cell.isCurrentMonth ? 'var(--bg-color)' : 'rgba(0,0,0,0.02)', 
                  boxShadow: 'var(--shadow-inset)',
                  borderRadius: '10px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  opacity: cell.isCurrentMonth ? 1 : 0.45,
                  minHeight: '130px',
                  minWidth: 0,
                  border: isToday ? '2px solid var(--accent-blue)' : '1px solid transparent',
                  position: 'relative',
                  cursor: cellEvents.length > 0 ? 'pointer' : 'default'
                }}
              >
                {/* Indicador de número de día */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold', 
                    color: isToday ? '#fff' : 'var(--text-main)',
                    background: isToday ? 'var(--accent-blue)' : 'transparent',
                    padding: isToday ? '2px 6px' : '0',
                    borderRadius: isToday ? '50%' : 'none',
                    display: 'inline-block',
                    textAlign: 'center',
                    minWidth: isToday ? '20px' : 'auto'
                  }}>
                    {cell.day}
                  </span>
                </div>

                {/* Listado de eventos en esta celda (1 más caro, +N más si hay excedente) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden', paddingRight: '2px' }}>
                  {(() => {
                    const sortedCellEvents = [...cellEvents].sort((a, b) => calcularTotalVenta(b) - calcularTotalVenta(a));
                    const previewEvents = sortedCellEvents.slice(0, 1);
                    const remainingCount = cellEvents.length - 1;

                    return (
                      <>
                        {previewEvents.map((ev) => {
                          const badge = getBadgeStyles(ev.paquete);
                          return (
                            <button
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventDetail(ev);
                              }}
                              style={{
                                background: badge.bg,
                                color: badge.color,
                                border: badge.border,
                                borderRadius: '6px',
                                padding: '3px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 'bold',
                                textAlign: 'left',
                                cursor: 'pointer',
                                width: '100%',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                transition: 'transform 0.1s ease',
                              }}
                              title={`${ev.cliente} - ${ev.paquete} ($${calcularTotalVenta(ev).toLocaleString('es-MX', { minimumFractionDigits: 2 })})`}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                            >
                              👥 {ev.cliente} ({ev.paquete})
                            </button>
                          );
                        })}
                        {remainingCount > 0 && (
                          <div style={{
                            fontSize: '0.68rem',
                            fontWeight: 'bold',
                            color: 'var(--accent-blue)',
                            textAlign: 'center',
                            padding: '2px 0',
                            marginTop: '2px',
                            background: 'rgba(59, 130, 246, 0.05)',
                            borderRadius: '4px',
                            border: '1px dashed rgba(59, 130, 246, 0.2)'
                          }}>
                            +{remainingCount} más
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal de Detalle de Evento Seleccionado */}
      {selectedEventDetail && (
        <EventDetailModal
          event={selectedEventDetail}
          onClose={() => setSelectedEventDetail(null)}
          onEdit={() => {
            onEditEvent(selectedEventDetail);
            setSelectedEventDetail(null);
          }}
          onAbonar={() => {
            onAbonarEvent(selectedEventDetail);
            setSelectedEventDetail(null);
          }}
          onPrint={() => {
            onPrintEvent(selectedEventDetail);
            setSelectedEventDetail(null);
          }}
        />
      )}

      {/* Modal de Eventos del Día */}
      {selectedDayEvents && (
        <DayEventsModal
          dateLabel={selectedDayEvents.dateLabel}
          events={selectedDayEvents.events}
          onClose={() => setSelectedDayEvents(null)}
          onSelectEvent={(ev) => {
            setSelectedEventDetail(ev);
            setSelectedDayEvents(null);
          }}
          getBadgeStyles={getBadgeStyles}
        />
      )}
    </div>
  );
};

// Componente Interno para Detalle de Evento Ficha Técnica
const EventDetailModal = ({ event, onClose, onEdit, onAbonar, onPrint }) => {
  const totalEvento = calcularTotalVenta(event);
  const totalAbonado = event.abonos ? event.abonos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) : 0;
  const saldoRestante = Math.max(0, totalEvento - totalAbonado);

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1100, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
      <div className="neu-box animate-fade-in" style={{ padding: '30px', width: '90%', maxWidth: '700px', background: 'var(--bg-color)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'left', maxHeight: '85vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '12px' }}>
          <h3 className="text-gradient-blue" style={{ margin: 0, fontSize: '1.5rem' }}>Ficha Técnica de Evento</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="neu-button"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            Regresar
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Columna Izquierda: Información Básica */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.85rem' }}>👤 Datos del Cliente</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div><strong>Nombre:</strong> {event.cliente}</div>
              <div><strong>Teléfono:</strong> {event.telefono || 'Faltante'}</div>
              <div><strong>Email:</strong> {event.email || 'Faltante'}</div>
              <div><strong>Código Postal:</strong> {event.codigoPostal || 'Faltante'}</div>
            </div>

            <h4 style={{ margin: '15px 0 12px 0', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.85rem' }}>🎉 Detalles de la Fiesta</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div><strong>Fecha:</strong> {event.fecha ? formatFecha(event.fecha) : 'Sin fecha'} ({getDiaSemanaLabel(event.fecha)})</div>
              <div><strong>Festejad@:</strong> {event.festejado || 'Faltante'}</div>
              <div><strong>Paquete:</strong> <strong style={{ color: 'var(--text-main)' }}>{event.paquete}</strong></div>
              <div><strong>Espacio Asignado:</strong> <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{event.espacio && event.espacio !== 'Sin definir' ? (event.espacio === 'salon 1' ? 'Salón 1' : event.espacio === 'salon 2' ? 'Salón 2' : event.espacio === 'salon 3' ? 'Salón 3' : event.espacio === 'Cafeteria' ? 'Cafetería' : event.espacio) : 'Sin definir'}</span></div>
              <div><strong>Saltadores:</strong> {event.saltadores || 0} niños • <strong>Adultos:</strong> {event.adultos || 0}</div>
            </div>
          </div>

          {/* Columna Derecha: Alimentos y Tiempos */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.85rem' }}>🍕 Catering y F&B</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div><strong>Pizza:</strong> {Array.isArray(event.pizza) ? (event.pizza.length > 0 ? event.pizza.join(', ') : 'Pendiente') : (event.pizza && event.pizza !== 'Sin definir' ? event.pizza : 'Pendiente')}</div>
              <div><strong>Agua:</strong> {Array.isArray(event.agua) ? (event.agua.length > 0 ? event.agua.join(', ') : 'Pendiente') : (event.agua && event.agua !== 'Sin definir' ? event.agua : 'Pendiente')}</div>
              <div><strong>Pastel sabor:</strong> {event.pastel && event.pastel !== 'Sin definir' ? event.pastel : 'Pendiente'}</div>
              {event.adultosPaquete1 > 0 && <div><strong>Paq. 1 Adultos:</strong> {event.adultosPaquete1} pzas (${(event.adultosPaquete1 * 180).toLocaleString('es-MX')})</div>}
              {event.adultosPaquete2 > 0 && <div><strong>Paq. 2 Adultos:</strong> {event.adultosPaquete2} pzas (${(event.adultosPaquete2 * 220).toLocaleString('es-MX')})</div>}
              {event.adultosPaquete3 && event.adultosPaquete3 !== 'Sin definir' && (
                <div>
                  <strong>Paq. 3 Adultos ({event.adultosPaquete3}):</strong> {event.adultosPaquete3Qty || 1} paq. (${((event.adultosPaquete3Qty || 1) * (event.adultosPaquete3 === '100 Tacos' ? 1950 : event.adultosPaquete3 === '200 Tacos' ? 2650 : 3350)).toLocaleString('es-MX')})
                </div>
              )}
            </div>

            <h4 style={{ margin: '15px 0 12px 0', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.85rem' }}>⏰ Cronograma</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div><strong>Hora de Llegada:</strong> {event.horaLlegada || 'Sin definir'}</div>
              {event.horaGlow && <div><strong>Hora Show Glow:</strong> {event.horaGlow}</div>}
              {event.horaAlimentos && <div><strong>Hora Alimentos:</strong> {event.horaAlimentos}</div>}
              {event.horaPinata && <div><strong>Hora Piñata:</strong> {event.horaPinata}</div>}
              {event.horaPastel && <div><strong>Hora Pastel:</strong> {event.horaPastel}</div>}
              {event.cronogramaExtra && event.cronogramaExtra.map((item, idx) => (
                item.concepto && item.hora && (
                  <div key={idx}><strong>{item.concepto}:</strong> {item.hora}</div>
                )
              ))}
              <div><strong>Hora de Salida:</strong> {event.horaSalida || 'Sin definir'}</div>
            </div>
          </div>
        </div>

        {/* Sección de Conceptos Extras */}
        {event.extras && event.extras.length > 0 && (
          <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.01)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-color)' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.8rem', fontWeight: 'bold' }}>➕ Cargos Extras</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {event.extras.map((ext, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>• {ext.concepto}</span>
                  <strong>${parseFloat(ext.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección Contable */}
        <div className="neu-box" style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', background: 'var(--bg-color)', boxShadow: 'var(--shadow-inset)', marginBottom: '25px', borderRadius: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>COSTO TOTAL</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '4px' }}>
              ${totalEvento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>TOTAL ABONADO</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-blue)', marginTop: '4px' }}>
              ${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SALDO RESTANTE</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: saldoRestante === 0 ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: '4px' }}>
              ${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            type="button"
            onClick={onEdit}
            className="neu-button"
            style={{ flex: 1, padding: '12px', color: 'var(--accent-blue)', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            ✏️ Editar Fiesta
          </button>
          <button
            type="button"
            onClick={onAbonar}
            className="neu-button"
            style={{ flex: 1, padding: '12px', color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            💰 Abonar / Liquidar
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="neu-button"
            style={{ flex: 1, padding: '12px', color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
          >
            📄 Generar PDF
          </button>
        </div>

      </div>
    </div>
  );
};

// Componente para desplegar la lista de eventos de un día
const DayEventsModal = ({ dateLabel, events, onClose, onSelectEvent, getBadgeStyles }) => {
  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', zIndex: 1050, left: 0, top: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div className="neu-box animate-fade-in" style={{ padding: '35px', width: '100%', maxWidth: '500px', maxHeight: '75vh', background: 'var(--bg-color)', borderRadius: '18px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--bg-color)', paddingBottom: '12px' }}>
          <h3 className="text-gradient-blue" style={{ margin: 0, fontSize: '1.35rem' }}>📅 Eventos del Día</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="neu-button"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            Cerrar [X]
          </button>
        </div>

        <p style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
          📅 {dateLabel} ({events.length} {events.length === 1 ? 'fiesta' : 'fiestas'})
        </p>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '5px' }}>
          {events.map((ev) => {
            const badge = getBadgeStyles(ev.paquete);
            const totalAbonado = ev.abonos ? ev.abonos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) : 0;
            const totalEvento = calcularTotalVenta(ev);
            const isLiquidado = totalAbonado > 0 && totalEvento - totalAbonado === 0;

            return (
              <button
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className="neu-box"
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'var(--bg-color)',
                  boxShadow: 'var(--shadow-inset)',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'transform 0.1s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.01)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ 
                    alignSelf: 'flex-start',
                    fontSize: '0.65rem', 
                    padding: '2px 8px', 
                    borderRadius: '8px', 
                    background: badge.bg, 
                    color: badge.color, 
                    border: badge.border,
                    fontWeight: 'bold'
                  }}>
                    {ev.paquete}
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{ev.cliente}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    🏡 Espacio: {ev.espacio && ev.espacio !== 'Sin definir' ? (ev.espacio === 'salon 1' ? 'Salón 1' : ev.espacio === 'salon 2' ? 'Salón 2' : ev.espacio === 'salon 3' ? 'Salón 3' : ev.espacio === 'Cafeteria' ? 'Cafetería' : ev.espacio) : 'Sin asignar'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    padding: '3px 6px', 
                    borderRadius: '8px', 
                    background: isLiquidado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                    color: isLiquidado ? 'var(--accent-success)' : 'var(--accent-danger)',
                    fontWeight: 'bold'
                  }}>
                    {isLiquidado ? 'LIQUIDADO' : 'POR LIQUIDAR'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                    ⏰ {ev.horaLlegada || 'S/H'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Componente de Impresión A4 de Reservación (PDF)
const PDFReservacionPrint = ({ event }) => {
  if (!event) return null;

  const totalBase = (event.precioBaseManual !== undefined && event.precioBaseManual !== null && event.precioBaseManual !== '')
    ? (parseFloat(event.precioBaseManual) || 0)
    : (event.paquete === 'VIP' || event.paquete === 'Platinum' || event.paquete === 'NTP $6299' || event.paquete === 'NTP $6100')
      ? calcularPrecioPaquete(event.paquete, event.saltadores, event.fecha)
      : (parseInt(event.saltadores) || 0) * 350;

  const totalAbonado = event.abonos ? event.abonos.reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0) : 0;
  const totalEvento = calcularTotalVenta(event);
  const saldoRestante = Math.max(0, totalEvento - totalAbonado);
  const diaSemana = getDiaSemanaLabel(event.fecha);

  const formatTimestamp = (ts) => {
    if (!ts) return 'Sin registrar';
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const getEspacioLabel = (esp) => {
    if (!esp || esp === 'Sin definir') return 'Sin definir';
    if (esp === 'salon 1') return 'Salón 1';
    if (esp === 'salon 2') return 'Salón 2';
    if (esp === 'salon 3') return 'Salón 3';
    return esp;
  };

  const subtotal = totalEvento / 1.16;
  const impuestos = totalEvento - subtotal;

  return createPortal(
    <div id="reservationSheetPrint" style={{
      width: '210mm',
      height: '297mm',
      padding: '15mm',
      boxSizing: 'border-box',
      background: 'white',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      lineHeight: '1.4',
      position: 'relative'
    }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <img src="/img/logo2 en png.png" alt="Sky Zone" style={{ height: '75px', objectFit: 'contain' }} />
          <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '2px', textAlign: 'center', width: '130px' }}>
            INDOOR TRAMPOLINE PARK
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9px', lineHeight: '1.2' }}>
          <strong>Skyzone Santa Fe</strong><br />
          Avenida Prolongacion Paseo de la Reforma<br />
          Alvaro Obregon,, Mexico<br />
          P: 5255 5292 4921<br />
          F: 
        </div>
      </div>

      {/* Control Numbers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px dashed black', paddingBottom: '4px', marginBottom: '10px', fontSize: '11px' }}>
        <div>
          Nº de reservacion del evento: <strong style={{ fontFamily: 'monospace' }}>{event.id ? event.id.substring(0, 10).toUpperCase() : 'N/A'}</strong>
        </div>
        <div>
          Fecha del evento: <strong>{formatFecha(event.fecha)}</strong>
        </div>
      </div>

      {/* Box 1: Datos del Cliente */}
      <div style={{ border: '1.5px dashed black', padding: '10px', marginBottom: '10px', borderRadius: '2px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <tbody>
            <tr>
              <td style={{ width: '15%', fontWeight: 'bold', padding: '2px 0' }}>Organización:</td>
              <td style={{ width: '35%', padding: '2px 0' }}>B-Fitness, Skyzone Santa Fe</td>
              <td style={{ width: '15%', fontWeight: 'bold', padding: '2px 0' }}>Teléfono Parque:</td>
              <td style={{ width: '35%', padding: '2px 0' }}>55 5476 5425</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>A nombre de:</td>
              <td style={{ padding: '2px 0' }}>{event.cliente}</td>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Tipo de evento:</td>
              <td style={{ padding: '2px 0' }}>{event.paquete}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Contacto:</td>
              <td style={{ padding: '2px 0' }}>{event.telefono || 'N/A'}</td>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Programado por:</td>
              <td style={{ padding: '2px 0' }}>{event.vendedor || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Correo electrónico:</td>
              <td style={{ padding: '2px 0' }}>{event.email || 'N/A'}</td>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Fecha de reservación:</td>
              <td style={{ padding: '2px 0' }}>{formatTimestamp(event.timestamp)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '2px 0' }}>Dirección:</td>
              <td style={{ padding: '2px 0' }}>{event.codigoPostal || 'N/A'}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Box 2: Horario y Asistentes */}
      <div style={{ border: '1.5px dashed black', padding: '8px 10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', borderRadius: '2px', textAlign: 'center', fontSize: '10px' }}>
        <div style={{ flex: 1, borderRight: '1.5px dashed black' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Fecha del evento</div>
          <div>{formatFecha(event.fecha)}</div>
        </div>
        <div style={{ flex: 1, borderRight: '1.5px dashed black' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Dia</div>
          <div>{diaSemana || 'N/A'}</div>
        </div>
        <div style={{ flex: 1, borderRight: '1.5px dashed black' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Hora del evento</div>
          <div>{event.horaLlegada || 'S/H'}</div>
        </div>
        <div style={{ flex: 1, borderRight: '1.5px dashed black' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Saltadores</div>
          <div>{event.saltadores || 0} saltadores</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Adultos</div>
          <div>{event.adultos || 0}</div>
        </div>
      </div>

      {/* Box 3: Notes & Cronograma */}
      <div style={{ border: '1.5px dashed black', padding: '10px', marginBottom: '10px', borderRadius: '2px', display: 'flex', fontSize: '10px' }}>
        <div style={{ flex: 1.2, borderRight: '1.5px dashed black', paddingRight: '10px' }}>
          <strong style={{ textDecoration: 'underline' }}>Notas:</strong>
          <table style={{ width: '100%', marginTop: '6px', borderCollapse: 'collapse' }}>
            <tbody>
              {event.horaLlegada && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>ENTRADA:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaLlegada}</td>
                </tr>
              )}
              {event.horaAlimentos && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>COMIDA:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaAlimentos}</td>
                </tr>
              )}
              {(() => {
                const arr = Array.isArray(event.pizza) ? event.pizza : (event.pizza && event.pizza !== 'Sin definir' ? [event.pizza] : []);
                return arr.length > 0 ? (
                  <tr>
                    <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>PIZZA:</td>
                    <td style={{ padding: '1px 0' }}>{arr.join(', ')}</td>
                  </tr>
                ) : null;
              })()}
              {(() => {
                const arr = Array.isArray(event.agua) ? event.agua : (event.agua && event.agua !== 'Sin definir' ? [event.agua] : []);
                return arr.length > 0 ? (
                  <tr>
                    <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>AGUA:</td>
                    <td style={{ padding: '1px 0' }}>{arr.join(', ')}</td>
                  </tr>
                ) : null;
              })()}
              {event.horaPinata && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>PIÑATA:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaPinata}</td>
                </tr>
              )}
              {event.pastel && event.pastel !== 'Sin definir' && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>PASTEL:</td>
                  <td style={{ padding: '1px 0' }}>{event.pastel}{event.tamañoPastel ? ` (${event.tamañoPastel})` : ''}</td>
                </tr>
              )}
              {event.horaPastel && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>HORA PASTEL:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaPastel}</td>
                </tr>
              )}
              {event.horaGlow && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>HORA GLOW:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaGlow}</td>
                </tr>
              )}
              {event.cronogramaExtra && event.cronogramaExtra.map((item, idx) => (
                item.concepto && item.hora && (
                  <tr key={idx}>
                    <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>{item.concepto.toUpperCase()}:</td>
                    <td style={{ padding: '1px 0' }}>{item.hora}</td>
                  </tr>
                )
              ))}
              {event.horaSalida && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>SALIDA:</td>
                  <td style={{ padding: '1px 0' }}>{event.horaSalida}</td>
                </tr>
              )}
              {event.decoracionTipo && event.decoracionTipo !== 'No incluye' && (
                <tr>
                  <td style={{ width: '40%', fontWeight: 'bold', padding: '1px 0' }}>DECORACION:</td>
                  <td style={{ padding: '1px 0' }}>
                    {event.decoracionTipo === 'Personalizada' 
                      ? `${event.decoracionConcepto || 'Personalizada'} ($${(parseFloat(event.decoracionMonto) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })})`
                      : (event.decoracionTipo === 'Neon' ? 'Neon' : '')}
                  </td>
                </tr>
              )}
              {event.notasExtra && event.notasExtra.map((nota, idx) => (
                <tr key={idx}>
                  <td colSpan={2} style={{ padding: '1px 0' }}>{nota}</td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
        <div style={{ flex: 0.8, paddingLeft: '15px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-start' }}>
          <div>
            <strong>CUMPLEAÑERO:</strong> {event.festejado || 'N/A'}
          </div>
          <div>
            <strong>SALON:</strong> {getEspacioLabel(event.espacio)}
          </div>
        </div>
      </div>

      {/* Box 4: Articulos Comprados */}
      <div style={{ display: 'flex', justifycontent: 'flex-end', marginBottom: '15px' }}>
        <div style={{ marginLeft: 'auto', border: '1.5px dashed black', padding: '10px', width: '50%', borderRadius: '2px' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px dashed black', paddingBottom: '4px', marginBottom: '6px', fontSize: '10px' }}>
            Articulos Comprados
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px dashed black' }}>
                <th style={{ padding: '2px 0' }}>Cantidad</th>
                <th style={{ padding: '2px 0' }}>Descripcion</th>
                <th style={{ padding: '2px 0', textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>{event.saltadores || 0}</td>
                <td style={{ padding: '3px 0' }}>Paquete {event.paquete}</td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>
                  ${totalBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {event.adultosPaquete1 > 0 && (
                <tr>
                  <td style={{ padding: '3px 0' }}>{event.adultosPaquete1}</td>
                  <td style={{ padding: '3px 0' }}>Paquete 1 Comida Adultos (2 Rebanadas Pizza, Agua, Pastel)</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    ${(event.adultosPaquete1 * 180).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {event.adultosPaquete2 > 0 && (
                <tr>
                  <td style={{ padding: '3px 0' }}>{event.adultosPaquete2}</td>
                  <td style={{ padding: '3px 0' }}>Paquete 2 Comida Adultos (Hamburguesa/Boneless, Agua, Pastel)</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    ${(event.adultosPaquete2 * 220).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {event.adultosPaquete3 && event.adultosPaquete3 !== 'Sin definir' && (
                <tr>
                  <td style={{ padding: '3px 0' }}>{event.adultosPaquete3Qty || 1}</td>
                  <td style={{ padding: '3px 0' }}>Paquete 3 Adultos ({event.adultosPaquete3 === '100 Tacos' ? '100 Tacos de Canasta + 4 Refrescos 2L' : event.adultosPaquete3 === '200 Tacos' ? '200 Tacos de Canasta + 6 Refrescos 2L' : '300 Tacos de Canasta + 6 Refrescos 2L'})</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    ${((event.adultosPaquete3Qty || 1) * (event.adultosPaquete3 === '100 Tacos' ? 1950 : event.adultosPaquete3 === '200 Tacos' ? 2650 : 3350)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {event.decoracionTipo === 'Personalizada' && parseFloat(event.decoracionMonto) > 0 && (
                <tr>
                  <td style={{ padding: '3px 0' }}>1</td>
                  <td style={{ padding: '3px 0' }}>Decoración: {event.decoracionConcepto || 'Personalizada'}</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    ${(parseFloat(event.decoracionMonto) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )}
              {event.pastel && event.pastel !== 'Sin definir' && (() => {
                let precioPastel = 0;
                const pastelGratis = event.paquete === 'VIP' || event.paquete === 'Platinum' || event.paquete === 'Evento Privado';
                if (!pastelGratis) {
                  if (event.tamañoPastel === 'Chico') precioPastel = 699;
                  else if (event.tamañoPastel === 'Grande') precioPastel = 799;
                  else if (event.tamañoPastel === 'Rectangular') precioPastel = 899;
                }

                return precioPastel > 0 ? (
                  <tr>
                    <td style={{ padding: '3px 0' }}>1</td>
                    <td style={{ padding: '3px 0' }}>Pastel: {event.pastel} ({event.tamañoPastel})</td>
                    <td style={{ padding: '3px 0', textAlign: 'right' }}>
                      ${precioPastel.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ) : null;
              })()}
              {event.extras && event.extras.map((ext, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '3px 0' }}>1</td>
                  <td style={{ padding: '3px 0' }}>Extra: {ext.concepto}</td>
                  <td style={{ padding: '3px 0', textAlign: 'right' }}>
                    ${parseFloat(ext.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Box 5: Depositos y Pagos / Total Evento */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        {/* Depositos y pagos */}
        <div style={{ border: '1.5px dashed black', padding: '10px', width: '48%', borderRadius: '2px' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px dashed black', paddingBottom: '4px', marginBottom: '6px', fontSize: '10px' }}>
            Depositos y pagos
          </div>
          {event.abonos && event.abonos.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px dashed black' }}>
                  <th style={{ padding: '2px 0' }}>Recibo Nº</th>
                  <th style={{ padding: '2px 0' }}>Fecha del pago</th>
                  <th style={{ padding: '2px 0', textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {event.abonos.map((ab, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '3px 0', fontFamily: 'monospace' }}>{ab.folio || `R-${idx}`}</td>
                    <td style={{ padding: '3px 0' }}>{ab.fecha}</td>
                    <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 'bold' }}>
                      ${parseFloat(ab.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: '9px', fontStyle: 'italic', textAlign: 'center', padding: '10px 0', color: '#666' }}>
              No se han registrado pagos
            </div>
          )}
        </div>

        {/* Total del evento */}
        <div style={{ border: '1.5px dashed black', padding: '10px', width: '48%', borderRadius: '2px', fontSize: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 0', color: '#333' }}>Subtotal:</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold' }}>
                  ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '2px 0', color: '#333', borderBottom: '1px dashed black' }}>Impuestos:</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px dashed black' }}>
                  ${impuestos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', fontWeight: 'bold' }}>Total del evento:</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>
                  ${totalEvento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#333' }}>Pagos:</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                  ${totalAbonado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer and conformity signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', fontSize: '10px' }}>
        <div style={{ width: '45%', borderTop: '1px dotted black', paddingTop: '6px', textAlign: 'center', fontSize: '9px' }}>
          Firma del cliente / Conformidad
        </div>
        <div style={{ border: '1.5px dashed black', padding: '8px 15px', width: '45%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '2px' }}>
          <strong style={{ fontSize: '11px' }}>Total a pagar</strong>
          <strong style={{ fontSize: '12px' }}>
            ${saldoRestante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Eventos;
