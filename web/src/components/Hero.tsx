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
    <section className="bg-tinta-950 text-white">
      <div
        className="mx-auto max-w-6xl px-6 py-20 sm:py-28"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(123,88,245,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(123,88,245,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      >
        <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Soporte tecnológico gestionado, sin departamento interno de TI.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
          Diagnóstico y resolución de incidencias, mantenimiento planificado y
          consultoría para pymes del Ecuador. Cada solicitud queda registrada
          con un código y puedes seguir su estado en línea.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/solicitar"
            className="rounded-md bg-violeta-500 px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-violeta-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
          >
            Solicitar asistencia
          </Link>
          <Link
            to="/servicios"
            className="rounded-md border border-white/40 px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:border-violeta-400 hover:text-violeta-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
          >
            Ver servicios
          </Link>
        </div>

        <form
          onSubmit={consultar}
          className="mt-14 max-w-xl border border-white/25 bg-tinta-900/80 p-5"
          aria-label="Seguimiento de una solicitud"
        >
          <label
            htmlFor="token-seguimiento"
            className="block font-display text-sm font-bold"
          >
            ¿Ya enviaste una solicitud?
          </label>
          <p className="mt-1 text-sm text-white/70">
            Ingresa el código que se generó al registrarla.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              id="token-seguimiento"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="SOL-2026-00001"
              className="w-full flex-1 border border-white/30 bg-tinta-950 px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus:border-violeta-400 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 border border-violeta-400 px-4 py-2 font-display text-sm font-bold text-violeta-400 transition-colors hover:bg-violeta-400 hover:text-tinta-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-400"
            >
              Consultar
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
