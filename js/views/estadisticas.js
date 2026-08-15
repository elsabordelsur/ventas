let estadisticasData = []

async function cargarEstadisticas() {
  const { data, error } = await supabase
    .from('cierres')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(90)

  if (error) {
    document.getElementById('estadisticasBody').innerHTML = '<div class="ticket-empty">Error al cargar estadísticas</div>'
    return
  }

  estadisticasData = data || []
  renderEstadisticas()
}

function renderEstadisticas() {
  const container = document.getElementById('estadisticasBody')

  if (estadisticasData.length === 0) {
    container.innerHTML = '<div class="ticket-empty">No hay cierres registrados todavía</div>'
    return
  }

  container.innerHTML = estadisticasData.map(c => {
    const fecha = new Date(c.fecha + 'T12:00:00')
    const fechaStr = fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    return `<div class="est-item">
      <div class="est-item-header">
        <span class="est-item-fecha">${fechaStr}</span>
        <span class="est-item-total">$${(+c.total_ventas_usd).toFixed(2)}</span>
      </div>
      <div class="est-item-detalles">
        <span>USD ef: $${(+c.efectivo_usd).toFixed(2)}</span>
        <span>Bs ef: Bs. ${(+c.efectivo_bs).toFixed(2)}</span>
        <span>PM: Bs. ${(+c.pagomovil).toFixed(2)}</span>
        <span>Pto: Bs. ${(+c.punto).toFixed(2)}</span>
      </div>
      <div class="est-item-totales">
        <span>Total Bs: Bs. ${(+c.total_bs_cobrado).toFixed(2)}</span>
        <span>Vuelto: Bs. ${(+c.vueltos_bs).toFixed(2)}</span>
      </div>
    </div>`
  }).join('')
}

