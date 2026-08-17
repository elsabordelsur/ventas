async function cargarHistorial() {
  const fechaInput = document.getElementById('historialFecha')
  const body = document.getElementById('historialBody')
  const resumen = document.getElementById('historialResumen')

  const fecha = fechaInput.value || new Date().toISOString().split('T')[0]

  body.innerHTML = '<div class="loading-indicator">Cargando...</div>'
  resumen.innerHTML = ''

  const inicio = `${fecha}T00:00:00`
  const fin = `${fecha}T23:59:59`

  const { data: ventas, error } = await supabase
    .from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)
    .order('fecha_hora', { ascending: false })

  if (error) {
    body.innerHTML = `<div class="ticket-empty">Error: ${escHtml(error.message)}</div>`
    return
  }

  if (!ventas || ventas.length === 0) {
    body.innerHTML = '<div class="ticket-empty">No hay ventas para esta fecha</div>'
    return
  }

  const ventaIds = ventas.map(v => v.id)
  let allDetalles = []
  for (const vid of ventaIds) {
    const { data: d } = await supabase.from('venta_detalles').select('*').eq('venta_id', vid)
    if (d) allDetalles = allDetalles.concat(d)
  }

  const { data: prodMap } = await supabase.from('productos').select('id, nombre')
  const nombresMap = {}
  if (prodMap) prodMap.forEach(p => { nombresMap[p.id] = p.nombre })

  let html = ''
  for (const v of ventas) {
    const hora = new Date(v.fecha_hora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    const ventaDetalles = allDetalles.filter(d => d.venta_id === v.id)
    const items = ventaDetalles.map(d => `${escHtml(nombresMap[d.producto_id] || '???')} ×${d.cantidad}`).join('')

    const pagos = []
    if (v.pago_usd_efectivo > 0) pagos.push(`$${v.pago_usd_efectivo.toFixed(2)} USD`)
    if (v.pago_bs_efectivo > 0) pagos.push(`Bs. ${fmtBs(v.pago_bs_efectivo)}`)
    if (v.pago_pagomovil > 0) pagos.push(`Móvil: Bs. ${fmtBs(v.pago_pagomovil)}`)
    if (v.pago_punto > 0) pagos.push(`Punto: Bs. ${fmtBs(v.pago_punto)}`)

    const pagosHtml = pagos.length > 0
      ? `<div class="historial-item-pagos">${pagos.map(p => `<span>${escHtml(p)}</span>`).join('')}</div>`
      : ''

    const vueltos = v.vuelto_bs_entregado > 0 ? `<span>Vuelto: Bs. ${fmtBs(v.vuelto_bs_entregado)}</span>` : ''

    const isAnulada = v.anulada
    const anuladaBadge = isAnulada ? '<span class="historial-badge-anulada">ANULADA</span>' : ''
    const motivoLine = isAnulada && v.motivo_anulacion ? `<div class="historial-item-motivo">Motivo: ${escHtml(v.motivo_anulacion)}</div>` : ''
    const anularBtn = !isAnulada ? `<button class="historial-anular-btn" onclick="anularVenta('${v.id}')">Anular</button>` : ''

    html += `
      <div class="historial-item${isAnulada ? ' anulada' : ''}">
        <div class="historial-item-header">
          <div>
            <div class="historial-item-hora">${hora} ${anuladaBadge}</div>
            <div class="historial-item-id">#${v.id}</div>
          </div>
          <div class="historial-item-actions">
            <div class="historial-item-total">$${v.total_usd.toFixed(2)}</div>
            ${anularBtn}
          </div>
        </div>
        <div class="historial-item-detalles">
          ${items || '<span>Sin detalles</span>'}
          ${vueltos ? `<span>${vueltos}</span>` : ''}
        </div>
        ${motivoLine}
        ${pagosHtml}
      </div>`
  }
  body.innerHTML = html
  parseEmoji(body)

  const activas = ventas.filter(v => !v.anulada)
  const totalUsd = activas.reduce((s, v) => s + (+v.total_usd || 0), 0)
  const totalBs = activas.reduce((s, v) => s + (+v.total_bs_cobrado || 0), 0)
  const totalVueltos = activas.reduce((s, v) => s + (+v.vuelto_bs_entregado || 0), 0)
  const totalRedondeo = activas.reduce((s, v) => s + (+v.ajuste_redondeo_bs || 0), 0)
  const anuladas = ventas.filter(v => v.anulada).length

  resumen.innerHTML = `
    <div class="historial-resumen">
      <div class="historial-resumen-line total">
        <span>Total USD</span><span>$${totalUsd.toFixed(2)}</span>
      </div>
      <div class="historial-resumen-line">
        <span>Total Bs. Cobrado</span><span>Bs. ${fmtBs(totalBs)}</span>
      </div>
      <div class="historial-resumen-line">
        <span>Vueltos Entregados</span><span>Bs. ${fmtBs(totalVueltos)}</span>
      </div>
      <div class="historial-resumen-line">
        <span>Ajuste Redondeo</span><span>Bs. ${fmtBs(totalRedondeo)}</span>
      </div>
      <div class="historial-resumen-line total">
        <span>Ventas</span><span>${activas.length}${anuladas > 0 ? ` (${anuladas} anulada${anuladas > 1 ? 's' : ''})` : ''}</span>
      </div>
    </div>`
}

async function anularVenta(ventaId) {
  const motivo = prompt('Motivo de anulación:')
  if (motivo === null || !motivo.trim()) return
  if (!confirm('¿Anular esta venta? Se revertirá el inventario.')) return

  const { data: detalles } = await supabase.from('venta_detalles')
    .select('producto_id, cantidad')
    .eq('venta_id', ventaId)

  if (detalles) {
    for (const d of detalles) {
      const { data: prod } = await supabase.from('productos')
        .select('stock, maneja_inventario')
        .eq('id', d.producto_id)
        .single()
      if (prod && prod.maneja_inventario) {
        await supabase.from('productos')
          .update({ stock: (prod.stock || 0) + d.cantidad })
          .eq('id', d.producto_id)
      }
    }
  }

  const { error } = await supabase.from('ventas')
    .update({
      anulada: true,
      motivo_anulacion: motivo.trim(),
      anulada_at: new Date().toISOString()
    })
    .eq('id', ventaId)

  if (error) {
    alert('Error al anular: ' + error.message)
    return
  }

  cargarHistorial()
}
