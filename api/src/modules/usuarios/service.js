'use strict'

const bcrypt = require('bcryptjs')
const { ApiError } = require('../../middlewares/errores')
const { validarPassword, EMAIL_RE, parsearPaginacion } = require('../../lib/validaciones')
const repositorio = require('./repository')
const { COSTE_BCRYPT } = require('../auth/service')

// Reglas de negocio de usuarios.

const ROLES_VALIDOS = ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE']

// Validar rol.
function validarRol (rol) {
  if (!ROLES_VALIDOS.includes(rol)) {
    throw new ApiError(400, 'ROL_INVALIDO', `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}.`, {
      campos: ['rol']
    })
  }
}

// Listar usuarios con filtros y paginación.
async function listar (usuario, { rol, organizacionId, q, page = 1, limit = 20, orden = 'creacion-desc' }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden listar usuarios.')
  }

  const { page: p, limit: l } = parsearPaginacion({ page, limit })
  const filtros = {
    rol: rol || null,
    organizacionId: organizacionId || null,
    q: q || null,
    page: p,
    limit: l,
    orden
  }

  const { data, total } = await repositorio.listar({ filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

// Obtener usuario por ID.
async function obtenerPorId (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden consultar usuarios.')
  }

  const usuarioEncontrado = await repositorio.obtenerPorId(id)
  if (!usuarioEncontrado) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  return usuarioEncontrado
}

// Crear usuario.
async function crear (usuario, { nombre, email, password, rol, organizacionId }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden crear usuarios.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre es obligatorio.', { campos: ['nombre'] })
  }

  const emailLimpio = String(email || '').trim().toLowerCase()
  if (!emailLimpio) {
    throw new ApiError(400, 'EMAIL_REQUERIDO', 'El correo electrónico es obligatorio.', { campos: ['email'] })
  }
  if (!EMAIL_RE.test(emailLimpio)) {
    throw new ApiError(400, 'EMAIL_INVALIDO', 'El correo electrónico no es válido.', { campos: ['email'] })
  }

  validarPassword(password)
  validarRol(rol)

  // Validar coherencia de rol y organización.
  if (rol === 'CLIENTE' && !organizacionId) {
    throw new ApiError(400, 'ORGANIZACION_REQUERIDA', 
      'Los usuarios CLIENTE deben estar asociados a una organización.', { campos: ['organizacionId'] })
  }

  if (rol !== 'CLIENTE' && organizacionId) {
    throw new ApiError(400, 'ORGANIZACION_NO_PERMITIDA',
      'Solo los usuarios CLIENTE pueden estar asociados a una organización.', { campos: ['organizacionId'] })
  }

  // Verificar unicidad de email.
  const existente = await repositorio.obtenerPorEmail(emailLimpio)
  if (existente) {
    throw new ApiError(409, 'EMAIL_DUPLICADO', 'Ya existe un usuario con ese correo electrónico.', {
      campos: ['email']
    })
  }

  const passwordHash = bcrypt.hashSync(String(password), COSTE_BCRYPT)

  return repositorio.crear({
    nombre: nombreLimpio,
    email: emailLimpio,
    passwordHash,
    rol,
    organizacionId: organizacionId || null
  })
}

// Actualizar usuario.
async function actualizar (usuario, id, { nombre, email, rol, organizacionId }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar usuarios.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre es obligatorio.', { campos: ['nombre'] })
  }

  const emailLimpio = String(email || '').trim().toLowerCase()
  if (!emailLimpio) {
    throw new ApiError(400, 'EMAIL_REQUERIDO', 'El correo electrónico es obligatorio.', { campos: ['email'] })
  }
  if (!EMAIL_RE.test(emailLimpio)) {
    throw new ApiError(400, 'EMAIL_INVALIDO', 'El correo electrónico no es válido.', { campos: ['email'] })
  }

  validarRol(rol)

  // Validar coherencia de rol y organización.
  if (rol === 'CLIENTE' && !organizacionId) {
    throw new ApiError(400, 'ORGANIZACION_REQUERIDA',
      'Los usuarios CLIENTE deben estar asociados a una organización.', { campos: ['organizacionId'] })
  }

  if (rol !== 'CLIENTE' && organizacionId) {
    throw new ApiError(400, 'ORGANIZACION_NO_PERMITIDA',
      'Solo los usuarios CLIENTE pueden estar asociados a una organización.', { campos: ['organizacionId'] })
  }

  // Verificar unicidad de email si se cambió.
  if (emailLimpio !== existente.email) {
    const conEmail = await repositorio.obtenerPorEmail(emailLimpio)
    if (conEmail) {
      throw new ApiError(409, 'EMAIL_DUPLICADO', 'Ya existe un usuario con ese correo electrónico.', {
        campos: ['email']
      })
    }
  }

  const actualizado = await repositorio.actualizar(id, {
    nombre: nombreLimpio,
    email: emailLimpio,
    rol,
    organizacionId: organizacionId || null
  })

  return actualizado
}

// Cambiar contraseña (administrativo).
async function cambiarPassword (usuario, id, { password }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden cambiar contraseñas de otros usuarios.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  validarPassword(password)

  const passwordHash = bcrypt.hashSync(String(password), COSTE_BCRYPT)
  await repositorio.actualizarPassword(id, passwordHash)

  return { ok: true, id }
}

// Desactivar usuario (borrado lógico).
async function desactivar (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar usuarios.')
  }

  if (usuario.id === id) {
    throw new ApiError(400, 'AUTO_DESACTIVACION', 'No puedes desactivar tu propia cuenta.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  const desactivado = await repositorio.desactivar(id)
  if (!desactivado) {
    throw new ApiError(500, 'ERROR_DESACTIVACION', 'No se pudo desactivar el usuario.')
  }

  return { ok: true, id: desactivado.id }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarPassword,
  desactivar
}
