import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Box, Link as MuiLink, Stack, Typography } from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import { get, patch, ApiError } from '../../../lib/api'
import {
  type Solicitud,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import {
  BadgeEstado,
  Boton,
  AreaTexto,
  Campo,
  Dato,
  Modal,
  Cargando,
  ErrorPanel,
  Pagina,
  Tarjeta,
} from '../../../components/ui/primitivos'
import { RielEstado } from '../../../components/ui/RielEstado'

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
      <Pagina maxWidth="md">
        <ErrorPanel mensaje={error} />
        <MuiLink component={Link} to="/app/mis-solicitudes" sx={{ display: 'inline-block', mt: 3 }}>
          Volver a mis solicitudes
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

  const cancelable = ESTADOS_CANCELABLES_CLIENTE.includes(solicitud.estado)

  return (
    <Pagina maxWidth="md">
      <MuiLink
        component={Link}
        to="/app/mis-solicitudes"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ArrowBackOutlined sx={{ fontSize: 16 }} /> Mis solicitudes
      </MuiLink>

      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
        <Typography variant="h2">{solicitud.codigo}</Typography>
        <BadgeEstado estado={solicitud.estado} texto={ETIQUETAS_ESTADO[solicitud.estado] ?? solicitud.estado} />
        {solicitud.prioridad && (
          <Typography variant="body2" color="text.secondary">
            Prioridad {ETIQUETAS_PRIORIDAD[solicitud.prioridad] ?? solicitud.prioridad}
          </Typography>
        )}
      </Stack>

      {mensaje && <Alert severity="info" onClose={() => setMensaje(null)} sx={{ mt: 2 }}>{mensaje}</Alert>}

      <Box sx={{ mt: 3 }}>
        <RielEstado estado={solicitud.estado} />
      </Box>

      <Tarjeta titulo="Datos de la solicitud" sx={{ mt: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Dato titulo="Categoría" valor={solicitud.categoriaNombre ?? '—'} />
          <Dato titulo="Organización" valor={solicitud.organizacionNombre ?? '—'} />
          <Dato titulo="Contacto" valor={`${solicitud.contactoNombre} · ${solicitud.contactoEmail} · ${solicitud.contactoTelefono}`} />
          <Dato titulo="Urgencia declarada" valor={solicitud.urgenciaDeclarada ? ETIQUETAS_PRIORIDAD[solicitud.urgenciaDeclarada] : '—'} />
          <Dato titulo="Fecha de creación" valor={fechaLocal(solicitud.fechaCreacion)} />
          <Dato titulo="Fecha objetivo (SLA)" valor={fechaLocal(solicitud.fechaObjetivo)} />
          <Dato titulo="Fecha programada" valor={fechaLocal(solicitud.fechaProgramada)} />
          <Dato titulo="Técnico asignado" valor={solicitud.tecnicoNombre ?? 'Sin asignar'} />
        </Box>

        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{solicitud.descripcion}</Typography>
        </Box>

        {solicitud.rechazadaMotivo && (
          <Alert severity="error" sx={{ mt: 2 }}>Motivo del rechazo: {solicitud.rechazadaMotivo}</Alert>
        )}
        {solicitud.canceladaMotivo && (
          <Alert severity="error" sx={{ mt: 2 }}>Motivo de la cancelación: {solicitud.canceladaMotivo}</Alert>
        )}
        {solicitud.resolucion && (
          <Alert severity="success" sx={{ mt: 2 }}>Resolución: {solicitud.resolucion}</Alert>
        )}
      </Tarjeta>

      {cancelable && (
        <Box sx={{ mt: 3 }}>
          <Boton variante="peligro" onClick={() => setCancelando(true)}>Cancelar solicitud</Boton>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Solo puede cancelarse antes de la aprobación. Después de aprobada, contacta a coordinación.
          </Typography>
        </Box>
      )}

      {cancelando && (
        <Modal titulo="Cancelar solicitud" abierto onCerrar={() => setCancelando(false)}>
          <Stack component="form" onSubmit={cancelar} spacing={2}>
            <Typography variant="body2" color="text.secondary">
              La cancelación es definitiva y requiere un motivo.
            </Typography>
            <Campo label="Motivo">
              <AreaTexto required value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explica por qué cancelas la solicitud…" />
            </Campo>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Boton type="button" variante="secundario" onClick={() => setCancelando(false)}>Volver</Boton>
              <Boton type="submit" variante="peligro">Confirmar cancelación</Boton>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Pagina>
  )
}
