import { ApiError } from '../../middlewares/errores.js'
import { emitir, notificarPrueba } from '../eventos/emisor.js'
import { conTransaccion } from '../../db/transaccion.js'
import * as repositorio from './repository.js'
import * as repositorioSolicitudes from '../solicitudes/repository.js'

// Reglas de negocio de las intervenciones del técnico.
// Iniciar: ASIGNADA → EN_PROCESO. Resolver: EN_PROCESO → RESUELTA.
// El cierre (RESUELTA → CERRADA) vive en el motor de transiciones de solicitudes.

const UID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const MINIMO_TEXTO = 10

// ─── Utilidades ─────────────────────────────────────────────────────────────

function asegurarIdValido (id, mensaje) {
  if (!UID_RE.test(id || '')) {
    throw new ApiError(404, mensaje, 'El recurso solicitado no existe.')
  }
}

function textoMinimo (valor, campo, code, message) {
  const texto = String(valor || '').trim()
  if (texto.length < MINIMO_TEXTO) {
    throw new ApiError(400, code, message, { campos: [campo] })
  }
  return texto
}

function notificarIntervencion (evento, tipo) {
  const datos = {
    solicitudId: evento.solicitudId,
    codigo: evento.codigo,
    intervencionId: evento.intervencionId,
    tecnicoId: evento.tecnicoId,
    estado: evento.estado,
    fecha: new Date().toISOString()
  }
  emitir('coordinacion', tipo, datos)
  emitir('tecnico', tipo, datos)
  notificarPrueba(tipo, datos)
}

// La intervención es exclusiva del técnico asignado: cualquier otro rol o un
// técnico distinto no accede (403), y un recurso ajeno se oculta con 404.
function asegurarTecnicoAsignado (usuario, solicitud) {
  if (!solicitud || usuario.rol !== 'TECNICO' || solicitud.tecnicoId !== usuario.id) {
    throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
  }
}

// ─── Iniciar intervención (ASIGNADA → EN_PROCESO) ───────────────────────────

async function iniciar (usuario, solicitudId) {
  asegurarIdValido(solicitudId, 'SOLICITUD_NO_ENCONTRADA')

  const resultado = await conTransaccion(async (cliente) => {
    const solicitud = await repositorioSolicitudes.bloquearPorId(cliente, solicitudId)
    asegurarTecnicoAsignado(usuario, solicitud)

    if (solicitud.estado !== 'ASIGNADA') {
      throw new ApiError(409, 'TRANSICION_INVALIDA',
        `Solo una solicitud ASIGNADA puede iniciar una intervención (estado actual: ${solicitud.estado}).`)
    }

    const intervencion = await repositorio.insertarAbierta(cliente, {
      solicitudId,
      tecnicoId: usuario.id
    })

    await repositorioSolicitudes.aplicarTransicion(cliente, solicitudId, {
      estado: 'EN_PROCESO'
    })

    await repositorioSolicitudes.insertarEvento(cliente, {
      solicitudId,
      actorId: usuario.id,
      tipo: 'INTERVENCION_INICIO',
      estadoAnterior: 'ASIGNADA',
      estadoNuevo: 'EN_PROCESO',
      metadata: { intervencionId: intervencion.id }
    })

    return {
      intervencionId: intervencion.id,
      solicitudId,
      inicio: intervencion.inicio,
      estado: 'EN_PROCESO',
      tecnicoId: usuario.id,
      codigo: solicitud.codigo
    }
  })

  notificarIntervencion({ ...resultado, solicitudId }, 'intervencion.iniciada')
  return resultado
}

// ─── Resolver intervención (EN_PROCESO → RESUELTA) ──────────────────────────

function validarResolucion (cuerpo, intervencion) {
  const finMs = new Date(cuerpo?.fin || '').getTime()
  if (!cuerpo?.fin || isNaN(finMs)) {
    throw new ApiError(400, 'FIN_OBLIGATORIA', 'La fecha y hora de fin es obligatoria y debe ser válida.', {
      campos: ['fin']
    })
  }
  const fin = new Date(finMs).toISOString()
  if (finMs <= new Date(intervencion.inicio).getTime()) {
    throw new ApiError(422, 'FIN_ANTES_DE_INICIO', 'La fecha de fin debe ser posterior al inicio de la intervención.', {
      campos: ['fin']
    })
  }

  const diagnostico = textoMinimo(cuerpo.diagnostico, 'diagnostico', 'DIAGNOSTICO_INVALIDO',
    'El diagnóstico debe tener al menos 10 caracteres.')
  const actividades = textoMinimo(cuerpo.actividades, 'actividades', 'ACTIVIDADES_INVALIDAS',
    'Las actividades deben tener al menos 10 caracteres.')
  const resultado = textoMinimo(cuerpo.resultado, 'resultado', 'RESULTADO_INVALIDO',
    'El resultado debe tener al menos 10 caracteres.')
  const observaciones = cuerpo.observaciones ? String(cuerpo.observaciones).trim() : null

  return { fin, diagnostico, actividades, resultado, observaciones }
}

async function resolver (usuario, intervencionId, cuerpo) {
  asegurarIdValido(intervencionId, 'INTERVENCION_NO_ENCONTRADA')

  const resultado = await conTransaccion(async (cliente) => {
    const intervencion = await repositorio.bloquearPorId(cliente, intervencionId)
    if (!intervencion || usuario.rol !== 'TECNICO' || intervencion.tecnicoId !== usuario.id) {
      // Recurso ajeno o sin permiso: se oculta con 404.
      throw new ApiError(404, 'INTERVENCION_NO_ENCONTRADA', 'La intervención no existe.')
    }

    if (intervencion.fin) {
      throw new ApiError(409, 'INTERVENCION_CERRADA', 'La intervención ya fue resuelta.')
    }
    if (intervencion.estadoSolicitud !== 'EN_PROCESO') {
      throw new ApiError(409, 'TRANSICION_INVALIDA',
        `Solo una intervención de una solicitud EN_PROCESO puede resolverse (estado actual: ${intervencion.estadoSolicitud}).`)
    }

    const datos = validarResolucion(cuerpo, intervencion)
    const { rows: filasSolicitud } = await cliente.query(
      'SELECT codigo FROM solicitudes WHERE id = $1',
      [intervencion.solicitudId]
    )
    const cerrada = await repositorio.cerrar(cliente, intervencionId, datos)
    if (!cerrada) {
      throw new ApiError(409, 'INTERVENCION_CERRADA', 'La intervención ya fue resuelta.')
    }

    // La resolución queda documentada en la solicitud.
    await repositorioSolicitudes.aplicarTransicion(cliente, intervencion.solicitudId, {
      estado: 'RESUELTA',
      resolucion: datos.resultado,
      resueltaEn: datos.fin
    })

    await repositorioSolicitudes.insertarEvento(cliente, {
      solicitudId: intervencion.solicitudId,
      actorId: usuario.id,
      tipo: 'INTERVENCION_FIN',
      estadoAnterior: 'EN_PROCESO',
      estadoNuevo: 'RESUELTA',
      metadata: {
        intervencionId,
        diagnostico: datos.diagnostico,
        resultado: datos.resultado
      }
    })

    return {
      id: intervencionId,
      solicitudId: intervencion.solicitudId,
      codigo: filasSolicitud[0]?.codigo || null,
      tecnicoId: usuario.id,
      fin: datos.fin,
      estado: 'RESUELTA',
      resolucion: datos.resultado
    }
  })

  notificarIntervencion(resultado, 'intervencion.resuelta')
  return resultado
}

// ─── Listado ────────────────────────────────────────────────────────────────

// ADMIN/COORDINADOR: todas. TÉCNICO: todas las de sus solicitudes asignadas.
// CLIENTE: sin acceso (no ve historial de intervenciones).
async function listar (usuario, solicitudId) {
  asegurarIdValido(solicitudId, 'SOLICITUD_NO_ENCONTRADA')

  if (usuario.rol === 'CLIENTE') {
    throw new ApiError(403, 'ROL_NO_AUTORIZADO', 'Tu rol no permite esta operación.')
  }

  const solicitud = await repositorioSolicitudes.obtenerPorId(solicitudId)
  if (!solicitud) {
    throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
  }
  if (usuario.rol === 'TECNICO') {
    asegurarTecnicoAsignado(usuario, solicitud)
  }

  return repositorio.listarPorSolicitud(solicitudId)
}

export {
  iniciar,
  resolver,
  listar
}
