'use strict'

const { ApiError } = require('../../middlewares/errores')
const { parsearPaginacion } = require('../../lib/validaciones')
const repositorio = require('./repository')

// Reglas de negocio de organizaciones.

// Validar formato de RUC ecuatoriano (13 dígitos).
function validarRuc (ruc) {
  if (!ruc) return true // RUC es opcional
  const rucLimpio = String(ruc).trim()
  if (!/^\d{13}$/.test(rucLimpio)) {
    throw new ApiError(400, 'RUC_INVALIDO', 'El RUC debe tener exactamente 13 dígitos.', {
      campos: ['ruc']
    })
  }
  return rucLimpio
}

// Listar organizaciones con filtros y paginación.
async function listar (usuario, { q, page = 1, limit = 20, orden = 'creacion-desc' }) {
  // Solo Admin puede listar organizaciones.
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden listar organizaciones.')
  }

  const { page: p, limit: l } = parsearPaginacion({ page, limit })
  const filtros = {
    q: q || null,
    page: p,
    limit: l,
    orden
  }

  const { data, total } = await repositorio.listar({ filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

// Obtener organización por ID.
async function obtenerPorId (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden consultar organizaciones.')
  }

  const organizacion = await repositorio.obtenerPorId(id)
  if (!organizacion) {
    throw new ApiError(404, 'ORGANIZACION_NO_ENCONTRADA', 'La organización no existe.')
  }

  return organizacion
}

// Crear organización.
async function crear (usuario, { nombre, ruc, telefono, direccion }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden crear organizaciones.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la organización es obligatorio.', {
      campos: ['nombre']
    })
  }

  const rucValidado = validarRuc(ruc)

  // Verificar unicidad de RUC si se proporcionó.
  if (rucValidado) {
    const existente = await repositorio.obtenerPorRuc(rucValidado)
    if (existente) {
      throw new ApiError(409, 'RUC_DUPLICADO', 'Ya existe una organización con ese RUC.', {
        campos: ['ruc']
      })
    }
  }

  return repositorio.crear({
    nombre: nombreLimpio,
    ruc: rucValidado,
    telefono: telefono ? String(telefono).trim() : null,
    direccion: direccion ? String(direccion).trim() : null
  })
}

// Actualizar organización.
async function actualizar (usuario, id, { nombre, ruc, telefono, direccion }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar organizaciones.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'ORGANIZACION_NO_ENCONTRADA', 'La organización no existe.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la organización es obligatorio.', {
      campos: ['nombre']
    })
  }

  const rucValidado = validarRuc(ruc)

  // Verificar unicidad de RUC si se cambió.
  if (rucValidado && rucValidado !== existente.ruc) {
    const conRuc = await repositorio.obtenerPorRuc(rucValidado)
    if (conRuc) {
      throw new ApiError(409, 'RUC_DUPLICADO', 'Ya existe una organización con ese RUC.', {
        campos: ['ruc']
      })
    }
  }

  const actualizada = await repositorio.actualizar(id, {
    nombre: nombreLimpio,
    ruc: rucValidado,
    telefono: telefono ? String(telefono).trim() : null,
    direccion: direccion ? String(direccion).trim() : null
  })

  return actualizada
}

// Desactivar organización (borrado lógico).
async function desactivar (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar organizaciones.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'ORGANIZACION_NO_ENCONTRADA', 'La organización no existe.')
  }

  // Verificar que no tenga usuarios activos.
  const tieneUsuarios = await repositorio.tieneUsuariosActivos(id)
  if (tieneUsuarios) {
    throw new ApiError(409, 'ORGANIZACION_CON_USUARIOS', 
      'No se puede desactivar la organización porque tiene usuarios activos.', {
        organizacionId: id
      })
  }

  const desactivada = await repositorio.desactivar(id)
  if (!desactivada) {
    throw new ApiError(500, 'ERROR_DESACTIVACION', 'No se pudo desactivar la organización.')
  }

  return { ok: true, id: desactivada.id }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar
}
