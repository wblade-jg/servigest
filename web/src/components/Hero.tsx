import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Hero() {
  const [token, setToken] = useState('')
  const navigate = useNavigate()

  const consultar = (e: FormEvent) => {
    e.preventDefault()
    const limpio = token.trim()
    if (limpio) navigate(`/seguimiento/${encodeURIComponent(limpio)}`)
  }

  return (
    <section className="border-b border-tinta-900/10 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Contenido principal y acciones */}
          <div className="lg:col-span-7">
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-tinta-950 sm:text-5xl lg:text-6xl">
              Soporte tecnológico gestionado, sin departamento interno de TI.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-tinta-700">
              Diagnóstico y resolución de incidencias, mantenimiento planificado y
              consultoría para pymes del Ecuador. Cada solicitud queda registrada
              con un código y puedes seguir su estado en línea.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/solicitar"
                className="rounded-md bg-violeta-500 px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-violeta-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
              >
                Solicitar asistencia
              </Link>
              <Link
                to="/servicios"
                className="rounded-md border border-tinta-900/20 px-6 py-3 font-display text-sm font-bold text-tinta-900 transition-colors hover:border-violeta-500 hover:text-violeta-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
              >
                Ver servicios
              </Link>
            </div>

            <form
              onSubmit={consultar}
              className="mt-10 max-w-xl rounded-lg border border-tinta-900/15 bg-lavanda/60 p-5"
              aria-label="Seguimiento de una solicitud"
            >
              <label
                htmlFor="token-seguimiento"
                className="block font-display text-sm font-bold text-tinta-900"
              >
                ¿Ya enviaste una solicitud?
              </label>
              <p className="mt-1 text-sm text-tinta-700">
                Ingresa el código que se generó al registrarla.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  id="token-seguimiento"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="SOL-2026-00001"
                  className="w-full flex-1 rounded-md border border-tinta-900/20 bg-white px-3 py-2 font-mono text-sm text-tinta-950 placeholder:text-tinta-500/50 focus:border-violeta-500 focus:outline-none focus:ring-1 focus:ring-violeta-500"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-md border border-violeta-500 px-4 py-2 font-display text-sm font-bold text-violeta-500 transition-colors hover:bg-violeta-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
                >
                  Consultar
                </button>
              </div>
            </form>
          </div>

          {/* Ilustración institucional */}
          <div className="flex justify-center lg:col-span-5">
            <div className="relative w-full max-w-md lg:max-w-none">
              <img
                src="/hero-illustration.png"
                alt="Infraestructura y soporte tecnológico gestionado de ServiGest"
                className="h-auto w-full object-contain"
                width={862}
                height={651}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

