import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardContent, Link as MuiLink, Stack, Typography } from '@mui/material'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import { get, post, ApiError } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import type { Categoria, CreacionSolicitud } from '../../../lib/solicitudes'
import { Boton, Campo, Entrada, AreaTexto, Selector, Cargando, ErrorPanel, Pagina } from '../../../components/ui/primitivos'

// Formulario corporativo: el backend fuerza origen CLIENTE y la organización
// de la sesión, independientemente de lo que envíe el navegador.

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export default function NuevaSolicitud () {
  const { usuario } = useAuth()
  const navegar = useNavigate()
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CreacionSolicitud | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => setError('No se pudo cargar el catálogo de categorías.'))
  }, [])

  async function enviar (e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formulario = new FormData(e.currentTarget)
    const datos = {
      contactoNombre: String(formulario.get('contactoNombre') || '').trim(),
      contactoEmail: String(formulario.get('contactoEmail') || '').trim(),
      contactoTelefono: String(formulario.get('contactoTelefono') || '').trim(),
      categoriaId: String(formulario.get('categoriaId') || ''),
      descripcion: String(formulario.get('descripcion') || '').trim(),
      ubicacion: String(formulario.get('ubicacion') || '').trim() || undefined,
      urgenciaDeclarada: String(formulario.get('urgenciaDeclarada') || '') || undefined,
    }

    setEnviando(true)
    try {
      setResultado(await post<CreacionSolicitud>('/solicitudes', datos))
    } catch (err) {
      if (err instanceof ApiError) {
        const campos = err.details?.campos as string[] | undefined
        setError(campos?.length ? `${err.message} (${campos.join(', ')})` : err.message)
      } else {
        setError('No se pudo crear la solicitud. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <Pagina maxWidth="sm">
        <Card variant="outlined" sx={{ borderColor: 'success.main', bgcolor: 'success.light' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h2" sx={{ color: 'success.dark' }}>Solicitud creada</Typography>
            <Typography variant="body1" sx={{ mt: 2 }}>
              Quedó registrada con el código <strong>{resultado.codigo}</strong> en estado{' '}
              <strong>Recibida</strong>. Coordinación la revisará antes de aprobarla y asignar un técnico.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button component={Link} to={`/app/mis-solicitudes/${resultado.id}`} variant="contained">
                Ver detalle
              </Button>
              <Boton variante="secundario" onClick={() => navegar('/app/mis-solicitudes')}>
                Ir a mis solicitudes
              </Boton>
            </Stack>
          </CardContent>
        </Card>
      </Pagina>
    )
  }

  return (
    <Pagina maxWidth="sm">
      <MuiLink
        component={Link}
        to="/app/mis-solicitudes"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ArrowBackOutlined sx={{ fontSize: 16 }} /> Mis solicitudes
      </MuiLink>
      <Typography variant="h2" sx={{ mt: 1.5 }}>Nueva solicitud</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Describe el requerimiento de tu organización. La prioridad final la define coordinación al aprobar.
      </Typography>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {!categorias && !error && <Box sx={{ mt: 3 }}><Cargando texto="Cargando categorías…" /></Box>}

      {categorias && (
        <Stack component="form" onSubmit={enviar} spacing={2.5} sx={{ mt: 4 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Campo label="Nombre de contacto">
              <Entrada name="contactoNombre" required defaultValue={usuario?.nombre ?? ''} />
            </Campo>
            <Campo label="Teléfono">
              <Entrada name="contactoTelefono" required placeholder="+593 99 123 4567" />
            </Campo>
          </Box>
          <Campo label="Correo electrónico">
            <Entrada name="contactoEmail" type="email" required defaultValue={usuario?.email ?? ''} />
          </Campo>
          <Campo label="Categoría">
            <Selector name="categoriaId" required defaultValue="">
              <option value="" disabled>Selecciona una categoría…</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
          </Campo>
          <Campo label="Descripción" ayuda="Entre 20 y 2000 caracteres.">
            <AreaTexto name="descripcion" required minLength={20} maxLength={2000} placeholder="Describe el problema o requerimiento…" />
          </Campo>
          <Campo label="Ubicación" ayuda="Opcional: sede, piso o referencia para la visita.">
            <Entrada name="ubicacion" />
          </Campo>
          <Campo label="Urgencia declarada" ayuda="Solo como referencia; la prioridad la fija coordinación.">
            <Selector name="urgenciaDeclarada" defaultValue="">
              <option value="">Sin preferencia</option>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Selector>
          </Campo>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Boton type="button" variante="secundario" onClick={() => navegar('/app/mis-solicitudes')}>Cancelar</Boton>
            <Boton type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear solicitud'}</Boton>
          </Stack>
        </Stack>
      )}
    </Pagina>
  )
}
