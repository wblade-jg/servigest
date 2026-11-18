'use strict'

const { ApiError } = require('../../middlewares/errores')
const { parsearPaginacion } = require('../../lib/validaciones')
const repositorio = require('./repository')

// Reglas de negocio de catálogos.

// --- Especialidades ---

async function listarEspecialidades (usuario, { q, page = 1, limit = 50 }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden listar especialidades.')
  }

  const { page: p, limit: l } = parsearPaginacion({ page, limit }, 50)
  const filtros = {
    q: q || null,
    page: p,
    limit: l
  }

  const { data, total } = await repositorio.listarEspecialidades({ filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

async function obtenerEspecialidadPorId (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden consultar especialidades.')
  }

  const especialidad = await repositorio.obtenerEspecialidadPorId(id)
  if (!especialidad) {
    throw new ApiError(404, 'ESPECIALIDAD_NO_ENCONTRADA', 'La especialidad no existe.')
  }

  return especialidad
}

async function crearEspecialidad (usuario, { nombre }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden crear especialidades.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la especialidad es obligatorio.', {
      campos: ['nombre']
    })
  }

  // Verificar unicidad.
  const existente = await repositorio.obtenerEspecialidadPorNombre(nombreLimpio)
  if (existente) {
    throw new ApiError(409, 'ESPECIALIDAD_DUPLICADA', 'Ya existe una especialidad con ese nombre.', {
      campos: ['nombre']
    })
  }

  return repositorio.crearEspecialidad({ nombre: nombreLimpio })
}

async function actualizarEspecialidad (usuario, id, { nombre }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar especialidades.')
  }

  const existente = await repositorio.obtenerEspecialidadPorId(id)
  if (!existente) {
    throw new ApiError(404, 'ESPECIALIDAD_NO_ENCONTRADA', 'La especialidad no existe.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la especialidad es obligatorio.', {
      campos: ['nombre']
    })
  }

  // Verificar unicidad si se cambió el nombre.
  if (nombreLimpio !== existente.nombre) {
    const conNombre = await repositorio.obtenerEspecialidadPorNombre(nombreLimpio)
    if (conNombre) {
      throw new ApiError(409, 'ESPECIALIDAD_DUPLICADA', 'Ya existe una especialidad con ese nombre.', {
        campos: ['nombre']
      })
    }
  }

  return repositorio.actualizarEspecialidad(id, { nombre: nombreLimpio })
}

async function desactivarEspecialidad (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar especialidades.')
  }

  const existente = await repositorio.obtenerEspecialidadPorId(id)
  if (!existente) {
    throw new ApiError(404, 'ESPECIALIDAD_NO_ENCONTRADA', 'La especialidad no existe.')
  }

  // Verificar que no esté en uso.
  const enUso = await repositorio.especialidadEnUso(id)
  if (enUso) {
    throw new ApiError(409, 'ESPECIALIDAD_EN_USO',
      'No se puede desactivar la especialidad porque está asociada a técnicos o categorías.')
  }

  const desactivada = await repositorio.desactivarEspecialidad(id)
  if (!desactivada) {
    throw new ApiError(500, 'ERROR_DESACTIVACION', 'No se pudo desactivar la especialidad.')
  }

  return { ok: true, id: desactivada.id }
}

// --- Categorías ---

async function listarCategorias (usuario, { q, page = 1, limit = 50 }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden listar categorías.')
  }

  const { page: p, limit: l } = parsearPaginacion({ page, limit }, 50)
  const filtros = {
    q: q || null,
    page: p,
    limit: l
  }

  const { data, total } = await repositorio.listarCategorias({ filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

async function obtenerCategoriaPorId (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden consultar categorías.')
  }

  const categoria = await repositorio.obtenerCategoriaPorId(id)
  if (!categoria) {
    throw new ApiError(404, 'CATEGORIA_NO_ENCONTRADA', 'La categoría no existe.')
  }

  return categoria
}

async function crearCategoria (usuario, { nombre, descripcion, especialidadRequeridaId, orden }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden crear categorías.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la categoría es obligatorio.', {
      campos: ['nombre']
    })
  }

  // Verificar unicidad.
  const existente = await repositorio.obtenerCategoriaPorNombre(nombreLimpio)
  if (existente) {
    throw new ApiError(409, 'CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre.', {
      campos: ['nombre']
    })
  }

  // Verificar que la especialidad requerida exista si se proporcionó.
  if (especialidadRequeridaId) {
    const especialidad = await repositorio.obtenerEspecialidadPorId(especialidadRequeridaId)
    if (!especialidad) {
      throw new ApiError(404, 'ESPECIALIDAD_NO_ENCONTRADA', 'La especialidad requerida no existe.')
    }
  }

  return repositorio.crearCategoria({
    nombre: nombreLimpio,
    descripcion: descripcion ? String(descripcion).trim() : null,
    especialidadRequeridaId: especialidadRequeridaId || null,
    orden: orden ? parseInt(orden, 10) : 0
  })
}

async function actualizarCategoria (usuario, id, { nombre, descripcion, especialidadRequeridaId, orden }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar categorías.')
  }

  const existente = await repositorio.obtenerCategoriaPorId(id)
  if (!existente) {
    throw new ApiError(404, 'CATEGORIA_NO_ENCONTRADA', 'La categoría no existe.')
  }

  const nombreLimpio = String(nombre || '').trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'NOMBRE_REQUERIDO', 'El nombre de la categoría es obligatorio.', {
      campos: ['nombre']
    })
  }

  // Verificar unicidad si se cambió el nombre.
  if (nombreLimpio !== existente.nombre) {
    const conNombre = await repositorio.obtenerCategoriaPorNombre(nombreLimpio)
    if (conNombre) {
      throw new ApiError(409, 'CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre.', {
        campos: ['nombre']
      })
    }
  }

  // Verificar que la especialidad requerida exista si se proporcionó.
  if (especialidadRequeridaId) {
    const especialidad = await repositorio.obtenerEspecialidadPorId(especialidadRequeridaId)
    if (!especialidad) {
      throw new ApiError(404, 'ESPECIALIDAD_NO_ENCONTRADA', 'La especialidad requerida no existe.')
    }
  }

  return repositorio.actualizarCategoria(id, {
    nombre: nombreLimpio,
    descripcion: descripcion ? String(descripcion).trim() : null,
    especialidadRequeridaId: especialidadRequeridaId || null,
    orden: orden ? parseInt(orden, 10) : 0
  })
}

async function desactivarCategoria (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar categorías.')
  }

  const existente = await repositorio.obtenerCategoriaPorId(id)
  if (!existente) {
    throw new ApiError(404, 'CATEGORIA_NO_ENCONTRADA', 'La categoría no existe.')
  }

  // Verificar que no esté en uso.
  const enUso = await repositorio.categoriaEnUso(id)
  if (enUso) {
    throw new ApiError(409, 'CATEGORIA_EN_USO',
      'No se puede desactivar la categoría porque está asociada a solicitudes.')
  }

  const desactivada = await repositorio.desactivarCategoria(id)
  if (!desactivada) {
    throw new ApiError(500, 'ERROR_DESACTIVACION', 'No se pudo desactivar la categoría.')
  }

  return { ok: true, id: desactivada.id }
}

module.exports = {
  listarEspecialidades,
  obtenerEspecialidadPorId,
  crearEspecialidad,
  actualizarEspecialidad,
  desactivarEspecialidad,
  listarCategorias,
  obtenerCategoriaPorId,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria
}
