import { useCallback, useEffect, useState } from 'react'
import { get, post, put, del, ApiError } from '../../../lib/api'
import type { Tecnico, Especialidad, DisponibilidadFranja } from '../../../lib/admin'
import { DIAS_SEMANA } from '../../../lib/admin'
import { Boton, Campo, Entrada, AreaTexto, Selector, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

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
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Técnicos</h1>
          <p className="mt-1 text-sm text-tinta-500">{tecnicos.length} técnicos activos</p>
        </div>
        <Boton onClick={() => setModalHabilitar(true)}>Habilitar técnico</Boton>
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {!error && cargando && <div className="mt-6"><Cargando /></div>}
      {!error && !cargando && tecnicos.length === 0 && (
        <p className="mt-6 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">No hay técnicos habilitados.</p>
      )}

      {!error && !cargando && tecnicos.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Especialidades</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map((t) => (
                <tr key={t.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                  <td className="px-4 py-3 font-display font-bold">{t.nombre}</td>
                  <td className="px-4 py-3">{t.email}</td>
                  <td className="px-4 py-3">{t.especialidades?.join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Boton variante="secundario" onClick={() => abrirEspecialidades(t)}>Especialidades</Boton>
                      <Boton variante="secundario" onClick={() => abrirDisponibilidad(t)}>Disponibilidad</Boton>
                      <Boton variante="peligro" onClick={() => void desactivarTecnico(t.id)}>Desactivar</Boton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Habilitar técnico */}
      <Modal titulo="Habilitar técnico" abierto={modalHabilitar} onCerrar={() => setModalHabilitar(false)}>
        <div className="space-y-4">
          <Campo label="ID del usuario" ayuda="El usuario debe tener rol TECNICO">
            <Entrada value={formHabilitar.usuarioId} onChange={(e) => setFormHabilitar({ ...formHabilitar, usuarioId: e.target.value })} />
          </Campo>
          <Campo label="Notas">
            <AreaTexto value={formHabilitar.notas} onChange={(e) => setFormHabilitar({ ...formHabilitar, notas: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalHabilitar(false)}>Cancelar</Boton>
            <Boton onClick={() => void habilitar()}>Habilitar</Boton>
          </div>
        </div>
      </Modal>

      {/* Modal: Especialidades */}
      <Modal titulo={`Especialidades — ${tecnicoSeleccionado?.nombre ?? ''}`} abierto={modalEsp} onCerrar={() => setModalEsp(false)}>
        <div className="space-y-3">
          {especialidades.map((e) => (
            <label key={e.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={espSeleccionadas.includes(e.id)}
                onChange={(ev) => {
                  if (ev.target.checked) setEspSeleccionadas([...espSeleccionadas, e.id])
                  else setEspSeleccionadas(espSeleccionadas.filter(id => id !== e.id))
                }}
              />
              {e.nombre}
            </label>
          ))}
          {especialidades.length === 0 && <p className="text-sm text-tinta-500">No hay especialidades registradas.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalEsp(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarEspecialidades()}>Guardar</Boton>
          </div>
        </div>
      </Modal>

      {/* Modal: Disponibilidad */}
      <Modal titulo={`Disponibilidad — ${tecnicoSeleccionado?.nombre ?? ''}`} abierto={modalDisp} onCerrar={() => setModalDisp(false)}>
        <div className="space-y-4">
          {errorDisp && <p className="text-sm text-red-600">{errorDisp}</p>}
          {disponibilidad.length > 0 && (
            <div className="space-y-1">
              {disponibilidad.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-tinta-900/10 px-3 py-2 text-sm">
                  <span>{DIAS_SEMANA[f.diaSemana]}: {f.horaInicio.slice(0, 5)} — {f.horaFin.slice(0, 5)}</span>
                  <Boton variante="peligro" onClick={() => void eliminarFranja(f.id)}>Eliminar</Boton>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-tinta-900/10 pt-3">
            <p className="mb-2 text-sm font-display font-bold">Agregar franja</p>
            <div className="grid grid-cols-3 gap-2">
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
            </div>
            <Boton className="mt-3" onClick={() => void agregarFranja()}>Agregar</Boton>
          </div>
          <div className="flex justify-end pt-2">
            <Boton variante="secundario" onClick={() => setModalDisp(false)}>Cerrar</Boton>
          </div>
        </div>
      </Modal>
    </section>
  )
}
