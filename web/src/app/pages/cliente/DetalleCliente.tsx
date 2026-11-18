import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get, patch, ApiError } from '../../../lib/api'
import {
  type Solicitud,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import { BadgeEstado, Boton, AreaTexto, Campo, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

// Detalle de una solicitud para el Cliente: sin notas internas, auditoría ni
// intervenciones. El backend responde 404 si la solicitud es de otra organización.

// Estados en los que el Cliente puede cancelar (antes de APROBADA).
export const ESTADOS_CANCELABLES_CLIENTE = ['RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION']

export default function DetalleCliente () {
  const { id } = useParams<{ id: string }>()
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const cargar = useCallback(async () => {
    if (!id) return
    try {
      setSolicitud(await get<Solicitud>(`/solicitudes/${id}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la solicitud.')
    }
  }, [id])

  useEffect(() => { void cargar() }, [cargar])

  async function cancelar (e: React.FormEvent) {
    e.preventDefault()
    try {
      await patch(`/solicitudes/${id}/estado`, { estado: 'CANCELADA', motivo })
      setCancelando(false)
      setMotivo('')
      setMensaje('Solicitud cancelada.')
      await cargar()
    } catch (err) {
      setMensaje(err instanceof ApiError ? err.message : 'No se pudo cancelar la solicitud.')
    }
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-16">
        <ErrorPanel mensaje={error} />
        <Link to="/app/mis-solicitudes" className="mt-6 inline-block text-violeta-500 underline">Volver a mis solicitudes</Link>
      </section>
    )
  }
  if (!solicitud) {
    return <section className="mx-auto max-w-3xl px-6 py-16"><Cargando texto="Cargando solicitud…" /></section>
  }

  const cancelable = ESTADOS_CANCELABLES_CLIENTE.includes(solicitud.estado)

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Link to="/app/mis-solicitudes" className="text-sm text-violeta-500 hover:underline">← Mis solicitudes</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">{solicitud.codigo}</h1>
        <BadgeEstado estado={solicitud.estado} texto={ETIQUETAS_ESTADO[solicitud.estado] ?? solicitud.estado} />
        {solicitud.prioridad && (
          <span className="text-sm text-tinta-500">Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad] ?? solicitud.prioridad}</span>
        )}
      </div>

      {mensaje && (
        <p className="mt-4 rounded-md bg-emerald-100 px-4 py-2 text-sm text-emerald-800">{mensaje}</p>
      )}

      <div className="mt-6 rounded-lg border border-tinta-900/10 bg-white p-6">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Dato titulo="Categoría" valor={solicitud.categoriaNombre ?? '—'} />
          <Dato titulo="Organización" valor={solicitud.organizacionNombre ?? '—'} />
          <Dato titulo="Contacto" valor={`${solicitud.contactoNombre} · ${solicitud.contactoEmail} · ${solicitud.contactoTelefono}`} />
          <Dato titulo="Urgencia declarada" valor={solicitud.urgenciaDeclarada ? ETIQUETAS_PRIORIDAD[solicitud.urgenciaDeclarada] : '—'} />
          <Dato titulo="Fecha de creación" valor={fechaLocal(solicitud.fechaCreacion)} />
          <Dato titulo="Fecha objetivo (SLA)" valor={fechaLocal(solicitud.fechaObjetivo)} />
          <Dato titulo="Fecha programada" valor={fechaLocal(solicitud.fechaProgramada)} />
          <Dato titulo="Técnico asignado" valor={solicitud.tecnicoNombre ?? 'Sin asignar'} />
        </dl>
        <p className="mt-4 whitespace-pre-wrap rounded-md bg-lavanda p-3 text-sm">{solicitud.descripcion}</p>
        {solicitud.rechazadaMotivo && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">Motivo del rechazo: {solicitud.rechazadaMotivo}</p>
        )}
        {solicitud.canceladaMotivo && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">Motivo de la cancelación: {solicitud.canceladaMotivo}</p>
        )}
        {solicitud.resolucion && (
          <p className="mt-3 rounded-md bg-teal-50 p-3 text-sm text-teal-800">Resolución: {solicitud.resolucion}</p>
        )}
      </div>

      {cancelable && (
        <div className="mt-6">
          <Boton variante="peligro" onClick={() => setCancelando(true)}>Cancelar solicitud</Boton>
          <p className="mt-2 text-xs text-tinta-500">
            Solo puede cancelarse antes de la aprobación. Después de aprobada, contacta a coordinación.
          </p>
        </div>
      )}

      {cancelando && (
        <Modal titulo="Cancelar solicitud" abierto onCerrar={() => setCancelando(false)}>
          <form className="space-y-4" onSubmit={cancelar}>
            <p className="text-sm text-tinta-700">
              La cancelación es definitiva y requiere un motivo.
            </p>
            <Campo label="Motivo">
              <AreaTexto required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica por qué cancelas la solicitud…" />
            </Campo>
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="secundario" onClick={() => setCancelando(false)}>Volver</Boton>
              <Boton type="submit" variante="peligro">Confirmar cancelación</Boton>
            </div>
          </form>
        </Modal>
      )}

    </section>
  )
}

function Dato ({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-500">{titulo}</dt>
      <dd className="mt-0.5">{valor}</dd>
    </div>
  )
}
