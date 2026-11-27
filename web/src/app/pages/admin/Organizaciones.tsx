import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
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
import { get, post, patch, del, ApiError } from '../../../lib/api'
import type { Organizacion, Listado } from '../../../lib/admin'
import {
  Boton,
  Campo,
  Entrada,
  AreaTexto,
  Modal,
  Cargando,
  ErrorPanel,
  EstadoVacio,
  Pagina,
} from '../../../components/ui/primitivos'

const LIMITE = 20

export default function Organizaciones() {
  const [listado, setListado] = useState<Listado<Organizacion> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Organizacion | null>(null)
  const [formulario, setFormulario] = useState({ nombre: '', ruc: '', telefono: '', direccion: '' })
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) })
      if (q) params.set('q', q)
      setListado(await get<Listado<Organizacion>>(`/organizaciones?${params}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las organizaciones.')
    } finally {
      setCargando(false)
    }
  }, [page, q])

  useEffect(() => { void cargar() }, [cargar])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void cargar() }, 350)
    return () => clearTimeout(t)
  }, [q, cargar])

  function abrirCrear() {
    setEditando(null)
    setFormulario({ nombre: '', ruc: '', telefono: '', direccion: '' })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirEditar(org: Organizacion) {
    setEditando(org)
    setFormulario({ nombre: org.nombre, ruc: org.ruc ?? '', telefono: org.telefono ?? '', direccion: org.direccion ?? '' })
    setErrorForm(null)
    setModalAbierto(true)
  }

  async function guardar() {
    setGuardando(true)
    setErrorForm(null)
    try {
      if (editando) {
        await patch(`/organizaciones/${editando.id}`, formulario)
      } else {
        await post('/organizaciones', formulario)
      }
      setModalAbierto(false)
      void cargar()
    } catch (e) {
      setErrorForm(e instanceof ApiError ? e.message : 'Error al guardar.')
    } finally {
      setGuardando(false)
    }
  }

  async function desactivar(id: string) {
    if (!confirm('¿Desactivar esta organización?')) return
    try {
      await del(`/organizaciones/${id}`)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al desactivar.')
    }
  }

  const totalPaginas = listado ? Math.max(1, Math.ceil(listado.total / LIMITE)) : 1

  return (
    <Pagina>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h2">Organizaciones</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {listado ? `${listado.total} registros` : 'Cargando…'}
          </Typography>
        </Box>
        <Boton onClick={abrirCrear}>Nueva organización</Boton>
      </Stack>

      <Box sx={{ mt: 3, maxWidth: 420 }}>
        <Entrada type="search" placeholder="Buscar por nombre o RUC…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Box>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {!error && cargando && <Box sx={{ mt: 3 }}><Cargando /></Box>}
      {!error && !cargando && listado && listado.data.length === 0 && (
        <Box sx={{ mt: 3 }}><EstadoVacio>No hay organizaciones.</EstadoVacio></Box>
      )}

      {!error && !cargando && listado && listado.data.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>RUC</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listado.data.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{org.nombre}</TableCell>
                  <TableCell>{org.ruc ?? '—'}</TableCell>
                  <TableCell>{org.telefono ?? '—'}</TableCell>
                  <TableCell>{org.direccion ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Boton variante="secundario" size="small" onClick={() => abrirEditar(org)}>Editar</Boton>
                      <Boton variante="peligro" size="small" onClick={() => void desactivar(org.id)}>Desactivar</Boton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {listado && totalPaginas > 1 && (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end', mt: 2 }}>
          <Boton variante="secundario" size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Boton>
          <Typography variant="caption" color="text.secondary">Página {page} de {totalPaginas}</Typography>
          <Boton variante="secundario" size="small" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Boton>
        </Stack>
      )}

      <Modal titulo={editando ? 'Editar organización' : 'Nueva organización'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <Stack spacing={2}>
          {errorForm && <Alert severity="error">{errorForm}</Alert>}
          <Campo label="Nombre">
            <Entrada value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
          </Campo>
          <Campo label="RUC" ayuda="13 dígitos (opcional)">
            <Entrada value={formulario.ruc} onChange={(e) => setFormulario({ ...formulario, ruc: e.target.value })} />
          </Campo>
          <Campo label="Teléfono">
            <Entrada value={formulario.telefono} onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })} />
          </Campo>
          <Campo label="Dirección">
            <AreaTexto value={formulario.direccion} onChange={(e) => setFormulario({ ...formulario, direccion: e.target.value })} />
          </Campo>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </Stack>
        </Stack>
      </Modal>
    </Pagina>
  )
}
