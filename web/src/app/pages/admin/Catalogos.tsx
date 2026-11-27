import { useCallback, useEffect, useState } from 'react'
import {
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
import type { Especialidad, Categoria, Listado } from '../../../lib/admin'
import {
  Boton,
  Campo,
  Entrada,
  AreaTexto,
  Selector,
  Modal,
  Cargando,
  ErrorPanel,
  EstadoVacio,
  Pagina,
} from '../../../components/ui/primitivos'

type Pestaña = 'especialidades' | 'categorias'

export default function Catalogos() {
  const [pestana, setPestana] = useState<Pestaña>('especialidades')
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Modal especialidad
  const [modalEsp, setModalEsp] = useState(false)
  const [editandoEsp, setEditandoEsp] = useState<Especialidad | null>(null)
  const [nombreEsp, setNombreEsp] = useState('')

  // Modal categoría
  const [modalCat, setModalCat] = useState(false)
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null)
  const [formCat, setFormCat] = useState({ nombre: '', descripcion: '', especialidadRequeridaId: '', orden: '0' })

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [resEsp, resCat] = await Promise.all([
        get<Listado<Especialidad>>('/catalogos/especialidades?page=1&limit=100'),
        get<Listado<Categoria>>('/catalogos/categorias?page=1&limit=100'),
      ])
      setEspecialidades(resEsp.data)
      setCategorias(resCat.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los catálogos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  // --- Especialidades ---

  function abrirCrearEsp() {
    setEditandoEsp(null)
    setNombreEsp('')
    setModalEsp(true)
  }

  function abrirEditarEsp(e: Especialidad) {
    setEditandoEsp(e)
    setNombreEsp(e.nombre)
    setModalEsp(true)
  }

  async function guardarEsp() {
    try {
      if (editandoEsp) {
        await patch(`/catalogos/especialidades/${editandoEsp.id}`, { nombre: nombreEsp })
      } else {
        await post('/catalogos/especialidades', { nombre: nombreEsp })
      }
      setModalEsp(false)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al guardar.')
    }
  }

  async function desactivarEsp(id: string) {
    if (!confirm('¿Desactivar esta especialidad?')) return
    try {
      await del(`/catalogos/especialidades/${id}`)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al desactivar.')
    }
  }

  // --- Categorías ---

  function abrirCrearCat() {
    setEditandoCat(null)
    setFormCat({ nombre: '', descripcion: '', especialidadRequeridaId: '', orden: '0' })
    setModalCat(true)
  }

  function abrirEditarCat(c: Categoria) {
    setEditandoCat(c)
    setFormCat({
      nombre: c.nombre,
      descripcion: c.descripcion ?? '',
      especialidadRequeridaId: c.especialidadRequeridaId ?? '',
      orden: String(c.orden),
    })
    setModalCat(true)
  }

  async function guardarCat() {
    try {
      const cuerpo = {
        nombre: formCat.nombre,
        descripcion: formCat.descripcion || null,
        especialidadRequeridaId: formCat.especialidadRequeridaId || null,
        orden: parseInt(formCat.orden, 10) || 0,
      }
      if (editandoCat) {
        await patch(`/catalogos/categorias/${editandoCat.id}`, cuerpo)
      } else {
        await post('/catalogos/categorias', cuerpo)
      }
      setModalCat(false)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al guardar.')
    }
  }

  async function desactivarCat(id: string) {
    if (!confirm('¿Desactivar esta categoría?')) return
    try {
      await del(`/catalogos/categorias/${id}`)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al desactivar.')
    }
  }

  return (
    <Pagina>
      <Typography variant="h2">Catálogos</Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <Boton variante={pestana === 'especialidades' ? 'primario' : 'secundario'} onClick={() => setPestana('especialidades')}>
          Especialidades
        </Boton>
        <Boton variante={pestana === 'categorias' ? 'primario' : 'secundario'} onClick={() => setPestana('categorias')}>
          Categorías
        </Boton>
      </Stack>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {cargando && <Box sx={{ mt: 3 }}><Cargando /></Box>}

      {/* Especialidades */}
      {!cargando && pestana === 'especialidades' && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Boton onClick={abrirCrearEsp}>Nueva especialidad</Boton>
          </Stack>
          {especialidades.length === 0 ? (
            <Box sx={{ mt: 2 }}><EstadoVacio>No hay especialidades.</EstadoVacio></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {especialidades.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{e.nombre}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Boton variante="secundario" size="small" onClick={() => abrirEditarEsp(e)}>Editar</Boton>
                          <Boton variante="peligro" size="small" onClick={() => void desactivarEsp(e.id)}>Desactivar</Boton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Categorías */}
      {!cargando && pestana === 'categorias' && (
        <>
          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
            <Boton onClick={abrirCrearCat}>Nueva categoría</Boton>
          </Stack>
          {categorias.length === 0 ? (
            <Box sx={{ mt: 2 }}><EstadoVacio>No hay categorías.</EstadoVacio></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Especialidad requerida</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categorias.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{c.nombre}</TableCell>
                      <TableCell>{c.descripcion ?? '—'}</TableCell>
                      <TableCell>{c.especialidadRequeridaNombre ?? '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Boton variante="secundario" size="small" onClick={() => abrirEditarCat(c)}>Editar</Boton>
                          <Boton variante="peligro" size="small" onClick={() => void desactivarCat(c.id)}>Desactivar</Boton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Modal: Especialidad */}
      <Modal titulo={editandoEsp ? 'Editar especialidad' : 'Nueva especialidad'} abierto={modalEsp} onCerrar={() => setModalEsp(false)}>
        <Stack spacing={2}>
          <Campo label="Nombre">
            <Entrada value={nombreEsp} onChange={(e) => setNombreEsp(e.target.value)} />
          </Campo>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalEsp(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarEsp()}>Guardar</Boton>
          </Stack>
        </Stack>
      </Modal>

      {/* Modal: Categoría */}
      <Modal titulo={editandoCat ? 'Editar categoría' : 'Nueva categoría'} abierto={modalCat} onCerrar={() => setModalCat(false)}>
        <Stack spacing={2}>
          <Campo label="Nombre">
            <Entrada value={formCat.nombre} onChange={(e) => setFormCat({ ...formCat, nombre: e.target.value })} />
          </Campo>
          <Campo label="Descripción">
            <AreaTexto value={formCat.descripcion} onChange={(e) => setFormCat({ ...formCat, descripcion: e.target.value })} />
          </Campo>
          <Campo label="Especialidad requerida" ayuda="Opcional: el técnico debe tener esta especialidad">
            <Selector value={formCat.especialidadRequeridaId} onChange={(e) => setFormCat({ ...formCat, especialidadRequeridaId: e.target.value })}>
              <option value="">Ninguna</option>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Selector>
          </Campo>
          <Campo label="Orden">
            <Entrada type="number" value={formCat.orden} onChange={(e) => setFormCat({ ...formCat, orden: e.target.value })} />
          </Campo>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalCat(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarCat()}>Guardar</Boton>
          </Stack>
        </Stack>
      </Modal>
    </Pagina>
  )
}
