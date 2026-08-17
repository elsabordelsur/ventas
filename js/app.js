window.addEventListener('error', e => {
  console.error('GLOBAL:', e.message, e.filename, e.lineno)
})

function parseEmoji(el) {
  if (typeof twemoji !== 'undefined') {
    twemoji.parse(el || document.body, { folder: 'svg', ext: '.svg' })
  }
}

function toggleMenu(force) {
  const d = document.getElementById('menuDropdown')
  const o = document.getElementById('menuOverlay')
  if (force === false) {
    d.classList.remove('active'); o.classList.remove('active')
  } else {
    d.classList.toggle('active'); o.classList.toggle('active')
  }
}

function navigate(view) {
  if (view !== 'login' && !userIsLoggedIn()) {
    userShowLogin()
    return
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.getElementById(`view-${view}`).classList.add('active')
  toggleMenu(false)

  if (view === 'caja') {
    Promise.all([cargarTasa(), cargarCategorias()]).then(() =>
      cargarProductos().then(() => {
        renderCategoriaTabs()
        cargarPedidosAbiertos()
        parseEmoji()
      })
    ).catch(e => console.error('Error cargando caja:', e))
  }

  if (view === 'config') {
    const el = document.getElementById('productosLista')
    if (el) el.innerHTML = '<div class="loading-indicator">Cargando...</div>'
    cargarConfig().then(() => parseEmoji()).catch(e => console.error('Error cargando config:', e))
  }
  if (view === 'cierre') {
    const el = document.getElementById('cierreGrid')
    if (el) el.style.opacity = '0.5'
    cargarCierre().then(() => { if (el) el.style.opacity = '1'; parseEmoji() }).catch(e => {
      console.error('Error cargando cierre:', e)
      if (el) el.style.opacity = '1'
    })
  }
  if (view === 'historial') {
    const fechaInput = document.getElementById('historialFecha')
    if (fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().split('T')[0]
    cargarHistorial().then(() => parseEmoji()).catch(e => console.error('Error cargando historial:', e))
  }
  if (view === 'estadisticas') {
    const el = document.getElementById('estadisticasBody')
    if (el) el.innerHTML = '<div class="loading-indicator">Cargando...</div>'
    cargarEstadisticas().then(() => parseEmoji()).catch(e => console.error('Error cargando estadísticas:', e))
  }
  if (view === 'resumen') {
    const el = document.getElementById('resumenBody')
    if (el) el.innerHTML = '<div class="loading-indicator">Cargando...</div>'
    cargarResumen().then(() => parseEmoji()).catch(e => console.error('Error cargando resumen:', e))
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(r => {
    r.addEventListener('updatefound', () => {
      const newSW = r.installing
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'activated') window.location.reload()
      })
    })
    if (r.active) r.update()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  themeInit()
  if (userIsLoggedIn()) {
    renderUserBadge()
    navigate('caja')
  } else {
    userShowLogin()
  }
})
