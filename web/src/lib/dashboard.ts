import { get } from './api'

export interface ConteoEstado {
  estado: string
  total: number
}

export interface ConteoPrioridad {
  prioridad: string
  total: number
}

export interface ResumenSla {
  enPlazo: number
  porVencer: number
  vencidas: number
  sinFecha: number
}

export interface CargaTecnico {
  tecnicoId: string
  nombre: string
  total: number
}

export interface DashboardData {
  total: number
  porEstado: ConteoEstado[]
  porPrioridad: ConteoPrioridad[]
  sla: ResumenSla
  mttrHoras: number | null
  // Solo para Admin/Coordinador; el Cliente recibe null.
  cargaTecnicos: CargaTecnico[] | null
}

export function obtenerDashboard (): Promise<DashboardData> {
  return get<DashboardData>('/dashboard')
}
