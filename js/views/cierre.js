async function cargarCierre() {
  const fechaInput = document.getElementById('cierreFecha')
  if (!fechaInput.value) {
    fechaInput.value = new Date().toISOString().split('T')[0]
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
