import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { get, post, patch, ApiError } from '../../../lib/api'
import { useAuth, esInterno } from '../../../lib/auth'
import { useSse } from '../../../lib/sse'
import {
  type Solicitud,
  type EventoSolicitud,
  type NotaSolicitud,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  ETIQUETAS_EVENTO,
  fechaLocal,
} from '../../../lib/solicitudes'
import { BadgeEstado, Boton, Campo, AreaTexto, Selector, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const

interface AccionModal {
  titulo: string
  texto: string
  requiereNota?: boolean
  requiereMotivo?: boolean
  requierePrioridad?: boolean
  requiereConstancia?: boolean
  ejecutar: (datos: { nota?: string; motivo?: string; prioridad?: string; constancia?: string }) => Promise<unknown>
}

export default function Detalle() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [eventos, setEventos] = useState<EventoSolicitud[]>([])
  const [notas, setNotas] = useState<NotaSolicitud[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<AccionModal | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!id) return
    try {
      const datos = await get<Solicitud>(`/solicitudes/${id}`)
      setSolicitud(datos)
      setError(null)
      if (esInterno(usuario)) {
        // El historial de auditoría es solo de internos; el backend lo impone igual.
        try {
          const listaEventos = await get<{ data: EventoSolicitud[] }>(`/solicitudes/${id}/eventos`)
          setEventos(listaEventos.data)
        } catch { /* 403 si el rol no lo permite */ }
        try {
          const listaNotas = await get<{ data: NotaSolicitud[] }>(`/solicitudes/${id}/notas`)
          setNotas(listaNotas.data)
        } catch { /* 403 si el rol no lo permite */ }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la solicitud.')
    }
  }, [id, usuario])

  useEffect(() => { void cargar() }, [cargar])

  useSse(
    '/api/eventos/coordinacion',
    () => { void cargar() },
    () => { void cargar() },
  )

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <ErrorPanel mensaje={error} />
        <Link to="/app/solicitudes" className="mt-6 inline-block text-violeta-500 underline">Volver a la bandeja</Link>
      </section>
    )
  }
  if (!solicitud) {
    return <section className="mx-auto max-w-4xl px-6 py-16"><Cargando texto="Cargando solicitud…" /></section>
  }

  const estado = solicitud.estado
  const coordina = esInterno(usuario)
  const esAdmin = usuario?.rol === 'ADMIN'

  const acciones: AccionModal[] = []
  if (coordina) {
    if (estado === 'RECIBIDA') {
      acciones.push({
        titulo: 'Poner en revisión',
        texto: `La solicitud ${solicitud.codigo} pasará a estar en revisión.`,
        ejecutar: () => patch(`/solicitudes/${id}/estado`, { estado: 'EN_REVISION' }),
      })
    }
    if (estado === 'EN_REVISION') {
      acciones.push(
        {
          titulo: 'Solicitar información',
          texto: 'Se pedirá información al solicitante con una nota interna obligatoria.',
          requiereNota: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'REQUIERE_INFORMACION', nota: d.nota }),
        },
        {
          titulo: 'Aprobar solicitud',
          texto: `Define la prioridad; el SLA se calcula según el catálogo${solicitud.origen === 'PUBLICO' ? ' y se exige la constancia de aceptación (origen público)' : ''}.`,
          requierePrioridad: true,
          requiereConstancia: solicitud.origen === 'PUBLICO',
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, {
            estado: 'APROBADA',
            prioridad: d.prioridad,
            constanciaAceptacion: d.constancia,
          }),
        },
        {
          titulo: 'Rechazar solicitud',
          texto: 'El rechazo es definitivo y requiere un motivo.',
          requiereMotivo: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'RECHAZADA', motivo: d.motivo }),
        },
        {
          titulo: 'Cancelar solicitud',
          texto: 'La cancelación requiere un motivo y queda auditada.',
          requiereMotivo: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'CANCELADA', motivo: d.motivo }),
        },
      )
    }
    if (estado === 'REQUIERE_INFORMACION') {
      acciones.push(
        {
          titulo: 'Volver a revisión',
          texto: 'Registra la gestión realizada como nota interna.',
          requiereNota: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'EN_REVISION', nota: d.nota }),
        },
        {
          titulo: 'Rechazar solicitud',
          texto: 'El rechazo es definitivo y requiere un motivo.',
          requiereMotivo: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'RECHAZADA', motivo: d.motivo }),
        },
        {
          titulo: 'Cancelar solicitud',
          texto: 'La cancelación requiere un motivo y queda auditada.',
          requiereMotivo: true,
          ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'CANCELADA', motivo: d.motivo }),
        },
      )
    }
    if (estado === 'APROBADA' || estado === 'RESUELTA') {
      acciones.push({
        titulo: 'Cancelar solicitud',
        texto: 'La cancelación requiere un motivo y queda auditada.',
        requiereMotivo: true,
        ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'CANCELADA', motivo: d.motivo }),
      })
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/app/solicitudes" className="text-sm text-violeta-500 hover:underline">← Bandeja de solicitudes</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">{solicitud.codigo}</h1>
        <BadgeEstado estado={estado} texto={ETIQUETAS_ESTADO[estado] ?? estado} />
        {solicitud.prioridad && (
          <span className="text-sm text-tinta-500">Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad]}</span>
        )}
      </div>

      {mensaje && (
        <p className="mt-4 rounded-md bg-emerald-100 px-4 py-2 text-sm text-emerald-800">{mensaje}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tarjeta titulo="Datos de la solicitud">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Dato titulo="Origen" valor={solicitud.origen === 'PUBLICO' ? 'Público' : 'Cliente'} />
              <Dato titulo="Categoría" valor={solicitud.categoriaNombre ?? '—'} />
              <Dato titulo="Organización" valor={solicitud.organizacionNombre ?? 'Visitante público'} />
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
            {solicitud.constanciaAceptacion && (
              <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">Constancia de aceptación: {solicitud.constanciaAceptacion}</p>
            )}
          </Tarjeta>

          {coordina && (
            <Tarjeta titulo="Historial de auditoría">
              {eventos.length === 0 ? (
                <p className="text-sm text-tinta-500">Sin eventos registrados.</p>
              ) : (
                <ol className="space-y-3">
                  {eventos.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="font-display font-bold">{ETIQUETAS_EVENTO[e.tipo] ?? e.tipo}</span>
                      {e.estadoAnterior && e.estadoNuevo && (
                        <span className="text-tinta-500">
                          {ETIQUETAS_ESTADO[e.estadoAnterior] ?? e.estadoAnterior} → {ETIQUETAS_ESTADO[e.estadoNuevo] ?? e.estadoNuevo}
                        </span>
                      )}
                      <span className="text-tinta-500">· {fechaLocal(e.fecha)}</span>
                      {e.actorNombre && <span className="text-tinta-500">· {e.actorNombre}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </Tarjeta>
          )}
        </div>

        <div className="space-y-6">
          {coordina && (
            <Tarjeta titulo="Acciones">
              {acciones.length === 0 ? (
                <p className="text-sm text-tinta-500">No hay acciones disponibles en este estado.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {acciones.map((a) => (
                    <Boton key={a.titulo} variante={a.titulo.startsWith('Rechazar') || a.titulo.startsWith('Cancelar') ? 'peligro' : 'primario'} onClick={() => setAccion(a)}>
                      {a.titulo}
                    </Boton>
                  ))}
                </div>
              )}
              {esAdmin && solicitud.origen === 'PUBLICO' && (
                <div className="mt-4 border-t border-tinta-900/10 pt-4">
                  <Boton variante="secundario" onClick={() => setAccion({
                    titulo: 'Regenerar token público',
                    texto: 'Se genera un nuevo enlace de seguimiento; el anterior deja de funcionar.',
                    ejecutar: () => post(`/solicitudes/${id}/token`),
                  })}>
                    Regenerar token público
                  </Boton>
                </div>
              )}
              {estado === 'APROBADA' && (
                <p className="mt-4 text-xs text-tinta-500">La asignación de técnico llega en la fase 3.</p>
              )}
              {estado === 'RESUELTA' && (
                <p className="mt-4 text-xs text-tinta-500">El cierre llega en la fase 3.</p>
              )}
            </Tarjeta>
          )}

          {coordina && (
            <Tarjeta titulo="Notas internas">
              <ul className="space-y-3">
                {notas.length === 0 && <p className="text-sm text-tinta-500">Sin notas internas.</p>}
                {notas.map((n) => (
                  <li key={n.id} className="rounded-md bg-lavanda p-3 text-sm">
                    <p className="whitespace-pre-wrap">{n.contenido}</p>
                    <p className="mt-1 text-xs text-tinta-500">
                      {n.autorNombre} · {ETIQUETAS_EVENTO['NOTA'] && (n.tipo === 'INTERNA' ? 'Interna' : 'Solicitud de información')} · {fechaLocal(n.fecha)}
                    </p>
                  </li>
                ))}
              </ul>
              <form
                className="mt-4 space-y-2 border-t border-tinta-900/10 pt-4"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formulario = new FormData(e.currentTarget)
                  const contenido = String(formulario.get('contenido') || '')
                  try {
                    await post(`/solicitudes/${id}/notas`, { contenido })
                    setMensaje('Nota interna registrada.')
                    ;(e.target as HTMLFormElement).reset()
                    await cargar()
                  } catch (err) {
                    setMensaje(err instanceof ApiError ? err.message : 'No se pudo registrar la nota.')
                  }
                }}
              >
                <AreaTexto name="contenido" required placeholder="Escribe una nota interna…" aria-label="Nueva nota interna" />
                <Boton type="submit" variante="secundario">Añadir nota</Boton>
              </form>
            </Tarjeta>
          )}
        </div>
      </div>

      {accion && (
        <Modal titulo={accion.titulo} abierto onCerrar={() => { setAccion(null); setMensaje(null) }}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              const formulario = new FormData(e.currentTarget)
              try {
                await accion.ejecutar({
                  nota: String(formulario.get('nota') || ''),
                  motivo: String(formulario.get('motivo') || ''),
                  prioridad: String(formulario.get('prioridad') || ''),
                  constancia: String(formulario.get('constancia') || ''),
                })
                setAccion(null)
                setMensaje(`${accion.titulo}: operación realizada.`)
                await cargar()
              } catch (err) {
                setMensaje(err instanceof ApiError ? err.message : 'La operación no se pudo completar.')
              }
            }}
          >
            <p className="text-sm text-tinta-700">{accion.texto}</p>
            {accion.requierePrioridad && (
              <Campo label="Prioridad" ayuda="Define el SLA: crítica 4 h, alta 8 h, media 24 h, baja 72 h.">
                <Selector name="prioridad" required defaultValue="">
                  <option value="" disabled>Selecciona una prioridad</option>
                  {PRIORIDADES.map((p) => <option key={p} value={p}>{ETIQUETAS_PRIORIDAD[p]}</option>)}
                </Selector>
              </Campo>
            )}
            {accion.requiereConstancia && (
              <Campo label="Constancia de aceptación" ayuda="Referencia de la aceptación del cliente (origen público).">
                <AreaTexto name="constancia" required placeholder="Ej.: Aceptada por teléfono, ref. AT-102" />
              </Campo>
            )}
            {accion.requiereNota && (
              <Campo label="Nota interna">
                <AreaTexto name="nota" required placeholder="Describe la gestión o lo que falta…" />
              </Campo>
            )}
            {accion.requiereMotivo && (
              <Campo label="Motivo">
                <AreaTexto name="motivo" required placeholder="Explica el motivo de la decisión…" />
              </Campo>
            )}
            <div className="flex justify-end gap-2">
              <Boton type="button" variante="secundario" onClick={() => { setAccion(null); setMensaje(null) }}>Cerrar</Boton>
              <Boton type="submit">Confirmar</Boton>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-tinta-900/10 bg-white p-6">
      <h2 className="font-display text-lg font-bold">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-tinta-500">{titulo}</dt>
      <dd className="mt-0.5">{valor}</dd>
    </div>
  )
}
