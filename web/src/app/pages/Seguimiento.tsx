import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { get, ApiError } from '../../lib/api'
import { useSse } from '../../lib/sse'
import {
  type Seguimiento,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../lib/solicitudes'

// Timeline público: solo estado y coordinación, sin notas, adjuntos ni contacto.
const ETAPAS = ['RECIBIDA', 'EN_REVISION', 'APROBADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA']

function etapaActual(estado: string): number {
  const indice = ETAPAS.indexOf(estado)
  if (indice >= 0) return indice
  // Estados fuera de la línea (RECHAZADA, CANCELADA, REQUIERE_INFORMACION) se muestran aparte
  return -1
}

export default function Seguimiento() {
  const { token } = useParams<{ token: string }>()
  const [datos, setDatos] = useState<Seguimiento | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    if (!token) return
    try {
      setDatos(await get<Seguimiento>(`/public/seguimiento/${token}`))
      setError(null)
    } catch (e: unknown) {
      if (e instanceof ApiError) setError(e.message)
      else setError('No se pudo cargar el seguimiento.')
    }
  }

  useEffect(() => { void cargar() }, [token])

  // SSE del canal público: refetch REST al reconectar y al recibir cada evento.
  // Solo se conecta si no hay error de búsqueda (evita bucles 404 en tokens inválidos).
  useSse(
    !error && token
      ? `${import.meta.env.VITE_API_URL ?? '/api'}/public/seguimiento/${token}/eventos`
      : '',
    () => { void cargar() },
    () => { void cargar() },
  )

  if (error) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <h1 className="font-display text-2xl font-bold text-red-800">Seguimiento no disponible</h1>
          <p className="mt-3 text-red-700">{error}</p>
          <Link to="/" className="mt-6 inline-block text-violeta-500 underline">Volver al inicio</Link>
        </div>
      </section>
    )
  }

  if (!datos) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-tinta-700">Cargando seguimiento…</p>
      </section>
    )
  }

  const etapa = etapaActual(datos.estado)
  const fueraDeLinea = etapa === -1

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Seguimiento</h1>
      <p className="mt-2 text-tinta-700">Solicitud <strong className="font-display">{datos.codigo}</strong></p>

      <div className="mt-8 rounded-lg border border-tinta-900/10 bg-white p-6">
        <p className="text-sm text-tinta-500">Estado actual</p>
        <p className="mt-1 font-display text-2xl font-bold">
          {ETIQUETAS_ESTADO[datos.estado] ?? datos.estado}
        </p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-tinta-500">Prioridad</dt>
            <dd>{datos.prioridad ? (ETIQUETAS_PRIORIDAD[datos.prioridad] ?? datos.prioridad) : 'Por definir en revisión'}</dd>
          </div>
          <div>
            <dt className="text-tinta-500">Fecha de creación</dt>
            <dd>{fechaLocal(datos.fechaCreacion)}</dd>
          </div>
          <div>
            <dt className="text-tinta-500">Fecha objetivo</dt>
            <dd>{fechaLocal(datos.fechaObjetivo)}</dd>
          </div>
          <div>
            <dt className="text-tinta-500">Fecha programada</dt>
            <dd>{fechaLocal(datos.fechaProgramada)}</dd>
          </div>
          <div>
            <dt className="text-tinta-500">Técnico asignado</dt>
            <dd>{datos.tecnicoAsignado ?? 'Sin asignar'}</dd>
          </div>
        </dl>
      </div>

      {fueraDeLinea ? (
        <p className="mt-6 rounded-md bg-lavanda-honda px-4 py-3 text-sm text-tinta-700">
          Esta solicitud no avanza por la línea de tiempo estándar (por ejemplo, rechazada o cancelada).
        </p>
      ) : (
        <ol className="mt-8 space-y-0">
          {ETAPAS.map((e, i) => (
            <li key={e} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-3 w-3 rounded-full ${i <= etapa ? 'bg-violeta-500' : 'bg-tinta-900/15'}`}
                />
                {i < ETAPAS.length - 1 && (
                  <span className={`h-8 w-px ${i < etapa ? 'bg-violeta-500' : 'bg-tinta-900/15'}`} />
                )}
              </div>
              <div className={i <= etapa ? 'font-semibold' : 'text-tinta-500'}>
                {ETIQUETAS_ESTADO[e]}
                {i === etapa && <span className="ml-2 text-xs text-violeta-500">· actual</span>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-8 text-xs text-tinta-500">
        La vista se actualiza en vivo. Guarda este enlace para volver a consultar.
      </p>
    </section>
  )
}
