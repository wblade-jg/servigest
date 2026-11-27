import { useEffect, useState } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { get, patch, ApiError } from '../../../lib/api'
import { type Solicitud, ETIQUETAS_PRIORIDAD, fechaLocal } from '../../../lib/solicitudes'
import { Boton, Campo, AreaTexto, Entrada, Selector, Modal } from '../../../components/ui/primitivos'
import { archivo } from '../../../theme'

interface TecnicoItem {
  id: string
  nombre: string
  email: string
  especialidades: string[] | null
}

interface ModalAsignarProps {
  solicitud: Solicitud
  abierto: boolean
  onCerrar: () => void
  onExito: () => void
}

export default function ModalAsignar({
  solicitud,
  abierto,
  onCerrar,
  onExito
}: ModalAsignarProps) {
  const [tecnicos, setTecnicos] = useState<TecnicoItem[]>([])
  const [tecnicoId, setTecnicoId] = useState(solicitud.tecnicoId || '')
  const [fechaProgramada, setFechaProgramada] = useState('')
  const [motivo, setMotivo] = useState('')
  const [cargandoTecnicos, setCargandoTecnicos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esReasignacion = solicitud.estado === 'ASIGNADA'
  const titulo = esReasignacion ? 'Reasignar técnico' : 'Asignar técnico'

  useEffect(() => {
    if (!abierto) return

    let cancelado = false
    async function cargarTecnicos() {
      setCargandoTecnicos(true)
      setError(null)
      try {
        const query = solicitud.especialidadRequeridaId
          ? `/tecnicos?activo=true&limit=100&especialidadId=${solicitud.especialidadRequeridaId}`
          : '/tecnicos?activo=true&limit=100'

        const respuesta = await get<{ data: TecnicoItem[] }>(query)
        if (!cancelado) {
          setTecnicos(respuesta.data || [])
          if (respuesta.data?.length === 0) {
            setError(
              solicitud.especialidadRequeridaNombre
                ? `No hay técnicos activos con la especialidad requerida (${solicitud.especialidadRequeridaNombre}).`
                : 'No hay técnicos activos disponibles.'
            )
          }
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof ApiError ? err.message : 'Error al cargar los técnicos.')
        }
      } finally {
        if (!cancelado) setCargandoTecnicos(false)
      }
    }

    cargarTecnicos()
    return () => {
      cancelado = true
    }
  }, [abierto, solicitud.especialidadRequeridaId, solicitud.especialidadRequeridaNombre])

  // Validación visual temprana del SLA
  const superaSla = Boolean(
    fechaProgramada &&
    solicitud.fechaObjetivo &&
    new Date(fechaProgramada).getTime() > new Date(solicitud.fechaObjetivo).getTime()
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tecnicoId) {
      setError('Debes seleccionar un técnico.')
      return
    }

    if (!fechaProgramada) {
      setError('Debes seleccionar una fecha y hora programada.')
      return
    }

    if (new Date(fechaProgramada).getTime() <= Date.now()) {
      setError('La fecha y hora programada debe ser en el futuro.')
      return
    }

    if (superaSla) {
      setError('La fecha programada supera la fecha límite del SLA.')
      return
    }

    if (esReasignacion && motivo.trim().length < 5) {
      setError('El motivo de reasignación es obligatorio (mínimo 5 caracteres).')
      return
    }

    setGuardando(true)
    try {
      await patch(`/solicitudes/${solicitud.id}/estado`, {
        estado: 'ASIGNADA',
        tecnicoId,
        fechaProgramada: new Date(fechaProgramada).toISOString(),
        ...(esReasignacion ? { motivo: motivo.trim() } : {})
      })
      onExito()
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la asignación.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={titulo} abierto={abierto} onCerrar={onCerrar}>
      <Stack component="form" onSubmit={handleSubmit} spacing={2}>
        {solicitud.especialidadRequeridaNombre && (
          <Box sx={{ bgcolor: 'info.light', color: 'info.dark', px: 1.5, py: 1, borderRadius: 1 }}>
            <Typography variant="body2">
              <Box component="span" sx={{ fontFamily: archivo, fontWeight: 700 }}>
                Especialidad requerida:
              </Box>{' '}
              {solicitud.especialidadRequeridaNombre}
            </Typography>
          </Box>
        )}

        {solicitud.fechaObjetivo && (
          <Box sx={{ bgcolor: 'background.default', px: 1.5, py: 1, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ fontFamily: archivo, fontWeight: 700, color: 'text.primary' }}>
                Fecha límite SLA:
              </Box>{' '}
              {fechaLocal(solicitud.fechaObjetivo)} ({solicitud.prioridad ? ETIQUETAS_PRIORIDAD[solicitud.prioridad] ?? solicitud.prioridad : 'Sin prioridad'})
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Campo
          label="Técnico asignado"
          ayuda={
            solicitud.especialidadRequeridaNombre
              ? `Listando únicamente técnicos con especialidad en ${solicitud.especialidadRequeridaNombre}.`
              : 'Selecciona un técnico activo del equipo.'
          }
        >
          <Selector
            value={tecnicoId}
            onChange={(e) => setTecnicoId(e.target.value)}
            disabled={cargandoTecnicos || guardando}
            required
          >
            <option value="" disabled>
              {cargandoTecnicos ? 'Cargando técnicos...' : 'Selecciona un técnico'}
            </option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} ({t.email})
                {t.especialidades && t.especialidades.length > 0 ? ` — [${t.especialidades.join(', ')}]` : ''}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo
          label="Fecha y hora de intervención"
          ayuda="Debe coincidir con la franja horaria de disponibilidad del técnico."
        >
          <Entrada
            type="datetime-local"
            value={fechaProgramada}
            onChange={(e) => setFechaProgramada(e.target.value)}
            disabled={guardando}
            required
          />
        </Campo>

        {superaSla && (
          <Alert severity="warning">
            La fecha seleccionada supera el SLA objetivo ({fechaLocal(solicitud.fechaObjetivo!)}).
          </Alert>
        )}

        {esReasignacion && (
          <Campo
            label="Motivo de la reasignación"
            ayuda="Quedará registrado de forma inmutable en el historial de auditoría."
          >
            <AreaTexto
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica la razón del cambio de técnico o fecha…"
              disabled={guardando}
              required
            />
          </Campo>
        )}

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" disabled={guardando || cargandoTecnicos}>
            {guardando ? 'Guardando...' : esReasignacion ? 'Confirmar reasignación' : 'Asignar técnico'}
          </Boton>
        </Stack>
      </Stack>
    </Modal>
  )
}
