window.addEventListener('error', e => {
  console.error('GLOBAL:', e.message, e.filename, e.lineno)
})

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
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.getElementById(`view-${view}`).classList.add('active')
  toggleMenu(false)

  if (view === 'caja') {
    Promise.all([cargarTasa(), cargarCategorias()]).then(() =>
      cargarProductos().then(() => renderCategoriaTabs())
    ).catch(e => console.error('Error cargando caja:', e))
  }

  if (view === 'config') cargarConfig().catch(e => console.error('Error cargando config:', e))
  if (view === 'cierre') cargarCierre().catch(e => console.error('Error cargando cierre:', e))
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(r => {
    if (r.active) r.update()
  })
}

function toggleMenu() {
  const d = document.getElementById('menuDropdown')
  d.style.display = d.style.display === 'none' ? 'block' : 'none'
}

document.addEventListener('DOMContentLoaded', () => {
  navigate('caja')
})
