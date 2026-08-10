import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { auth } from '../lib/api'
import type { User } from '../types'

// Must match backend/app/seed.py's DEMO_EMAIL/DEMO_PASSWORD.
const DEMO_EMAIL = 'demo@berea.edu'
const DEMO_PASSWORD = 'demopassword123'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      auth
        .me()
        .then(setUser)
        .catch(() => localStorage.removeItem('access_token'))
        .finally(() => setLoading(false))
      return
    }

    if (import.meta.env.DEV) {
      login(DEMO_EMAIL, DEMO_PASSWORD)
        .catch(() => {
          // Seed data not loaded yet (run `python -m app.seed` in backend/) - fall
          // back to the normal logged-out state instead of blocking the app.
        })
        .finally(() => setLoading(false))
      return
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email: string, password: string) {
    const token = await auth.login(email, password)
    localStorage.setItem('access_token', token)
    setUser(await auth.me())
  }

  async function register(email: string, password: string, fullName: string) {
    await auth.register({ email, password, full_name: fullName })
    await login(email, password)
  }

  function logout() {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
