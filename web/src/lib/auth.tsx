// Contexto de autenticación: sesión por cookie, CSRF y rol del usuario.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { get, post, patch, setCsrfToken, setManejadorSesionExpirada } from './api'

export type Rol = 'ADMIN' | 'COORDINADOR' | 'TECNICO' | 'CLIENTE'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  organizacionId: string | null
}

interface SesionActual {
  usuario: Usuario
  csrfToken: string
}

interface ValorAuth {
  usuario: Usuario | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  cambiarPassword: (actual: string, nueva: string) => Promise<void>
}

const AuthContext = createContext<ValorAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  const cerrarSesionLocal = useCallback(() => {
    setCsrfToken(null)
    setUsuario(null)
  }, [])

  // Al expirar la sesión en cualquier petición, se limpia el estado local.
  useEffect(() => {
    setManejadorSesionExpirada(cerrarSesionLocal)
    return () => setManejadorSesionExpirada(null)
  }, [cerrarSesionLocal])

  useEffect(() => {
    let activo = true
    async function restaurarSesion() {
      try {
        const sesion = await get<SesionActual>('/auth/me')
        if (!activo) return
        setCsrfToken(sesion.csrfToken)
        setUsuario(sesion.usuario)
      } catch {
        if (activo) cerrarSesionLocal()
      } finally {
        if (activo) setLoading(false)
      }
    }
    void restaurarSesion()
    return () => { activo = false }
  }, [cerrarSesionLocal])

  const login = useCallback(async (email: string, password: string) => {
    const sesion = await post<SesionActual>('/auth/login', { email, password })
    setCsrfToken(sesion.csrfToken)
    setUsuario(sesion.usuario)
  }, [])

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout')
    } finally {
      cerrarSesionLocal()
    }
  }, [cerrarSesionLocal])

  const cambiarPassword = useCallback(async (actual: string, nueva: string) => {
    await patch('/auth/password', { actual, nueva })
  }, [])

  const valor = useMemo<ValorAuth>(() => ({
    usuario,
    loading,
    login,
    logout,
    cambiarPassword,
  }), [usuario, loading, login, logout, cambiarPassword])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth(): ValorAuth {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return contexto
}

// El historial de auditoría y las notas son internos.
export function esInterno(usuario: Usuario | null): boolean {
  return usuario?.rol === 'ADMIN' || usuario?.rol === 'COORDINADOR'
}
