import { useCallback, useEffect, useState } from 'react'
import { get, ApiError } from '../../../lib/api'
import { useSse } from '../../../lib/sse'
import {
  type Solicitud,
  type ListadoSolicitudes,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import {
  type Intervencion,
  iniciarIntervencion,
  listarIntervenciones,
} from '../../../lib/intervenciones'
import { BadgeEstado, Boton, Cargando, ErrorPanel } from '../../../components/ui/primitivos'
import ModalResolverIntervencion from '../solicitudes/ModalResolverIntervencion'

// Agenda del técnico: sus solicitudes asignadas, con acciones para iniciar
// la intervención (ASIGNADA) y resolverla (EN_PROCESO). El backend filtra
// siempre por el técnico de la sesión.

interface FilaAgenda {
  solicitud: Solicitud
  intervencionAbierta: Intervencion | null
}

// Color del SLA según el tiempo restante hasta la fecha objetivo.
function estadoSla (fechaObjetivo: string | null): { texto: string; clase: string } | null {
  if (!fechaObjetivo) return null
  const restanteMs = new Date(fechaObjetivo).getTime() - Date.now()
  if (restanteMs < 0) return { texto: 'SLA vencido', clase: 'bg-red-100 text-red-800' }
  if (restanteMs < 24 * 3600 * 1000) return { texto: 'SLA por vencer', clase: 'bg-amber-100 text-amber-800' }
  return { texto: 'SLA en plazo', clase: 'bg-emerald-100 text-emerald-800' }
}

export default function MiAgenda () {
  const [filas, setFilas] = useState<FilaAgenda[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [iniciando, setIniciando] = useState<string | null>(null)
  const [resolviendo, setResolviendo] = useState<FilaAgenda | null>(null)

  const cargar = useCallback(async () => {
    try {
      const listado = await get<ListadoSolicitudes>('/solicitudes?limit=100')
      const conIntervencion = await Promise.all(listado.data.map(async (solicitud) => {
        if (solicitud.estado !== 'EN_PROCESO') {
          return { solicitud, intervencionAbierta: null }
        }
        try {
          const intervenciones = await listarIntervenciones(solicitud.id)
          return {
            solicitud,
            intervencionAbierta: intervenciones.find((i) => i.fin === null) ?? null,
          }
        } catch {
          // Si el listado falla, la solicitud sigue visible sin acción de resolver.
          return { solicitud, intervencionAbierta: null }
        }
      }))
      setFilas(conIntervencion)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu agenda.')
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  // El canal del técnico avisa de intervenciones y cambios de estado.
  useSse('/api/eventos/tecnico', () => { void cargar() }, () => { void cargar() })

  async function iniciar (solicitud: Solicitud) {
    setIniciando(solicitud.id)
    setMensaje(null)
    try {
      await iniciarIntervencion(solicitud.id)
      setMensaje(`Intervención iniciada en ${solicitud.codigo}.`)
      await cargar()
    } catch (e) {
      setMensaje(e instanceof ApiError ? e.message : 'No se pudo iniciar la intervención.')
    } finally {
      setIniciando(null)
    }
  }

  if (error) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <ErrorPanel mensaje={error} />
      </section>
    )
  }
  if (!filas) {
    return <section className="mx-auto max-w-5xl px-6 py-10"><Cargando texto="Cargando tu agenda…" /></section>
  }

  const pendientes = filas.filter((f) => f.solicitud.estado === 'ASIGNADA')
  const enProceso = filas.filter((f) => f.solicitud.estado === 'EN_PROCESO')
  const finalizadas = filas.filter((f) => ['RESUELTA', 'CERRADA', 'CANCELADA'].includes(f.solicitud.estado))

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Mi agenda</h1>
      <p className="mt-2 text-sm text-tinta-700">
        Solicitudes asignadas a ti. Inicia la intervención al llegar al sitio y resuélvela con su
        documentación completa.
      </p>

      {mensaje && (
        <p className="mt-4 rounded-md bg-emerald-100 px-4 py-2 text-sm text-emerald-800">{mensaje}</p>
      )}

      <Grupo
        titulo="Pendientes de iniciar"
        vacio="No tienes intervenciones pendientes de iniciar."
        filas={pendientes}
        accion={(fila) => (
          <Boton
            onClick={() => void iniciar(fila.solicitud)}
            disabled={iniciando === fila.solicitud.id}
          >
            {iniciando === fila.solicitud.id ? 'Iniciando…' : 'Iniciar intervención'}
          </Boton>
        )}
      />

      <Grupo
        titulo="En proceso"
        vacio="No tienes intervenciones en proceso."
        filas={enProceso}
        accion={(fila) => (
          <Boton
            variante="secundario"
            disabled={!fila.intervencionAbierta}
            onClick={() => setResolviendo(fila)}
          >
            Resolver intervención
          </Boton>
        )}
      />

      <Grupo
        titulo="Finalizadas"
        vacio="Aún no tienes solicitudes finalizadas."
        filas={finalizadas}
        accion={(fila) => (
          <span className="text-xs text-tinta-500">
            {fila.solicitud.resolucion ? 'Resolución registrada' : 'Sin resolución'}
          </span>
        )}
      />

      {resolviendo?.intervencionAbierta && (
        <ModalResolverIntervencion
          intervencion={resolviendo.intervencionAbierta}
          abierto
          onCerrar={() => setResolviendo(null)}
          onExito={async () => {
            setMensaje(`Intervención resuelta en ${resolviendo.solicitud.codigo}.`)
            setResolviendo(null)
            await cargar()
          }}
        />
      )}
    </section>
  )
}

function Grupo ({
  titulo,
  vacio,
  filas,
  accion,
}: {
  titulo: string
  vacio: string
  filas: FilaAgenda[]
  accion: (fila: FilaAgenda) => React.ReactNode
}) {
  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-bold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="mt-2 text-sm text-tinta-500">{vacio}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {filas.map((fila) => {
            const { solicitud } = fila
            const sla = estadoSla(solicitud.fechaObjetivo)
            return (
              <li key={solicitud.id} className="rounded-lg border border-tinta-900/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold">{solicitud.codigo}</span>
                      <BadgeEstado
                        estado={solicitud.estado}
                        texto={ETIQUETAS_ESTADO[solicitud.estado] ?? solicitud.estado}
                      />
                      {solicitud.prioridad && (
                        <span className="text-xs text-tinta-500">
                          Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad] ?? solicitud.prioridad}
                        </span>
                      )}
                      {sla && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-display font-bold ${sla.clase}`}>
                          {sla.texto}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-tinta-700">{solicitud.descripcion}</p>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-tinta-500 sm:grid-cols-2">
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">Categoría:</dt>
                        <dd>{solicitud.categoriaNombre ?? '—'}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">Programada:</dt>
                        <dd>{fechaLocal(solicitud.fechaProgramada)}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">SLA:</dt>
                        <dd>{fechaLocal(solicitud.fechaObjetivo)}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">Ubicación:</dt>
                        <dd>{solicitud.ubicacion || 'No indicada'}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">Contacto:</dt>
                        <dd>{solicitud.contactoNombre} · {solicitud.contactoTelefono}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-display font-bold">Organización:</dt>
                        <dd>{solicitud.organizacionNombre ?? 'Visitante público'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="shrink-0">{accion(fila)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
