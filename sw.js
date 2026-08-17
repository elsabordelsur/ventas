const CACHE_NAME = 'esds-cache-v17'
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/tailwind.css',
  './manifest.json',
  './js/supabaseClient.js',
  './js/pricingEngine.js',
  './js/modules/user.js',
  './js/modules/theme.js',
  './js/modules/alerts.js',
  './js/modules/export.js',
  './js/modules/sync.js',
  './js/views/caja.js',
  './js/views/config.js',
  './js/views/cierre.js',
  './js/views/historial.js',
  './js/views/estadisticas.js',
  './js/views/resumen.js',
  './js/app.js'
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)))
    return
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy))
        return res
      }).catch(() => caches.match('./index.html'))
    )
    return
  }

  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone()
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy))
      return res
    }))
  )
})
