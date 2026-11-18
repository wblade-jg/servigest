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

export interface Solicitud {
  id: string
  codigo: string
  origen: 'PUBLICO' | 'CLIENTE'
  estado: string
  prioridad: string | null
  urgenciaDeclarada: string | null
  descripcion: string
  ubicacion: string | null
  contactoNombre: string
  contactoEmail: string
  contactoTelefono: string
  organizacionId: string | null
  organizacionNombre: string | null
  categoriaId: string
  categoriaNombre: string | null
  especialidadRequeridaId?: string | null
  especialidadRequeridaNombre?: string | null
  tecnicoId: string | null
  tecnicoNombre: string | null
  fechaProgramada: string | null
  fechaObjetivo: string | null
  constanciaAceptacion: string | null
  aprobadaEn: string | null
  rechazadaMotivo: string | null
  canceladaMotivo: string | null
  resolucion: string | null
  resueltaEn: string | null
  cerradaEn: string | null
  fechaCreacion: string
  fechaActualizacion: string
}

export interface ListadoSolicitudes {
  data: Solicitud[]
  page: number
  limit: number
  total: number
}

export interface EventoSolicitud {
  id: number
  tipo: string
  estadoAnterior: string | null
  estadoNuevo: string | null
  metadata: Record<string, unknown>
  fecha: string
  actorNombre: string | null
  actorRol: string | null
}

export interface NotaSolicitud {
  id: string
  tipo: string
  contenido: string
  fecha: string
  autorId: string
  autorNombre: string
  autorRol: string
}

export const ETIQUETAS_EVENTO: Record<string, string> = {
  CREACION: 'Creación',
  CAMBIO_ESTADO: 'Cambio de estado',
  APROBACION: 'Aprobación',
  RECHAZO: 'Rechazo',
  ASIGNACION: 'Asignación',
  REASIGNACION: 'Reasignación',
  INTERVENCION_INICIO: 'Inicio de intervención',
  INTERVENCION_FIN: 'Fin de intervención',
  NOTA: 'Nota interna',
  ADJUNTO: 'Adjunto',
  CIERRE: 'Cierre',
  CANCELACION: 'Cancelación',
  REGENERACION_TOKEN: 'Regeneración de token',
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
