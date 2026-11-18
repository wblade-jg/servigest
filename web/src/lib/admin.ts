// Tipos y utilidades para los módulos de administración (G1).

export interface Organizacion {
  id: string
  nombre: string
  ruc: string | null
  telefono: string | null
  direccion: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: 'ADMIN' | 'COORDINADOR' | 'TECNICO' | 'CLIENTE'
  organizacionId: string | null
  organizacionNombre: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface Tecnico {
  id: string
  nombre: string
  email: string
  notas: string | null
  activo: boolean
  especialidades: string[] | null
  createdAt: string
  updatedAt: string
}

export interface Especialidad {
  id: string
  nombre: string
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
  especialidadRequeridaId: string | null
  especialidadRequeridaNombre: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

export interface DisponibilidadFranja {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
}

export interface Listado<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

export const DIAS_SEMANA: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const ETIQUETAS_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  TECNICO: 'Técnico',
  CLIENTE: 'Cliente',
}
