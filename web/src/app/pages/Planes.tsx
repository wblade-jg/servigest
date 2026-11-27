import { Link } from 'react-router-dom'
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import CheckOutlined from '@mui/icons-material/CheckOutlined'
import { Pagina } from '../../components/ui/primitivos'

const planes = [
  {
    nombre: 'Soporte bajo demanda',
    descripcion:
      'Atención de requerimientos puntuales sin compromiso de volumen. Ideal para pymes que inician su gestión tecnológica.',
    puntos: ['Requerimientos individuales', 'Seguimiento público con token', 'Horario de atención de oficina'],
  },
  {
    nombre: 'Gestión mensual',
    descripcion:
      'Un canal continuo de asistencia con coordinación de prioridades y reporte de actividades.',
    puntos: ['Solicitudes ilimitadas dentro del mes', 'Priorización coordinada con SLA', 'Intervenciones documentadas'],
  },
  {
    nombre: 'Consultoría por proyecto',
    descripcion:
      'Acompañamiento en proyectos de infraestructura: redes, servidores, seguridad y respaldos.',
    puntos: ['Alcance acordado por escrito', 'Ejecución por técnicos certificados', 'Cierre con resolución documentada'],
  },
]

export default function Planes() {
  return (
    <Pagina>
      <Typography variant="h1">Planes</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 680 }}>
        Modalidades de contratación informativas. La solicitud de asistencia se inicia desde el formulario
        público; no hay contratación en línea.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        {planes.map((plan) => (
          <Grid key={plan.nombre} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Typography variant="h4">{plan.nombre}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  {plan.descripcion}
                </Typography>
                <Stack component="ul" spacing={1} sx={{ mt: 2.5, m: 0, p: 0, listStyle: 'none' }}>
                  {plan.puntos.map((punto) => (
                    <Stack component="li" key={punto} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                      <Box sx={{ color: 'primary.main', mt: '2px', display: 'flex' }}>
                        <CheckOutlined sx={{ fontSize: 16 }} />
                      </Box>
                      <Typography variant="body2">{punto}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Stack direction="row" sx={{ mt: 6 }}>
        <Button component={Link} to="/solicitar" variant="contained" size="large">
          Solicitar asistencia
        </Button>
      </Stack>
    </Pagina>
  )
}
