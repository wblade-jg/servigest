// Suscripción SSE con reconexión automática y refetch por REST.
// El navegador reconecta EventSource por sí solo; tras cada reconexión se
// avisa al cliente para que vuelva a consultar por REST y cubra eventos perdidos.

import { useEffect, useRef } from 'react'

export function useSse(
  ruta: string,
  onEvento: (evento: string, datos: unknown) => void,
  onReconexion?: () => void
) {
  // Referencias para no recrear la conexión por cambios de identidad del callback.
  const manejadorRef = useRef(onEvento)
  const reconexionRef = useRef(onReconexion)
  manejadorRef.current = onEvento
  reconexionRef.current = onReconexion

  useEffect(() => {
    if (!ruta) return
    const fuente = new EventSource(ruta)

    const oyente = (evento: Event) => {
      const e = evento as MessageEvent
      let datos: unknown = null
      try { datos = JSON.parse(e.data) } catch { datos = null }
      manejadorRef.current(e.type, datos)
    }

    const generico = (e: MessageEvent) => {
      let datos: unknown = null
      try { datos = JSON.parse(e.data) } catch { datos = null }
      manejadorRef.current(e.type ?? 'mensaje', datos)
    }

    fuente.onopen = () => reconexionRef.current?.()

    // Los tipos conocidos del acuerdo
    for (const tipo of [
      'solicitud.creada',
      'solicitud.estado',
      'solicitud.asignada',
      'solicitud.reasignada',
      'solicitud.cerrada',
      'intervencion.iniciada',
      'intervencion.resuelta',
    ]) {
      fuente.addEventListener(tipo, oyente)
    }
    fuente.onmessage = generico

    return () => fuente.close()
  }, [ruta])
}
