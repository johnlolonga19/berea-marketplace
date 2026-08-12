import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { auth } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    auth
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem('access_token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const token = await auth.login(email, password)
    localStorage.setItem('access_token', token)
    setUser(await auth.me())
  }

  async function register(email: string, password: string, fullName: string) {
    // Accounts start unverified, so we can't log in yet - the caller sends
    // the user to /verify-email to enter the code from their inbox.
    await auth.register({ email, password, full_name: fullName })
  }

  async function verifyCode(email: string, code: string) {
    const token = await auth.verifyCode(email, code)
    localStorage.setItem('access_token', token)
    setUser(await auth.me())
  }

  function logout() {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
