import { get, patch, post } from './api'

export interface Intervencion {
  id: string
  solicitudId: string
  tecnicoId: string
  tecnicoNombre: string | null
  inicio: string
  fin: string | null
  diagnostico: string | null
  actividades: string | null
  resultado: string | null
  observaciones: string | null
  fechaCreacion: string
  fechaActualizacion: string
}

export interface InicioIntervencion {
  intervencionId: string
  solicitudId: string
  inicio: string
  estado: string
  tecnicoId: string
  codigo: string
}

export interface ResolucionIntervencion {
  fin: string
  diagnostico: string
  actividades: string
  resultado: string
  observaciones?: string
}

// Intervenciones de una solicitud. El técnico solo accede a las de sus
// solicitudes asignadas (lo impone el backend).
export async function listarIntervenciones (solicitudId: string): Promise<Intervencion[]> {
  const res = await get<{ data: Intervencion[] }>(`/solicitudes/${solicitudId}/intervenciones`)
  return res.data
}

// Inicia la intervención de una solicitud ASIGNADA (ASIGNADA → EN_PROCESO).
export function iniciarIntervencion (solicitudId: string): Promise<InicioIntervencion> {
  return post<InicioIntervencion>(`/solicitudes/${solicitudId}/intervenciones`)
}

// Resuelve la intervención abierta (EN_PROCESO → RESUELTA).
export function resolverIntervencion (intervencionId: string, datos: ResolucionIntervencion) {
  return patch(`/intervenciones/${intervencionId}`, datos)
}

export const MINIMO_TEXTO_INTERVENCION = 10
