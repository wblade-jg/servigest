import { useCallback, useEffect, useState } from 'react'
import { get, post, patch, del, ApiError } from '../../../lib/api'
import type { Usuario, Organizacion, Listado } from '../../../lib/admin'
import { ETIQUETAS_ROL } from '../../../lib/admin'
import { Boton, Campo, Entrada, Selector, Modal, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

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
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-tinta-500">{listado ? `${listado.total} registros` : 'Cargando…'}</p>
        </div>
        <Boton onClick={abrirCrear}>Nuevo usuario</Boton>
      </div>

      <div className="mt-6">
        <Entrada type="search" placeholder="Buscar por nombre o email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {!error && cargando && <div className="mt-6"><Cargando /></div>}
      {!error && !cargando && listado && listado.data.length === 0 && (
        <p className="mt-6 rounded-lg border border-tinta-900/10 bg-white p-6 text-tinta-500">No hay usuarios.</p>
      )}

      {!error && !cargando && listado && listado.data.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-tinta-900/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Organización</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.data.map((u) => (
                <tr key={u.id} className="border-b border-tinta-900/5 last:border-0 hover:bg-lavanda/60">
                  <td className="px-4 py-3 font-display font-bold">{u.nombre}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{ETIQUETAS_ROL[u.rol] ?? u.rol}</td>
                  <td className="px-4 py-3">{u.organizacionNombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Boton variante="secundario" onClick={() => abrirEditar(u)}>Editar</Boton>
                      <Boton variante="peligro" onClick={() => void desactivar(u.id)}>Desactivar</Boton>
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

      <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <div className="space-y-4">
          {errorForm && <p className="text-sm text-red-600">{errorForm}</p>}
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
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="secundario" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
            <Boton disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
          </div>
        </div>
      </Modal>
    </section>
  )
}
