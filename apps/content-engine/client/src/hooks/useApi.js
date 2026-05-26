import { useState, useEffect, useCallback } from 'react'

export function useApi(path, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError]     = useState(null)

  const fetch_ = useCallback(async () => {
    if (path === null) return   // skip — caller manages this fetch elsewhere
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api${path}`)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => { fetch_() }, [fetch_, ...deps])

  return { data, loading, error, refetch: fetch_ }
}

export async function apiPost(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}

export async function apiPut(path, body) {
  const res = await fetch(`/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}

export async function apiDelete(path) {
  const res = await fetch(`/api${path}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}

export function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
