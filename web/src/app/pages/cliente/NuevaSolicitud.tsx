import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { get, post, ApiError } from '../../../lib/api'
import { useAuth } from '../../../lib/auth'
import type { Categoria, CreacionSolicitud } from '../../../lib/solicitudes'
import { Boton, Campo, Entrada, AreaTexto, Selector, Cargando, ErrorPanel } from '../../../components/ui/primitivos'

// Formulario corporativo: el backend fuerza origen CLIENTE y la organización
// de la sesión, independientemente de lo que envíe el navegador.

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export default function NuevaSolicitud () {
  const { usuario } = useAuth()
  const navegar = useNavigate()
  const [categorias, setCategorias] = useState<Categoria[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CreacionSolicitud | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => setError('No se pudo cargar el catálogo de categorías.'))
  }, [])

  async function enviar (e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formulario = new FormData(e.currentTarget)
    const datos = {
      contactoNombre: String(formulario.get('contactoNombre') || '').trim(),
      contactoEmail: String(formulario.get('contactoEmail') || '').trim(),
      contactoTelefono: String(formulario.get('contactoTelefono') || '').trim(),
      categoriaId: String(formulario.get('categoriaId') || ''),
      descripcion: String(formulario.get('descripcion') || '').trim(),
      ubicacion: String(formulario.get('ubicacion') || '').trim() || undefined,
      urgenciaDeclarada: String(formulario.get('urgenciaDeclarada') || '') || undefined,
    }

    setEnviando(true)
    try {
      setResultado(await post<CreacionSolicitud>('/solicitudes', datos))
    } catch (err) {
      if (err instanceof ApiError) {
        const campos = err.details?.campos as string[] | undefined
        setError(campos?.length ? `${err.message} (${campos.join(', ')})` : err.message)
      } else {
        setError('No se pudo crear la solicitud. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-emerald-800">Solicitud creada</h1>
          <p className="mt-4 text-tinta-700">
            Quedó registrada con el código <strong className="font-display">{resultado.codigo}</strong> en estado{' '}
            <strong>Recibida</strong>. Coordinación la revisará antes de aprobarla y asignar un técnico.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/app/mis-solicitudes/${resultado.id}`} className="rounded-md bg-violeta-500 px-4 py-2 font-display text-sm font-bold text-white hover:bg-violeta-700">
              Ver detalle
            </Link>
            <Boton variante="secundario" onClick={() => navegar('/app/mis-solicitudes')}>
              Ir a mis solicitudes
            </Boton>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/app/mis-solicitudes" className="text-sm text-violeta-500 hover:underline">← Mis solicitudes</Link>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Nueva solicitud</h1>
      <p className="mt-2 text-sm text-tinta-700">
        Describe el requerimiento de tu organización. La prioridad final la define coordinación al aprobar.
      </p>

      {error && <div className="mt-6"><ErrorPanel mensaje={error} /></div>}
      {!categorias && !error && <div className="mt-8"><Cargando texto="Cargando categorías…" /></div>}

      {categorias && (
        <form onSubmit={enviar} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre de contacto">
              <Entrada name="contactoNombre" required defaultValue={usuario?.nombre ?? ''} />
            </Campo>
            <Campo label="Teléfono">
              <Entrada name="contactoTelefono" required placeholder="+593 99 123 4567" />
            </Campo>
          </div>
          <Campo label="Correo electrónico">
            <Entrada name="contactoEmail" type="email" required defaultValue={usuario?.email ?? ''} />
          </Campo>
          <Campo label="Categoría">
            <Selector name="categoriaId" required defaultValue="">
              <option value="" disabled>Selecciona una categoría…</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
          </Campo>
          <Campo label="Descripción" ayuda="Entre 20 y 2000 caracteres.">
            <AreaTexto name="descripcion" required minLength={20} maxLength={2000} placeholder="Describe el problema o requerimiento…" />
          </Campo>
          <Campo label="Ubicación" ayuda="Opcional: sede, piso o referencia para la visita.">
            <Entrada name="ubicacion" />
          </Campo>
          <Campo label="Urgencia declarada" ayuda="Solo como referencia; la prioridad la fija coordinación.">
            <Selector name="urgenciaDeclarada" defaultValue="">
              <option value="">Sin preferencia</option>
              {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Selector>
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="secundario" onClick={() => navegar('/app/mis-solicitudes')}>Cancelar</Boton>
            <Boton type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear solicitud'}</Boton>
          </div>
        </form>
      )}
    </section>
  )
}
