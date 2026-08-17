const LS_USER_KEY = 'esds_user'

let _userCurrent = null

function userInit() {
  try {
    const raw = localStorage.getItem(LS_USER_KEY)
    if (raw) _userCurrent = JSON.parse(raw)
  } catch {}
}

function userCurrent() {
  return _userCurrent
}

function userIsLoggedIn() {
  return _userCurrent !== null && _userCurrent.id && _userCurrent.nombre
}

async function userLogin(nombre) {
  const trim = (nombre || '').trim()
  if (!trim) return false
  const { data } = await supabase.from('usuarios').select('*').eq('nombre', trim).eq('activo', true).single()
  if (!data) return false
  _userCurrent = { id: data.id, nombre: data.nombre }
  localStorage.setItem(LS_USER_KEY, JSON.stringify(_userCurrent))
  return true
}

function userLogout() {
  _userCurrent = null
  localStorage.removeItem(LS_USER_KEY)
  pedidos = []
  pedidoIdx = -1
  pedidoCounter = 0
}

function userShowLogin() {
  document.getElementById('loginOverlay').style.display = 'flex'
  const input = document.getElementById('loginInput')
  requestAnimationFrame(() => { input.focus(); input.select() })
}

function userHideLogin() {
  document.getElementById('loginOverlay').style.display = 'none'
}

function renderUserBadge() {
  const badge = document.getElementById('userBadge')
  if (!badge) return
  if (userIsLoggedIn()) {
    badge.innerHTML = `<span class="user-badge-name">${escHtml(_userCurrent.nombre)}</span>
      <button class="user-badge-logout" onclick="userDoLogout()" title="Cerrar sesión">✕</button>`
    badge.style.display = 'flex'
  } else {
    badge.style.display = 'none'
  }
}

async function userDoLogin() {
  const input = document.getElementById('loginInput')
  const err = document.getElementById('loginError')
  const nombre = input.value.trim()
  if (!nombre) { err.textContent = 'Ingresa un nombre'; return }
  err.textContent = 'Buscando...'
  const ok = await userLogin(nombre)
  if (ok) {
    userHideLogin()
    renderUserBadge()
    navigate('caja')
  } else {
    err.textContent = 'Usuario no encontrado'
    input.value = ''
    input.focus()
  }
}

function userDoLogout() {
  if (!confirm('¿Cerrar sesión? Se perderán los pedidos abiertos.')) return
  userLogout()
  renderUserBadge()
  navigate('caja')
  userShowLogin()
}

function userLoginKeyHandler(e) {
  if (e.key === 'Enter') { e.preventDefault(); userDoLogin() }
}

userInit()
