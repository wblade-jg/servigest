'use strict'

const crypto = require('crypto')
const { ApiError } = require('./errores')
const repositorio = require('../modules/auth/repository')
const { COOKIE_SESION } = require('../modules/auth/controller')

// Sesión, CSRF y roles.

const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const METODO_SEGURO = (metodo) => ['GET', 'HEAD', 'OPTIONS'].includes(metodo)

// Lee la cookie de sesión, valida la sesión activa y el usuario,
// y carga req.usuario / req.sesion. 401 si no hay sesión válida.
async function autenticar (req, res, siguiente) {
  try {
    const token = req.cookies?.[COOKIE_SESION]
    if (!token) {
      throw new ApiError(401, 'NO_AUTENTICADO', 'Se requiere una sesión activa.')
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const sesion = await repositorio.buscarSesionActiva(tokenHash)
    if (!sesion) {
      throw new ApiError(401, 'SESION_EXPIRADA', 'La sesión no es válida o expiró.')
    }
    req.usuario = {
      id: sesion.id,
      nombre: sesion.nombre,
      email: sesion.email,
      rol: sesion.rol,
      organizacionId: sesion.organizacionId
    }
    req.sesion = {
      id: sesion.sesionId,
      csrfSecret: sesion.csrfSecret,
      expiraEn: sesion.expiraEn
    }
    repositorio.actualizarUltimoAcceso(sesion.sesionId).catch(() => { /* best effort */ })
    return siguiente()
  } catch (error) { return siguiente(error) }
}

// CSRF en métodos mutantes: X-CSRF-Token debe coincidir con el secreto de la sesión.
// El orden importa: siempre después de autenticar.
function exigirCsrf (req, res, siguiente) {
  if (METODO_SEGURO(req.method)) return siguiente()
  const token = req.get('x-csrf-token') || ''
  const secreto = req.sesion?.csrfSecret || ''
  const a = Buffer.from(token)
  const b = Buffer.from(secreto)
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    return siguiente()
  }
  return siguiente(new ApiError(403, 'CSRF_INVALIDO', 'Falta el token CSRF o no es válido.'))
}

// Cadenar autenticar + CSRF; útil para montar rutas completas.
function sesionConCsrf (router) {
  router.use(autenticar)
  router.use(exigirCsrf)
}

// Factory de guardia por roles. 403 si el rol del usuario no está permitido.
function soloRoles (...rolesPermitidos) {
  return (req, res, siguiente) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return siguiente(new ApiError(403, 'ROL_NO_AUTORIZADO', 'Tu rol no permite esta operación.'))
    }
    return siguiente()
  }
}

module.exports = { autenticar, exigirCsrf, sesionConCsrf, soloRoles, METODOS_MUTANTES }
