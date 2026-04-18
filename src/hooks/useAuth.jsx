import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import bcrypt from 'bcryptjs'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cbt_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.removeItem('cbt_user') }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (studentId, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('student_id', studentId.trim().toUpperCase())
      .single()

    if (error || !data) throw new Error('Invalid Student ID or password')
    if (data.is_suspended) throw new Error('Your account has been suspended. Contact your administrator.')

    const isValid = await bcrypt.compare(password, data.hashed_password)
    if (!isValid) {
      // Also try plain password comparison for initial login
      if (password !== data.plain_password) throw new Error('Invalid Student ID or password')
    }

    const userData = {
      id: data.id,
      studentId: data.student_id,
      name: data.name,
      email: data.email,
      role: data.role,
      class: data.class,
      isSuspended: data.is_suspended
    }
    setUser(userData)
    localStorage.setItem('cbt_user', JSON.stringify(userData))
    return userData
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('cbt_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
