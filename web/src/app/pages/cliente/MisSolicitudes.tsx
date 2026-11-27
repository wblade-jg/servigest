import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { get, ApiError } from '../../../lib/api'
import {
  type ListadoSolicitudes,
  ETIQUETAS_ESTADO,
  ETIQUETAS_PRIORIDAD,
  fechaLocal,
} from '../../../lib/solicitudes'
import {
  BadgeEstado,
  Boton,
  Cargando,
  Entrada,
  ErrorPanel,
  EstadoVacio,
  Pagina,
  Selector,
} from '../../../components/ui/primitivos'
import { archivo } from '../../../theme'

const LIMITE = 20

// Listado de solicitudes del Cliente. El backend filtra siempre por su
// organización; aquí solo se presenta y se filtra por estado.

export default function MisSolicitudes () {
  const [listado, setListado] = useState<ListadoSolicitudes | null>(null)
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(1)
  const [texto, setTexto] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    setCargando(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) })
    if (estado) params.set('estado', estado)
    if (q) params.set('q', q)
    try {
      setListado(await get<ListadoSolicitudes>(`/solicitudes?${params.toString()}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus solicitudes.')
    } finally {
      setCargando(false)
    }
  }, [page, estado, q])

  useEffect(() => { void cargar() }, [cargar])

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => { setQ(texto); setPage(1) }, 350)
    return () => clearTimeout(temporizador)
  }, [texto])

  const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / LIMITE)) : 1

  return (
    <Pagina>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h2">Mis solicitudes</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Requerimientos de tu organización. Puedes cancelar una solicitud antes de su aprobación.
          </Typography>
        </Box>
        <Button component={Link} to="/app/mis-solicitudes/nueva" variant="contained">
          Nueva solicitud
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, mt: 3, maxWidth: 560 }}>
        <Entrada
          aria-label="Buscar solicitudes"
          placeholder="Buscar por código o descripción…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Selector
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1) }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ETIQUETAS_ESTADO).map(([clave, etiqueta]) => (
            <option key={clave} value={clave}>{etiqueta}</option>
          ))}
        </Selector>
      </Stack>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}

      {cargando && !listado && <Box sx={{ mt: 4 }}><Cargando texto="Cargando solicitudes…" /></Box>}

      {listado && listado.data.length === 0 && (
        <Box sx={{ mt: 4 }}>
          <EstadoVacio
            accion={
              <Button component={Link} to="/app/mis-solicitudes/nueva" variant="contained" size="small">
                Crear la primera solicitud
              </Button>
            }
          >
            Aún no hay solicitudes registradas.
          </EstadoVacio>
        </Box>
      )}

      {listado && listado.data.length > 0 && (
        <>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {listado.data.map((s) => (
              <Card key={s.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography
                          component={Link}
                          to={`/app/mis-solicitudes/${s.id}`}
                          variant="h5"
                          sx={{ color: 'primary.dark', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {s.codigo}
                        </Typography>
                        <BadgeEstado estado={s.estado} texto={ETIQUETAS_ESTADO[s.estado] ?? s.estado} />
                        {s.prioridad && (
                          <Typography variant="caption" color="text.secondary">
                            Prioridad {ETIQUETAS_PRIORIDAD[s.prioridad] ?? s.prioridad}
                          </Typography>
                        )}
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {s.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: archivo }}>
                        {s.categoriaNombre ?? 'Sin categoría'} · Creada {fechaLocal(s.fechaCreacion)} · SLA {fechaLocal(s.fechaObjetivo)}
                      </Typography>
                    </Box>
                    <Boton component={Link} to={`/app/mis-solicitudes/${s.id}`} variante="secundario" size="small" sx={{ flexShrink: 0 }}>
                      Ver detalle
                    </Boton>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              {listado.total} solicitud{listado.total === 1 ? '' : 'es'} · Página {page} de {totalPaginas}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Boton variante="secundario" size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Boton>
              <Boton variante="secundario" size="small" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Boton>
            </Stack>
          </Stack>
        </>
      )}
    </Pagina>
  )
}
