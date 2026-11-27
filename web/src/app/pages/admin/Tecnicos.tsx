import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
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
import { get, post, put, del, ApiError } from '../../../lib/api'
import type { Tecnico, Especialidad, DisponibilidadFranja } from '../../../lib/admin'
import { DIAS_SEMANA } from '../../../lib/admin'
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

export default function Tecnicos() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  // Modal de habilitar técnico
  const [modalHabilitar, setModalHabilitar] = useState(false)
  const [formHabilitar, setFormHabilitar] = useState({ usuarioId: '', notas: '' })

  // Modal de especialidades
  const [modalEsp, setModalEsp] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<Tecnico | null>(null)
  const [espSeleccionadas, setEspSeleccionadas] = useState<string[]>([])

  // Modal de disponibilidad
  const [modalDisp, setModalDisp] = useState(false)
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadFranja[]>([])
  const [formDisp, setFormDisp] = useState({ diaSemana: '1', horaInicio: '08:00', horaFin: '17:00' })
  const [errorDisp, setErrorDisp] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [resTec, resEsp] = await Promise.all([
        get<{ data: Tecnico[]; total: number }>('/tecnicos?page=1&limit=100'),
        get<{ data: Especialidad[]; total: number }>('/catalogos/especialidades?page=1&limit=100'),
      ])
      setTecnicos(resTec.data)
      setEspecialidades(resEsp.data)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los técnicos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  async function habilitar() {
    try {
      await post('/tecnicos', { usuarioId: formHabilitar.usuarioId, notas: formHabilitar.notas || null })
      setModalHabilitar(false)
      setFormHabilitar({ usuarioId: '', notas: '' })
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al habilitar técnico.')
    }
  }

  function abrirEspecialidades(t: Tecnico) {
    setTecnicoSeleccionado(t)
    setEspSeleccionadas(t.especialidades ? especialidades.filter(e => t.especialidades!.includes(e.nombre)).map(e => e.id) : [])
    setModalEsp(true)
  }

  async function guardarEspecialidades() {
    if (!tecnicoSeleccionado) return
    try {
      await put(`/tecnicos/${tecnicoSeleccionado.id}/especialidades`, { especialidadIds: espSeleccionadas })
      setModalEsp(false)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al guardar especialidades.')
    }
  }

  function abrirDisponibilidad(t: Tecnico) {
    setTecnicoSeleccionado(t)
    setModalDisp(true)
    setErrorDisp(null)
    void cargarDisponibilidad(t.id)
  }

  async function cargarDisponibilidad(tecnicoId: string) {
    try {
      const res = await get<{ data: DisponibilidadFranja[] }>(`/tecnicos/${tecnicoId}/disponibilidad`)
      setDisponibilidad(res.data)
    } catch (e) {
      setErrorDisp(e instanceof ApiError ? e.message : 'Error al cargar disponibilidad.')
    }
  }

  async function agregarFranja() {
    if (!tecnicoSeleccionado) return
    try {
      await post(`/tecnicos/${tecnicoSeleccionado.id}/disponibilidad`, {
        diaSemana: parseInt(formDisp.diaSemana, 10),
        horaInicio: formDisp.horaInicio,
        horaFin: formDisp.horaFin,
      })
      setErrorDisp(null)
      void cargarDisponibilidad(tecnicoSeleccionado.id)
    } catch (e) {
      setErrorDisp(e instanceof ApiError ? e.message : 'Error al agregar franja.')
    }
  }

  async function eliminarFranja(id: string) {
    if (!tecnicoSeleccionado) return
    try {
      await del(`/tecnicos/disponibilidad/${id}`)
      void cargarDisponibilidad(tecnicoSeleccionado.id)
    } catch (e) {
      setErrorDisp(e instanceof ApiError ? e.message : 'Error al eliminar franja.')
    }
  }

  async function desactivarTecnico(id: string) {
    if (!confirm('¿Desactivar este técnico?')) return
    try {
      await del(`/tecnicos/${id}`)
      void cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al desactivar.')
    }
  }

  return (
    <Pagina>
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h2">Técnicos</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {tecnicos.length} técnicos activos
          </Typography>
        </Box>
        <Boton onClick={() => setModalHabilitar(true)}>Habilitar técnico</Boton>
      </Stack>

      {error && <Box sx={{ mt: 3 }}><ErrorPanel mensaje={error} /></Box>}
      {!error && cargando && <Box sx={{ mt: 3 }}><Cargando /></Box>}
      {!error && !cargando && tecnicos.length === 0 && (
        <Box sx={{ mt: 3 }}><EstadoVacio>No hay técnicos habilitados.</EstadoVacio></Box>
      )}

      {!error && !cargando && tecnicos.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Especialidades</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tecnicos.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{t.nombre}</TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.especialidades?.join(', ') || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Boton variante="secundario" size="small" onClick={() => abrirEspecialidades(t)}>Especialidades</Boton>
                      <Boton variante="secundario" size="small" onClick={() => abrirDisponibilidad(t)}>Disponibilidad</Boton>
                      <Boton variante="peligro" size="small" onClick={() => void desactivarTecnico(t.id)}>Desactivar</Boton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal: Habilitar técnico */}
      <Modal titulo="Habilitar técnico" abierto={modalHabilitar} onCerrar={() => setModalHabilitar(false)}>
        <Stack spacing={2}>
          <Campo label="ID del usuario" ayuda="El usuario debe tener rol TECNICO">
            <Entrada value={formHabilitar.usuarioId} onChange={(e) => setFormHabilitar({ ...formHabilitar, usuarioId: e.target.value })} />
          </Campo>
          <Campo label="Notas">
            <AreaTexto value={formHabilitar.notas} onChange={(e) => setFormHabilitar({ ...formHabilitar, notas: e.target.value })} />
          </Campo>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalHabilitar(false)}>Cancelar</Boton>
            <Boton onClick={() => void habilitar()}>Habilitar</Boton>
          </Stack>
        </Stack>
      </Modal>

      {/* Modal: Especialidades */}
      <Modal titulo={`Especialidades — ${tecnicoSeleccionado?.nombre ?? ''}`} abierto={modalEsp} onCerrar={() => setModalEsp(false)}>
        <Stack spacing={1}>
          {especialidades.map((e) => (
            <FormControlLabel
              key={e.id}
              label={e.nombre}
              control={
                <Checkbox
                  size="small"
                  checked={espSeleccionadas.includes(e.id)}
                  onChange={(ev) => {
                    if (ev.target.checked) setEspSeleccionadas([...espSeleccionadas, e.id])
                    else setEspSeleccionadas(espSeleccionadas.filter(id => id !== e.id))
                  }}
                />
              }
            />
          ))}
          {especialidades.length === 0 && (
            <Typography variant="body2" color="text.secondary">No hay especialidades registradas.</Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalEsp(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarEspecialidades()}>Guardar</Boton>
          </Stack>
        </Stack>
      </Modal>

      {/* Modal: Disponibilidad */}
      <Modal titulo={`Disponibilidad — ${tecnicoSeleccionado?.nombre ?? ''}`} abierto={modalDisp} onCerrar={() => setModalDisp(false)}>
        <Stack spacing={2}>
          {errorDisp && <Alert severity="error">{errorDisp}</Alert>}
          {disponibilidad.length > 0 && (
            <Stack spacing={1}>
              {disponibilidad.map((f) => (
                <Stack
                  key={f.id}
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography variant="body2">
                    {DIAS_SEMANA[f.diaSemana]}: {f.horaInicio.slice(0, 5)} — {f.horaFin.slice(0, 5)}
                  </Typography>
                  <Boton variante="peligro" size="small" onClick={() => void eliminarFranja(f.id)}>Eliminar</Boton>
                </Stack>
              ))}
            </Stack>
          )}

          <Divider />
          <Typography variant="h6">Agregar franja</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
            <Campo label="Día">
              <Selector value={formDisp.diaSemana} onChange={(e) => setFormDisp({ ...formDisp, diaSemana: e.target.value })}>
                {Object.entries(DIAS_SEMANA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Selector>
            </Campo>
            <Campo label="Inicio">
              <Entrada type="time" value={formDisp.horaInicio} onChange={(e) => setFormDisp({ ...formDisp, horaInicio: e.target.value })} />
            </Campo>
            <Campo label="Fin">
              <Entrada type="time" value={formDisp.horaFin} onChange={(e) => setFormDisp({ ...formDisp, horaFin: e.target.value })} />
            </Campo>
          </Box>
          <Box>
            <Boton onClick={() => void agregarFranja()}>Agregar</Boton>
          </Box>

          <Stack direction="row" sx={{ justifyContent: 'flex-end', pt: 1 }}>
            <Boton variante="secundario" onClick={() => setModalDisp(false)}>Cerrar</Boton>
          </Stack>
        </Stack>
      </Modal>
    </Pagina>
  )
}
