const LS_PENDING_KEY = 'esds_pending'

function syncInit() {
  window.addEventListener('online', () => {
    syncBadgeUpdate()
    syncProcesarCola()
  })
  window.addEventListener('offline', () => {
    syncBadgeUpdate()
  })
  syncBadgeUpdate()
}

function syncIsOnline() {
  return navigator.onLine
}

function syncCola() {
  try {
    return JSON.parse(localStorage.getItem(LS_PENDING_KEY) || '[]')
  } catch { return [] }
}

function syncAgregar(venta) {
  const cola = syncCola()
  cola.push({ venta, timestamp: Date.now() })
  localStorage.setItem(LS_PENDING_KEY, JSON.stringify(cola))
  syncBadgeUpdate()
}

async function syncProcesarCola() {
  const cola = syncCola()
  if (cola.length === 0) return
  const pendientes = []
  for (const item of cola) {
    try {
      const { error } = await supabase.from('ventas').insert(item.venta)
      if (error) pendientes.push(item)
    } catch {
      pendientes.push(item)
    }
  }
  localStorage.setItem(LS_PENDING_KEY, JSON.stringify(pendientes))
  syncBadgeUpdate()
}

function syncBadgeUpdate() {
  const badge = document.getElementById('syncBadge')
  if (!badge) return
  const pending = syncCola().length
  if (!navigator.onLine) {
    badge.innerHTML = `<span class="sync-offline">SIN CONEXIÓN</span>`
    badge.style.display = 'flex'
  } else if (pending > 0) {
    badge.innerHTML = `<span class="sync-pending">${pending} pendiente${pending > 1 ? 's' : ''}</span>`
    badge.style.display = 'flex'
  } else {
    badge.style.display = 'none'
  }
}

syncInit()
