import { useState, useEffect, useCallback } from 'react'

export const FINANCE_BASE = '/api/finance'

export function useFinanceApi(path, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError]     = useState(null)

  const fetch_ = useCallback(async () => {
    if (path === null) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${FINANCE_BASE}${path}`)
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

export async function financePost(path, body) {
  const res = await fetch(`${FINANCE_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}

export async function financePut(path, body) {
  const res = await fetch(`${FINANCE_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}

export async function financeDelete(path) {
  const res = await fetch(`${FINANCE_BASE}${path}`, { method: 'DELETE' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? res.statusText)
  return json
}
