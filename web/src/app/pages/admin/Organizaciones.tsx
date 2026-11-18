import { useCallback, useEffect, useState } from 'react'
import { get, post, patch, del, ApiError } from '../../../lib/api'
import type { Organizacion, Listado } from '../../../lib/admin'
import { Boton, Campo, Entrada, AreaTexto, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

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
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Organizaciones</h1>
          <p className="mt-1 text-sm text-tinta-500">{listado ? `${listado.total} registros` : 'Cargando…'}</p>
        </div>
        <Boton onClick={abrirCrear}>Nueva organización</Boton>
      </div>

      <div className="mt-6">
        <Entrada type="search" placeholder="Buscar por nombre o RUC…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {!error && cargando && <div className="mt-6"><Cargando /></div>}
      {!error && !cargando && listado && listado.data.length === 0 && (
        <p className="mt-6 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">No hay organizaciones.</p>
      )}

      {!error && !cargando && listado && listado.data.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.data.map((org) => (
                <tr key={org.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                  <td className="px-4 py-3 font-display font-bold">{org.nombre}</td>
                  <td className="px-4 py-3">{org.ruc ?? '—'}</td>
                  <td className="px-4 py-3">{org.telefono ?? '—'}</td>
                  <td className="px-4 py-3">{org.direccion ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Boton variante="secundario" onClick={() => abrirEditar(org)}>Editar</Boton>
                      <Boton variante="peligro" onClick={() => void desactivar(org.id)}>Desactivar</Boton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {listado && totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <Boton variante="secundario" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Boton>
          <span className="text-tinta-500">Página {page} de {totalPaginas}</span>
          <Boton variante="secundario" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</Boton>
        </div>
      )}

      <Modal titulo={editando ? 'Editar organización' : 'Nueva organización'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <div className="space-y-4">
          {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}
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
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>
    </section>
  )
}
