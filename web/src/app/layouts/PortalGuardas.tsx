import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, esInterno } from '../../lib/auth'
import type { Rol } from '../../lib/auth'
import AppLayout from './AppLayout'
import { Cargando } from '../../components/ui/primitivos'

// Protege el portal: sin sesión → /login conservando la ruta de origen.
export function RequireAuth() {
  const { usuario, loading } = useAuth()
  const ubicacion = useLocation()

  if (loading) {
    return <section className="mx-auto max-w-2xl px-6 py-16"><Cargando texto="Comprobando sesión…" /></section>
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: ubicacion.pathname }} />
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

// Restringe una ruta a roles concretos; roles sin portal aún → aviso de fase.
export function RequireRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (roles.includes(usuario.rol)) return <>{children}</>
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-2xl font-bold">Portal en construcción</h1>
      <p className="mt-3 text-tinta-700">
        Las vistas de tu rol llegan en las siguientes fases del proyecto.
      </p>
      <Link to="/app" className="mt-6 inline-block text-violeta-500 underline">
        Volver
      </Link>
    </section>
  )
}

export { esInterno }
