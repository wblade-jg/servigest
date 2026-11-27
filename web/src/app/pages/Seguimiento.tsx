import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material'
import { get, ApiError } from '../../lib/api'
import { useSse } from '../../lib/sse'
import {
  type Seguimiento,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../lib/solicitudes'
import { Dato, Pagina } from '../../components/ui/primitivos'
import { RielEstado } from '../../components/ui/RielEstado'

// Timeline público: solo estado y coordinación, sin notas, adjuntos ni contacto.

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
      <Pagina maxWidth="sm">
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography component={Link} to="/" variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
          Volver al inicio
        </Typography>
      </Pagina>
    )
  }

  if (!datos) {
    return (
      <Pagina maxWidth="sm">
        <Skeleton variant="text" width="40%" height={44} />
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rectangular" height={180} sx={{ mt: 3, borderRadius: 1 }} />
      </Pagina>
    )
  }

  return (
    <Pagina maxWidth="sm">
      <Typography variant="h1">Seguimiento</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Solicitud{' '}
        <Typography component="span" sx={{ fontFamily: '"Archivo Variable", sans-serif', fontWeight: 700, color: 'text.primary' }}>
          {datos.codigo}
        </Typography>
      </Typography>

      <Card
        variant="outlined"
        sx={{
          mt: 3,
          bgcolor: 'secondary.dark',
          borderColor: 'secondary.dark',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)', fontWeight: 700 }}>
            Estado actual de la solicitud
          </Typography>
          <Typography
            component="p"
            sx={{
              mt: 0.75,
              mb: 0,
              color: 'common.white',
              fontFamily: '"Archivo Variable", sans-serif',
              fontSize: { xs: 38, sm: 52 },
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: '-0.035em',
            }}
          >
            {ETIQUETAS_ESTADO[datos.estado] ?? datos.estado}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: { xs: 1.5, sm: 2 },
              mt: 4,
              pt: 2.5,
              borderTop: '1px solid',
              borderColor: 'rgba(255,255,255,0.14)',
              '& dt': { color: 'rgba(255,255,255,0.58)' },
              '& dd': { color: 'common.white' },
            }}
          >
            <Dato
              titulo="Prioridad"
              valor={datos.prioridad ? (ETIQUETAS_PRIORIDAD[datos.prioridad] ?? datos.prioridad) : 'Por definir en revisión'}
            />
            <Dato titulo="Fecha de creación" valor={fechaLocal(datos.fechaCreacion)} />
            <Dato titulo="Fecha objetivo" valor={fechaLocal(datos.fechaObjetivo)} />
            <Dato titulo="Fecha programada" valor={fechaLocal(datos.fechaProgramada)} />
            <Dato titulo="Técnico asignado" valor={datos.tecnicoAsignado ?? 'Sin asignar'} />
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ mt: 4, px: { xs: 0.5, sm: 1 }, opacity: 0.72 }}>
        <RielEstado
          estado={datos.estado}
          fechas={{
            RECIBIDA: datos.fechaCreacion,
            ASIGNADA: datos.fechaProgramada,
          }}
        />
      </Box>

      <Stack spacing={1} sx={{ mt: 4 }}>
        <Typography variant="caption" color="text.secondary">
          La vista se actualiza en vivo. Guarda este enlace para volver a consultar.
        </Typography>
      </Stack>
    </Pagina>
  )
}
