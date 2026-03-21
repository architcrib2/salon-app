/**
 * @file Authentication context.
 * Stores JWT tokens in localStorage, provides login/logout helpers,
 * attaches Authorization header to all Axios requests via interceptor,
 * and handles 401 → auto-refresh token flow.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

/** Token storage keys */
const ACCESS_KEY = 'salon_access'
const REFRESH_KEY = 'salon_refresh'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(ACCESS_KEY))

  // ── Axios default header ──────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // ── Fetch current user on mount if token exists ───────────────────────────
  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me/')
        .then(res => setUser(res.data.data))
        .catch(() => logout())
        .finally(() => setLoading(false))
    }
  }, [])

  // ── Response interceptor: handle 401 → try refresh ───────────────────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const original = err.config
        if (err.response?.status === 401 && !original._retry) {
          original._retry = true
          const refresh = localStorage.getItem(REFRESH_KEY)
          if (refresh) {
            try {
              const res = await axios.post('/api/auth/refresh/', { refresh })
              const newAccess = res.data.access
              localStorage.setItem(ACCESS_KEY, newAccess)
              setToken(newAccess)
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`
              original.headers['Authorization'] = `Bearer ${newAccess}`
              return axios(original)
            } catch {
              logout()
            }
          } else {
            logout()
          }
        }
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  const login = async (username, password) => {
    const res = await axios.post('/api/auth/login/', { username, password })
    const { access, refresh } = res.data
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
    setToken(access)
    axios.defaults.headers.common['Authorization'] = `Bearer ${access}`
    // Fetch user info
    const meRes = await axios.get('/api/auth/me/')
    setUser(meRes.data.data)
    return meRes.data.data
  }

  const logout = () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
