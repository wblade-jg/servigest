// Cliente HTTP con manejo de errores uniforme: { error: { code, message, details } }

export interface ApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class ApiError extends Error {
  code: string
  details: Record<string, unknown>
  estado: number

  constructor(error: ApiErrorShape, estado: number) {
    super(error.message)
    this.estado = estado
    this.code = error.code
    this.details = error.details ?? {}
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function respuesta<T>(res: Response): Promise<T> {
  const cuerpo = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(cuerpo?.error ?? { code: 'ERROR_INTERNO', message: 'Error interno del servidor.' }, res.status)
  }
  return cuerpo as T
}

export async function get<T>(ruta: string): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`)
  return respuesta<T>(res)
}

export async function postMultipart<T>(ruta: string, cuerpo: Record<string, string>, archivos: File[]): Promise<T> {
  const datos = new FormData()
  for (const [campo, valor] of Object.entries(cuerpo)) {
    datos.append(campo, valor)
  }
  for (const archivo of archivos) {
    datos.append('adjuntos', archivo)
  }
  const res = await fetch(`${BASE}${ruta}`, { method: 'POST', body: datos })
  return respuesta<T>(res)
}
