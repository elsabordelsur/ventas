window.addEventListener('error', e => {
  console.error('GLOBAL:', e.message, e.filename, e.lineno)
})

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))

  document.getElementById(`view-${view}`).classList.add('active')
  document.querySelector(`.nav-btn[data-view="${view}"]`).classList.add('active')

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

document.addEventListener('DOMContentLoaded', () => {
  navigate('caja')
})
