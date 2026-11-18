// Primitivos de UI compartidos del portal (Tailwind con el tema de la marca).

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'fantasma'

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-violeta-500 text-white hover:bg-violeta-700 focus-visible:outline-violeta-500',
  secundario: 'border border-tinta-900/20 bg-white text-tinta-700 hover:border-violeta-500 hover:text-violeta-500',
  peligro: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  fantasma: 'text-tinta-500 hover:text-tinta-900 underline-offset-2 hover:underline',
}

export function Boton({
  variante = 'primario',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBoton }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-display font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-display font-bold text-tinta-700">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-tinta-500">{ayuda}</span>}
    </label>
  )
}

const CLASE_CONTROL = 'w-full rounded-md border border-tinta-900/20 bg-white px-3 py-2 text-sm text-tinta-900 outline-none transition-colors focus:border-violeta-500 disabled:bg-lavanda-honda'

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={CLASE_CONTROL} {...props} />
}

export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // textarea comparte la misma presentación
  return <textarea className={`${CLASE_CONTROL} min-h-24`} {...props} />
}

export function Selector(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={CLASE_CONTROL} {...props} />
}

const COLORES_ESTADO: Record<string, string> = {
  RECIBIDA: 'bg-lavanda-honda text-tinta-700',
  EN_REVISION: 'bg-amber-100 text-amber-800',
  REQUIERE_INFORMACION: 'bg-orange-100 text-orange-800',
  APROBADA: 'bg-emerald-100 text-emerald-800',
  RECHAZADA: 'bg-red-100 text-red-800',
  ASIGNADA: 'bg-sky-100 text-sky-800',
  EN_PROCESO: 'bg-indigo-100 text-indigo-800',
  RESUELTA: 'bg-teal-100 text-teal-800',
  CERRADA: 'bg-tinta-900/10 text-tinta-700',
  CANCELADA: 'bg-red-100 text-red-800',
}

export function BadgeEstado({ estado, texto }: { estado: string; texto: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-display font-bold ${COLORES_ESTADO[estado] ?? 'bg-lavanda-honda text-tinta-700'}`}>
      {texto}
    </span>
  )
}

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
}: {
  titulo: string
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
}) {
  if (!abierto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta-950/40 p-4" onClick={onCerrar}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-tinta-500 hover:text-tinta-900">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="text-tinta-500">{texto}</p>
}

export function ErrorPanel({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="text-red-700">{mensaje}</p>
    </div>
  )
}
