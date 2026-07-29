let categorias = []
let productos = []
let ticket = []
let tasaBcvActual = 0

async function cargarTasa() {
  const { data } = await supabase.from('configuracion').select('tasa_bcv').eq('id', 1).single()
  if (data) tasaBcvActual = data.tasa_bcv
}

async function cargarCategorias() {
  const { data } = await supabase.from('categorias').select('*').eq('activa', true).order('id')
  if (data) categorias = data
}

async function cargarProductos() {
  const { data } = await supabase.from('productos').select('*').eq('activo', true).order('id')
  if (data) productos = data
}

function renderCategoriaTabs() {
  const container = document.getElementById('categoriaTabs')
  container.innerHTML = categorias.map((c, i) =>
    `<button class="categoria-tab${i === 0 ? ' active' : ''}" data-cat-id="${c.id}" onclick="filtrarPorCategoria(${c.id}, this)">${c.nombre}</button>`
  ).join('')
  if (categorias.length > 0) filtrarPorCategoria(categorias[0].id, container.querySelector('.categoria-tab'))
}

function filtrarPorCategoria(catId, btn) {
  document.querySelectorAll('.categoria-tab').forEach(t => t.classList.remove('active'))
  if (btn) btn.classList.add('active')
  const filtrados = productos.filter(p => p.categoria_id === catId)
  renderProductos(filtrados)
}

function renderProductos(lista) {
  const grid = document.getElementById('productosGrid')
  if (lista.length === 0) {
    grid.innerHTML = '<div class="ticket-empty">Sin productos en esta categoría</div>'
    return
  }
  grid.innerHTML = lista.map(p =>
    `<button class="producto-btn" onclick="agregarAlTicket(${p.id}, '${p.nombre.replace(/'/g, "\\'")}', ${p.precio_usd})">
      <span class="producto-nombre">${p.nombre}</span>
      <span class="producto-precio">$${p.precio_usd.toFixed(2)}</span>
    </button>`
  ).join('')
}

function agregarAlTicket(id, nombre, precio) {
  const existente = ticket.find(t => t.id === id)
  if (existente) {
    existente.cantidad++
  } else {
    ticket.push({ id, nombre, precio, cantidad: 1 })
  }
  renderTicket()
}

function renderTicket() {
  const container = document.getElementById('ticketItems')
  const count = document.getElementById('itemCount')

  count.textContent = ticket.reduce((s, t) => s + t.cantidad, 0)

  if (ticket.length === 0) {
    container.innerHTML = '<div class="ticket-empty">Agrega productos al ticket</div>'
    actualizarTotales()
    return
  }

  container.innerHTML = ticket.map((t, i) =>
    `<div class="ticket-item">
      <div class="ticket-item-info">
        <div class="ticket-item-nombre">${t.nombre}</div>
        <div class="ticket-item-precio">$${t.precio.toFixed(2)}</div>
      </div>
      <div class="ticket-item-cantidad">
        <button onclick="cambiarCantidad(${i}, -1)">−</button>
        <span>${t.cantidad}</span>
        <button onclick="cambiarCantidad(${i}, 1)">+</button>
      </div>
      <div class="ticket-item-subtotal">$${(t.precio * t.cantidad).toFixed(2)}</div>
      <button class="ticket-item-remove" onclick="eliminarDelTicket(${i})">✕</button>
    </div>`
  ).join('')

  actualizarTotales()
}

function cambiarCantidad(index, delta) {
  ticket[index].cantidad += delta
  if (ticket[index].cantidad <= 0) ticket.splice(index, 1)
  renderTicket()
}

function eliminarDelTicket(index) {
  ticket.splice(index, 1)
  renderTicket()
}

function actualizarTotales() {
  const totalUsd = ticket.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const totalBsExacto = calcularTotalBs(totalUsd, tasaBcvActual)
  const totalBsEfectivo = calcularRedondeoEfectivo(totalBsExacto)

  document.getElementById('totalUsd').textContent = `$${totalUsd.toFixed(2)}`
  document.getElementById('totalBsDigital').textContent = `Bs. ${totalBsExacto.toFixed(2)}`
  document.getElementById('totalBsEfectivo').textContent = `Bs. ${totalBsEfectivo.toFixed(2)}`
}

function abrirCheckout() {
  if (ticket.length === 0) return
  const totalUsd = ticket.reduce((s, t) => s + t.precio * t.cantidad, 0)
  document.getElementById('checkTotalUsd').textContent = `$${totalUsd.toFixed(2)}`
  document.getElementById('checkTotalBsExacto').textContent = `Bs. ${calcularTotalBs(totalUsd, tasaBcvActual).toFixed(2)}`
  document.getElementById('checkTotalBsEfectivo').textContent = `Bs. ${calcularRedondeoEfectivo(calcularTotalBs(totalUsd, tasaBcvActual))}`

  document.getElementById('pagoUsd').value = '0'
  document.getElementById('pagoBs').value = '0'
  document.getElementById('pagoPagoMovil').value = '0'
  document.getElementById('pagoPunto').value = '0'

  document.getElementById('modalCheckout').style.display = 'flex'
  calcularCheckoutUI()
}

function cerrarCheckout() {
  document.getElementById('modalCheckout').style.display = 'none'
}

function calcularCheckoutUI() {
  const totalUsd = ticket.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const pagos = {
    usd: +document.getElementById('pagoUsd').value || 0,
    bs: +document.getElementById('pagoBs').value || 0,
    pagoMovil: +document.getElementById('pagoPagoMovil').value || 0,
    punto: +document.getElementById('pagoPunto').value || 0
  }

  const result = calcularCheckout(totalUsd, tasaBcvActual, pagos)

  document.getElementById('checkFaltante').textContent = `Faltante: Bs. ${result.faltante.toFixed(2)}`
  document.getElementById('checkFaltante').style.color = result.faltante > 0 ? 'var(--danger)' : 'var(--success)'
  document.getElementById('checkVuelto').textContent = `Vuelto Bs.: Bs. ${result.vueltoBs.toFixed(2)}`
  document.getElementById('checkRedondeo').textContent = `Ajuste redondeo: Bs. ${result.ajusteRedondeo.toFixed(2)}`

  const btn = document.getElementById('btnProcesar')
  btn.disabled = !result.puedeProcesar
  btn.style.opacity = result.puedeProcesar ? '1' : '0.5'
}

async function procesarVenta() {
  const btn = document.getElementById('btnProcesar')
  if (btn.disabled) return
  btn.textContent = 'Procesando...'
  btn.disabled = true

  const totalUsd = ticket.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const pagos = {
    usd: +document.getElementById('pagoUsd').value || 0,
    bs: +document.getElementById('pagoBs').value || 0,
    pagoMovil: +document.getElementById('pagoPagoMovil').value || 0,
    punto: +document.getElementById('pagoPunto').value || 0
  }

  const result = calcularCheckout(totalUsd, tasaBcvActual, pagos)

  const { data: venta, error } = await supabase.from('ventas').insert({
    total_usd: +totalUsd.toFixed(2),
    tasa_bcv_aplicada: tasaBcvActual,
    total_bs_teorico: result.totalBsExacto,
    total_bs_cobrado: result.puedeProcesar ? (pagos.bs > 0 || pagos.usd > 0 ? result.totalBsEfectivo : result.totalBsExacto) : 0,
    pago_usd_efectivo: pagos.usd,
    pago_bs_efectivo: pagos.bs,
    pago_pagomovil: pagos.pagoMovil,
    pago_punto: pagos.punto,
    vuelto_bs_entregado: result.vueltoBs,
    ajuste_redondeo_bs: result.ajusteRedondeo
  }).select().single()

  if (error) {
    alert('Error al procesar venta: ' + error.message)
    btn.textContent = 'PROCESAR VENTA'
    btn.disabled = false
    return
  }

  const detalles = ticket.map(t => ({
    venta_id: venta.id,
    producto_id: t.id,
    cantidad: t.cantidad,
    precio_unitario_usd: t.precio,
    subtotal_usd: +(t.precio * t.cantidad).toFixed(2)
  }))

  const { error: detError } = await supabase.from('venta_detalles').insert(detalles)
  if (detError) console.error('Error al guardar detalles:', detError)

  ticket = []
  renderTicket()
  cerrarCheckout()
  btn.textContent = 'PROCESAR VENTA'
}
