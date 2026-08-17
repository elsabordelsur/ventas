let categorias = []
let productos = []
let tasaBcvActual = 0
let tasaVueltoActual = 0
let ticketSelectedIdx = -1
let prodSelectedIdx = -1
let focusArea = 'productos'
let busquedaQuery = ''

let pedidos = []
let pedidoIdx = -1
let pedidoCounter = 0

function getTicket() {
  if (pedidoIdx >= 0 && pedidoIdx < pedidos.length) return pedidos[pedidoIdx].items
  return []
}

function setTicket(arr) {
  if (pedidoIdx >= 0 && pedidoIdx < pedidos.length) pedidos[pedidoIdx].items = arr
}

function ticket() { return getTicket() }

function fmtBs(num) {
  const [entero, dec] = Math.abs(num).toFixed(2).split('.')
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (num < 0 ? '-' : '') + conMiles + ',' + dec
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function cargarTasa() {
  const { data } = await supabase.from('configuracion').select('tasa_bcv, tasa_vuelto').eq('id', 1).single()
  if (data) {
    tasaBcvActual = data.tasa_bcv
    tasaVueltoActual = data.tasa_vuelto || data.tasa_bcv
  }
}

async function cargarCategorias() {
  const { data } = await supabase.from('categorias').select('*').eq('activa', true).order('id')
  if (data) categorias = data
}

async function cargarProductos() {
  const { data } = await supabase.from('productos').select('*').eq('activo', true).order('id')
  if (data) productos = data
  alertsRender(productos)
  renderVentaRapida()
}

async function cargarPedidosAbiertos() {
  const { data } = await supabase.from('pedidos').select('*').eq('status', 'abierto').order('created_at')
  if (!data) return
  pedidos = data.map(p => ({
    dbId: p.id,
    numero: p.numero,
    clienteNombre: p.cliente_nombre || '',
    items: [],
    creadoEn: p.created_at
  }))
  for (const p of pedidos) {
    const { data: detalles } = await supabase.from('pedido_detalles').select('*').eq('pedido_id', p.dbId)
    if (detalles) {
      p.items = detalles.map(d => ({
        id: d.producto_id,
        nombre: '', // will be filled from productos
        precio: +d.precio_unitario_usd,
        cantidad: d.cantidad
      }))
      for (const item of p.items) {
        const prod = productos.find(pr => pr.id === item.id)
        if (prod) item.nombre = prod.nombre
      }
    }
  }
  if (pedidos.length > 0) {
    pedidoIdx = 0
    pedidoCounter = Math.max(...pedidos.map(p => p.numero))
  }
  renderPedidos()
  renderTicket()
}

function getFavoritos() {
  try { return JSON.parse(localStorage.getItem('esds_favoritos') || '[]') } catch { return [] }
}

function toggleFavorito(id) {
  const favs = getFavoritos()
  const idx = favs.indexOf(id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.push(id)
  localStorage.setItem('esds_favoritos', JSON.stringify(favs))
  renderVentaRapida()
}

async function cargarTopVendidos() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data } = await supabase.from('venta_detalles')
    .select('producto_id, cantidad')
    .gte('created_at', hoy + 'T00:00:00')
    .lte('created_at', hoy + 'T23:59:59')
  if (!data || data.length === 0) return []
  const map = {}
  for (const d of data) {
    map[d.producto_id] = (map[d.producto_id] || 0) + d.cantidad
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, cant]) => ({ id: +id, cantidad: cant }))
}

async function renderVentaRapida() {
  const section = document.getElementById('ventaRapidaSection')
  const bar = document.getElementById('ventaRapidaBar')
  if (!section || !bar) return

  const favs = getFavoritos()
  const topVendidos = await cargarTopVendidos()

  const ids = new Set()
  const items = []

  for (const favId of favs) {
    const prod = productos.find(p => p.id === favId)
    if (prod && !ids.has(prod.id)) { ids.add(prod.id); items.push(prod) }
  }

  for (const tv of topVendidos) {
    if (ids.has(tv.id)) continue
    const prod = productos.find(p => p.id === tv.id)
    if (prod) { ids.add(prod.id); items.push(prod) }
  }

  if (items.length === 0) { section.style.display = 'none'; return }
  section.style.display = ''

  bar.innerHTML = items.map(p => {
    const isFav = favs.includes(p.id)
    return `<button class="venta-rapida-btn" onclick="agregarRapido(${p.id})" title="${escHtml(p.nombre)}">
      <span class="vr-fav${isFav ? ' active' : ''}" onclick="event.stopPropagation();toggleFavorito(${p.id})">★</span>
      <span class="vr-nombre">${escHtml(p.nombre)}</span>
      <span class="vr-precio">$${p.precio_usd.toFixed(2)}</span>
    </button>`
  }).join('')
  parseEmoji(bar)
}

function agregarRapido(id) {
  const prod = productos.find(p => p.id === id)
  if (!prod) return
  agregarAlTicket(prod.id, prod.nombre, prod.precio_usd, 1)
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const modalCant = document.getElementById('modalCantidad')
    const modalCheck = document.getElementById('modalCheckout')
    const modalRecibo = document.getElementById('modalRecibo')
    if (modalCant.style.display !== 'none') { cerrarModalCantidad(); return }
    if (modalCheck.style.display !== 'none') { cerrarCheckout(); return }
    if (modalRecibo && modalRecibo.style.display !== 'none') { cerrarRecibo(); return }
  }

  const modalCant = document.getElementById('modalCantidad').style.display !== 'none'
  const modalCheck = document.getElementById('modalCheckout').style.display !== 'none'
  const modalRecibo = document.getElementById('modalRecibo')?.style.display !== 'none'

  if (modalCheck) {
    const isInputFocused = document.activeElement.tagName === 'INPUT'
    const inlineVisible = document.getElementById('checkoutInline').style.display !== 'none'
    const metodosVisible = document.getElementById('checkoutMetodos').style.display !== 'none'

    if (!isInputFocused) {
      const match = e.code.match(/^F(\d+)$/)
      if (match) {
        const fNum = +match[1]
        e.preventDefault()
        if (fNum === 1) agregarMetodo('punto')
        else if (fNum === 2) agregarMetodo('pagomovil')
        else if (fNum === 3) agregarMetodo('usd')
        else if (fNum === 4) agregarMetodo('bs')
        return
      }

      if (metodosVisible) {
        const btns = document.getElementById('checkoutMetodos').querySelectorAll('button')
        if (!btns.length) return
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          checkoutMetodoIdx = (checkoutMetodoIdx + 2) % btns.length
          renderCheckoutHighlight(btns)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          checkoutMetodoIdx = (checkoutMetodoIdx - 2 + btns.length) % btns.length
          renderCheckoutHighlight(btns)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          checkoutMetodoIdx = (checkoutMetodoIdx + 1) % btns.length
          renderCheckoutHighlight(btns)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          checkoutMetodoIdx = (checkoutMetodoIdx - 1 + btns.length) % btns.length
          renderCheckoutHighlight(btns)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (checkoutMetodoIdx >= 0 && checkoutMetodoIdx < btns.length) {
            const metodos = ['punto', 'pagomovil', 'usd', 'bs']
            agregarMetodoDirecto(metodos[checkoutMetodoIdx])
          }
        }
        return
      }
    }

    if (isInputFocused && e.key === 'Enter') {
      e.preventDefault()
      if (inlineVisible) {
        confirmarInline()
      } else {
        const btn = document.getElementById('btnProcesar')
        if (btn && !btn.disabled) btn.click()
      }
      return
    }

    if (isInputFocused && e.key === 'Tab') {
      e.preventDefault()
      if (inlineVisible) cancelarInline()
      return
    }

    return
  }

  if (modalCant || modalRecibo) return

  if (!document.getElementById('view-caja').classList.contains('active')) return

  const searchInput = document.getElementById('searchInput')
  const isSearchFocused = document.activeElement === searchInput

  if (e.key === '/' && !isSearchFocused) {
    e.preventDefault()
    searchInput.focus()
    return
  }

  if (isSearchFocused) return

  const isInput = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT'
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !isInput) {
    e.preventDefault()
    nuevoPedido()
    return
  }

  const match = e.code.match(/^F(\d+)$/)
  if (match) {
    const fNum = +match[1]
    if (fNum < 1 || fNum > 12) return
    e.preventDefault()
    const prod = productos.find(p => p.tecla_rapida === `F${fNum}`)
    if (prod) abrirModalCantidad(prod.id, prod.nombre, prod.precio_usd)
    return
  }

  const grid = document.getElementById('productosGrid')
  const gridItems = grid.querySelectorAll('.producto-btn')
  const cols = gridCols()
  const items = getTicket()

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (focusArea === 'productos') {
      const next = prodSelectedIdx + cols
      if (next < gridItems.length) { prodSelectedIdx = next }
      else { focusArea = 'ticket'; ticketSelectedIdx = 0 }
      renderProdHighlight(gridItems)
      renderTicket()
    } else {
      if (ticketSelectedIdx < items.length - 1) ticketSelectedIdx++
      renderTicket()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (focusArea === 'ticket') {
      if (ticketSelectedIdx > 0) ticketSelectedIdx--
      else { focusArea = 'productos'; ticketSelectedIdx = -1; prodSelectedIdx = Math.min(prodSelectedIdx, gridItems.length - 1) }
      renderTicket()
      renderProdHighlight(gridItems)
    } else {
      if (prodSelectedIdx >= cols) prodSelectedIdx -= cols
      renderProdHighlight(gridItems)
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (focusArea === 'productos') {
      if (prodSelectedIdx < gridItems.length - 1) prodSelectedIdx++
      renderProdHighlight(gridItems)
    } else if (ticketSelectedIdx >= 0) {
      cambiarCantidad(ticketSelectedIdx, 1)
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (focusArea === 'productos') {
      if (prodSelectedIdx > 0) prodSelectedIdx--
      renderProdHighlight(gridItems)
    } else if (ticketSelectedIdx >= 0) {
      cambiarCantidad(ticketSelectedIdx, -1)
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (focusArea === 'productos' && prodSelectedIdx >= 0 && prodSelectedIdx < productosFiltrados().length) {
      const p = productosFiltrados()[prodSelectedIdx]
      abrirModalCantidad(p.id, p.nombre.replace(/'/g, "\\'"), p.precio_usd)
    } else if (focusArea === 'ticket' && items.length > 0) {
      ticketSelectedIdx = -1
      abrirCheckout()
    }
  }
})

function gridCols() {
  const grid = document.getElementById('productosGrid')
  if (!grid.children.length) return 1
  const gridStyle = getComputedStyle(grid)
  const cols = gridStyle.gridTemplateColumns.split(' ').length
  return cols || 1
}

function productosFiltrados() {
  if (busquedaQuery) {
    const q = busquedaQuery.toLowerCase()
    return productos.filter(p => p.nombre.toLowerCase().includes(q))
  }
  const activeTab = document.querySelector('.categoria-tab.active')
  if (!activeTab) return productos
  const catId = +activeTab.dataset.catId
  return productos.filter(p => p.categoria_id === catId)
}

function renderProdHighlight(items) {
  if (!items) items = document.querySelectorAll('#productosGrid .producto-btn')
  items.forEach((el, i) => el.classList.toggle('selected', i === prodSelectedIdx))
  if (prodSelectedIdx >= 0 && items[prodSelectedIdx]) {
    items[prodSelectedIdx].scrollIntoView({ block: 'nearest' })
  }
}

function renderCategoriaTabs() {
  const container = document.getElementById('categoriaTabs')
  container.innerHTML = categorias.map((c, i) =>
    `<button class="categoria-tab${i === 0 ? ' active' : ''}" data-cat-id="${c.id}" onclick="filtrarPorCategoria(${c.id}, this)">${escHtml(c.nombre)}</button>`
  ).join('')
  if (categorias.length > 0) filtrarPorCategoria(categorias[0].id, container.querySelector('.categoria-tab'))
}

function filtrarPorCategoria(catId, btn) {
  document.querySelectorAll('.categoria-tab').forEach(t => t.classList.remove('active'))
  if (btn) btn.classList.add('active')
  clearSearch()
  prodSelectedIdx = -1
  renderProductos(productos.filter(p => p.categoria_id === catId))
}

function buscarProducto() {
  const input = document.getElementById('searchInput')
  busquedaQuery = input.value.trim()
  const clearBtn = document.getElementById('searchClear')
  clearBtn.classList.toggle('active', busquedaQuery.length > 0)
  if (busquedaQuery) {
    document.querySelectorAll('.categoria-tab').forEach(t => t.classList.remove('active'))
  }
  prodSelectedIdx = -1
  renderProductos(productosFiltrados())
}

function clearSearch() {
  const input = document.getElementById('searchInput')
  input.value = ''
  busquedaQuery = ''
  document.getElementById('searchClear').classList.remove('active')
  prodSelectedIdx = -1
}

function searchKeyHandler(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    clearSearch()
    renderProductos(productosFiltrados())
    document.getElementById('searchInput').blur()
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const gridItems = document.querySelectorAll('#productosGrid .producto-btn')
    if (!gridItems.length) return
    const cols = gridCols()
    if (e.key === 'ArrowDown') {
      const next = prodSelectedIdx + cols
      if (next < gridItems.length) prodSelectedIdx = next
    } else {
      if (prodSelectedIdx >= cols) prodSelectedIdx -= cols
      else { prodSelectedIdx = 0 }
    }
    focusArea = 'productos'
    renderProdHighlight(gridItems)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const filtrados = productosFiltrados()
    if (prodSelectedIdx >= 0 && prodSelectedIdx < filtrados.length) {
      const p = filtrados[prodSelectedIdx]
      document.getElementById('searchInput').blur()
      abrirModalCantidad(p.id, p.nombre, p.precio_usd)
    } else if (filtrados.length > 0) {
      prodSelectedIdx = 0
      document.getElementById('searchInput').blur()
      focusArea = 'productos'
      renderProdHighlight()
    }
  }
}

function renderProductos(lista) {
  const grid = document.getElementById('productosGrid')
  if (lista.length === 0) {
    grid.innerHTML = '<div class="ticket-empty">Sin productos en esta categoría</div>'
    prodSelectedIdx = -1
    return
  }
  grid.innerHTML = lista.map((p, i) => {
    const bsPrice = fmtBs(p.precio_usd * tasaBcvActual)
    return `<button class="producto-btn${p.tecla_rapida ? ' has-fkey' : ''}" onclick="prodSelectedIdx=${i};abrirModalCantidad(${p.id}, '${p.nombre.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${p.precio_usd})"${p.tecla_rapida ? ` data-fkey="${p.tecla_rapida}"` : ''}>
      ${p.tecla_rapida ? `<span class="producto-fkey">${p.tecla_rapida}</span>` : ''}
      <span class="producto-nombre">${escHtml(p.nombre)}</span>
      <span class="producto-precio">$${p.precio_usd.toFixed(2)}</span>
      <span class="producto-precio-bs">Bs. ${bsPrice}</span>
      ${p.maneja_inventario ? `<span class="producto-stock">Stock: ${p.stock}</span>` : ''}
    </button>`
  }).join('')
  parseEmoji(grid)
}

function renderPedidos() {
  const container = document.getElementById('pedidosBar')
  if (!container) return

  if (pedidos.length === 0) {
    container.innerHTML = `<div class="pedidos-empty">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <span>Crear primer pedido</span>
    </div>`
    return
  }

  let html = ''
  pedidos.forEach((p, i) => {
    const total = p.items.reduce((s, t) => s + t.precio * t.cantidad, 0)
    const count = p.items.reduce((s, t) => s + t.cantidad, 0)
    const isSelected = i === pedidoIdx
    const nombre = p.clienteNombre ? escHtml(p.clienteNombre) : ''

    html += `<div class="pedido-card${isSelected ? ' active' : ''}" onclick="seleccionarPedido(${i})" ondblclick="editarClienteIdx(${i})">
      <div class="pedido-card-top">
        <span class="pedido-card-num">#${p.numero}</span>
        <button class="pedido-card-close" onclick="event.stopPropagation();cerrarPedidoIdx(${i})" title="Cerrar pedido">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>
        </button>
      </div>
      ${nombre ? `<div class="pedido-card-name" ondblclick="event.stopPropagation();editarClienteIdx(${i})">${nombre}</div>` : ''}
      <div class="pedido-card-meta">
        ${count > 0
          ? `<span class="pedido-card-count">${count} uds</span><span class="pedido-card-total">$${total.toFixed(2)}</span>`
          : `<span class="pedido-card-empty">Vacío</span>`}
      </div>
    </div>`
  })

  container.innerHTML = html
  parseEmoji(container)
}

async function cerrarPedidoIdx(idx) {
  if (idx < 0 || idx >= pedidos.length) return
  const p = pedidos[idx]
  const label = `#${p.numero}` + (p.clienteNombre ? ` (${p.clienteNombre})` : '')
  if (!confirm(`¿Cerrar pedido ${label} sin cobrar?`)) return
  if (p.dbId) {
    await supabase.from('pedidos').delete().eq('id', p.dbId)
  }
  pedidos.splice(idx, 1)
  if (pedidos.length === 0) {
    pedidoIdx = -1
  } else if (idx <= pedidoIdx) {
    pedidoIdx = Math.max(0, (idx === pedidoIdx ? idx : pedidoIdx) - (idx < pedidoIdx ? 0 : 0))
    if (pedidoIdx >= pedidos.length) pedidoIdx = pedidos.length - 1
  }
  ticketSelectedIdx = -1
  renderPedidos()
  renderTicket()
}

function nuevoPedido() {
  pedidoCounter++
  const nuevo = {
    dbId: null,
    numero: pedidoCounter,
    clienteNombre: '',
    items: [],
    creadoEn: new Date().toISOString()
  }
  pedidos.push(nuevo)
  pedidoIdx = pedidos.length - 1
  ticketSelectedIdx = -1
  renderPedidos()
  renderTicket()

  const nombre = prompt('Nombre del cliente (opcional, Enter para omitir):', '')
  if (nombre !== null && nombre.trim()) {
    nuevo.clienteNombre = nombre.trim()
  }
  renderPedidos()
  guardarPedidoActual()
}

async function guardarPedidoActual() {
  if (pedidoIdx < 0) return
  const p = pedidos[pedidoIdx]
  if (p.dbId) {
    const items = p.items
    await supabase.from('pedido_detalles').delete().eq('pedido_id', p.dbId)
    if (items.length > 0) {
      const detalles = items.map(t => ({
        pedido_id: p.dbId,
        producto_id: t.id,
        cantidad: t.cantidad,
        precio_unitario_usd: t.precio,
        subtotal_usd: +(t.precio * t.cantidad).toFixed(2)
      }))
      await supabase.from('pedido_detalles').insert(detalles)
    }
  } else {
    const { data, error } = await supabase.from('pedidos').insert({
      cliente_nombre: p.clienteNombre
    }).select().single()
    if (!error && data) {
      p.dbId = data.id
      p.numero = data.numero
      if (p.items.length > 0) {
        const detalles = p.items.map(t => ({
          pedido_id: p.dbId,
          producto_id: t.id,
          cantidad: t.cantidad,
          precio_unitario_usd: t.precio,
          subtotal_usd: +(t.precio * t.cantidad).toFixed(2)
        }))
        await supabase.from('pedido_detalles').insert(detalles)
      }
    }
  }
}

function seleccionarPedido(idx) {
  if (idx < 0 || idx >= pedidos.length) return
  pedidoIdx = idx
  ticketSelectedIdx = -1
  renderPedidos()
  renderTicket()
}

function editarCliente() {
  if (pedidoIdx < 0) return
  const actual = pedidos[pedidoIdx].clienteNombre
  const nombre = prompt('Nombre del cliente:', actual || '')
  if (nombre !== null) {
    pedidos[pedidoIdx].clienteNombre = nombre.trim()
    renderPedidos()
    guardarPedidoActual()
  }
}

function editarClienteIdx(idx) {
  if (idx < 0 || idx >= pedidos.length) return
  pedidoIdx = idx
  const actual = pedidos[idx].clienteNombre
  const nombre = prompt('Nombre del cliente:', actual || '')
  if (nombre !== null) {
    pedidos[idx].clienteNombre = nombre.trim()
    renderPedidos()
    guardarPedidoActual()
  }
}

function agregarAlTicket(id, nombre, precio, cantidad = 1) {
  if (pedidoIdx < 0) {
    nuevoPedido()
  }
  const items = getTicket()
  const existente = items.find(t => t.id === id)
  if (existente) {
    existente.cantidad += cantidad
  } else {
    items.push({ id, nombre, precio, cantidad })
  }
  renderTicket()
  renderPedidos()
  guardarPedidoActual()
}

function renderTicket() {
  const container = document.getElementById('ticketItems')
  const count = document.getElementById('itemCount')
  const items = getTicket()

  count.textContent = items.reduce((s, t) => s + t.cantidad, 0)

  if (items.length === 0) {
    container.innerHTML = pedidoIdx >= 0
      ? '<div class="ticket-empty">Agrega productos al ticket</div>'
      : '<div class="ticket-empty">Crea un pedido para comenzar</div>'
    actualizarTotales()
    ticketSelectedIdx = -1
    return
  }

  if (ticketSelectedIdx >= items.length) ticketSelectedIdx = items.length - 1

  container.innerHTML = items.map((t, i) => {
    const precioBs = t.precio * tasaBcvActual
    const subtotalUsd = t.precio * t.cantidad
    const subtotalBs = precioBs * t.cantidad
    return `<div class="ticket-item${i === ticketSelectedIdx ? ' selected' : ''}" onmouseenter="ticketHover(${i})">
      <div class="ticket-item-nombre">${escHtml(t.nombre)}</div>
      <div class="ticket-item-precio">$${t.precio.toFixed(2)}<br><span class="precio-bs">Bs. ${fmtBs(precioBs)}</span></div>
      <div class="ticket-item-cantidad"><span>${t.cantidad}</span></div>
      <div class="ticket-item-subtotal">$${subtotalUsd.toFixed(2)}<br><span class="subtotal-bs">Bs. ${fmtBs(subtotalBs)}</span></div>
      <button class="ticket-item-remove" onclick="eliminarDelTicket(${i})"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/></svg></button>
    </div>`
  }).join('')

  actualizarTotales()
  parseEmoji(container)
}

function cambiarCantidad(index, delta) {
  const items = getTicket()
  items[index].cantidad += delta
  if (items[index].cantidad < 1) items[index].cantidad = 1
  renderTicket()
  renderPedidos()
  guardarPedidoActual()
}

function eliminarDelTicket(index) {
  const items = getTicket()
  items.splice(index, 1)
  if (ticketSelectedIdx >= items.length) ticketSelectedIdx = items.length - 1
  renderTicket()
  renderPedidos()
  guardarPedidoActual()
}

function ticketHover(index) {
  ticketSelectedIdx = index
  focusArea = 'ticket'
  renderTicket()
}

function vaciarTicket() {
  const items = getTicket()
  if (items.length === 0) return
  if (!confirm('¿Vaciar todo el ticket?')) return
  setTicket([])
  ticketSelectedIdx = -1
  renderTicket()
  renderPedidos()
  guardarPedidoActual()
}

function toggleTicket() {
  if (window.innerWidth > 768) return
  document.getElementById('posRight').classList.toggle('collapsed')
}

function actualizarTotales() {
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const totalBsExacto = tasaBcvActual > 0 ? calcularTotalBs(totalUsd, tasaBcvActual) : 0
  const totalBsEfectivo = tasaBcvActual > 0 ? techo50(totalBsExacto) : 0

  document.getElementById('totalUsd').textContent = `$${totalUsd.toFixed(2)}`
  document.getElementById('totalBsDigital').textContent = `Bs. ${fmtBs(totalBsExacto)}`
  document.getElementById('totalBsEfectivo').textContent = `Bs. ${fmtBs(totalBsEfectivo)}`

  if (tasaBcvActual <= 0 && items.length > 0) {
    document.getElementById('totalBsDigital').textContent = 'Bs. —'
    document.getElementById('totalBsEfectivo').textContent = 'Bs. —'
  }

  const btnCobrar = document.getElementById('btnCobrar')
  const canCobrar = items.length > 0 && tasaBcvActual > 0
  btnCobrar.disabled = !canCobrar
  btnCobrar.style.opacity = canCobrar ? '1' : '0.5'
  btnCobrar.style.pointerEvents = canCobrar ? '' : 'none'
}

let checkoutPagos = []
let checkoutInlineMetodo = null
let checkoutMetodoIdx = 0
let pagomovilConfirmado = false
let pagomovilReferencia = ''
let checkoutVueltoPendiente = false

const METODOS_CFG = {
  usd:       { label: '💵 USD Efectivo',     moneda: '$',   monedaLabel: 'USD', esDigital: false },
  bs:        { label: '£ BS Efectivo',          moneda: 'Bs.', monedaLabel: 'Bs.', esDigital: false },
  pagomovil: { label: '📱 PagoMóvil',         moneda: 'Bs.', monedaLabel: 'Bs.', esDigital: true  },
  punto:     { label: '💳 Punto de Venta',    moneda: 'Bs.', monedaLabel: 'Bs.', esDigital: true  }
}

function pagarMetodo(metodo) {
  return metodo === 'pagomovil' ? 'pagoMovil' : metodo === 'punto' ? 'punto' : metodo
}

function abrirCheckout() {
  const items = getTicket()
  if (items.length === 0) return
  if (tasaBcvActual <= 0) { alert('Configura la tasa BCV antes de cobrar'); return }
  checkoutPagos = []
  checkoutInlineMetodo = null
  checkoutMetodoIdx = 0
  pagomovilConfirmado = false
  pagomovilReferencia = ''
  checkoutVueltoPendiente = false
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  document.getElementById('checkTotalUsd').textContent = `$${totalUsd.toFixed(2)}`
  document.getElementById('checkTotalBsExacto').textContent = `Bs. ${fmtBs(calcularTotalBs(totalUsd, tasaBcvActual))}`

  const p = pedidos[pedidoIdx]
  const nombreEl = document.getElementById('checkoutClienteNombre')
  if (nombreEl) nombreEl.textContent = `Pedido #${p.numero}` + (p.clienteNombre ? ` — ${p.clienteNombre}` : '')

  document.getElementById('modalCheckout').style.display = 'flex'
  document.activeElement.blur()
  checkoutMetodoIdx = 0
  renderPagosLista()
  calcularCheckoutUI()
  const metBtns = document.getElementById('checkoutMetodos').querySelectorAll('button')
  renderCheckoutHighlight(metBtns)
  document.getElementById('checkoutMetodos').style.display = ''
  document.getElementById('pagomovilConfirmSection').style.display = 'none'
}

function cerrarCheckout() {
  document.getElementById('modalCheckout').style.display = 'none'
  checkoutPagos = []
  checkoutInlineMetodo = null
  pagomovilConfirmado = false
  pagomovilReferencia = ''
}

function agregarMetodo(metodo) {
  checkoutInlineMetodo = metodo
  const cfg = METODOS_CFG[metodo]
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const totalBs = calcularTotalBs(totalUsd, tasaBcvActual)
  const pagosActuales = buildPagos()
  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagosActuales)
  const faltanteBs = result.faltante

  let valorInicial = '0'
  if (cfg.esDigital) {
    valorInicial = faltanteBs > 0 ? faltanteBs.toFixed(2) : '0'
  } else if (metodo === 'bs') {
    valorInicial = faltanteBs > 0 ? techo50(faltanteBs).toString() : '0'
  }

  document.getElementById('inlineLabel').textContent = cfg.label + ' — ' + (faltanteBs > 0 ? `Faltante: Bs. ${fmtBs(faltanteBs)}` : 'Ya pagado')
  document.getElementById('inlineMoneda').textContent = cfg.moneda
  document.getElementById('inlineMonto').value = valorInicial
  document.getElementById('btnInlineExacto').style.display = (!cfg.esDigital && metodo === 'usd' && faltanteBs > 0) ? 'block' : 'none'
  if (metodo === 'usd' && faltanteBs > 0) {
    document.getElementById('btnInlineExacto').textContent = `Exacto: $${(faltanteBs / tasaBcvActual).toFixed(2)}`
  }
  document.getElementById('checkoutInline').style.display = 'block'
  document.getElementById('checkoutMetodos').style.display = 'none'
  document.getElementById('inlineMonto').focus()
  recalcularInline()
}

function agregarMetodoDirecto(metodo) {
  const cfg = METODOS_CFG[metodo]
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const pagosActuales = buildPagos()
  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagosActuales)
  const faltanteBs = result.faltante

  if (faltanteBs <= 0) return

  let monto
  if (cfg.esDigital) {
    monto = faltanteBs
  } else if (metodo === 'usd') {
    monto = faltanteBs / tasaBcvActual
  } else {
    monto = faltanteBs
  }

  checkoutPagos.push({ metodo, monto })
  renderPagosLista()
  calcularCheckoutUI()

  if (metodo === 'pagomovil') {
    document.getElementById('pagomovilConfirmSection').style.display = 'block'
  }
}

function cancelarInline() {
  checkoutInlineMetodo = null
  document.getElementById('checkoutInline').style.display = 'none'
  document.getElementById('checkoutMetodos').style.display = ''
  checkoutMetodoIdx = 0
  const btns = document.getElementById('checkoutMetodos').querySelectorAll('button')
  renderCheckoutHighlight(btns)
}

function renderCheckoutHighlight(btns) {
  if (!btns) btns = document.getElementById('checkoutMetodos').querySelectorAll('button')
  btns.forEach((b, i) => b.classList.toggle('selected', i === checkoutMetodoIdx))
  if (btns[checkoutMetodoIdx]) btns[checkoutMetodoIdx].scrollIntoView({ block: 'nearest' })
}

function confirmarInline() {
  if (!checkoutInlineMetodo) return
  const monto = +document.getElementById('inlineMonto').value || 0
  if (monto <= 0) return
  checkoutPagos.push({ metodo: checkoutInlineMetodo, monto })
  cancelarInline()
  renderPagosLista()
  calcularCheckoutUI()

  if (checkoutInlineMetodo === 'pagomovil') {
    document.getElementById('pagomovilConfirmSection').style.display = 'block'
  }
}

function removePago(idx) {
  const removed = checkoutPagos.splice(idx, 1)[0]
  if (removed && removed.metodo === 'pagomovil') {
    const hasPM = checkoutPagos.some(p => p.metodo === 'pagomovil')
    if (!hasPM) {
      pagomovilConfirmado = false
      pagomovilReferencia = ''
      document.getElementById('pagomovilConfirmSection').style.display = 'none'
    }
  }
  renderPagosLista()
  calcularCheckoutUI()
}

function ponerExactoInline() {
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const totalBs = calcularTotalBs(totalUsd, tasaBcvActual)
  const pagosActuales = buildPagos()
  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagosActuales)
  const faltanteBs = result.faltante
  if (faltanteBs > 0) {
    document.getElementById('inlineMonto').value = (faltanteBs / tasaBcvActual).toFixed(2)
    recalcularInline()
  }
}

function recalcularInline() {
  if (!checkoutInlineMetodo) return
  const monto = +document.getElementById('inlineMonto').value || 0
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const totalBs = calcularTotalBs(totalUsd, tasaBcvActual)

  let pagosSim = buildPagos()
  const key = pagarMetodo(checkoutInlineMetodo)
  pagosSim[key] = (pagosSim[key] || 0) + monto

  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagosSim)
  const label = document.getElementById('inlineLabel')
  const cfg = METODOS_CFG[checkoutInlineMetodo]
  if (result.faltante > 0) {
    label.textContent = cfg.label + ' — Faltante: Bs. ' + fmtBs(result.faltante)
    label.style.color = 'var(--danger)'
  } else if (result.vueltoBs > 0) {
    label.textContent = cfg.label + ' — Vuelto: Bs. ' + fmtBs(result.vueltoBs)
    label.style.color = 'var(--green)'
  } else {
    label.textContent = cfg.label + ' — Pago exacto'
    label.style.color = 'var(--success)'
  }
}

function buildPagos() {
  const pagos = { usd: 0, bs: 0, pagoMovil: 0, punto: 0 }
  for (const p of checkoutPagos) {
    pagos[pagarMetodo(p.metodo)] += p.monto
  }
  return pagos
}

function renderPagosLista() {
  const el = document.getElementById('checkoutPagosLista')
  if (checkoutPagos.length === 0) {
    el.innerHTML = ''
    return
  }
  el.innerHTML = checkoutPagos.map((p, i) => {
    const cfg = METODOS_CFG[p.metodo]
    return `<div class="pago-item">
      <span class="pago-item-label">${cfg.label}</span>
      <span class="pago-item-monto">${p.metodo === 'usd' ? '$' + p.monto.toFixed(2) : 'Bs. ' + fmtBs(p.monto)}</span>
      <button class="pago-item-remove" onclick="removePago(${i})">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>
      </button>
    </div>`
  }).join('')
  parseEmoji(el)
}

function togglePagomovilConfirm() {
  pagomovilConfirmado = !pagomovilConfirmado
  const btn = document.getElementById('btnPagomovilConfirm')
  btn.classList.toggle('confirmed', pagomovilConfirmado)
  btn.textContent = pagomovilConfirmado ? '✓ Transferencia Confirmada' : 'Marcar como Confirmada'
  calcularCheckoutUI()
}

function actualizarRefPagomovil() {
  pagomovilReferencia = document.getElementById('pagomovilRefInput').value.trim()
}

function calcularCheckoutUI() {
  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const pagos = buildPagos()
  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagos)

  document.getElementById('checkFaltante').textContent = result.faltante > 0 ? `Faltante: Bs. ${fmtBs(result.faltante)}` : ''
  document.getElementById('checkFaltante').style.color = 'var(--danger)'

  const vueltoEl = document.getElementById('checkVuelto')
  if (result.vueltoBs > 0) {
    vueltoEl.textContent = `Vuelto: Bs. ${fmtBs(result.vueltoBs)}`
    vueltoEl.style.color = 'var(--green)'
    vueltoEl.style.fontWeight = '700'
    vueltoEl.style.fontSize = '16px'
  } else if (result.faltante <= 0 && checkoutPagos.length > 0) {
    vueltoEl.textContent = 'Pago exacto'
    vueltoEl.style.color = 'var(--success)'
    vueltoEl.style.fontWeight = ''
    vueltoEl.style.fontSize = ''
  } else {
    vueltoEl.textContent = ''
  }

  const vueltoMsg = document.getElementById('checkVueltoMsg')
  const vueltoMsgText = document.getElementById('vueltoMsgText')
  if (result.vueltoBs > 0 && checkoutPagos.length > 0 && result.faltante <= 0) {
    checkoutVueltoPendiente = true
    vueltoMsgText.textContent = `Vuelto: Bs. ${fmtBs(result.vueltoBs)}`
    vueltoMsg.classList.remove('hidden')
    vueltoMsg.style.display = 'block'
  } else {
    checkoutVueltoPendiente = false
    vueltoMsg.classList.add('hidden')
    vueltoMsg.style.display = 'none'
  }

  document.getElementById('checkRedondeo').textContent = result.ajusteRedondeo ? `Ajuste redondeo: Bs. ${fmtBs(result.ajusteRedondeo)}` : ''

  if (result.vueltoBilletes && result.vueltoBilletes.length > 0) {
    document.getElementById('checkBilletes').innerHTML = '<div class="billetes-title">Billetes a entregar:</div>' +
      result.vueltoBilletes.map(b => `<div class="billete-line">${b.cantidad} × Bs. ${fmtBs(b.denom)}</div>`).join('')
  } else {
    document.getElementById('checkBilletes').innerHTML = ''
  }

  const hasPM = checkoutPagos.some(p => p.metodo === 'pagomovil')
  if (hasPM && !pagomovilConfirmado) {
    result.puedeProcesar = false
  }

  const btn = document.getElementById('btnProcesar')
  btn.disabled = !result.puedeProcesar
  btn.style.opacity = result.puedeProcesar ? '1' : '0.5'
}

async function procesarVenta() {
  const btn = document.getElementById('btnProcesar')
  if (btn.disabled) return

  const hasPM = checkoutPagos.some(p => p.metodo === 'pagomovil')
  if (hasPM && !pagomovilConfirmado) {
    alert('Debes confirmar la transferencia PagoMóvil antes de procesar')
    return
  }

  btn.textContent = 'Procesando...'
  btn.disabled = true

  const items = getTicket()
  const totalUsd = items.reduce((s, t) => s + t.precio * t.cantidad, 0)
  const pagos = buildPagos()
  const result = calcularCheckout(totalUsd, tasaBcvActual, tasaVueltoActual, pagos)

  const { data: venta, error } = await supabase.from('ventas').insert({
    total_usd: +totalUsd.toFixed(2),
    tasa_bcv_aplicada: tasaBcvActual,
    total_bs_teorico: result.totalBsExacto,
    total_bs_cobrado: result.totalBsCobrado,
    pago_usd_efectivo: pagos.usd,
    pago_bs_efectivo: pagos.bs,
    pago_pagomovil: pagos.pagoMovil,
    pago_punto: pagos.punto,
    vuelto_bs_entregado: result.vueltoBs,
    ajuste_redondeo_bs: result.ajusteRedondeo,
    usuario_id_ref: userCurrent()?.id || null
  }).select().single()

  if (error) {
    alert('Error al procesar venta: ' + error.message)
    btn.textContent = 'CONFIRMAR'
    btn.disabled = false
    return
  }

  const detalles = items.map(t => ({
    venta_id: venta.id,
    producto_id: t.id,
    cantidad: t.cantidad,
    precio_unitario_usd: t.precio,
    subtotal_usd: +(t.precio * t.cantidad).toFixed(2)
  }))

  const { error: detError } = await supabase.from('venta_detalles').insert(detalles)
  if (detError) console.error('Error al guardar detalles:', detError)

  for (const t of items) {
    const { data: prodActual } = await supabase.from('productos').select('stock, maneja_inventario').eq('id', t.id).single()
    if (prodActual && prodActual.maneja_inventario) {
      const nuevoStock = (prodActual.stock || 0) - t.cantidad
      const { error: invErr } = await supabase.from('productos').update({ stock: Math.max(0, nuevoStock) }).eq('id', t.id)
      if (invErr) console.error('Error actualizando inventario:', invErr)
    }
  }

  if (pedidos[pedidoIdx]?.dbId) {
    await supabase.from('pedidos').update({
      status: 'pagado',
      pagado_at: new Date().toISOString(),
      total_usd: +totalUsd.toFixed(2),
      tasa_bcv_aplicada: tasaBcvActual,
      total_bs_teorico: result.totalBsExacto,
      total_bs_cobrado: result.totalBsCobrado,
      pago_usd_efectivo: pagos.usd,
      pago_bs_efectivo: pagos.bs,
      pago_pagomovil: pagos.pagoMovil,
      pago_punto: pagos.punto,
      vuelto_bs_entregado: result.vueltoBs,
      ajuste_redondeo_bs: result.ajusteRedondeo,
      pagomovil_confirmado: pagomovilConfirmado,
      pagomovil_referencia: pagomovilReferencia
    }).eq('id', pedidos[pedidoIdx].dbId)
  }

  pedidos.splice(pedidoIdx, 1)
  if (pedidos.length === 0) {
    pedidoIdx = -1
  } else {
    pedidoIdx = Math.min(pedidoIdx, pedidos.length - 1)
  }
  ticketSelectedIdx = -1
  renderPedidos()
  renderTicket()
  cerrarCheckout()
  btn.textContent = 'CONFIRMAR'

  mostrarRecibo(venta)
}

function mostrarRecibo(venta) {
  const fecha = new Date(venta.created_at).toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  const pagos = []
  if (venta.pago_usd_efectivo > 0) pagos.push(`USD Efectivo: $${venta.pago_usd_efectivo.toFixed(2)}`)
  if (venta.pago_bs_efectivo > 0) pagos.push(`Bs Efectivo: Bs. ${fmtBs(venta.pago_bs_efectivo)}`)
  if (venta.pago_pagomovil > 0) pagos.push(`PagoMóvil: Bs. ${fmtBs(venta.pago_pagomovil)}`)
  if (venta.pago_punto > 0) pagos.push(`Punto: Bs. ${fmtBs(venta.pago_punto)}`)

  let html = `
    <div class="recibo-linea"><span>#${venta.id}</span><span>${fecha}</span></div>
    <div class="recibo-divider"></div>
    <div class="recibo-linea"><span>Tasa BCV</span><span>${fmtBs(venta.tasa_bcv_aplicada)}</span></div>
    <div class="recibo-divider"></div>
    <div class="recibo-linea total"><span>Total USD</span><span>$${venta.total_usd.toFixed(2)}</span></div>
    <div class="recibo-linea"><span>Total Bs. Teórico</span><span>Bs. ${fmtBs(venta.total_bs_teorico)}</span></div>
    <div class="recibo-linea"><span>Total Bs. Cobrado</span><span>Bs. ${fmtBs(venta.total_bs_cobrado)}</span></div>`

  if (pagos.length > 0) {
    html += `<div class="recibo-divider"></div><div class="recibo-linea header">Pagos:</div>`
    pagos.forEach(p => { html += `<div class="recibo-linea"><span>${escHtml(p)}</span></div>` })
  }

  if (venta.vuelto_bs_entregado > 0) {
    html += `<div class="recibo-divider"></div><div class="recibo-linea"><span>Vuelto:</span><span>Bs. ${fmtBs(venta.vuelto_bs_entregado)}</span></div>`
  }

  if (venta.ajuste_redondeo_bs !== 0) {
    html += `<div class="recibo-linea dim"><span>Ajuste redondeo:</span><span>Bs. ${fmtBs(venta.ajuste_redondeo_bs)}</span></div>`
  }

  document.getElementById('reciboBody').innerHTML = html
  document.getElementById('modalRecibo').style.display = 'flex'
  parseEmoji(document.getElementById('reciboBody'))
}

function cerrarRecibo() {
  document.getElementById('modalRecibo').style.display = 'none'
}

function imprimirRecibo() {
  const box = document.getElementById('reciboBox')
  const w = window.open('', '_blank', 'width=320,height=600')
  w.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
    body{font-family:'Courier New',monospace;font-size:12px;padding:10px;margin:0;width:280px;}
    .recibo-header{text-align:center;margin-bottom:8px;}
    .recibo-title{font-size:14px;font-weight:bold;}
    .recibo-subtitle{font-size:10px;color:#666;}
    .recibo-linea{display:flex;justify-content:space-between;padding:1px 0;font-size:11px;}
    .recibo-linea.total{font-size:13px;font-weight:bold;border-top:1px dashed #000;padding-top:4px;margin-top:4px;}
    .recibo-linea.header{font-weight:bold;font-size:10px;color:#333;}
    .recibo-linea.dim{font-size:9px;color:#999;}
    .recibo-divider{border-top:1px dashed #ccc;margin:3px 0;}
    .recibo-footer{text-align:center;margin-top:8px;font-size:10px;color:#666;}
  </style></head><body>${box.innerHTML}</body></html>`)
  w.document.close()
  w.print()
}

let modalCantProd = null

function abrirModalCantidad(id, nombre, precio) {
  modalCantProd = { id, nombre, precio }
  document.getElementById('modalCantProd').textContent = nombre
  const input = document.getElementById('cantInput')
  input.value = 1
  document.getElementById('modalCantidad').style.display = 'flex'
  requestAnimationFrame(() => { input.focus(); input.select() })
  input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirmarCantidad() } }
}

function cerrarModalCantidad() {
  document.getElementById('modalCantidad').style.display = 'none'
  modalCantProd = null
}

function cambiarCantModal(delta) {
  const input = document.getElementById('cantInput')
  input.value = Math.max(1, (+input.value || 1) + delta)
}

function confirmarCantidad() {
  if (!modalCantProd) return
  const cantidad = +document.getElementById('cantInput').value || 1
  agregarAlTicket(modalCantProd.id, modalCantProd.nombre, modalCantProd.precio, cantidad)
  cerrarModalCantidad()
}
