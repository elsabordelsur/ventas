const SUPABASE_URL = 'https://putmambqopgifxnhervv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dG1hbWJxb3BnaWZ4bmhlcnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMTA0NDEsImV4cCI6MjEwMDg4NjQ0MX0.SsdwPlwc4vKx0HzlpOo8UGt7j7l8ZO9RER0BMVQIxX4'

async function sbFetch(path, opts = {}) {
  const url = SUPABASE_URL + '/rest/v1/' + path
  const h = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }
  if (opts.headers) Object.assign(h, opts.headers)
  const res = await fetch(url, { ...opts, headers: h })
  if (res.status === 204) return { data: null, error: null }
  const text = await res.text()
  if (!res.ok) return { data: null, error: { message: text } }
  try { return { data: JSON.parse(text), error: null } } catch { return { data: text, error: null } }
}

function SBQ(table) {
  const q = { _filters: [], _order: '', _limit: '', _single: false, _method: 'GET', _body: null, _headers: {} }
  const exec = async () => {
    let path = table + '?select=' + (q._cols || '*')
    q._filters.forEach(f => { path += '&' + f })
    if (q._order) path += '&order=' + q._order
    if (q._limit) path += '&limit=' + q._limit
    if (q._single) path += '&limit=1'
    if (q._method === 'GET') {
      const r = await sbFetch(path)
      if (q._single) return { data: r.data?.[0] || null, error: r.error }
      return r
    }
    if (q._method === 'POST') {
      const r = await sbFetch(table, { method: 'POST', body: JSON.stringify(q._body), headers: q._headers })
      if (q._single) return { data: (Array.isArray(r.data) ? r.data[0] : r.data) || null, error: r.error }
      return r
    }
    const f = q._filters.join('&')
    const p = f ? '?' + f : ''
    return sbFetch(table + p, { method: q._method, body: q._body ? JSON.stringify(q._body) : undefined, headers: q._headers })
  }
  q.then = (resolve) => { exec().then(resolve) }
  q.eq = (c, v) => { q._filters.push(encodeURIComponent(c) + '=eq.' + encodeURIComponent(v)); return q }
  q.gte = (c, v) => { q._filters.push(encodeURIComponent(c) + '=gte.' + encodeURIComponent(v)); return q }
  q.lte = (c, v) => { q._filters.push(encodeURIComponent(c) + '=lte.' + encodeURIComponent(v)); return q }
  q.order = (c, o) => { q._order = encodeURIComponent(c) + (o?.ascending === false ? '.desc' : ''); return q }
  q.limit = (n) => { q._limit = n; return q }
  q.single = () => { q._single = true; return q }
  q.maybeSingle = () => { q._single = true; return q }
  q.select = (c) => { q._cols = c; return q }
  return q
}

const supabase = {
  from: (table) => ({
    select: (c) => { const q = SBQ(table); q._method = 'GET'; q._cols = c || '*'; return q },
    insert: (data) => {
      const q = SBQ(table); q._method = 'POST'; q._body = data
      q.select = () => { q._headers['Prefer'] = 'return=representation'; return q }
      return q
    },
    update: (data) => {
      const q = SBQ(table); q._method = 'PATCH'; q._body = data
      return q
    },
    delete: () => {
      const q = SBQ(table); q._method = 'DELETE'
      return q
    }
  })
}