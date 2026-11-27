import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Box, Divider, Link as MuiLink, Stack, Typography } from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
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
import {
  AreaTexto,
  BadgeEstado,
  Boton,
  Campo,
  Cargando,
  Dato,
  ErrorPanel,
  Modal,
  Pagina,
  Selector,
  Tarjeta,
} from '../../../components/ui/primitivos'
import { RielEstado } from '../../../components/ui/RielEstado'
import { type Intervencion, listarIntervenciones } from '../../../lib/intervenciones'
import { archivo } from '../../../theme'
import ModalAsignar from './ModalAsignar'

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

interface Aviso {
  texto: string
  tipo: 'success' | 'error'
}

export default function Detalle() {
  const { id } = useParams<{ id: string }>()
  const { usuario } = useAuth()
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [eventos, setEventos] = useState<EventoSolicitud[]>([])
  const [notas, setNotas] = useState<NotaSolicitud[]>([])
  const [intervenciones, setIntervenciones] = useState<Intervencion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<AccionModal | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false)

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
        try {
          setIntervenciones(await listarIntervenciones(id))
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
      <Pagina maxWidth="md">
        <ErrorPanel mensaje={error} />
        <MuiLink component={Link} to="/app/solicitudes" sx={{ display: 'inline-block', mt: 3 }}>
          Volver a la bandeja
        </MuiLink>
      </Pagina>
    )
  }
  if (!solicitud) {
    return (
      <Pagina maxWidth="md">
        <Cargando texto="Cargando solicitud…" />
      </Pagina>
    )
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
    if (estado === 'APROBADA' || estado === 'ASIGNADA' || estado === 'RESUELTA') {
      acciones.push({
        titulo: 'Cancelar solicitud',
        texto: 'La cancelación requiere un motivo y queda auditada.',
        requiereMotivo: true,
        ejecutar: (d) => patch(`/solicitudes/${id}/estado`, { estado: 'CANCELADA', motivo: d.motivo }),
      })
    }
  }

  const fechasEstado: Record<string, string | null> = {
    RECIBIDA: solicitud.fechaCreacion,
    APROBADA: solicitud.aprobadaEn,
    ASIGNADA: solicitud.fechaProgramada,
    RESUELTA: solicitud.resueltaEn,
    CERRADA: solicitud.cerradaEn,
  }
  for (const evento of eventos) {
    if (evento.estadoNuevo && evento.fecha && !fechasEstado[evento.estadoNuevo]) {
      fechasEstado[evento.estadoNuevo] = evento.fecha
    }
  }

  return (
    <Pagina>
      <MuiLink
        component={Link}
        to="/app/solicitudes"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ArrowBackOutlined sx={{ fontSize: 16 }} /> Bandeja de solicitudes
      </MuiLink>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
        <Typography variant="h2">{solicitud.codigo}</Typography>
        <BadgeEstado estado={estado} texto={ETIQUETAS_ESTADO[estado] ?? estado} />
        {solicitud.prioridad && (
          <Typography variant="body2" color="text.secondary">
            Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad]}
          </Typography>
        )}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <RielEstado estado={estado} fechas={fechasEstado} />
      </Box>

      {aviso && (
        <Alert severity={aviso.tipo} onClose={() => setAviso(null)} sx={{ mt: 3 }}>
          {aviso.texto}
        </Alert>
      )}

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
          gap: 3,
        }}
      >
        <Stack spacing={3}>
          <Tarjeta titulo="Datos de la solicitud">
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Dato titulo="Origen" valor={solicitud.origen === 'PUBLICO' ? 'Público' : 'Cliente'} />
              <Dato titulo="Categoría" valor={solicitud.categoriaNombre ?? '—'} />
              <Dato titulo="Organización" valor={solicitud.organizacionNombre ?? 'Visitante público'} />
              <Dato titulo="Contacto" valor={`${solicitud.contactoNombre} · ${solicitud.contactoEmail} · ${solicitud.contactoTelefono}`} />
              <Dato titulo="Urgencia declarada" valor={solicitud.urgenciaDeclarada ? ETIQUETAS_PRIORIDAD[solicitud.urgenciaDeclarada] : '—'} />
              <Dato titulo="Fecha de creación" valor={fechaLocal(solicitud.fechaCreacion)} />
              <Dato titulo="Fecha objetivo (SLA)" valor={fechaLocal(solicitud.fechaObjetivo)} />
              <Dato titulo="Fecha programada" valor={fechaLocal(solicitud.fechaProgramada)} />
              <Dato titulo="Técnico asignado" valor={solicitud.tecnicoNombre ?? 'Sin asignar'} />
            </Box>

            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {solicitud.descripcion}
              </Typography>
            </Box>

            {solicitud.rechazadaMotivo && (
              <Alert severity="error" sx={{ mt: 2 }}>Motivo del rechazo: {solicitud.rechazadaMotivo}</Alert>
            )}
            {solicitud.canceladaMotivo && (
              <Alert severity="error" sx={{ mt: 2 }}>Motivo de la cancelación: {solicitud.canceladaMotivo}</Alert>
            )}
            {solicitud.constanciaAceptacion && (
              <Alert severity="success" sx={{ mt: 2 }}>Constancia de aceptación: {solicitud.constanciaAceptacion}</Alert>
            )}
            {solicitud.resolucion && (
              <Alert severity="info" sx={{ mt: 2 }}>Resolución: {solicitud.resolucion}</Alert>
            )}
          </Tarjeta>

          {coordina && (
            <Tarjeta titulo="Intervenciones">
              {intervenciones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin intervenciones registradas.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {intervenciones.map((i) => (
                    <Box key={i.id} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: archivo, fontWeight: 700 }}>
                        {i.tecnicoNombre ?? 'Técnico'} · {fechaLocal(i.inicio)}
                        {i.fin ? ` → ${fechaLocal(i.fin)}` : ' · en proceso'}
                      </Typography>
                      {i.diagnostico && <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>Diagnóstico: {i.diagnostico}</Typography>}
                      {i.actividades && <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>Actividades: {i.actividades}</Typography>}
                      {i.resultado && <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>Resultado: {i.resultado}</Typography>}
                      {i.observaciones && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>Observaciones: {i.observaciones}</Typography>}
                    </Box>
                  ))}
                </Stack>
              )}
            </Tarjeta>
          )}

          {coordina && (
            <Tarjeta titulo="Historial de auditoría">
              {eventos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Sin eventos registrados.</Typography>
              ) : (
                <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                  {eventos.map((e, indice) => (
                    <Box component="li" key={e.id} sx={{ display: 'flex', gap: 1.5, pb: indice < eventos.length - 1 ? 2 : 0 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Box sx={{ width: 8, height: 8, mt: '6px', borderRadius: '50%', bgcolor: 'primary.main' }} />
                        {indice < eventos.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5 }} />}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {ETIQUETAS_EVENTO[e.tipo] ?? e.tipo}
                        </Typography>
                        {e.estadoAnterior && e.estadoNuevo && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {ETIQUETAS_ESTADO[e.estadoAnterior] ?? e.estadoAnterior} → {ETIQUETAS_ESTADO[e.estadoNuevo] ?? e.estadoNuevo}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {fechaLocal(e.fecha)}
                          {e.actorNombre ? ` · ${e.actorNombre}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Tarjeta>
          )}
        </Stack>

        <Stack spacing={3}>
          {coordina && (
            <Tarjeta titulo="Acciones">
              {acciones.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No hay acciones disponibles en este estado.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {acciones.map((a) => (
                    <Boton
                      key={a.titulo}
                      variante={a.titulo.startsWith('Rechazar') || a.titulo.startsWith('Cancelar') ? 'peligro' : 'primario'}
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                      onClick={() => { setErrorAccion(null); setAccion(a) }}
                    >
                      {a.titulo}
                    </Boton>
                  ))}
                </Stack>
              )}

              {esAdmin && solicitud.origen === 'PUBLICO' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Boton
                    variante="secundario"
                    fullWidth
                    onClick={() => {
                      setErrorAccion(null)
                      setAccion({
                        titulo: 'Regenerar token público',
                        texto: 'Se genera un nuevo enlace de seguimiento; el anterior deja de funcionar.',
                        ejecutar: () => post(`/solicitudes/${id}/token`),
                      })
                    }}
                  >
                    Regenerar token público
                  </Boton>
                </>
              )}

              {estado === 'APROBADA' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Boton fullWidth onClick={() => setModalAsignarAbierto(true)}>
                    Asignar técnico
                  </Boton>
                </>
              )}

              {estado === 'ASIGNADA' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Boton variante="secundario" fullWidth onClick={() => setModalAsignarAbierto(true)}>
                    Reasignar técnico
                  </Boton>
                </>
              )}

              {estado === 'RESUELTA' && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Boton
                    fullWidth
                    onClick={() => {
                      setErrorAccion(null)
                      setAccion({
                        titulo: 'Cerrar solicitud',
                        texto: 'El cierre es definitivo y exige la resolución documentada de la intervención.',
                        ejecutar: () => patch(`/solicitudes/${id}/estado`, { estado: 'CERRADA' }),
                      })
                    }}
                  >
                    Cerrar solicitud
                  </Boton>
                </>
              )}
            </Tarjeta>
          )}

          {coordina && (
            <Tarjeta titulo="Notas internas">
              <Stack spacing={1.5}>
                {notas.length === 0 && (
                  <Typography variant="body2" color="text.secondary">Sin notas internas.</Typography>
                )}
                {notas.map((n) => (
                  <Box key={n.id} sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{n.contenido}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {n.autorNombre} · {n.tipo === 'INTERNA' ? 'Interna' : 'Solicitud de información'} · {fechaLocal(n.fecha)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box
                component="form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const formulario = new FormData(e.currentTarget)
                  const contenido = String(formulario.get('contenido') || '')
                  try {
                    await post(`/solicitudes/${id}/notas`, { contenido })
                    setAviso({ texto: 'Nota interna registrada.', tipo: 'success' })
                    ;(e.target as HTMLFormElement).reset()
                    await cargar()
                  } catch (err) {
                    setAviso({
                      texto: err instanceof ApiError ? err.message : 'No se pudo registrar la nota.',
                      tipo: 'error',
                    })
                  }
                }}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <AreaTexto name="contenido" required placeholder="Escribe una nota interna…" aria-label="Nueva nota interna" />
                <Boton type="submit" variante="secundario" sx={{ alignSelf: 'flex-end' }}>
                  Añadir nota
                </Boton>
              </Box>
            </Tarjeta>
          )}
        </Stack>
      </Box>

      {accion && (
        <Modal titulo={accion.titulo} abierto onCerrar={() => { setAccion(null); setErrorAccion(null) }}>
          <Box
            component="form"
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
                setAviso({ texto: `${accion.titulo}: operación realizada.`, tipo: 'success' })
                await cargar()
              } catch (err) {
                setErrorAccion(err instanceof ApiError ? err.message : 'La operación no se pudo completar.')
              }
            }}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <Typography variant="body2" color="text.secondary">{accion.texto}</Typography>

            {errorAccion && <Alert severity="error">{errorAccion}</Alert>}

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

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Boton type="button" variante="secundario" onClick={() => { setAccion(null); setErrorAccion(null) }}>
                Cerrar
              </Boton>
              <Boton type="submit">Confirmar</Boton>
            </Stack>
          </Box>
        </Modal>
      )}

      {modalAsignarAbierto && solicitud && (
        <ModalAsignar
          solicitud={solicitud}
          abierto={modalAsignarAbierto}
          onCerrar={() => setModalAsignarAbierto(false)}
          onExito={async () => {
            setAviso({
              texto: solicitud.estado === 'ASIGNADA'
                ? 'Técnico reasignado exitosamente.'
                : 'Técnico asignado exitosamente.',
              tipo: 'success',
            })
            await cargar()
          }}
        />
      )}
    </Pagina>
  )
}
