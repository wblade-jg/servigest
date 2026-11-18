// Cliente HTTP con manejo de errores uniforme: { error: { code, message, details } }
// Envía la cookie de sesión y el token CSRF en métodos mutantes.

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

// Token CSRF ligado a la sesión; lo establece /auth/login y /auth/me.
let csrfToken: string | null = null

// Redirección global al expirar la sesión (la registra AuthProvider).
let manejadorSesionExpirada: (() => void) | null = null

export function setCsrfToken(token: string | null) {
  csrfToken = token
}

export function setManejadorSesionExpirada(manejador: (() => void) | null) {
  manejadorSesionExpirada = manejador
}

async function respuesta<T>(res: Response): Promise<T> {
  const cuerpo = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && manejadorSesionExpirada) manejadorSesionExpirada()
    throw new ApiError(cuerpo?.error ?? { code: 'ERROR_INTERNO', message: 'Error interno del servidor.' }, res.status)
  }
  return cuerpo as T
}

export async function get<T>(ruta: string): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, { credentials: 'same-origin' })
  return respuesta<T>(res)
}

// Mutaciones JSON: POST, PATCH, DELETE. Exigen el header X-CSRF-Token.
export async function enviar<T>(ruta: string, metodo: 'POST' | 'PUT' | 'PATCH' | 'DELETE', cuerpo?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  return respuesta<T>(res)
}

export const post = <T>(ruta: string, cuerpo?: unknown) => enviar<T>(ruta, 'POST', cuerpo)
export const put = <T>(ruta: string, cuerpo?: unknown) => enviar<T>(ruta, 'PUT', cuerpo)
export const patch = <T>(ruta: string, cuerpo?: unknown) => enviar<T>(ruta, 'PATCH', cuerpo)
export const del = <T>(ruta: string) => enviar<T>(ruta, 'DELETE')

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
