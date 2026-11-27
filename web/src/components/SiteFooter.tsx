import { Link } from 'react-router-dom'
import { Box, Container, Link as MuiLink, Stack, Typography } from '@mui/material'
import { archivo, tinta } from '../theme'

export default function SiteFooter() {
  return (
    <Box component="footer" sx={{ bgcolor: tinta[900], color: 'rgba(255,255,255,0.78)' }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 4,
            py: 6,
          }}
        >
          <Box>
            <Box component="img" src="/servigest-logo-alt.png" alt="ServiGest" sx={{ height: 36, width: 'auto' }} />
            <Typography variant="body2" sx={{ mt: 1.5, maxWidth: 280 }}>
              Servicios tecnológicos gestionados y consultoría para pymes del Ecuador.
            </Typography>
          </Box>

          <Stack component="nav" aria-label="Enlaces del sitio" spacing={1}>
            {[
              { to: '/servicios', texto: 'Servicios' },
              { to: '/planes', texto: 'Planes' },
              { to: '/solicitar', texto: 'Solicitar asistencia' },
              { to: '/seguimiento', texto: 'Seguimiento de solicitud' },
            ].map((enlace) => (
              <MuiLink
                key={enlace.to}
                component={Link}
                to={enlace.to}
                variant="body2"
                sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 400, '&:hover': { color: 'primary.light' } }}
              >
                {enlace.texto}
              </MuiLink>
            ))}
          </Stack>

          <Box>
            <Typography variant="body2">Quito · Guayaquil</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Horario de atención: lunes a viernes, 08:00–17:00
            </Typography>
          </Box>
        </Box>
      </Container>

      <Box sx={{ borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.15)', py: 2 }}>
        <Container maxWidth="lg">
          <Typography
            variant="caption"
            component="p"
            sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: archivo }}
          >
            © {new Date().getFullYear()} ServiGest Ecuador · Proyecto demostrativo
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
