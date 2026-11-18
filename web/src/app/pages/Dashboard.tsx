import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api'
import { useAuth, esInterno } from '../../lib/auth'
import { useSse } from '../../lib/sse'
import { obtenerDashboard, type DashboardData } from '../../lib/dashboard'
import { ETIQUETAS_ESTADO, ETIQUETAS_PRIORIDAD } from '../../lib/solicitudes'
import { Cargando, ErrorPanel } from '../../components/ui/primitivos'

// Dashboard operativo: internos ven métricas globales y carga por técnico;
// el Cliente solo las métricas de su organización.

export default function Dashboard () {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerDashboard())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el dashboard.')
    }
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  // El canal de coordinación solo existe para internos; el Cliente refresca
  // al navegar. Evitamos abrir una conexión que respondería 403.
  const canal = esInterno(usuario) ? '/api/eventos/coordinacion' : ''
  useSse(canal, () => { void cargar() }, () => { void cargar() })

  if (error) {
    return <section className="mx-auto max-w-5xl px-6 py-10"><ErrorPanel mensaje={error} /></section>
  }
  if (!datos) {
    return <section className="mx-auto max-w-5xl px-6 py-10"><Cargando texto="Cargando dashboard…" /></section>
  }

  const totalPrioridades = datos.porPrioridad.reduce((suma, p) => suma + p.total, 0)
  const totalSla = datos.sla.enPlazo + datos.sla.porVencer + datos.sla.vencidas

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-tinta-700">
        {esInterno(usuario)
          ? 'Métricas globales de la operación y cumplimiento de SLA.'
          : 'Métricas de las solicitudes de tu organización.'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Solicitudes" valor={String(datos.total)} detalle="Total registradas" />
        <Tarjeta titulo="En plazo" valor={String(datos.sla.enPlazo)} detalle="SLA con más de 24 h" tono="verde" />
        <Tarjeta titulo="Por vencer" valor={String(datos.sla.porVencer)} detalle="SLA en las próximas 24 h" tono="ambar" />
        <Tarjeta titulo="Vencidas" valor={String(datos.sla.vencidas)} detalle="SLA fuera de tiempo" tono="rojo" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Tarjeta
          titulo="MTTR"
          valor={datos.mttrHoras === null ? '—' : `${datos.mttrHoras} h`}
          detalle="Promedio de resolución (30 días)"
        />
        <Tarjeta
          titulo="Sin fecha objetivo"
          valor={String(datos.sla.sinFecha)}
          detalle="No terminales sin SLA calculado"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel titulo="Distribución por estado">
          <Barras
            filas={datos.porEstado.map((e) => ({
              etiqueta: ETIQUETAS_ESTADO[e.estado] ?? e.estado,
              total: e.total,
            }))}
            total={datos.total}
            vacio="Sin solicitudes registradas."
          />
        </Panel>

        <Panel titulo="Prioridad (no terminales)">
          <Barras
            filas={datos.porPrioridad.map((p) => ({
              etiqueta: ETIQUETAS_PRIORIDAD[p.prioridad] ?? p.prioridad,
              total: p.total,
            }))}
            total={totalPrioridades}
            vacio="Sin solicitudes abiertas."
          />
          <p className="mt-3 text-xs text-tinta-500">
            {totalSla} solicitudes no terminales con SLA calculado.
          </p>
        </Panel>
      </div>

      {datos.cargaTecnicos && (
        <Panel titulo="Carga por técnico" className="mt-6">
          {datos.cargaTecnicos.length === 0 ? (
            <p className="text-sm text-tinta-500">Sin solicitudes asignadas o en proceso.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-tinta-900/10 text-xs uppercase tracking-wide text-tinta-500">
                  <th className="py-2 pr-4">Técnico</th>
                  <th className="py-2">Solicitudes activas</th>
                </tr>
              </thead>
              <tbody>
                {datos.cargaTecnicos.map((t) => (
                  <tr key={t.tecnicoId} className="border-b border-tinta-900/5">
                    <td className="py-2 pr-4">{t.nombre}</td>
                    <td className="py-2 font-display font-bold">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
    </section>
  )
}

type Tono = 'neutro' | 'verde' | 'ambar' | 'rojo'

const TONOS: Record<Tono, string> = {
  neutro: 'text-tinta-900',
  verde: 'text-emerald-700',
  ambar: 'text-amber-700',
  rojo: 'text-red-700',
}

function Tarjeta ({ titulo, valor, detalle, tono = 'neutro' }: {
  titulo: string
  valor: string
  detalle: string
  tono?: Tono
}) {
  return (
    <div className="rounded-lg border border-tinta-900/10 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-tinta-500">{titulo}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${TONOS[tono]}`}>{valor}</p>
      <p className="mt-1 text-xs text-tinta-500">{detalle}</p>
    </div>
  )
}

function Panel ({ titulo, className = '', children }: {
  titulo: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border border-tinta-900/10 bg-white p-6 ${className}`}>
      <h2 className="font-display text-lg font-bold">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Barras ({ filas, total, vacio }: {
  filas: Array<{ etiqueta: string; total: number }>
  total: number
  vacio: string
}) {
  if (filas.length === 0) return <p className="text-sm text-tinta-500">{vacio}</p>
  return (
    <ul className="space-y-3">
      {filas.map((fila) => {
        const porcentaje = total > 0 ? Math.round((fila.total / total) * 100) : 0
        return (
          <li key={fila.etiqueta}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-display font-bold">{fila.etiqueta}</span>
              <span className="text-tinta-500">{fila.total}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-lavanda-honda" role="img" aria-label={`${fila.etiqueta}: ${fila.total}`}>
              <div className="h-2 rounded-full bg-violeta-500" style={{ width: `${porcentaje}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
