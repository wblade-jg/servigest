import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import CheckOutlined from '@mui/icons-material/CheckOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import { get, postMultipart, ApiError } from '../../lib/api'
import type { Categoria, CreacionSolicitud } from '../../lib/solicitudes'
import { AreaTexto, Boton, Campo, Entrada, Pagina, Selector } from '../../components/ui/primitivos'

const MAX_ADJUNTOS = 5
const TAMANO_MAX = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'application/pdf']

export default function Solicitar() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CreacionSolicitud | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => setError('No se pudo cargar el catálogo de categorías.'))
  }, [])

  function validarArchivos(archivos: FileList | null): File[] | null {
    if (!archivos || archivos.length === 0) return []
    if (archivos.length > MAX_ADJUNTOS) {
      setError(`Se permiten como máximo ${MAX_ADJUNTOS} archivos.`)
      return null
    }
    for (const archivo of archivos) {
      if (!TIPOS.includes(archivo.type)) {
        setError(`"${archivo.name}" no es un archivo jpg, png o pdf.`)
        return null
      }
      if (archivo.size > TAMANO_MAX) {
        setError(`"${archivo.name}" supera el máximo de 5 MB.`)
        return null
      }
    }
    return Array.from(archivos)
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    const campos = Object.fromEntries(
      Array.from(datos.entries()).filter(([clave]) => clave !== 'adjuntos'),
    ) as Record<string, string>
    const entradaAdjuntos = formulario.elements.namedItem('adjuntos') as HTMLInputElement | null
    const archivos = validarArchivos(entradaAdjuntos?.files ?? null)
    if (archivos === null) return

    setEnviando(true)
    try {
      const creada = await postMultipart<CreacionSolicitud>('/public/solicitudes', campos, archivos)
      setResultado(creada)
      window.scrollTo(0, 0)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.details?.campos ? `${e.message} (${(e.details.campos as string[]).join(', ')})` : e.message)
      } else {
        setError('No se pudo enviar la solicitud. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <Pagina maxWidth="sm">
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              La solicitud quedó registrada correctamente.
            </Alert>
            <Typography variant="h2">Solicitud recibida</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Tu solicitud quedó registrada con el código{' '}
              <Typography component="span" sx={{ fontFamily: '"Archivo Variable", sans-serif', fontWeight: 700, color: 'text.primary' }}>
                {resultado.codigo}
              </Typography>{' '}
              (referencia para llamadas y correos).
            </Typography>

            <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 600 }}>
                Token de seguimiento en línea
              </Typography>
              <Typography
                sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 14, fontWeight: 700, wordBreak: 'break-all', userSelect: 'all' }}
              >
                {resultado.token}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Guarda este token para consultar el avance en la barra de búsqueda de la página principal.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
              <Button component={Link} to={`/seguimiento/${resultado.token}`} variant="contained">
                Ver seguimiento
              </Button>
              <Boton
                variante="secundario"
                startIcon={copiado ? <CheckOutlined /> : <ContentCopyOutlined />}
                onClick={() => {
                  void navigator.clipboard?.writeText(resultado.token)
                  setCopiado(true)
                  setTimeout(() => setCopiado(false), 2000)
                }}
              >
                {copiado ? 'Token copiado' : 'Copiar token'}
              </Boton>
            </Stack>
          </CardContent>
        </Card>
      </Pagina>
    )
  }

  return (
    <Pagina maxWidth="sm">
      <Typography variant="h1">Solicitar asistencia</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Describe tu requerimiento. Recibirás un código de seguimiento al enviar el formulario.
      </Typography>

      <Stack component="form" onSubmit={enviar} spacing={3} noValidate sx={{ mt: 4 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Campo label="Organización">
          <Entrada name="organizacion" required />
        </Campo>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Campo label="Nombre de contacto">
            <Entrada name="contactoNombre" required />
          </Campo>
          <Campo label="Teléfono">
            <Entrada name="contactoTelefono" required />
          </Campo>
        </Box>

        <Campo label="Correo electrónico">
          <Entrada name="contactoEmail" type="email" required />
        </Campo>

        <Campo label="Categoría">
          <Selector name="categoriaId" required defaultValue="">
            <option value="">Selecciona una categoría…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
        </Campo>

        <Campo label="Descripción" ayuda="Entre 20 y 2000 caracteres.">
          <AreaTexto name="descripcion" rows={5} required minLength={20} maxLength={2000} />
        </Campo>

        <Campo label="Ubicación" ayuda="Opcional.">
          <Entrada name="ubicacion" />
        </Campo>

        <Campo label="Urgencia" ayuda="Solo como referencia; la prioridad la define coordinación.">
          <Selector name="urgenciaDeclarada" defaultValue="">
            <option value="">Sin preferencia</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </Selector>
        </Campo>

        <Campo label="Adjuntos" ayuda="Hasta 5 archivos de 5 MB; jpg, png o pdf.">
          <Entrada name="adjuntos" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" />
        </Campo>

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Boton>
        </Stack>
      </Stack>
    </Pagina>
  )
}
