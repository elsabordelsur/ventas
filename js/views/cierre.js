async function cargarCierre() {
  const fechaInput = document.getElementById('cierreFecha')
  if (!fechaInput.value) {
    const d = new Date()
    fechaInput.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }

  const fecha = fechaInput.value
  const inicio = new Date(fecha + 'T00:00:00-04:00').toISOString()
  const fin = new Date(fecha + 'T23:59:59-04:00').toISOString()

  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)

  if (error) {
    console.error('Error al cargar cierre:', error)
    return
  }

  const { data: cierreExistente } = await supabase
    .from('cierres')
    .select('id')
    .eq('fecha', fecha)
    .maybeSingle()

  const statusEl = document.getElementById('cierreStatus')
  const btn = document.getElementById('btnCerrarDia')
  const yaCerrado = !!cierreExistente

  if (yaCerrado) {
    statusEl.textContent = '✓ Día ya cerrado'
    statusEl.style.color = 'var(--green)'
    btn.textContent = 'Día Cerrado'
    btn.disabled = true
  } else {
    statusEl.textContent = data && data.length > 0 ? `${data.length} ventas registradas` : 'Sin ventas'
    statusEl.style.color = data && data.length > 0 ? 'var(--text)' : 'var(--text-dim)'
    btn.textContent = 'Cerrar Día'
    btn.disabled = false
  }

  if (!data || data.length === 0) {
    document.getElementById('cierreTotalUsd').textContent = '$0.00'
    document.getElementById('cierreEfectivoUsd').textContent = '$0.00'
    document.getElementById('cierreEfectivoBs').textContent = 'Bs. 0.00'
    document.getElementById('cierrePagoMovil').textContent = 'Bs. 0.00'
    document.getElementById('cierrePunto').textContent = 'Bs. 0.00'
    document.getElementById('cierreVueltos').textContent = 'Bs. 0.00'
    document.getElementById('cierreRedondeo').textContent = 'Bs. 0.00'
    document.getElementById('cierreTotalBs').textContent = 'Bs. 0.00'
    return
  }

  const totalUsd = data.reduce((s, v) => s + +v.total_usd, 0)
  const efectivoUsd = data.reduce((s, v) => s + +v.pago_usd_efectivo, 0)
  const efectivoBs = data.reduce((s, v) => s + +v.pago_bs_efectivo, 0)
  const pagoMovil = data.reduce((s, v) => s + +v.pago_pagomovil, 0)
  const punto = data.reduce((s, v) => s + +v.pago_punto, 0)
  const vueltos = data.reduce((s, v) => s + +v.vuelto_bs_entregado, 0)
  const redondeo = data.reduce((s, v) => s + +v.ajuste_redondeo_bs, 0)
  const totalBs = data.reduce((s, v) => s + +v.total_bs_cobrado, 0)

  document.getElementById('cierreTotalUsd').textContent = `$${totalUsd.toFixed(2)}`
  document.getElementById('cierreEfectivoUsd').textContent = `$${efectivoUsd.toFixed(2)}`
  document.getElementById('cierreEfectivoBs').textContent = `Bs. ${efectivoBs.toFixed(2)}`
  document.getElementById('cierrePagoMovil').textContent = `Bs. ${pagoMovil.toFixed(2)}`
  document.getElementById('cierrePunto').textContent = `Bs. ${punto.toFixed(2)}`
  document.getElementById('cierreVueltos').textContent = `Bs. ${vueltos.toFixed(2)}`
  document.getElementById('cierreRedondeo').textContent = `Bs. ${redondeo.toFixed(2)}`
  document.getElementById('cierreTotalBs').textContent = `Bs. ${totalBs.toFixed(2)}`
}

async function cerrarDia() {
  const btn = document.getElementById('btnCerrarDia')
  if (btn.disabled) return
  const fecha = document.getElementById('cierreFecha').value
  const d = new Date()
  const hoy = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

  if (fecha !== hoy) {
    alert('Solo se puede cerrar el día de hoy')
    return
  }

  if (!confirm('¿Cerrar el día ' + fecha + '? Esto guardará las ventas en el histórico.')) return

  btn.textContent = 'Guardando...'
  btn.disabled = true

  const inicio = new Date(fecha + 'T00:00:00-04:00').toISOString()
  const fin = new Date(fecha + 'T23:59:59-04:00').toISOString()

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*')
    .gte('fecha_hora', inicio)
    .lte('fecha_hora', fin)

  if (!ventas || ventas.length === 0) {
    alert('No hay ventas en esta fecha')
    btn.textContent = 'Cerrar Día'
    btn.disabled = false
    return
  }

  const totalUsd = ventas.reduce((s, v) => s + +v.total_usd, 0)
  const efectivoUsd = ventas.reduce((s, v) => s + +v.pago_usd_efectivo, 0)
  const efectivoBs = ventas.reduce((s, v) => s + +v.pago_bs_efectivo, 0)
  const pagoMovil = ventas.reduce((s, v) => s + +v.pago_pagomovil, 0)
  const punto = ventas.reduce((s, v) => s + +v.pago_punto, 0)
  const vueltos = ventas.reduce((s, v) => s + +v.vuelto_bs_entregado, 0)
  const redondeo = ventas.reduce((s, v) => s + +v.ajuste_redondeo_bs, 0)
  const totalBs = ventas.reduce((s, v) => s + +v.total_bs_cobrado, 0)

  const { error } = await supabase.from('cierres').insert({
    fecha,
    total_ventas_usd: +totalUsd.toFixed(2),
    efectivo_usd: +efectivoUsd.toFixed(2),
    efectivo_bs: +efectivoBs.toFixed(2),
    pagomovil: +pagoMovil.toFixed(2),
    punto: +punto.toFixed(2),
    vueltos_bs: +vueltos.toFixed(2),
    ajuste_redondeo_bs: +redondeo.toFixed(2),
    total_bs_cobrado: +totalBs.toFixed(2)
  })

  if (error) {
    if (error.message && error.message.includes('unique')) {
      alert('Este día ya fue cerrado anteriormente')
    } else {
      alert('Error al cerrar día: ' + (error.message || 'desconocido'))
    }
    btn.textContent = 'Cerrar Día'
    btn.disabled = false
    return
  }

  btn.textContent = '✓ Día Cerrado'
  document.getElementById('cierreStatus').textContent = '✓ Día cerrado exitosamente'
  document.getElementById('cierreStatus').style.color = 'var(--green)'
  alert('Día cerrado exitosamente')
}