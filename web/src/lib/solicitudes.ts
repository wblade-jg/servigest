export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  especialidad: string | null
}

export interface Seguimiento {
  codigo: string
  estado: string
  prioridad: string | null
  fechaCreacion: string
  fechaObjetivo: string | null
  fechaProgramada: string | null
  tecnicoAsignado: string | null
}

export interface CreacionSolicitud {
  codigo: string
  token: string
}

// Etiquetas legibles para estados y prioridades
export const ETIQUETAS_ESTADO: Record<string, string> = {
  RECIBIDA: 'Recibida',
  EN_REVISION: 'En revisión',
  REQUIERE_INFORMACION: 'Requiere información',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En proceso',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}

export const ETIQUETAS_PRIORIDAD: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

// Presentación de fechas en America/Guayaquil
export function fechaLocal(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(iso))
}
