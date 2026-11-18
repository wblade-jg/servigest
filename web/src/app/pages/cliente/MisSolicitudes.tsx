import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, ApiError } from '../../../lib/api'
import {
  type ListadoSolicitudes,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import { BadgeEstado, Entrada, Selector, Boton, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

const LIMITE = 20

// Listado de solicitudes del Cliente. El backend filtra siempre por su
// organización; aquí solo se presenta y se filtra por estado.

export default function MisSolicitudes () {
  const [listado, setListado] = useState<ListadoSolicitudes | null>(null)
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) })
    if (estado) params.set('estado', estado)
    if (q) params.set('q', q)
    try {
      setListado(await get<ListadoSolicitudes>(`/solicitudes?${params.toString()}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus solicitudes.')
    } finally {
      setCargando(false)
    }
  }, [page, estado, q])

  useEffect(() => { void cargar() }, [cargar])

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => { setQ(texto); setPage(1) }, 350)
    return () => clearTimeout(temporizador)
  }, [texto])

  const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / LIMITE)) : 1

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mis solicitudes</h1>
          <p className="mt-2 text-sm text-tinta-700">
            Requerimientos de tu organización. Puedes cancelar una solicitud antes de su aprobación.
          </p>
        </div>
        <Link
          to="/app/mis-solicitudes/nueva"
          className="rounded-md bg-violeta-500 px-4 py-2 font-display text-sm font-bold text-white hover:bg-violeta-700"
        >
          Nueva solicitud
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Entrada
          aria-label="Buscar solicitudes"
          placeholder="Buscar por código o descripción…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="max-w-xs"
        />
        <Selector
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1) }}
          className="max-w-xs"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => (
            <option key={clave} value={clave}>{etiqueta}</option>
          ))}
        </Selector>
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}

      {cargando && !listado && <div className="mt-8"><Cargando texto="Cargando solicitudes…" /></div>}

      {listado && listado.data.length === 0 && (
        <div className="mt-8 rounded-lg border border-tinta-900/10 bg-white p-8 text-center">
          <p className="text-tinta-700">Aún no hay solicitudes registradas.</p>
          <Link to="/app/mis-solicitudes/nueva" className="mt-3 inline-block text-violeta-500 underline">
            Crear la primera solicitud
          </Link>
        </div>
      )}

      {listado && listado.data.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {listado.data.map((s) => (
              <li key={s.id} className="rounded-lg border border-tinta-900/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/app/mis-solicitudes/${s.id}`} className="font-display text-lg font-bold text-violeta-700 hover:underline">
                        {s.codigo}
                      </Link>
                      <BadgeEstado estado={s.estado} texto={ETIQUETAS_ESTADO[s.estado] ?? s.estado} />
                      {s.prioridad && (
                        <span className="text-xs text-tinta-500">
                          Prioridad {ETIQUETAS_PRIORIDAD[s.prioridad] ?? s.prioridad}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-tinta-700">{s.descripcion}</p>
                    <p className="mt-2 text-xs text-tinta-500">
                      {s.categoriaNombre ?? 'Sin categoría'} · Creada {fechaLocal(s.fechaCreacion)} · SLA {fechaLocal(s.fechaObjetivo)}
                    </p>
                  </div>
                  <Link to={`/app/mis-solicitudes/${s.id}`} className="shrink-0">
                    <Boton variante="secundario">Ver detalle</Boton>
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-tinta-500">
              {listado.total} solicitud{listado.total === 1 ? '' : 'es'} · Página {page} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <Boton variante="secundario" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Boton>
              <Boton variante="secundario" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Boton>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
