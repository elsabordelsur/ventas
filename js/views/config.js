async function cargarConfig() {
  const { data } = await supabase.from('configuracion').select('tasa_bcv').eq('id', 1).single()
  if (data) {
    document.getElementById('tasaBcvInput').value = data.tasa_bcv
    tasaBcvActual = data.tasa_bcv
  }
  await cargarCategoriasSelect()
  await cargarProductosAdmin()
}

async function guardarTasa() {
  const tasa = +document.getElementById('tasaBcvInput').value
  if (!tasa || tasa <= 0) {
    document.getElementById('configStatus').textContent = 'Ingresa una tasa válida'
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  const { error } = await supabase.from('configuracion').update({
    tasa_bcv: tasa,
    fecha_actualizacion: new Date().toISOString()
  }).eq('id', 1)

  if (error) {
    document.getElementById('configStatus').textContent = 'Error: ' + error.message
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  tasaBcvActual = tasa
  document.getElementById('configStatus').textContent = '✅ Tasa actualizada correctamente'
  document.getElementById('configStatus').style.color = 'var(--success)'
}

async function cargarCategoriasSelect() {
  const { data } = await supabase.from('categorias').select('*').eq('activa', true).order('id')
  const select = document.getElementById('prodCategoria')
  if (!data) return
  select.innerHTML = '<option value="">Seleccionar categoría</option>' +
    data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')
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
        <div class="prod-item-nombre">${p.nombre}</div>
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

  if (!categoria_id || !nombre || !precio_usd) {
    document.getElementById('prodStatus').textContent = 'Completa todos los campos'
    document.getElementById('prodStatus').style.color = 'var(--danger)'
    return
  }

  let error

  if (id) {
    ({ error } = await supabase.from('productos').update({ categoria_id, nombre, precio_usd, activo }).eq('id', id))
  } else {
    ({ error } = await supabase.from('productos').insert({ categoria_id, nombre, precio_usd, activo }))
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
