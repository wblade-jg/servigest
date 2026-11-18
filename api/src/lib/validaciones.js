'use strict'

const crypto = require('crypto')
const { ApiError } = require('../middlewares/errores')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validarEmail (valor, campo = 'email') {
  const email = String(valor || '').trim().toLowerCase()
  if (!email) {
    throw new ApiError(400, 'EMAIL_REQUERIDO', 'El correo electrónico es obligatorio.', { campos: [campo] })
  }
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, 'EMAIL_INVALIDO', 'El correo de contacto no es válido.', { campos: [campo] })
  }
  return email
}

function validarPassword (password, campo = 'password') {
  const pass = String(password || '')
  if (pass.length < 8) {
    throw new ApiError(400, 'PASSWORD_INVALIDA', 'La contraseña debe tener al menos 8 caracteres.', {
      campos: [campo]
    })
  }
  return pass
}

function generarToken () {
  return crypto.randomBytes(32).toString('base64url')
}

function parsearPaginacion (query = {}, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit))
  return { page, limit }
}

module.exports = {
  EMAIL_RE,
  validarEmail,
  validarPassword,
  generarToken,
  parsearPaginacion
}
