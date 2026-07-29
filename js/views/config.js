let categoriasAdmin = []

async function cargarConfig() {
  const { data } = await supabase.from('configuracion').select('*').eq('id', 1).single()
  if (data) {
    document.getElementById('tasaBcvInput').value = data.tasa_bcv
    document.getElementById('tasaVueltoInput').value = data.tasa_vuelto
    tasaBcvActual = data.tasa_bcv
    tasaVueltoActual = data.tasa_vuelto
  }
  await cargarCategoriasSelect()
  await cargarCategoriasAdmin()
  await cargarProductosAdmin()
}

async function guardarTasa() {
  const tasa = +document.getElementById('tasaBcvInput').value
  const tasaVuelto = +document.getElementById('tasaVueltoInput').value

  if (!tasa || tasa <= 0) {
    document.getElementById('configStatus').textContent = 'Ingresa una tasa BCV válida'
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  const { error } = await supabase.from('configuracion').update({
    tasa_bcv: tasa,
    tasa_vuelto: tasaVuelto || tasa,
    fecha_actualizacion: new Date().toISOString()
  }).eq('id', 1)

  if (error) {
    document.getElementById('configStatus').textContent = 'Error: ' + error.message
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  tasaBcvActual = tasa
  tasaVueltoActual = tasaVuelto || tasa
  document.getElementById('configStatus').textContent = '✅ Tasas actualizadas correctamente'
  document.getElementById('configStatus').style.color = 'var(--success)'
}

async function obtenerTasaBCV() {
  const btn = document.getElementById('btnScrapear')
  btn.textContent = 'Obteniendo...'
  btn.disabled = true

  function ponerTasa(tasa) {
    document.getElementById('tasaBcvInput').value = tasa.toFixed(2)
    document.getElementById('tasaVueltoInput').value = tasa.toFixed(2)
    document.getElementById('configStatus').textContent = `✅ Tasa BCV actualizada: Bs. ${tasa.toFixed(2)}`
    document.getElementById('configStatus').style.color = 'var(--success)'
  }

  try {
    const res = await fetch('https://corsproxy.io/?url=https://www.bcv.org.ve/')
    const html = await res.text()
    const m = html.match(/id="dolar"[^>]*>.*?<strong[^>]*>\s*([\d.,]+)\s*<\/strong>/)
    if (m) {
      const str = m[1].replace(/\./g, '').replace(',', '.')
      const tasa = +str
      if (tasa && tasa > 0) { ponerTasa(tasa); btn.textContent = 'Obtener automáticamente'; btn.disabled = false; return }
    }
  } catch {}

  try {
    const res = await fetch('https://bcv.today/api/v1/rate.json')
    const data = await res.json()
    const tasa = +(data.USD || 0)
    if (tasa && tasa > 0) { ponerTasa(tasa); btn.textContent = 'Obtener automáticamente'; btn.disabled = false; return } else { throw new Error() }
  } catch {}
  try {
    const res = await fetch('https://pydolarve.com/api/dolar?moneda=usd')
    const data = await res.json()
    const tasa = +(data.bcv || 0)
    if (tasa && tasa > 0) { ponerTasa(tasa); btn.textContent = 'Obtener automáticamente'; btn.disabled = false; return } else { throw new Error() }
  } catch {
    document.getElementById('configStatus').textContent = '❌ No se pudo obtener la tasa automáticamente'
    document.getElementById('configStatus').style.color = 'var(--danger)'
  }
  btn.textContent = 'Obtener automáticamente'
  btn.disabled = false
}

async function cargarCategoriasSelect() {
  const { data } = await supabase.from('categorias').select('*').order('id')
  const select = document.getElementById('prodCategoria')
  if (!data) return
  select.innerHTML = '<option value="">Seleccionar categoría</option>' +
    data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')
}

async function cargarCategoriasAdmin() {
  const { data } = await supabase.from('categorias').select('*').order('id')
  categoriasAdmin = data || []
  const container = document.getElementById('categoriasLista')
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="ticket-empty">No hay categorías</div>'
    return
  }
  container.innerHTML = data.map(c =>
    `<div class="prod-item${c.activa ? '' : ' inactivo'}">
      <div class="prod-item-info">
        <div class="prod-item-nombre">${c.nombre}</div>
      </div>
      <button class="prod-item-accion editar" onclick="editarCategoria(${c.id})">✎</button>
      <button class="prod-item-accion eliminar" onclick="toggleCategoria(${c.id}, ${c.activa})">${c.activa ? 'Desactivar' : 'Activar'}</button>
    </div>`
  ).join('')
}

async function guardarCategoria() {
  const id = document.getElementById('catId').value
  const nombre = document.getElementById('catNombre').value.trim()
  if (!nombre) return
  let error
  if (id) {
    ({ error } = await supabase.from('categorias').update({ nombre }).eq('id', id))
  } else {
    ({ error } = await supabase.from('categorias').insert({ nombre }))
  }
  if (error) { alert('Error: ' + error.message); return }
  document.getElementById('catNombre').value = ''
  document.getElementById('catId').value = ''
  document.getElementById('btnGuardarCat').textContent = 'Agregar'
  await cargarCategoriasAdmin()
  await cargarCategoriasSelect()
}

function editarCategoria(id) {
  const cat = categoriasAdmin.find(c => c.id === id)
  if (!cat) return
  document.getElementById('catId').value = cat.id
  document.getElementById('catNombre').value = cat.nombre
  document.getElementById('btnGuardarCat').textContent = 'Actualizar'
}

async function toggleCategoria(id, activa) {
  await supabase.from('categorias').update({ activa: !activa }).eq('id', id)
  await cargarCategoriasAdmin()
}

async function cargarProductosAdmin() {
  const { data } = await supabase
    .from('productos')
    .select('*, categorias(nombre)')
    .order('id')

  const container = document.getElementById('productosLista')
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="ticket-empty">No hay productos todavía</div>'
    return
  }

  container.innerHTML = data.map(p =>
    `<div class="prod-item${p.activo ? '' : ' inactivo'}">
      <div class="prod-item-info">
        <div class="prod-item-nombre">${p.nombre} ${p.maneja_inventario ? `<span class="stock-badge">Stock: ${p.stock}</span>` : ''}</div>
        <div class="prod-item-categoria">${p.categorias?.nombre || 'Sin categoría'}</div>
      </div>
      <div class="prod-item-precio">$${p.precio_usd.toFixed(2)}</div>
      <button class="prod-item-accion editar" onclick="editarProducto(${p.id})">✎</button>
      <button class="prod-item-accion eliminar" onclick="eliminarProducto(${p.id})">✕</button>
    </div>`
  ).join('')
}

function editarProducto(id) {
  supabase.from('productos').select('*').eq('id', id).single().then(({ data }) => {
    if (!data) return
    document.getElementById('prodId').value = data.id || ''
    document.getElementById('prodCategoria').value = data.categoria_id
    document.getElementById('prodNombre').value = data.nombre
    document.getElementById('prodPrecio').value = data.precio_usd
    document.getElementById('prodActivo').checked = data.activo
    document.getElementById('prodInventario').checked = data.maneja_inventario
    document.getElementById('stockRow').style.display = data.maneja_inventario ? 'block' : 'none'
    document.getElementById('prodStock').value = data.stock
    document.getElementById('btnGuardarProducto').textContent = 'Actualizar'
    document.getElementById('btnCancelar').style.display = 'inline-block'
    document.getElementById('prodStatus').textContent = ''
  })
}

function cancelarEdicion() {
  document.getElementById('prodId').value = ''
  document.getElementById('prodCategoria').value = ''
  document.getElementById('prodNombre').value = ''
  document.getElementById('prodPrecio').value = ''
  document.getElementById('prodActivo').checked = true
  document.getElementById('prodInventario').checked = false
  document.getElementById('stockRow').style.display = 'none'
  document.getElementById('prodStock').value = 0
  document.getElementById('btnGuardarProducto').textContent = 'Agregar'
  document.getElementById('btnCancelar').style.display = 'none'
  document.getElementById('prodStatus').textContent = ''
}

async function guardarProducto() {
  const id = document.getElementById('prodId').value
  const categoria_id = +document.getElementById('prodCategoria').value
  const nombre = document.getElementById('prodNombre').value.trim()
  const precio_usd = +document.getElementById('prodPrecio').value
  const activo = document.getElementById('prodActivo').checked
  const maneja_inventario = document.getElementById('prodInventario').checked
  const stock = +document.getElementById('prodStock').value || 0

  if (!categoria_id || !nombre || !precio_usd) {
    document.getElementById('prodStatus').textContent = 'Completa todos los campos'
    document.getElementById('prodStatus').style.color = 'var(--danger)'
    return
  }

  let error

  if (id) {
    ({ error } = await supabase.from('productos').update({
      categoria_id, nombre, precio_usd, activo, maneja_inventario, stock
    }).eq('id', id))
  } else {
    ({ error } = await supabase.from('productos').insert({
      categoria_id, nombre, precio_usd, activo, maneja_inventario, stock
    }))
  }

  if (error) {
    document.getElementById('prodStatus').textContent = 'Error: ' + error.message
    document.getElementById('prodStatus').style.color = 'var(--danger)'
    return
  }

  cancelarEdicion()
  document.getElementById('prodStatus').textContent = '✅ Producto guardado'
  document.getElementById('prodStatus').style.color = 'var(--success)'
  await cargarProductosAdmin()
  await cargarProductos()
  renderCategoriaTabs()
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) {
    alert('Error: ' + error.message)
    return
  }
  cancelarEdicion()
  await cargarProductosAdmin()
  await cargarProductos()
  renderCategoriaTabs()
}
