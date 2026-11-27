import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { get, ApiError } from '../../lib/api'
import type { Categoria } from '../../lib/solicitudes'
import { Cargando, Pagina } from '../../components/ui/primitivos'

export default function Servicios() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo de servicios.')
      })
  }, [])

  return (
    <Pagina>
      <Typography variant="h1">Servicios</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 640 }}>
        Categorías disponibles para solicitar asistencia técnica gestionada.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      )}

      {!categorias && !error && (
        <Box sx={{ mt: 4 }}>
          <Cargando texto="Cargando servicios…" />
        </Box>
      )}

      {categorias && (
        <Grid container spacing={3} sx={{ mt: 4 }}>
          {categorias.map((c) => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5">{c.nombre}</Typography>
                  {c.descripcion && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {c.descripcion}
                    </Typography>
                  )}
                  {c.especialidad && (
                    <Chip
                      size="small"
                      label={c.especialidad}
                      variant="outlined"
                      color="primary"
                      sx={{ mt: 2 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Stack direction="row" sx={{ mt: 6 }}>
        <Button component={Link} to="/solicitar" variant="contained" size="large">
          Solicitar asistencia
        </Button>
      </Stack>
    </Pagina>
  )
}
