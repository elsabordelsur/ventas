const LS_THEME_KEY = 'esds_theme'

function themeInit() {
  const saved = localStorage.getItem(LS_THEME_KEY) || 'light'
  document.documentElement.setAttribute('data-theme', saved)
  themeUpdateButton()
}

function themeGet() {
  return document.documentElement.getAttribute('data-theme') || 'light'
}

function themeToggle() {
  const current = themeGet()
  const next = current === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem(LS_THEME_KEY, next)
  themeUpdateButton()
}

function themeUpdateButton() {
  const btn = document.getElementById('themeToggle')
  if (!btn) return
  const isDark = themeGet() === 'dark'
  btn.innerHTML = isDark
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  btn.title = isDark ? 'Modo claro' : 'Modo oscuro'
}

themeInit()
