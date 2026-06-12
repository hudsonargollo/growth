import { createContext, useContext, useState, useCallback } from 'react'

const AuthCtx = createContext(null)
const TKEY = 'ci_token'
const UKEY = 'ci_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TKEY))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(UKEY) || 'null') } catch { return null }
  })

  const login = useCallback((tok, usr) => {
    localStorage.setItem(TKEY, tok)
    localStorage.setItem(UKEY, JSON.stringify(usr))
    setToken(tok); setUser(usr)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TKEY); localStorage.removeItem(UKEY)
    setToken(null); setUser(null)
  }, [])

  return <AuthCtx.Provider value={{ token, user, login, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
