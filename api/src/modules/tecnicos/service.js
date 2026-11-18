import { ApiError } from '../../middlewares/errores.js'
import { conTransaccion } from '../../db/transaccion.js'
import { parsearPaginacion } from '../../lib/validaciones.js'
import * as repositorio from './repository.js'
import * as repositorioUsuarios from '../usuarios/repository.js'

// Reglas de negocio de técnicos.

// Listar técnicos con filtros y paginación.
async function listar (usuario, { especialidadId, q, page = 1, limit = 20, orden = 'creacion-desc' }) {
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COORDINADOR') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores y coordinadores pueden listar técnicos.')
  }

  const { page: p, limit: l } = parsearPaginacion({ page, limit })
  const filtros = {
    especialidadId: especialidadId || null,
    q: q || null,
    page: p,
    limit: l,
    orden
  }

  const { data, total } = await repositorio.listar({ filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

// Obtener técnico por ID.
async function obtenerPorId (usuario, id) {
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COORDINADOR') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores y coordinadores pueden consultar técnicos.')
  }

  const tecnico = await repositorio.obtenerPorId(id)
  if (!tecnico) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  return tecnico
}

// Habilitar usuario como técnico.
async function habilitar (usuario, { usuarioId, notas }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden habilitar técnicos.')
  }

  // Verificar que el usuario existe y tiene rol TECNICO.
  const usuarioExistente = await repositorioUsuarios.obtenerPorId(usuarioId)
  if (!usuarioExistente) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario no existe.')
  }

  if (usuarioExistente.rol !== 'TECNICO') {
    throw new ApiError(400, 'ROL_INCORRECTO', 'El usuario debe tener rol TECNICO para ser habilitado.', {
      rolActual: usuarioExistente.rol
    })
  }

  return repositorio.crear({ usuarioId, notas })
}

// Actualizar técnico.
async function actualizar (usuario, id, { notas }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar técnicos.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  const actualizado = await repositorio.actualizar(id, { notas })
  return actualizado
}

// Desactivar técnico.
async function desactivar (usuario, id) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar técnicos.')
  }

  const existente = await repositorio.obtenerPorId(id)
  if (!existente) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  const desactivado = await repositorio.desactivar(id)
  if (!desactivado) {
    throw new ApiError(500, 'ERROR_DESACTIVACION', 'No se pudo desactivar el técnico.')
  }

  return { ok: true, id: desactivado.id }
}

// Asignar especialidades (PUT - reemplaza el conjunto completo).
async function asignarEspecialidades (usuario, tecnicoId, especialidadIds) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden asignar especialidades.')
  }

  const existente = await repositorio.obtenerPorId(tecnicoId)
  if (!existente) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  return conTransaccion(async (cliente) => {
    return repositorio.asignarEspecialidades(cliente, tecnicoId, especialidadIds)
  })
}

// --- Disponibilidad ---

function validarFranja ({ diaSemana, horaInicio, horaFin }) {
  const dia = parseInt(diaSemana, 10)
  if (isNaN(dia) || dia < 1 || dia > 7) {
    throw new ApiError(400, 'DIA_INVALIDO', 'El día de la semana debe ser un número entre 1 (lunes) y 7 (domingo).', {
      campos: ['diaSemana']
    })
  }

  const patronHora = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
  if (!patronHora.test(horaInicio) || !patronHora.test(horaFin)) {
    throw new ApiError(400, 'HORA_INVALIDA', 'Las horas deben tener formato HH:MM.', {
      campos: ['horaInicio', 'horaFin']
    })
  }

  if (horaFin <= horaInicio) {
    throw new ApiError(400, 'FRANJA_INVALIDA', 'La hora de fin debe ser posterior a la hora de inicio.', {
      campos: ['horaFin']
    })
  }

  return { dia, horaInicio, horaFin }
}

// Listar disponibilidad de un técnico.
async function listarDisponibilidad (usuario, tecnicoId) {
  if (usuario.rol !== 'ADMIN' && usuario.rol !== 'COORDINADOR') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores y coordinadores pueden consultar disponibilidad.')
  }

  const tecnico = await repositorio.obtenerPorId(tecnicoId)
  if (!tecnico) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  return repositorio.listarDisponibilidad(tecnicoId)
}

// Crear franja de disponibilidad.
async function crearDisponibilidad (usuario, tecnicoId, { diaSemana, horaInicio, horaFin }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden crear disponibilidad.')
  }

  const tecnico = await repositorio.obtenerPorId(tecnicoId)
  if (!tecnico) {
    throw new ApiError(404, 'TECNICO_NO_ENCONTRADO', 'El técnico no existe.')
  }

  const { dia } = validarFranja({ diaSemana, horaInicio, horaFin })

  const solapamiento = await repositorio.verificarSolapamiento({
    tecnicoId,
    diaSemana: dia,
    horaInicio,
    horaFin
  })

  if (solapamiento) {
    throw new ApiError(409, 'FRANJA_SOLAPADA', 'La franja horaria se solapa con otra existente.')
  }

  return repositorio.crearDisponibilidad({
    tecnicoId,
    diaSemana: dia,
    horaInicio,
    horaFin
  })
}

// Actualizar franja de disponibilidad.
async function actualizarDisponibilidad (usuario, franjaId, { diaSemana, horaInicio, horaFin }) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden actualizar disponibilidad.')
  }

  const { dia } = validarFranja({ diaSemana, horaInicio, horaFin })

  const tecnicoId = await repositorio.obtenerTecnicoIdDeFranja(franjaId)
  if (!tecnicoId) {
    throw new ApiError(404, 'FRANJA_NO_ENCONTRADA', 'La franja de disponibilidad no existe.')
  }

  const solapamiento = await repositorio.verificarSolapamiento({
    tecnicoId,
    diaSemana: dia,
    horaInicio,
    horaFin,
    excluirId: franjaId
  })

  if (solapamiento) {
    throw new ApiError(409, 'FRANJA_SOLAPADA', 'La franja horaria se solapa con otra existente.')
  }

  const actualizada = await repositorio.actualizarDisponibilidad(franjaId, {
    diaSemana: dia,
    horaInicio,
    horaFin
  })

  return actualizada
}

// Desactivar franja de disponibilidad.
async function desactivarDisponibilidad (usuario, franjaId) {
  if (usuario.rol !== 'ADMIN') {
    throw new ApiError(403, 'ACCESO_DENEGADO', 'Solo administradores pueden desactivar disponibilidad.')
  }

  const desactivada = await repositorio.desactivarDisponibilidad(franjaId)
  if (!desactivada) {
    throw new ApiError(404, 'FRANJA_NO_ENCONTRADA', 'La franja de disponibilidad no existe.')
  }

  return { ok: true, id: desactivada.id }
}

export {
  listar,
  obtenerPorId,
  habilitar,
  actualizar,
  desactivar,
  asignarEspecialidades,
  listarDisponibilidad,
  crearDisponibilidad,
  actualizarDisponibilidad,
  desactivarDisponibilidad
}
