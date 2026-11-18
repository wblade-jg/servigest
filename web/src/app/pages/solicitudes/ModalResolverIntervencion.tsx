import { useEffect, useState } from 'react'
import { ApiError } from '../../../lib/api'
import {
  type Intervencion,
  type ResolucionIntervencion,
  resolverIntervencion,
  MINIMO_TEXTO_INTERVENCION,
} from '../../../lib/intervenciones'
import { Boton, Campo, Entrada, AreaTexto, Modal } from '../../../components/ui/primitivos'

// Formulario de resolución de la intervención abierta (EN_PROCESO → RESUELTA).
// El técnico documenta diagnóstico, actividades, resultado y, opcionalmente,
// observaciones. El fin debe ser posterior al inicio.

interface Props {
  intervencion: Intervencion
  abierto: boolean
  onCerrar: () => void
  onExito: () => void | Promise<void>
}

// Valor para <input type="datetime-local"> en hora local del navegador.
function ahoraLocal (): string {
  const ahora = new Date()
  const desplazamiento = ahora.getTimezoneOffset() * 60 * 1000
  return new Date(ahora.getTime() - desplazamiento).toISOString().slice(0, 16)
}

export default function ModalResolverIntervencion ({ intervencion, abierto, onCerrar, onExito }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (abierto) setError(null)
  }, [abierto])

  async function enviar (e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formulario = new FormData(e.currentTarget)
    const finLocal = String(formulario.get('fin') || '')
    const fin = finLocal ? new Date(finLocal).toISOString() : ''

    const datos: ResolucionIntervencion = {
      fin,
      diagnostico: String(formulario.get('diagnostico') || '').trim(),
      actividades: String(formulario.get('actividades') || '').trim(),
      resultado: String(formulario.get('resultado') || '').trim(),
      observaciones: String(formulario.get('observaciones') || '').trim() || undefined,
    }

    const campos: Array<[keyof ResolucionIntervencion, string]> = [
      ['diagnostico', 'diagnóstico'],
      ['actividades', 'actividades'],
      ['resultado', 'resultado'],
    ]
    for (const [campo, nombre] of campos) {
      if (String(datos[campo] || '').length < MINIMO_TEXTO_INTERVENCION) {
        setError(`El ${nombre} debe tener al menos ${MINIMO_TEXTO_INTERVENCION} caracteres.`)
        return
      }
    }

    setEnviando(true)
    try {
      await resolverIntervencion(intervencion.id, datos)
      await onExito()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar la resolución.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Resolver intervención" abierto={abierto} onCerrar={onCerrar}>
      <form className="space-y-4" onSubmit={enviar}>
        <p className="text-sm text-tinta-700">
          Documenta la intervención. Al resolver, la solicitud pasa a <strong>Resuelta</strong> y la
          resolución queda registrada en la solicitud.
        </p>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <Campo label="Fin de la intervención" ayuda="Debe ser posterior al inicio de la intervención.">
          <Entrada type="datetime-local" name="fin" required defaultValue={ahoraLocal()} />
        </Campo>
        <Campo label="Diagnóstico" ayuda={`Mínimo ${MINIMO_TEXTO_INTERVENCION} caracteres.`}>
          <AreaTexto name="diagnostico" required placeholder="Qué se encontró en el equipo o servicio…" />
        </Campo>
        <Campo label="Actividades realizadas" ayuda={`Mínimo ${MINIMO_TEXTO_INTERVENCION} caracteres.`}>
          <AreaTexto name="actividades" required placeholder="Qué se hizo durante la intervención…" />
        </Campo>
        <Campo label="Resultado" ayuda="Se copia como resolución de la solicitud.">
          <AreaTexto name="resultado" required placeholder="Estado final del servicio tras la intervención…" />
        </Campo>
        <Campo label="Observaciones (opcional)">
          <AreaTexto name="observaciones" placeholder="Notas adicionales, repuestos usados, recomendaciones…" />
        </Campo>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={enviando}>Cancelar</Boton>
          <Boton type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Resolver intervención'}</Boton>
        </div>
      </form>
    </Modal>
  )
}
