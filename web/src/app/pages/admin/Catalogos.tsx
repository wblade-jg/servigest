import { useCallback, useEffect, useState } from 'react'
import { get, post, patch, del, ApiError } from '../../../lib/api'
import type { Especialidad, Categoria, Listado } from '../../../lib/admin'
import { Boton, Campo, Entrada, AreaTexto, Selector, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

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
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Catálogos</h1>

      <div className="mt-4 flex gap-2">
        <Boton variante={pestana === 'especialidades' ? 'primario' : 'secundario'} onClick={() => setPestana('especialidades')}>
          Especialidades
        </Boton>
        <Boton variante={pestana === 'categorias' ? 'primario' : 'secundario'} onClick={() => setPestana('categorias')}>
          Categorías
        </Boton>
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {cargando && <div className="mt-6"><Cargando /></div>}

      {/* Especialidades */}
      {!cargando && pestana === 'especialidades' && (
        <>
          <div className="mt-6 flex justify-end">
            <Boton onClick={abrirCrearEsp}>Nueva especialidad</Boton>
          </div>
          {especialidades.length === 0 ? (
            <p className="mt-4 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">No hay especialidades.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
                  <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Acciones</th></tr>
                </thead>
                <tbody>
                  {especialidades.map((e) => (
                    <tr key={e.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                      <td className="px-4 py-3 font-display font-bold">{e.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Boton variante="secundario" onClick={() => abrirEditarEsp(e)}>Editar</Boton>
                          <Boton variante="peligro" onClick={() => void desactivarEsp(e.id)}>Desactivar</Boton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Categorías */}
      {!cargando && pestana === 'categorias' && (
        <>
          <div className="mt-6 flex justify-end">
            <Boton onClick={abrirCrearCat}>Nueva categoría</Boton>
          </div>
          {categorias.length === 0 ? (
            <p className="mt-4 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">No hay categorías.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Especialidad requerida</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                      <td className="px-4 py-3 font-display font-bold">{c.nombre}</td>
                      <td className="px-4 py-3">{c.descripcion ?? '—'}</td>
                      <td className="px-4 py-3">{c.especialidadRequeridaNombre ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Boton variante="secundario" onClick={() => abrirEditarCat(c)}>Editar</Boton>
                          <Boton variante="peligro" onClick={() => void desactivarCat(c.id)}>Desactivar</Boton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal: Especialidad */}
      <Modal titulo={editandoEsp ? 'Editar especialidad' : 'Nueva especialidad'} abierto={modalEsp} onCerrar={() => setModalEsp(false)}>
        <div className="space-y-4">
          <Campo label="Nombre">
            <Entrada value={nombreEsp} onChange={(e) => setNombreEsp(e.target.value)} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalEsp(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarEsp()}>Guardar</Boton>
          </div>
        </div>
      </Modal>

      {/* Modal: Categoría */}
      <Modal titulo={editandoCat ? 'Editar categoría' : 'Nueva categoría'} abierto={modalCat} onCerrar={() => setModalCat(false)}>
        <div className="space-y-4">
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
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalCat(false)}>Cancelar</Boton>
            <Boton onClick={() => void guardarCat()}>Guardar</Boton>
          </div>
        </div>
      </Modal>
    </section>
  )
}
