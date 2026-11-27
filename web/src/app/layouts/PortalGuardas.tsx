import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Link as MuiLink, Typography } from '@mui/material'
import { useAuth, esInterno } from '../../lib/auth'
import type { Rol } from '../../lib/auth'
import AppLayout from './AppLayout'
import { Cargando, Pagina } from '../../components/ui/primitivos'

// Protege el portal: sin sesión → /login conservando la ruta de origen.
export function RequireAuth() {
  const { usuario, loading } = useAuth()
  const ubicacion = useLocation()

  if (loading) {
    return (
      <Pagina maxWidth="sm">
        <Cargando texto="Comprobando sesión…" />
      </Pagina>
    )
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
    <Pagina maxWidth="sm">
      <Typography variant="h2">Portal en construcción</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Las vistas de tu rol llegan en las siguientes fases del proyecto.
      </Typography>
      <MuiLink component={Link} to="/app" sx={{ display: 'inline-block', mt: 3 }}>
        Volver
      </MuiLink>
    </Pagina>
  )
}

export { esInterno }
