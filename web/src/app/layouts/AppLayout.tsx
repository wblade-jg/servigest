import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { ETIQUETAS_ROL } from '../../lib/admin'
import { Boton } from '../../components/ui/primitivos'

// Layout del portal interno: sidebar de navegación y encabezado con la cuenta.
export default function AppLayout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useAuth()

  return (
    <div className="min-h-screen lg:flex">
      <aside className="flex flex-col bg-tinta-900 text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <Link to="/app" className="flex items-center gap-3 px-6 py-5">
          <img src="/servigest-logo.png" alt="" className="h-8 w-auto brightness-0 invert" />
          <span className="font-display font-bold tracking-tight">ServiGest</span>
        </Link>

        <nav aria-label="Portal" className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:px-3 lg:pb-0">
          {usuario?.rol === 'TECNICO' && <EnlaceSidebar to="/app/agenda" texto="Mi agenda" />}
          {usuario?.rol === 'CLIENTE' && (
            <>
              <EnlaceSidebar to="/app/mis-solicitudes" texto="Mis solicitudes" />
              <EnlaceSidebar to="/app/dashboard" texto="Dashboard" />
            </>
          )}
          {(usuario?.rol === 'ADMIN' || usuario?.rol === 'COORDINADOR') && (
            <>
              <EnlaceSidebar to="/app/solicitudes" texto="Solicitudes" />
              <EnlaceSidebar to="/app/dashboard" texto="Dashboard" />
            </>
          )}
          {usuario?.rol === 'ADMIN' && (
            <>
              <EnlaceSidebar to="/app/organizaciones" texto="Organizaciones" />
              <EnlaceSidebar to="/app/usuarios" texto="Usuarios" />
              <EnlaceSidebar to="/app/tecnicos" texto="Técnicos" />
              <EnlaceSidebar to="/app/catalogos" texto="Catálogos" />
            </>
          )}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 px-6 py-4 text-sm lg:block">
          <p className="font-display font-bold">{usuario?.nombre}</p>
          <p className="text-xs text-white/60">{ETIQUETAS_ROL[usuario?.rol ?? ''] ?? usuario?.rol}</p>
          <Boton variante="fantasma" className="mt-3 !text-white/70" onClick={() => void logout()}>
            Cerrar sesión
          </Boton>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-tinta-900/10 bg-white px-6 py-3 lg:hidden">
          <div>
            <p className="font-display font-bold">{usuario?.nombre}</p>
            <p className="text-xs text-tinta-500">{ETIQUETAS_ROL[usuario?.rol ?? ''] ?? usuario?.rol}</p>
          </div>
          <Boton variante="secundario" onClick={() => void logout()}>
            Salir
          </Boton>
        </header>
        <main className="flex-1 bg-lavanda">{children}</main>
      </div>
    </div>
  )
}

function EnlaceSidebar({ to, texto }: { to: string; texto: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 whitespace-nowrap transition-colors ${
          isActive ? 'bg-violeta-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {texto}
    </NavLink>
  )
}
