import { Link, NavLink } from 'react-router-dom'

const enlaces = [
  { to: '/servicios', texto: 'Servicios' },
  { to: '/planes', texto: 'Planes' },
  { to: '/contacto', texto: 'Contacto' },
]

export default function SiteHeader() {
  return (
    <header className="bg-white border-b border-tinta-900/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center">
          <img
            src="/servigest-logo.png"
            alt="ServiGest"
            className="h-10 w-auto"
          />
          <span className="sr-only">ServiGest Ecuador — inicio</span>
        </Link>
        <nav
          aria-label="Navegación principal"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
        >
          {enlaces.map((e) => (
            <NavLink
              key={e.to}
              to={e.to}
              className="text-tinta-700 transition-colors hover:text-violeta-500"
            >
              {e.texto}
            </NavLink>
          ))}
          <Link
            to="/login"
            className="rounded-md border border-violeta-500 px-3 py-1.5 font-display font-bold text-violeta-500 transition-colors hover:bg-violeta-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-500"
          >
            Ingresar al portal
          </Link>
        </nav>
      </div>
    </header>
  )
}
