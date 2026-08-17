function alertsCheck(lista) {
  if (!lista) return []
  return lista.filter(p => p.maneja_inventario && p.stock <= (p.stock_minimo || 5))
}

function alertsRender(lista) {
  const zone = document.getElementById('stockAlertZone')
  if (!zone) return
  const bajos = alertsCheck(lista)
  if (bajos.length === 0) { zone.innerHTML = ''; return }
  zone.innerHTML = `<div class="stock-alert-banner">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 1.5L1.5 13h13L8 1.5z"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="11" r="0.5" fill="currentColor"/></svg>
    <span>Stock bajo: ${bajos.map(p => `${escHtml(p.nombre)} (${p.stock})`).join(', ')}</span>
  </div>`
}

function alertsBadge(lista) {
  const count = alertsCheck(lista).length
  if (count === 0) return ''
  return `<span class="menu-alert-badge">${count}</span>`
}
