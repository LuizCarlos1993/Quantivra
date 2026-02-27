import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppUser } from '@/types'
import { authService } from '@/services/authService'

interface AuthContextType {
  user: AppUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.getSession().then((sessionUser) => {
      setUser(sessionUser)
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const result = await authService.login(email, password)
    if (result) {
      setUser(result)
    }
    return !!result
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-8 h-8 border-2 border-[#1a3d47] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
