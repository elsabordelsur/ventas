async function exportCSV(fecha) {
  if (!fecha) { alert('Selecciona una fecha'); return }
  const inicio = fecha + 'T00:00:00'
  const fin = fecha + 'T23:59:59'

  const { data: ventas } = await supabase.from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)
    .order('fecha_hora')

  if (!ventas || ventas.length === 0) {
    alert('No hay ventas para esta fecha')
    return
  }

  const rows = [['ID', 'Fecha', 'Total USD', 'Total BS', 'Pago USD', 'Pago BS', 'PagoMóvil', 'Punto', 'Vuelto', 'Anulada', 'Motivo']]
  for (const v of ventas) {
    rows.push([
      v.id,
      new Date(v.fecha_hora).toLocaleString('es-VE'),
      (+v.total_usd).toFixed(2),
      (+v.total_bs_cobrado).toFixed(2),
      (+v.pago_usd_efectivo).toFixed(2),
      (+v.pago_bs_efectivo).toFixed(2),
      (+v.pago_pagomovil).toFixed(2),
      (+v.pago_punto).toFixed(2),
      (+v.vuelto_bs_entregado).toFixed(2),
      v.anulada ? 'SI' : 'NO',
      v.motivo_anulacion || ''
    ])
  }

  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  descargarArchivo(`ventas_${fecha}.csv`, csv, 'text/csv;charset=utf-8')
}

function descargarArchivo(nombre, contenido, tipo) {
  const blob = new Blob(['\uFEFF' + contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function exportPDF(fecha) {
  if (!fecha) { alert('Selecciona una fecha'); return }
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    alert('jsPDF no cargado. Verifica conexión a internet.')
    return
  }

  const inicio = fecha + 'T00:00:00'
  const fin = fecha + 'T23:59:59'

  const { data: ventas } = await supabase.from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)
    .order('fecha_hora')

  if (!ventas || ventas.length === 0) {
    alert('No hay ventas para esta fecha')
    return
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(18)
  doc.text('El Sabor Del Sur', 14, 15)
  doc.setFontSize(11)
  doc.text(`Reporte de Ventas — ${fecha}`, 14, 22)

  const activas = ventas.filter(v => !v.anulada)
  const totalUsd = activas.reduce((s, v) => s + (+v.total_usd || 0), 0)
  const totalBs = activas.reduce((s, v) => s + (+v.total_bs_cobrado || 0), 0)

  doc.setFontSize(10)
  doc.text(`Total ventas: ${activas.length} | Total USD: $${totalUsd.toFixed(2)} | Total Bs: Bs. ${fmtBs(totalBs)}`, 14, 29)

  const rows = ventas.map(v => [
    v.id ? v.id.substring(0, 8) : '',
    new Date(v.fecha_hora).toLocaleString('es-VE'),
    '$' + (+v.total_usd).toFixed(2),
    'Bs. ' + fmtBs(+v.total_bs_cobrado),
    '$' + (+v.pago_usd_efectivo).toFixed(2),
    'Bs. ' + fmtBs(+v.pago_bs_efectivo),
    'Bs. ' + fmtBs(+v.pago_pagomovil),
    'Bs. ' + fmtBs(+v.pago_punto),
    v.anulada ? 'ANULADA' : 'OK'
  ])

  doc.autoTable({
    startY: 33,
    head: [['ID', 'Fecha', 'Total USD', 'Total BS', 'Efect $', 'Efect Bs', 'PM', 'Punto', 'Estado']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26, 39, 68] },
    alternateRowStyles: { fillColor: [245, 245, 247] }
  })

  doc.save(`reporte_${fecha}.pdf`)
}
