function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))

  document.getElementById(`view-${view}`).classList.add('active')
  document.querySelector(`.nav-btn[data-view="${view}"]`).classList.add('active')

  if (view === 'caja') {
    cargarTasa()
    cargarCategorias().then(() => {
      cargarProductos().then(() => renderCategoriaTabs())
    })
  }

  if (view === 'config') cargarConfig()
  if (view === 'cierre') cargarCierre()
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
}

document.addEventListener('DOMContentLoaded', () => {
  navigate('caja')
})
