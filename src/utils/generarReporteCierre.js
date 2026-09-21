import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Genera un reporte PDF detallado para el cierre de caja.
 * @param {string} areaName - Nombre del área (Taquilla, Cafeteria, Eventos).
 * @param {Array} ventas - Lista de todas las ventas del día para el área.
 * @param {Object} totales - Totales calculados (efectivo, debito, credito, transferencia, totalGeneral).
 * @param {Object} resumenCierre - Información del conteo físico (saldoReal, diferencia, desgloseBilletes).
 */
export const generarReporteCierre = (areaName, ventas, totales, resumenCierre) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('es-MX');

  // Colores corporativos
  const blueColor = [0, 82, 204]; // #0052cc

  // ================= ENCABEZADO =================
  doc.setFontSize(22);
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.text(`Corte de Caja - ${areaName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado el: ${dateStr} a las ${timeStr}`, 14, 28);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(14, 32, 196, 32);

  // ================= RESUMEN DE VENTAS (SISTEMA) =================
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("1. Resumen de Ventas (Según Sistema)", 14, 42);
  
  doc.setFont("helvetica", "normal");
  const sysY = 50;
  doc.text(`Efectivo: $${totales.ef.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, sysY);
  doc.text(`Débito: $${totales.deb.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, sysY + 6);
  doc.text(`Crédito: $${totales.cred.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, sysY + 12);
  doc.text(`Transferencia: $${totales.trans.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, sysY + 18);
  
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL DEL DÍA: $${totales.totalGeneral.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 20, sysY + 28);

  // ================= RESULTADO DEL CONTEO (EFECTIVO) =================
  doc.text("2. Resultado del Conteo Físico (Efectivo)", 110, 42);
  
  doc.setFont("helvetica", "normal");
  doc.text(`Fondo Contado (Real): $${resumenCierre.saldoReal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 115, sysY);
  doc.text(`Esperado (Sistema): $${totales.ef.toLocaleString('es-MX', {minimumFractionDigits: 2})}`, 115, sysY + 6);
  
  // Color condicional para diferencia
  const dif = resumenCierre.diferencia;
  if (dif === 0) {
    doc.setTextColor(0, 128, 0);
  } else if (dif < 0) {
    doc.setTextColor(200, 0, 0);
  } else {
    doc.setTextColor(0, 0, 200);
  }
  doc.setFont("helvetica", "bold");
  const difText = dif === 0 ? "Sin Diferencia (Cuadra exacto)" : (dif > 0 ? `Sobrante: +$${Math.abs(dif).toLocaleString('es-MX', {minimumFractionDigits: 2})}` : `Faltante: -$${Math.abs(dif).toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
  doc.text(`Diferencia: ${difText}`, 115, sysY + 14);
  
  // ================= DESGLOSE DE BILLETES =================
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text("Desglose de Efectivo Contado:", 115, sysY + 24);
  doc.setFont("helvetica", "normal");
  let desgloseText = "";
  const b = resumenCierre.desgloseBilletes;
  if (b.b1000) desgloseText += `$1000 x${b.b1000} | `;
  if (b.b500) desgloseText += `$500 x${b.b500} | `;
  if (b.b200) desgloseText += `$200 x${b.b200} | `;
  if (b.b100) desgloseText += `$100 x${b.b100} | `;
  if (b.b50) desgloseText += `$50 x${b.b50} | `;
  if (b.b20) desgloseText += `$20 x${b.b20} | `;
  if (b.m10) desgloseText += `$10(m) x${b.m10} | `;
  
  // Dividir texto largo
  const splitDesglose = doc.splitTextToSize(desgloseText, 80);
  doc.setFontSize(8);
  doc.text(splitDesglose, 115, sysY + 29);

  // ================= TABLA DE VENTAS =================
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("3. Desglose de Ventas Individuales", 14, 90);
  
  const tableData = ventas.map((v, i) => {
    const time = new Date(v.timestamp).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
    let metodos = [];
    if (v.pagoEfectivo) metodos.push(`Ef($${v.pagoEfectivo})`);
    if (v.pagoDebito) metodos.push(`Deb($${v.pagoDebito})`);
    if (v.pagoCredito) metodos.push(`Cre($${v.pagoCredito})`);
    if (v.pagoTransferencia) metodos.push(`Trans($${v.pagoTransferencia})`);
    
    // Fallback if none defined
    if (metodos.length === 0) metodos.push(v.metodoPago || 'No especificado');

    return [
      i + 1,
      time,
      v.cajero || 'N/A',
      metodos.join(", "),
      `$${parseFloat(v.total || v.Total || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`
    ];
  });

  doc.autoTable({
    startY: 95,
    head: [['#', 'Hora', 'Cajero', 'Métodos de Pago', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: blueColor },
    styles: { fontSize: 9 },
  });

  // Guardar archivo
  const safeDate = new Date().toISOString().split('T')[0];
  doc.save(`Corte_Caja_${areaName}_${safeDate}.pdf`);
};
