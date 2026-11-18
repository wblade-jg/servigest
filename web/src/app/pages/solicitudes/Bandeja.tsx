import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, ApiError } from '../../../lib/api'
import { useSse } from '../../../lib/sse'
import {
  type ListadoSolicitudes,
  type Solicitud,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import { BadgeEstado, Boton, Entrada, Selector, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

const ESTADOS = [
  'RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA',
  'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA',
]

const LIMITE = 20

export default function Bandeja() {
  const [filtros, setFiltros] = useState({ estado: '', prioridad: '', origen: '', q: '' })
  const [page, setPage] = useState(1)
  const [listado, setListado] = useState<ListadoSolicitudes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')

  const construirConsulta = useCallback((p: number, f: typeof filtros) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(LIMITE))
    if (f.estado) params.set('estado', f.estado)
    if (f.prioridad) params.set('prioridad', f.prioridad)
    if (f.origen) params.set('origen', f.origen)
    if (f.q) params.set('q', f.q)
    return params.toString()
  }, [])

  const cargar = useCallback(async (p: number, f: typeof filtros) => {
    setCargando(true)
    try {
      setListado(await get<ListadoSolicitudes>(`/solicitudes?${construirConsulta(p, f)}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la bandeja.')
    } finally {
      setCargando(false)
    }
  }, [construirConsulta])

  useEffect(() => { void cargar(page, filtros) }, [cargar, page, filtros])

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setFiltros((f) => (f.q === texto ? f : { ...f, q: texto }))
      setPage(1)
    }, 350)
    return () => clearTimeout(temporizador)
  }, [texto])

  // SSE de coordinación: refetch sin recarga (el evento no llega con el detalle).
  const recargaPendiente = useRef(false)
  useSse(
    '/api/eventos/coordinacion',
    () => { recargaPendiente.current = true },
    () => { if (recargaPendiente.current) { recargaPendiente.current = false; void cargar(page, filtros) } },
  )

  const actualizarFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }))
    setPage(1)
  }

  const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / LIMITE)) : 1

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Solicitudes</h1>
      <p className="mt-1 text-sm text-tinta-500">
        {listado ? `${listado.total} solicitud${listado.total === 1 ? '' : 'es'}` : 'Consultando…'} · se actualiza en vivo
      </p>

      <div className="mt-6 grid gap-3 rounded-lg border border-tinta-900/10 bg-white p-4 sm:grid-cols-4">
        <Entrada
          type="search"
          placeholder="Buscar por código, contacto…"
          aria-label="Buscar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="sm:col-span-2"
        />
        <Selector aria-label="Estado" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETAS_ESTADO[e]}</option>)}
        </Selector>
        <Selector aria-label="Prioridad" value={filtros.prioridad} onChange={(e) => actualizarFiltro('prioridad', e.target.value)}>
          <option value="">Toda prioridad</option>
          {Object.entries(ETIQUETAS_PRIORIDAD).map(([clave, textoP]) => <option key={clave} value={clave}>{textoP}</option>)}
        </Selector>
        <Selector aria-label="Origen" value={filtros.origen} onChange={(e) => actualizarFiltro('origen', e.target.value)}>
          <option value="">Ambos orígenes</option>
          <option value="PUBLICO">Público</option>
          <option value="CLIENTE">Cliente</option>
        </Selector>
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {!error && (cargando || !listado) && <div className="mt-6"><Cargando /></div>}
      {!error && listado && !cargando && listado.data.length === 0 && (
        <p className="mt-6 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">
          No hay solicitudes con esos filtros.
        </p>
      )}

      {!error && listado && listado.data.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Técnico</th>
              </tr>
            </thead>
            <tbody>
              {listado.data.map((s: Solicitud) => (
                <tr key={s.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                  <td className="px-4 py-3 font-display font-bold">
                    <Link to={`/app/solicitudes/${s.id}`} className="text-violeta-500 hover:underline">
                      {s.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.origen === 'PUBLICO' ? 'Público' : 'Cliente'}</td>
                  <td className="px-4 py-3">{s.categoriaNombre ?? '—'}</td>
                  <td className="px-4 py-3"><BadgeEstado estado={s.estado} texto={ETIQUETAS_ESTADO[s.estado] ?? s.estado} /></td>
                  <td className="px-4 py-3">{s.prioridad ? ETIQUETAS_PRIORIDAD[s.prioridad] : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fechaLocal(s.fechaCreacion)}</td>
                  <td className="px-4 py-3">{s.tecnicoNombre ?? 'Sin asignar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {listado && totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <Boton variante="secundario" disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Boton>
          <span className="text-tinta-500">Página {page} de {totalPaginas}</span>
          <Boton variante="secundario" disabled={page >= totalPaginas || cargando} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Boton>
        </div>
      )}
    </section>
  )
}
