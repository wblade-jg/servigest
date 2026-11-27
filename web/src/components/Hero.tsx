import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material'
import { Boton, Entrada } from './ui/primitivos'

export default function Hero() {
  const [token, setToken] = useState('')
  const navigate = useNavigate()

  const consultar = (e: FormEvent) => {
    e.preventDefault()
    let limpio = token.trim()
    if (limpio.includes('/seguimiento/')) {
      const partes = limpio.split('/seguimiento/')
      limpio = partes[partes.length - 1].split('?')[0].split('#')[0].trim()
    }
    if (limpio) navigate(`/seguimiento/${encodeURIComponent(limpio)}`)
  }

  return (
    <Box component="section" sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 5, lg: 6 }} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Typography variant="h1">
              Soporte tecnológico gestionado, sin departamento interno de TI.
            </Typography>
            <Typography
              variant="body1"
              sx={{ mt: 3, maxWidth: 620, color: 'text.secondary', fontSize: { xs: '1rem', md: '1.0625rem' } }}
            >
              Diagnóstico y resolución de incidencias, mantenimiento planificado y consultoría para pymes del
              Ecuador. Cada solicitud queda registrada con un código y puedes seguir su estado en línea.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button component={Link} to="/solicitar" variant="contained" size="large">
                Solicitar asistencia
              </Button>
              <Button component={Link} to="/servicios" variant="outlined" size="large">
                Ver servicios
              </Button>
            </Stack>

            <Card
              variant="outlined"
              sx={{
                mt: 5,
                maxWidth: 620,
                bgcolor: 'secondary.dark',
                borderColor: 'secondary.dark',
                boxShadow: 'none',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 }, '&:last-child': { pb: { xs: 2.5, sm: 3 } } }}>
                <Typography variant="h6" sx={{ color: 'common.white' }}>¿Ya enviaste una solicitud?</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'rgba(255,255,255,0.68)' }}>
                  Ingresa el token de seguimiento que recibiste o pega tu enlace.
                </Typography>
                <Stack
                  component="form"
                  onSubmit={consultar}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mt: 2 }}
                  aria-label="Seguimiento de una solicitud"
                >
                  <Entrada
                    id="token-seguimiento"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Ej. tok-demo-fase3-00010 o tu token"
                    aria-label="Token de seguimiento"
                    sx={{
                      flex: 1,
                      fontFamily: 'monospace',
                      bgcolor: 'common.white',
                      borderColor: 'rgba(255,255,255,0.76)',
                      color: 'text.primary',
                    }}
                  />
                  <Boton
                    type="submit"
                    variante="primario"
                    sx={{ minWidth: { sm: 116 }, whiteSpace: 'nowrap' }}
                  >
                    Consultar estado
                  </Boton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Box
              component="img"
              src="/hero-illustration.png"
              alt="Infraestructura y soporte tecnológico gestionado de ServiGest"
              width={862}
              height={651}
              sx={{ display: 'block', width: '100%', height: 'auto', maxWidth: 520, mx: 'auto' }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
