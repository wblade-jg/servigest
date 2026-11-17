import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="bg-tinta-900 text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
        <div>
          <img src="/servigest-logo.png" alt="ServiGest" className="h-9 w-auto" />
          <p className="mt-3 text-sm leading-relaxed">
            Servicios tecnológicos gestionados y consultoría para pymes del
            Ecuador.
          </p>
        </div>
        <nav className="text-sm">
          <ul className="space-y-2">
            <li>
              <Link to="/servicios" className="hover:text-violeta-400">
                Servicios
              </Link>
            </li>
            <li>
              <Link to="/planes" className="hover:text-violeta-400">
                Planes
              </Link>
            </li>
            <li>
              <Link to="/solicitar" className="hover:text-violeta-400">
                Solicitar asistencia
              </Link>
            </li>
            <li>
              <Link to="/seguimiento" className="hover:text-violeta-400">
                Seguimiento de solicitud
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm">
          <p>Quito · Guayaquil</p>
          <p className="mt-2">Horario de atención: lunes a viernes, 08:00–17:00</p>
        </div>
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} ServiGest Ecuador · Proyecto demostrativo
      </div>
    </footer>
  )
}
