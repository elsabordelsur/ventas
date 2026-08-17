async function cargarResumen() {
  const fechaInput = document.getElementById('resumenFecha')
  if (!fechaInput.value) fechaInput.value = new Date().toISOString().split('T')[0]
  const fecha = fechaInput.value

  const inicio = fecha + 'T00:00:00'
  const fin = fecha + 'T23:59:59'

  const { data: ventas } = await supabase.from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)
    .order('fecha_hora', { ascending: false })

  const container = document.getElementById('resumenBody')
  if (!ventas || ventas.length === 0) {
    container.innerHTML = '<div class="ticket-empty">No hay ventas registradas para esta fecha</div>'
    return
  }

  const activas = ventas.filter(v => !v.anulada)
  const totalVentas = activas.length
  const totalUsd = activas.reduce((s, v) => s + (+v.total_usd || 0), 0)
  const totalBsCobrado = activas.reduce((s, v) => s + (+v.total_bs_cobrado || 0), 0)
  const efectivoUsd = activas.reduce((s, v) => s + (+v.pago_usd_efectivo || 0), 0)
  const efectivoBs = activas.reduce((s, v) => s + (+v.pago_bs_efectivo || 0), 0)
  const pagoMovil = activas.reduce((s, v) => s + (+v.pago_pagomovil || 0), 0)
  const punto = activas.reduce((s, v) => s + (+v.pago_punto || 0), 0)
  const vueltos = activas.reduce((s, v) => s + (+v.vuelto_bs_entregado || 0), 0)
  const ticketsAnulados = ventas.filter(v => v.anulada).length

  let html = `
    <div class="resumen-grid">
      <div class="resumen-card highlight">
        <div class="resumen-label">Ventas Totales</div>
        <div class="resumen-valor">${totalVentas} ticket${totalVentas !== 1 ? 's' : ''}</div>
      </div>
      <div class="resumen-card highlight">
        <div class="resumen-label">Ingresos USD</div>
        <div class="resumen-valor">$${totalUsd.toFixed(2)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">Efectivo USD</div>
        <div class="resumen-valor">$${efectivoUsd.toFixed(2)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">Efectivo Bs.</div>
        <div class="resumen-valor">Bs. ${fmtBs(efectivoBs)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">PagoMóvil</div>
        <div class="resumen-valor">Bs. ${fmtBs(pagoMovil)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">Punto de Venta</div>
        <div class="resumen-valor">Bs. ${fmtBs(punto)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">Vueltos Entregados</div>
        <div class="resumen-valor">Bs. ${fmtBs(vueltos)}</div>
      </div>
      <div class="resumen-card">
        <div class="resumen-label">Total Bs. Cobrado</div>
        <div class="resumen-valor">Bs. ${fmtBs(totalBsCobrado)}</div>
      </div>`

  if (ticketsAnulados > 0) {
    html += `
      <div class="resumen-card anulada">
        <div class="resumen-label">Anulados</div>
        <div class="resumen-valor">${ticketsAnulados} ticket${ticketsAnulados !== 1 ? 's' : ''}</div>
      </div>`
  }

  html += `</div>`

  const { data: detalles } = await supabase.from('venta_detalles')
    .select('producto_id, cantidad, subtotal_usd, productos(nombre)')
    .gte('created_at', inicio)
    .lte('created_at', fin)

  if (detalles && detalles.length > 0) {
    const prodMap = {}
    for (const d of detalles) {
      const pid = d.producto_id
      if (!prodMap[pid]) prodMap[pid] = { nombre: d.productos?.nombre || 'Producto', cantidad: 0, total: 0 }
      prodMap[pid].cantidad += d.cantidad
      prodMap[pid].total += +d.subtotal_usd || 0
    }
    const topProds = Object.values(prodMap).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5)
    html += `<h3 style="margin-top:16px;font-size:13px;color:var(--text-secondary)">Top Productos</h3>
      <div class="resumen-top-prods">`
    for (const p of topProds) {
      html += `<div class="resumen-prod-item">
        <span class="resumen-prod-name">${escHtml(p.nombre)}</span>
        <span class="resumen-prod-cant">${p.cantidad} uds</span>
        <span class="resumen-prod-total">$${p.total.toFixed(2)}</span>
      </div>`
    }
    html += `</div>`
  }

  container.innerHTML = html
  parseEmoji(container)
}
