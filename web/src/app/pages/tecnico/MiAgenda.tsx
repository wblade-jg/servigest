import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
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
import { BadgeEstado, Boton, Cargando, ErrorPanel, Pagina } from '../../../components/ui/primitivos'
import { archivo } from '../../../theme'
import ModalResolverIntervencion from '../solicitudes/ModalResolverIntervencion'

// Agenda del técnico: sus solicitudes asignadas, con acciones para iniciar
// la intervención (ASIGNADA) y resolverla (EN_PROCESO). El backend filtra
// siempre por el técnico de la sesión.

interface FilaAgenda {
  solicitud: Solicitud
  intervencionAbierta: Intervencion | null
}

type TonoSla = 'success' | 'warning' | 'error'

// Tono del SLA según el tiempo restante hasta la fecha objetivo.
function estadoSla (fechaObjetivo: string | null): { texto: string; tono: TonoSla } | null {
  if (!fechaObjetivo) return null
  const restanteMs = new Date(fechaObjetivo).getTime() - Date.now()
  if (restanteMs < 0) return { texto: 'SLA vencido', tono: 'error' }
  if (restanteMs < 24 * 3600 * 1000) return { texto: 'SLA por vencer', tono: 'warning' }
  return { texto: 'SLA en plazo', tono: 'success' }
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
      <Pagina>
        <ErrorPanel mensaje={error} />
      </Pagina>
    )
  }
  if (!filas) {
    return (
      <Pagina>
        <Cargando texto="Cargando tu agenda…" />
      </Pagina>
    )
  }

  const pendientes = filas.filter((f) => f.solicitud.estado === 'ASIGNADA')
  const enProceso = filas.filter((f) => f.solicitud.estado === 'EN_PROCESO')
  const finalizadas = filas.filter((f) => ['RESUELTA', 'CERRADA', 'CANCELADA'].includes(f.solicitud.estado))

  return (
    <Pagina>
      <Typography variant="h2">Mi agenda</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Solicitudes asignadas a ti. Inicia la intervención al llegar al sitio y resuélvela con su
        documentación completa.
      </Typography>

      {mensaje && <Alert severity="info" onClose={() => setMensaje(null)} sx={{ mt: 3 }}>{mensaje}</Alert>}

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
          <Typography variant="caption" color="text.secondary">
            {fila.solicitud.resolucion ? 'Resolución registrada' : 'Sin resolución'}
          </Typography>
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
    </Pagina>
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
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="h5">{titulo}</Typography>
      {filas.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{vacio}</Typography>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {filas.map((fila) => {
            const { solicitud } = fila
            const sla = estadoSla(solicitud.fechaObjetivo)
            return (
              <Card key={solicitud.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="h5">{solicitud.codigo}</Typography>
                        <BadgeEstado
                          estado={solicitud.estado}
                          texto={ETIQUETAS_ESTADO[solicitud.estado] ?? solicitud.estado}
                        />
                        {solicitud.prioridad && (
                          <Typography variant="caption" color="text.secondary">
                            Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad] ?? solicitud.prioridad}
                          </Typography>
                        )}
                        {sla && <Chip size="small" color={sla.tono} label={sla.texto} />}
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {solicitud.descripcion}
                      </Typography>
                      <Box
                        component="dl"
                        sx={{
                          mt: 1.5,
                          mb: 0,
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          columnGap: 3,
                          rowGap: 0.5,
                        }}
                      >
                        <LineaDato etiqueta="Categoría" valor={solicitud.categoriaNombre ?? '—'} />
                        <LineaDato etiqueta="Programada" valor={fechaLocal(solicitud.fechaProgramada)} />
                        <LineaDato etiqueta="SLA" valor={fechaLocal(solicitud.fechaObjetivo)} />
                        <LineaDato etiqueta="Ubicación" valor={solicitud.ubicacion || 'No indicada'} />
                        <LineaDato etiqueta="Contacto" valor={`${solicitud.contactoNombre} · ${solicitud.contactoTelefono}`} />
                        <LineaDato etiqueta="Organización" valor={solicitud.organizacionNombre ?? 'Visitante público'} />
                      </Box>
                    </Box>
                    <Box sx={{ flexShrink: 0 }}>{accion(fila)}</Box>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

function LineaDato ({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, fontSize: 13 }}>
      <Box component="dt" sx={{ fontFamily: archivo, fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>
        {etiqueta}:
      </Box>
      <Box component="dd" sx={{ m: 0, fontSize: 12, color: 'text.secondary' }}>{valor}</Box>
    </Box>
  )
}
