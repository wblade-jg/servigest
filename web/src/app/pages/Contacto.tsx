import { Link } from 'react-router-dom'
import { Card, CardContent, Stack, Typography } from '@mui/material'
import { Pagina } from '../../components/ui/primitivos'

export default function Contacto() {
  return (
    <Pagina maxWidth="md">
      <Typography variant="h1">Contacto</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Canales oficiales de ServiGest Ecuador.
      </Typography>

      <Stack spacing={2.5} sx={{ mt: 5 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Ciudades</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Quito · Guayaquil
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Horario de atención</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Lunes a viernes, 08:00–17:00 (America/Guayaquil)
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Requerimientos técnicos</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Usa el formulario de{' '}
              <Typography
                component={Link}
                to="/solicitar"
                variant="body2"
                sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'underline' }}
              >
                solicitud de asistencia
              </Typography>
              . Recibirás un código y un enlace de seguimiento inmediato.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Pagina>
  )
}
