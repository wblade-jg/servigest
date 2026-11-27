import { Link } from 'react-router-dom'
import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material'
import Hero from '../../components/Hero'
import { lavandaHonda } from '../../theme'

const lineas = [
  {
    nombre: 'Soporte técnico',
    descripcion: 'Diagnóstico y resolución de incidencias de equipos, redes y sistemas.',
    modalidad: 'Por intervención o suscripción',
    imagen: '/servicio-soporte.png',
  },
  {
    nombre: 'Mantenimiento y prevención',
    descripcion: 'Inspecciones y actividades planificadas para reducir fallos operativos.',
    modalidad: 'Principalmente suscripción',
    imagen: '/servicio-mantenimiento.png',
  },
  {
    nombre: 'Consultoría y optimización',
    descripcion: 'Evaluación de infraestructura y procesos, con mejoras cotizadas por separado.',
    modalidad: 'Proyecto o acompañamiento',
    imagen: '/servicio-consultoria.png',
  },
]

const pasos = [
  {
    titulo: 'Envías tu requerimiento',
    texto: 'Describe la necesidad desde el formulario público; no hace falta registrarte.',
  },
  {
    titulo: 'Recibes un código de seguimiento',
    texto: 'La solicitud queda registrada y el equipo la revisa.',
  },
  {
    titulo: 'Revisamos y coordinamos',
    texto: 'Validamos la información y te contactamos para cotizar o pedir detalles.',
  },
  {
    titulo: 'Se ejecuta y se documenta',
    texto: 'Un técnico especializado realiza la intervención y registra el resultado.',
  },
]

export default function Inicio() {
  return (
    <>
      <Hero />

      <Container maxWidth="lg" component="section" aria-labelledby="servicios" sx={{ py: { xs: 8, md: 10 } }}>
        <Typography id="servicios" variant="h2" sx={{ maxWidth: 760 }}>
          Tres líneas de servicio, una sola operación centralizada.
        </Typography>

        <Grid container spacing={3} sx={{ mt: 4 }}>
          {lineas.map((linea) => (
            <Grid key={linea.nombre} size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box
                    component="img"
                    src={linea.imagen}
                    alt=""
                    sx={{ display: 'block', width: '100%', height: 160, objectFit: 'contain' }}
                  />
                </Box>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <Typography variant="h5">{linea.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, flex: 1 }}>
                    {linea.descripcion}
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 2, color: 'primary.main', fontWeight: 600 }}>
                    {linea.modalidad}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 760 }}>
          Las solicitudes se gestionan desde una sola plataforma: revisión, asignación por especialidad,
          intervenciones documentadas y estado en línea.
        </Typography>
      </Container>

      <Box component="section" aria-labelledby="como-funciona" sx={{ bgcolor: lavandaHonda }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
          <Typography id="como-funciona" variant="h2" sx={{ maxWidth: 760 }}>
            Cómo funciona sin suscripción.
          </Typography>

          <Grid container spacing={{ xs: 4, md: 3 }} sx={{ mt: 4 }}>
            {pasos.map((paso, i) => (
              <Grid key={paso.titulo} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Typography sx={{ fontFamily: '"Archivo Variable", sans-serif', fontSize: 28, fontWeight: 700, color: 'primary.main' }}>
                  {i + 1}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {paso.titulo}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {paso.texto}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 5, maxWidth: 640 }}>
            Enviar el formulario no implica la aceptación automática del trabajo: toda prestación queda
            sujeta a evaluación, cotización y aceptación.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" component="section" aria-labelledby="cta-final" sx={{ py: { xs: 8, md: 10 } }}>
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Typography id="cta-final" variant="h2" sx={{ maxWidth: 640 }}>
              Cuéntanos qué necesita tu empresa.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 640 }}>
              Completa el formulario en pocos minutos. Recibirás un código para seguir el estado de tu
              solicitud en todo momento.
            </Typography>
            <Stack direction="row" sx={{ mt: 3 }}>
              <Button component={Link} to="/solicitar" variant="contained" size="large">
                Crear una solicitud
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}
