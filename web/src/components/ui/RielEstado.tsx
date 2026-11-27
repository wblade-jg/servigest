// Riel de estado: elemento firma de la interfaz. Representa el recorrido real
// de una solicitud por la máquina de estados, con fechas cuando están disponibles.

import { Alert, Box, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ETIQUETAS_ESTADO, fechaLocal } from '../../lib/solicitudes'
import { violeta } from '../../theme'

const ETAPAS = ['RECIBIDA', 'EN_REVISION', 'APROBADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA']

type Fechas = Record<string, string | null | undefined>

function indiceDe(estado: string): number {
  if (estado === 'REQUIERE_INFORMACION') return ETAPAS.indexOf('EN_REVISION')
  return ETAPAS.indexOf(estado)
}

export function RielEstado({
  estado,
  compacto = false,
  fechas,
}: {
  estado: string
  compacto?: boolean
  fechas?: Fechas
}) {
  const indice = indiceDe(estado)

  if (compacto) {
    if (indice === -1) return null
    return (
      <Stack
        direction="row"
        spacing={0.5}
        role="img"
        aria-label={`Avance de la solicitud: ${ETIQUETAS_ESTADO[estado] ?? estado}`}
        sx={{ alignItems: 'center' }}
      >
        {ETAPAS.map((etapa, i) => (
          <Box
            key={etapa}
            sx={{
              width: i === indice ? 10 : 6,
              height: i === indice ? 10 : 6,
              borderRadius: '50%',
              bgcolor: i <= indice ? 'primary.main' : 'divider',
              transition: 'background-color 200ms ease',
            }}
          />
        ))}
      </Stack>
    )
  }

  if (estado === 'RECHAZADA' || estado === 'CANCELADA') {
    return (
      <Alert severity="error">
        La solicitud terminó en estado <strong>{ETIQUETAS_ESTADO[estado]}</strong>. No se reabre: se crea una
        nueva solicitud relacionada.
      </Alert>
    )
  }

  return (
    <Box>
      {estado === 'REQUIERE_INFORMACION' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          La solicitud requiere información del solicitante antes de continuar.
        </Alert>
      )}

      {/* Escritorio: riel horizontal */}
      <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' }, pt: 1 }}>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: '7.14%',
            right: '7.14%',
            height: 2,
            bgcolor: 'divider',
          }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${ETAPAS.length}, 1fr)`, gap: 1 }}>
          {ETAPAS.map((etapa, i) => {
            const completado = i <= indice
            const actual = i === indice
            return (
              <Box
                key={etapa}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: completado ? 'primary.main' : 'divider',
                    bgcolor: completado ? 'primary.main' : 'background.paper',
                    boxShadow: actual ? `0 0 0 4px ${alpha(violeta[500], 0.16)}` : 'none',
                  }}
                />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: actual ? 700 : 500,
                      color: completado ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {ETIQUETAS_ESTADO[etapa] ?? etapa}
                  </Typography>
                  {fechas?.[etapa] && (
                    <Typography variant="caption" sx={{ display: 'block', fontSize: 11, color: 'text.secondary' }}>
                      {fechaLocal(fechas[etapa] ?? null)}
                    </Typography>
                  )}
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Móvil: riel vertical */}
      <Box component="ol" sx={{ display: { xs: 'block', sm: 'none' }, m: 0, p: 0, listStyle: 'none' }}>
        {ETAPAS.map((etapa, i) => {
          const completado = i <= indice
          const actual = i === indice
          return (
            <Box component="li" key={etapa} sx={{ display: 'flex', gap: 1.5, pb: i < ETAPAS.length - 1 ? 2 : 0 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    mt: '3px',
                    borderRadius: '50%',
                    bgcolor: completado ? 'primary.main' : 'divider',
                    boxShadow: actual ? `0 0 0 3px ${alpha(violeta[500], 0.16)}` : 'none',
                  }}
                />
                {i < ETAPAS.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      minHeight: 20,
                      mt: 0.5,
                      bgcolor: i < indice ? 'primary.main' : 'divider',
                    }}
                  />
                )}
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: actual ? 700 : 500, color: completado ? 'text.primary' : 'text.secondary' }}
                >
                  {ETIQUETAS_ESTADO[etapa] ?? etapa}
                </Typography>
                {fechas?.[etapa] && (
                  <Typography variant="caption" color="text.secondary">
                    {fechaLocal(fechas[etapa] ?? null)}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
