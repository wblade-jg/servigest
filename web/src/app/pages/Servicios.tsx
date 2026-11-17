import { useEffect, useState } from 'react'
import { get, ApiError } from '../../lib/api'
import type { Categoria } from '../../lib/solicitudes'

export default function Servicios() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo de servicios.')
      })
  }, [])

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Servicios</h1>
      <p className="mt-4 max-w-2xl text-lg text-tinta-700">
        Categorías disponibles para solicitar asistencia técnica gestionada.
      </p>

      {error && (
        <p className="mt-8 rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</p>
      )}

      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categorias?.map((c) => (
          <li key={c.id} className="rounded-lg border border-tinta-900/10 bg-white p-6">
            <h2 className="font-display text-lg font-bold">{c.nombre}</h2>
            {c.descripcion && (
              <p className="mt-2 text-sm text-tinta-700">{c.descripcion}</p>
            )}
            {c.especialidad && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-violeta-500">
                {c.especialidad}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <a
          href="/solicitar"
          className="inline-block rounded-md bg-violeta-500 px-6 py-3 font-display font-bold text-white transition-colors hover:bg-violeta-700"
        >
          Solicitar asistencia
        </a>
      </div>
    </section>
  )
}
