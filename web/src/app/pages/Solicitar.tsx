import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { get, postMultipart, ApiError } from '../../lib/api'
import type { Categoria, CreacionSolicitud } from '../../lib/solicitudes'

const MAX_ADJUNTOS = 5
const TAMANO_MAX = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'application/pdf']

export default function Solicitar() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<CreacionSolicitud | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    get<{ data: Categoria[] }>('/public/categorias')
      .then(({ data }) => setCategorias(data))
      .catch(() => setError('No se pudo cargar el catálogo de categorías.'))
  }, [])

  function validarArchivos(archivos: FileList | null): File[] | null {
    if (!archivos || archivos.length === 0) return []
    if (archivos.length > MAX_ADJUNTOS) {
      setError(`Se permiten como máximo ${MAX_ADJUNTOS} archivos.`)
      return null
    }
    for (const archivo of archivos) {
      if (!TIPOS.includes(archivo.type)) {
        setError(`"${archivo.name}" no es un archivo jpg, png o pdf.`)
        return null
      }
      if (archivo.size > TAMANO_MAX) {
        setError(`"${archivo.name}" supera el máximo de 5 MB.`)
        return null
      }
    }
    return Array.from(archivos)
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    const campos = Object.fromEntries(datos.entries()) as Record<string, string>
    const archivos = validarArchivos(formulario.adjuntos.files)
    if (archivos === null) return

    setEnviando(true)
    try {
      const resultado = await postMultipart<CreacionSolicitud>('/public/solicitudes', campos, archivos)
      setResultado(resultado)
      window.scrollTo(0, 0)
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.details?.campos ? `${e.message} (${(e.details.campos as string[]).join(', ')})` : e.message)
      } else {
        setError('No se pudo enviar la solicitud. Inténtalo de nuevo.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-green-200 bg-green-50 p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-green-800">
            Solicitud recibida
          </h1>
          <p className="mt-4 text-tinta-700">
            Tu solicitud quedó registrada con el código{' '}
            <strong className="font-display">{resultado.codigo}</strong>. Guárdalo junto con tu
            enlace de seguimiento.
          </p>
          <Link
            to={`/seguimiento/${resultado.token}`}
            className="mt-6 inline-block rounded-md bg-violeta-500 px-6 py-3 font-display font-bold text-white transition-colors hover:bg-violeta-700"
          >
            Ver seguimiento
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Solicitar asistencia</h1>
      <p className="mt-4 text-lg text-tinta-700">
        Describe tu requerimiento. Recibirás un código de seguimiento al enviar el formulario.
      </p>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={enviar} className="mt-10 space-y-6" noValidate>
        <div>
          <label htmlFor="organizacion" className="block text-sm font-semibold">Organización</label>
          <input id="organizacion" name="organizacion" required className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="contactoNombre" className="block text-sm font-semibold">Nombre de contacto</label>
            <input id="contactoNombre" name="contactoNombre" required className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
          </div>
          <div>
            <label htmlFor="contactoTelefono" className="block text-sm font-semibold">Teléfono</label>
            <input id="contactoTelefono" name="contactoTelefono" required className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
          </div>
        </div>
        <div>
          <label htmlFor="contactoEmail" className="block text-sm font-semibold">Correo electrónico</label>
          <input id="contactoEmail" name="contactoEmail" type="email" required className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
        </div>
        <div>
          <label htmlFor="categoriaId" className="block text-sm font-semibold">Categoría</label>
          <select id="categoriaId" name="categoriaId" required className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2">
            <option value="">Selecciona una categoría…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="descripcion" className="block text-sm font-semibold">
            Descripción <span className="font-normal text-tinta-500">(entre 20 y 2000 caracteres)</span>
          </label>
          <textarea id="descripcion" name="descripcion" rows={5} required minLength={20} maxLength={2000} className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
        </div>
        <div>
          <label htmlFor="ubicacion" className="block text-sm font-semibold">
            Ubicación <span className="font-normal text-tinta-500">(opcional)</span>
          </label>
          <input id="ubicacion" name="ubicacion" className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2" />
        </div>
        <div>
          <label htmlFor="urgenciaDeclarada" className="block text-sm font-semibold">
            Urgencia <span className="font-normal text-tinta-500">(solo como referencia; la prioridad la define coordinación)</span>
          </label>
          <select id="urgenciaDeclarada" name="urgenciaDeclarada" className="mt-1 w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2">
            <option value="">Sin preferencia</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </select>
        </div>
        <div>
          <label htmlFor="adjuntos" className="block text-sm font-semibold">
            Adjuntos <span className="font-normal text-tinta-500">(hasta 5 archivos de 5 MB; jpg, png o pdf)</span>
          </label>
          <input id="adjuntos" name="adjuntos" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="mt-1 w-full text-sm" />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-violeta-500 px-6 py-3 font-display font-bold text-white transition-colors hover:bg-violeta-700 disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </section>
  )
}
