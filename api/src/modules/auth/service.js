'use strict'

const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { ApiError } = require('../../middlewares/errores')
const repositorio = require('./repository')

// Reglas de negocio de autenticación y sesiones.

const COSTE_BCRYPT = 12
const HORAS_SESION = 12
const INTENTOS_MAXIMOS = 5

const hashSha256 = (valor) => crypto.createHash('sha256').update(valor).digest('hex')

function compararContraseñas (contraseña, hash) {
  return bcrypt.compareSync(String(contraseña), hash)
}

async function iniciarSesion ({ email, password, ip, userAgent }) {
  const correo = String(email || '').trim()
  const contraseña = String(password || '')
  if (!correo || !contraseña) {
    throw new ApiError(400, 'CAMPOS_FALTANTES', 'El correo y la contraseña son obligatorios.', {
      campos: [!correo && 'email', !contraseña && 'password'].filter(Boolean)
    })
  }

  const usuario = await repositorio.buscarUsuarioPorEmail(correo)

  // Usuario inexistente: se compara contra un hash de cortesía para uniformar
  // el tiempo de respuesta y no revelar si el correo existe.
  if (!usuario) {
    compararContraseñas(contraseña, repositorio.HASH_CORTESIA)
    throw new ApiError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.')
  }

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    throw new ApiError(423, 'CUENTA_BLOQUEADA',
      'La cuenta está bloqueada por intentos fallidos. Inténtalo más tarde.',
      { bloqueadoHasta: usuario.bloqueado_hasta })
  }

  if (!compararContraseñas(contraseña, usuario.password_hash) || !usuario.activo) {
    const { intentos_fallidos, bloqueado_hasta } = await repositorio.registrarIntentoFallido(usuario.id)
    const detalles = {}
    if (bloqueado_hasta && new Date(bloqueado_hasta) > new Date()) {
      detalles.bloqueadoHasta = bloqueado_hasta
    }
    throw new ApiError(401, 'CREDENCIALES_INVALIDAS',
      intentos_fallidos >= INTENTOS_MAXIMOS
        ? 'Correo o contraseña incorrectos. La cuenta quedó bloqueada por 15 minutos.'
        : 'Correo o contraseña incorrectos.',
      detalles)
  }

  await repositorio.limpiarIntentosFallidos(usuario.id)

  // El token viaja en la cookie; en la base de datos solo queda su SHA-256.
  const token = crypto.randomBytes(32).toString('hex')
  const csrfSecret = crypto.randomBytes(32).toString('hex')
  const sesion = await repositorio.crearSesion({
    usuarioId: usuario.id,
    tokenHash: hashSha256(token),
    csrfSecret,
    horas: HORAS_SESION,
    ip,
    userAgent
  })

  return {
    token,
    csrfToken: csrfSecret,
    expiraEn: sesion.expira_en,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      organizacionId: usuario.organizacion_id
    }
  }
}

async function cerrarSesion (sesionId) {
  await repositorio.revocarSesion(sesionId)
}

async function cambiarPassword ({ usuarioId, actual, nueva }) {
  const usuario = await repositorio.buscarUsuarioPorId(usuarioId)
  if (!usuario || !compararContraseñas(String(actual || ''), usuario.password_hash)) {
    throw new ApiError(400, 'PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.')
  }
  const nuevaClave = String(nueva || '')
  if (nuevaClave.length < 8) {
    throw new ApiError(400, 'PASSWORD_INVALIDA', 'La nueva contraseña debe tener al menos 8 caracteres.', {
      campos: ['nueva']
    })
  }
  if (compararContraseñas(nuevaClave, usuario.password_hash)) {
    throw new ApiError(400, 'PASSWORD_INVALIDA', 'La nueva contraseña debe ser distinta de la actual.', {
      campos: ['nueva']
    })
  }
  const hash = bcrypt.hashSync(nuevaClave, COSTE_BCRYPT)
  await repositorio.actualizarPassword(usuarioId, hash)
  return { ok: true }
}

module.exports = { iniciarSesion, cerrarSesion, cambiarPassword, COSTE_BCRYPT, HORAS_SESION, INTENTOS_MAXIMOS }
