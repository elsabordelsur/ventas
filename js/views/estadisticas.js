let estadisticasData = []
let chartHorasInstance = null

async function cargarEstadisticas() {
  const container = document.getElementById('estadisticasBody')

  const { data: cierres, error } = await supabase
    .from('cierres')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(90)

  if (error) {
    container.innerHTML = '<div class="ticket-empty">Error al cargar estadísticas</div>'
    return
  }

  estadisticasData = cierres || []

  const hoy = new Date().toISOString().split('T')[0]

  const { data: topProds } = await supabase.from('venta_detalles')
    .select('producto_id, cantidad, subtotal_usd, productos(nombre)')
    .gte('created_at', hoy + 'T00:00:00')
    .lte('created_at', hoy + 'T23:59:59')

  const { data: ventasHoy } = await supabase.from('ventas')
    .select('fecha_hora, total_usd, anulada')
    .gte('fecha_hora', hoy + 'T00:00:00')
    .lte('fecha_hora', hoy + 'T23:59:59')

  let html = ''

  if (ventasHoy && ventasHoy.length > 0) {
    const activas = ventasHoy.filter(v => !v.anulada)
    const mapaHora = {}
    for (let h = 6; h <= 22; h++) mapaHora[h] = 0
    for (const v of activas) {
      const h = new Date(v.fecha_hora).getHours()
      if (h >= 6 && h <= 22) mapaHora[h] += +v.total_usd || 0
    }
    const labels = Object.keys(mapaHora).map(h => h + ':00')
    const values = Object.values(mapaHora)

    html += `<div class="est-chart-section">
      <h3>Ventas por Hora — Hoy</h3>
      <div class="est-chart-wrap"><canvas id="chartHoras"></canvas></div>
    </div>`

    container.innerHTML = html

    if (typeof Chart !== 'undefined') {
      if (chartHorasInstance) chartHorasInstance.destroy()
      const ctx = document.getElementById('chartHoras')
      if (ctx) {
        chartHorasInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Ventas USD',
              data: values,
              backgroundColor: 'rgba(34,165,90,0.6)',
              borderColor: 'rgba(34,165,90,1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
            }
          }
        })
      }
    }
  }

  if (topProds && topProds.length > 0) {
    const map = {}
    for (const d of topProds) {
      const pid = d.producto_id
      if (!map[pid]) map[pid] = { nombre: d.productos?.nombre || '???', cantidad: 0, total: 0 }
      map[pid].cantidad += d.cantidad
      map[pid].total += +d.subtotal_usd || 0
    }
    const top = Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
    const maxCant = top[0]?.cantidad || 1

    html += `<div class="est-top-section">
      <h3>Top Productos Hoy</h3>
      <div class="est-top-list">`
    for (const p of top) {
      const pct = Math.round((p.cantidad / maxCant) * 100)
      html += `<div class="est-top-item">
        <div class="est-top-name">${escHtml(p.nombre)}</div>
        <div class="est-top-bar-wrap"><div class="est-top-bar" style="width:${pct}%"></div></div>
        <div class="est-top-cant">${p.cantidad} uds</div>
        <div class="est-top-total">$${p.total.toFixed(2)}</div>
      </div>`
    }
    html += `</div></div>`
  }

  if (!html) {
    container.innerHTML = '<div class="ticket-empty">No hay datos de hoy</div>'
    return
  }
  container.innerHTML = html

  let cierresHtml = `<div class="est-cierres-section"><h3>Cierres Anteriores</h3>`
  if (estadisticasData.length === 0) {
    cierresHtml += '<div class="ticket-empty">No hay cierres registrados</div>'
  } else {
    cierresHtml += estadisticasData.map(c => {
      const fecha = new Date(c.fecha + 'T12:00:00')
      const fechaStr = fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
      return `<div class="est-item">
        <div class="est-item-header">
          <span class="est-item-fecha">${fechaStr}</span>
          <span class="est-item-total">$${(+c.total_ventas_usd).toFixed(2)}</span>
        </div>
        <div class="est-item-detalles">
          <span>USD ef: $${(+c.efectivo_usd).toFixed(2)}</span>
          <span>Bs ef: Bs. ${fmtBs(+c.efectivo_bs)}</span>
          <span>PM: Bs. ${fmtBs(+c.pagomovil)}</span>
          <span>Pto: Bs. ${fmtBs(+c.punto)}</span>
        </div>
        <div class="est-item-totales">
          <span>Total Bs: Bs. ${fmtBs(+c.total_bs_cobrado)}</span>
          <span>Vuelto: Bs. ${fmtBs(+c.vueltos_bs)}</span>
        </div>
      </div>`
    }).join('')
  }
  cierresHtml += '</div>'
  container.innerHTML += cierresHtml
}
