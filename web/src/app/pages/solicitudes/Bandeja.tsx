import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { get, ApiError } from '../../../lib/api'
import { useSse } from '../../../lib/sse'
import {
  type ListadoSolicitudes,
  type Solicitud,
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
  Tarjeta,
} from '../../../components/ui/primitivos'

const ESTADOS = [
  'RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA',
  'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA',
]

const LIMITE = 20

export default function Bandeja() {
  const [filtros, setFiltros] = useState({ estado: '', prioridad: '', origen: '', q: '' })
  const [page, setPage] = useState(1)
  const [listado, setListado] = useState<ListadoSolicitudes | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [texto, setTexto] = useState('')

  const construirConsulta = useCallback((p: number, f: typeof filtros) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(LIMITE))
    if (f.estado) params.set('estado', f.estado)
    if (f.prioridad) params.set('prioridad', f.prioridad)
    if (f.origen) params.set('origen', f.origen)
    if (f.q) params.set('q', f.q)
    return params.toString()
  }, [])

  const cargar = useCallback(async (p: number, f: typeof filtros) => {
    setCargando(true)
    try {
      setListado(await get<ListadoSolicitudes>(`/solicitudes?${construirConsulta(p, f)}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la bandeja.')
    } finally {
      setCargando(false)
    }
  }, [construirConsulta])

  useEffect(() => { void cargar(page, filtros) }, [cargar, page, filtros])

  // Búsqueda con retardo para no consultar en cada tecla.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setFiltros((f) => (f.q === texto ? f : { ...f, q: texto }))
      setPage(1)
    }, 350)
    return () => clearTimeout(temporizador)
  }, [texto])

  // SSE de coordinación: refetch sin recarga (el evento no llega con el detalle).
  const recargaPendiente = useRef(false)
  useSse(
    '/api/eventos/coordinacion',
    () => { recargaPendiente.current = true },
    () => { if (recargaPendiente.current) { recargaPendiente.current = false; void cargar(page, filtros) } },
  )

  const actualizarFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros((f) => ({ ...f, [campo]: valor }))
    setPage(1)
  }

  const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / LIMITE)) : 1

  return (
    <Pagina>
      <Typography variant="h2">Solicitudes</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {listado ? `${listado.total} solicitud${listado.total === 1 ? '' : 'es'}` : 'Consultando…'} · se actualiza en vivo
      </Typography>

      <Tarjeta sx={{ mt: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <Entrada
            type="search"
            placeholder="Buscar por código, contacto…"
            aria-label="Buscar"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Selector aria-label="Estado" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETAS_ESTADO[e]}</option>)}
          </Selector>
          <Selector aria-label="Prioridad" value={filtros.prioridad} onChange={(e) => actualizarFiltro('prioridad', e.target.value)}>
            <option value="">Toda prioridad</option>
            {Object.entries(ETIQUETAS_PRIORIDAD).map(([clave, textoP]) => <option key={clave} value={clave}>{textoP}</option>)}
          </Selector>
          <Selector aria-label="Origen" value={filtros.origen} onChange={(e) => actualizarFiltro('origen', e.target.value)}>
            <option value="">Ambos orígenes</option>
            <option value="PUBLICO">Público</option>
            <option value="CLIENTE">Cliente</option>
          </Selector>
        </Box>
      </Tarjeta>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {!error && (cargando || !listado) && <Box sx={{ mt: 3 }}><Cargando /></Box>}
      {!error && listado && !cargando && listado.data.length === 0 && (
        <Box sx={{ mt: 3 }}>
          <EstadoVacio>No hay solicitudes con esos filtros.</EstadoVacio>
        </Box>
      )}

      {!error && listado && listado.data.length > 0 && (
        <>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              mt: 3,
              borderTop: '3px solid',
              borderTopColor: 'secondary.dark',
              '& th': { bgcolor: 'background.paper' },
            }}
          >
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Prioridad</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Técnico</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listado.data.map((s: Solicitud) => (
                  <TableRow
                    key={s.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:hover .codigo-solitud': { bgcolor: 'primary.main', color: 'common.white', borderColor: 'primary.main' },
                    }}
                    onClick={() => window.location.assign(`/app/solicitudes/${s.id}`)}
                  >
                    <TableCell sx={{ py: 1.25 }}>
                      <MuiLink
                        component={Link}
                        to={`/app/solicitudes/${s.id}`}
                        className="codigo-solitud"
                        aria-label={`Ver expediente ${s.codigo}`}
                        onClick={(evento) => evento.stopPropagation()}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minHeight: 32,
                          px: 1,
                          border: '1px solid',
                          borderColor: 'primary.main',
                          borderRadius: 1,
                          bgcolor: 'background.paper',
                          color: 'primary.dark',
                          fontFamily: '"Archivo Variable", sans-serif',
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: '0.01em',
                          textDecoration: 'none',
                          transition: 'all 160ms ease',
                        }}
                      >
                        {s.codigo}
                      </MuiLink>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{s.origen === 'PUBLICO' ? 'Público' : 'Cliente'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{s.categoriaNombre ?? '—'}</TableCell>
                    <TableCell><BadgeEstado estado={s.estado} texto={ETIQUETAS_ESTADO[s.estado] ?? s.estado} /></TableCell>
                    <TableCell sx={{ fontWeight: s.prioridad ? 700 : 400, color: s.prioridad ? 'text.primary' : 'text.secondary' }}>
                      {s.prioridad ? ETIQUETAS_PRIORIDAD[s.prioridad] : '—'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {fechaLocal(s.fechaCreacion)}
                    </TableCell>
                    <TableCell sx={{ color: s.tecnicoNombre ? 'text.primary' : 'text.secondary' }}>
                      {s.tecnicoNombre ?? 'Sin asignar'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPaginas > 1 && (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', mt: 2 }}>
              <Boton variante="secundario" size="small" disabled={page <= 1 || cargando} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Boton>
              <Typography variant="body2" color="text.secondary">
                Página {page} de {totalPaginas}
              </Typography>
              <Boton variante="secundario" size="small" disabled={page >= totalPaginas || cargando} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Boton>
            </Stack>
          )}
        </>
      )}
    </Pagina>
  )
}
