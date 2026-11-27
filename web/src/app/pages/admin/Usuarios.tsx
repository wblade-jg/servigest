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
import type { Usuario, Organizacion, Listado } from '../../../lib/admin'
import { ETIQUETAS_ROL } from '../../../lib/admin'
import {
  Boton,
  Campo,
  Entrada,
  Selector,
  Modal,
  Cargando,
  ErrorPanel,
  EstadoVacio,
  Pagina,
} from '../../../components/ui/primitivos'

const LIMITE = 20

export default function Usuarios() {
  const [listado, setListado] = useState<Listado<Usuario> | null>(null)
  const [orgs, setOrgs] = useState<Organizacion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [formulario, setFormulario] = useState({ nombre: '', email: '', password: '', rol: 'COORDINADOR', organizacionId: '' })
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE) })
      if (q) params.set('q', q)
      setListado(await get<Listado<Usuario>>(`/usuarios?${params}`))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios.')
    } finally {
      setCargando(false)
    }
  }, [page, q])

  const cargarOrgs = useCallback(async () => {
    try {
      const res = await get<Listado<Organizacion>>('/organizaciones?page=1&limit=100')
      setOrgs(res.data)
    } catch { /* silencio */ }
  }, [])

  useEffect(() => { void cargar(); void cargarOrgs() }, [cargar, cargarOrgs])

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void cargar() }, 350)
    return () => clearTimeout(t)
  }, [q, cargar])

  function abrirCrear() {
    setEditando(null)
    setFormulario({ nombre: '', email: '', password: '', rol: 'COORDINADOR', organizacionId: '' })
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setFormulario({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, organizacionId: u.organizacionId ?? '' })
    setErrorForm(null)
    setModalAbierto(true)
  }

  async function guardar() {
    setGuardando(true)
    setErrorForm(null)
    try {
      const cuerpo: Record<string, unknown> = {
        nombre: formulario.nombre,
        email: formulario.email,
        rol: formulario.rol,
        organizacionId: formulario.organizacionId || null,
      }
      if (!editando && formulario.password) cuerpo.password = formulario.password
      if (editando) {
        await patch(`/usuarios/${editando.id}`, cuerpo)
      } else {
        await post('/usuarios', cuerpo)
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
    if (!confirm('¿Desactivar este usuario?')) return
    try {
      await del(`/usuarios/${id}`)
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
          <Typography variant="h2">Usuarios</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {listado ? `${listado.total} registros` : 'Cargando…'}
          </Typography>
        </Box>
        <Boton onClick={abrirCrear}>Nuevo usuario</Boton>
      </Stack>

      <Box sx={{ mt: 3, maxWidth: 420 }}>
        <Entrada type="search" placeholder="Buscar por nombre o email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Box>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {!error && cargando && <Box sx={{ mt: 3 }}><Cargando /></Box>}
      {!error && !cargando && listado && listado.data.length === 0 && (
        <Box sx={{ mt: 3 }}><EstadoVacio>No hay usuarios.</EstadoVacio></Box>
      )}

      {!error && !cargando && listado && listado.data.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Organización</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listado.data.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{u.nombre}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ETIQUETAS_ROL[u.rol] ?? u.rol}</TableCell>
                  <TableCell>{u.organizacionNombre ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Boton variante="secundario" size="small" onClick={() => abrirEditar(u)}>Editar</Boton>
                      <Boton variante="peligro" size="small" onClick={() => void desactivar(u.id)}>Desactivar</Boton>
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

      <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <Stack spacing={2}>
          {errorForm && <Alert severity="error">{errorForm}</Alert>}
          <Campo label="Nombre">
            <Entrada value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
          </Campo>
          <Campo label="Email">
            <Entrada type="email" value={formulario.email} onChange={(e) => setFormulario({ ...formulario, email: e.target.value })} />
          </Campo>
          {!editando && (
            <Campo label="Contraseña" ayuda="Mínimo 8 caracteres">
              <Entrada type="password" value={formulario.password} onChange={(e) => setFormulario({ ...formulario, password: e.target.value })} />
            </Campo>
          )}
          <Campo label="Rol">
            <Selector value={formulario.rol} onChange={(e) => setFormulario({ ...formulario, rol: e.target.value, organizacionId: e.target.value !== 'CLIENTE' ? '' : formulario.organizacionId })}>
              <option value="ADMIN">Administrador</option>
              <option value="COORDINADOR">Coordinador</option>
              <option value="TECNICO">Técnico</option>
              <option value="CLIENTE">Cliente</option>
            </Selector>
          </Campo>
          {formulario.rol === 'CLIENTE' && (
            <Campo label="Organización">
              <Selector value={formulario.organizacionId} onChange={(e) => setFormulario({ ...formulario, organizacionId: e.target.value })}>
                <option value="">Seleccionar…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </Selector>
            </Campo>
          )}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </Stack>
        </Stack>
      </Modal>
    </Pagina>
  )
}
