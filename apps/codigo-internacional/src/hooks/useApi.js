import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

function authHeaders(extra = {}) {
  const t = localStorage.getItem('ci_token')
  return { ...extra, ...(t ? { Authorization: `Bearer ${t}` } : {}) }
}

function handle401(res) {
  if (res.status === 401) {
    localStorage.removeItem('ci_token')
    localStorage.removeItem('ci_user')
    if (!location.pathname.startsWith('/login')) location.href = '/login'
  }
}

export function useApi(path, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState(null)

  const fetch_ = useCallback(async () => {
    if (path === null) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api${path}`, { headers: authHeaders() })
      if (!res.ok) { handle401(res); throw new Error(`${res.status} ${res.statusText}`) }
      setData(await res.json())
    } catch (e) { setError(e.message) } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => { fetch_() }, [fetch_, ...deps])
  return { data, loading, error, refetch: fetch_ }
}

async function mutate(method, path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) { handle401(res); throw new Error(json.error ?? res.statusText) }
  return json
}

export const apiPost = (path, body) => mutate('POST', path, body)
export const apiPatch = (path, body) => mutate('PATCH', path, body)
export const apiDelete = (path) => mutate('DELETE', path)

export function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
