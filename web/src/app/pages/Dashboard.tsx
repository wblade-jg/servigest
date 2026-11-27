import { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { ApiError } from '../../lib/api'
import { useAuth, esInterno } from '../../lib/auth'
import { useSse } from '../../lib/sse'
import { obtenerDashboard, type DashboardData } from '../../lib/dashboard'
import { ETIQUETAS_ESTADO, ETIQUETAS_PRIORIDAD } from '../../lib/solicitudes'
import { Cargando, ErrorPanel, Pagina, Tarjeta } from '../../components/ui/primitivos'

// Dashboard operativo: internos ven métricas globales y carga por técnico;
// el Cliente solo las métricas de su organización.

type Tono = 'neutro' | 'verde' | 'ambar' | 'rojo'

const TONOS: Record<Tono, string> = {
  neutro: 'text.primary',
  verde: 'success.main',
  ambar: 'warning.main',
  rojo: 'error.main',
}

export default function Dashboard() {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerDashboard())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el dashboard.')
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  // El canal de coordinación solo existe para internos; el Cliente refresca
  // al navegar. Evitamos abrir una conexión que respondería 403.
  const canal = esInterno(usuario) ? '/api/eventos/coordinacion' : ''
  useSse(canal, () => { void cargar() }, () => { void cargar() })

  if (error) {
    return (
      <Pagina>
        <ErrorPanel mensaje={error} />
      </Pagina>
    )
  }
  if (!datos) {
    return (
      <Pagina>
        <Cargando texto="Cargando dashboard…" />
      </Pagina>
    )
  }

  const totalPrioridades = datos.porPrioridad.reduce((suma, p) => suma + p.total, 0)
  const totalSla = datos.sla.enPlazo + datos.sla.porVencer + datos.sla.vencidas

  return (
    <Pagina>
      <Typography variant="h2">Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {esInterno(usuario)
          ? 'Métricas globales de la operación y cumplimiento de SLA.'
          : 'Métricas de las solicitudes de tu organización.'}
      </Typography>

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Kpi titulo="Solicitudes" valor={String(datos.total)} detalle="Total registradas" />
        <Kpi titulo="En plazo" valor={String(datos.sla.enPlazo)} detalle="SLA con más de 24 h" tono="verde" />
        <Kpi titulo="Por vencer" valor={String(datos.sla.porVencer)} detalle="SLA en las próximas 24 h" tono="ambar" />
        <Kpi titulo="Vencidas" valor={String(datos.sla.vencidas)} detalle="SLA fuera de tiempo" tono="rojo" />
      </Box>

      <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Kpi titulo="MTTR" valor={datos.mttrHoras === null ? '—' : `${datos.mttrHoras} h`} detalle="Promedio de resolución (30 días)" />
        <Kpi titulo="Sin fecha objetivo" valor={String(datos.sla.sinFecha)} detalle="No terminales sin SLA calculado" />
      </Box>

      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Tarjeta titulo="Distribución por estado">
          <Barras
            filas={datos.porEstado.map((e) => ({
              etiqueta: ETIQUETAS_ESTADO[e.estado] ?? e.estado,
              total: e.total,
            }))}
            total={datos.total}
            vacio="Sin solicitudes registradas."
          />
        </Tarjeta>

        <Tarjeta titulo="Prioridad (no terminales)">
          <Barras
            filas={datos.porPrioridad.map((p) => ({
              etiqueta: ETIQUETAS_PRIORIDAD[p.prioridad] ?? p.prioridad,
              total: p.total,
            }))}
            total={totalPrioridades}
            vacio="Sin solicitudes abiertas."
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {totalSla} solicitudes no terminales con SLA calculado.
          </Typography>
        </Tarjeta>
      </Box>

      {datos.cargaTecnicos && (
        <Tarjeta titulo="Carga por técnico" sx={{ mt: 3 }}>
          {datos.cargaTecnicos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sin solicitudes asignadas o en proceso.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Técnico</TableCell>
                  <TableCell align="right">Solicitudes activas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {datos.cargaTecnicos.map((t) => (
                  <TableRow key={t.tecnicoId}>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: '"Archivo Variable", sans-serif', fontWeight: 700 }}>
                      {t.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Tarjeta>
      )}
    </Pagina>
  )
}

function Kpi({ titulo, valor, detalle, tono = 'neutro' }: {
  titulo: string
  valor: string
  detalle: string
  tono?: Tono
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}>
          {titulo}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontFamily: '"Archivo Variable", sans-serif',
            fontSize: { xs: 26, sm: 30 },
            fontWeight: 700,
            lineHeight: 1.1,
            color: TONOS[tono],
          }}
        >
          {valor}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {detalle}
        </Typography>
      </CardContent>
    </Card>
  )
}

function Barras({ filas, total, vacio }: {
  filas: Array<{ etiqueta: string; total: number }>
  total: number
  vacio: string
}) {
  if (filas.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {vacio}
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      {filas.map((fila) => {
        const porcentaje = total > 0 ? Math.round((fila.total / total) * 100) : 0
        return (
          <Box key={fila.etiqueta}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {fila.etiqueta}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fila.total}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={porcentaje}
              aria-label={`${fila.etiqueta}: ${fila.total}`}
            />
          </Box>
        )
      })}
    </Stack>
  )
}
