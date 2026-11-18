'use strict'

const { ApiError } = require('../../middlewares/errores')
const { emitir, notificarPrueba } = require('../eventos/emisor')
const { conTransaccion } = require('../../db/transaccion')
const { EMAIL_RE, generarToken, parsearPaginacion } = require('../../lib/validaciones')
const repositorio = require('./repository')
const repositorioPublico = require('../public/repository')

// Reglas de negocio del ciclo de vida de la solicitud.
// Cada transición se ejecuta en transacción, con bloqueo de fila y auditoría.

const ESTADOS_TERMINALES = ['RECHAZADA', 'CERRADA', 'CANCELADA']
const ESTADOS_CANCELABLES_CLIENTE = ['RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION']
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
const ORIGENES = ['PUBLICO', 'CLIENTE']

// ─── Utilidades ─────────────────────────────────────────────────────────────

function rechazarTransicion (desde, hasta) {
  return new ApiError(409, 'TRANSICION_INVALIDA', `No se puede pasar de ${desde} a ${hasta}.`)
}

function notificarCambio (evento, tipo) {
  const datos = {
    solicitudId: evento.solicitudId,
    codigo: evento.codigo,
    estado: evento.estado,
    fecha: new Date().toISOString()
  }
  emitir('coordinacion', tipo, datos)
  if (evento.tokenPublico) emitir(`seguimiento:${evento.tokenPublico}`, tipo, datos)
  notificarPrueba(tipo, datos)
}

function puedeVer (usuario, solicitud) {
  if (usuario.rol === 'ADMIN' || usuario.rol === 'COORDINADOR') return true
  if (usuario.rol === 'TECNICO') return solicitud.tecnicoId === usuario.id
  if (usuario.rol === 'CLIENTE') return solicitud.organizacionId === usuario.organizacionId
  return false
}

function asegurarVisible (usuario, solicitud) {
  if (!solicitud || !puedeVer(usuario, solicitud)) {
    // Ante un recurso ajeno se responde 404 para no revelar su existencia.
    throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
  }
}

function esInterno (usuario) {
  return usuario.rol === 'ADMIN' || usuario.rol === 'COORDINADOR'
}

function textoObligatorio (valor, campo, code, message) {
  const texto = String(valor || '').trim()
  if (texto.length < 5) {
    throw new ApiError(400, code, message, { campos: [campo] })
  }
  return texto
}

// ─── Listado y detalle ──────────────────────────────────────────────────────

function parsearFiltros (query) {
  const filtros = parsearPaginacion(query, 20, 100)
  if (query.estado && ['RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA', 'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA'].includes(query.estado)) {
    filtros.estado = query.estado
  }
  if (query.prioridad && PRIORIDADES.includes(query.prioridad)) filtros.prioridad = query.prioridad
  if (query.origen && ORIGENES.includes(query.origen)) filtros.origen = query.origen
  if (query.categoriaId) filtros.categoriaId = query.categoriaId
  if (query.tecnicoId) filtros.tecnicoId = query.tecnicoId
  if (query.desde && !Number.isNaN(Date.parse(query.desde))) filtros.desde = query.desde
  if (query.hasta && !Number.isNaN(Date.parse(query.hasta))) filtros.hasta = query.hasta
  if (query.q && String(query.q).trim()) filtros.q = String(query.q).trim()
  if (query.orden && ['creacion-asc', 'creacion-desc'].includes(query.orden)) filtros.orden = query.orden
  return filtros
}

async function listar (usuario, query) {
  const filtros = parsearFiltros(query)
  const { data, total } = await repositorio.listar({ usuario, filtros })
  return { data, page: filtros.page, limit: filtros.limit, total }
}

async function obtenerDetalle (usuario, id) {
  const solicitud = await repositorio.obtenerPorId(id)
  asegurarVisible(usuario, solicitud)
  return solicitud
}

// ─── Creación (origen CLIENTE o PUBLICO por internos) ───────────────────────

function validarCampos (cuerpo) {
  const faltantes = []
  const obligatorios = ['contactoNombre', 'contactoEmail', 'contactoTelefono', 'categoriaId', 'descripcion']
  for (const campo of obligatorios) {
    if (!cuerpo[campo] || String(cuerpo[campo]).trim() === '') faltantes.push(campo)
  }
  if (faltantes.length > 0) {
    throw new ApiError(400, 'CAMPOS_FALTANTES', 'Faltan campos obligatorios.', { campos: faltantes })
  }
  if (!EMAIL_RE.test(String(cuerpo.contactoEmail).trim())) {
    throw new ApiError(400, 'EMAIL_INVALIDO', 'El correo de contacto no es válido.', { campos: ['contactoEmail'] })
  }
  const descripcion = String(cuerpo.descripcion).trim()
  if (descripcion.length < 20 || descripcion.length > 2000) {
    throw new ApiError(400, 'DESCRIPCION_INVALIDA', 'La descripción debe tener entre 20 y 2000 caracteres.', { campos: ['descripcion'] })
  }
  if (cuerpo.urgenciaDeclarada && !PRIORIDADES.includes(cuerpo.urgenciaDeclarada)) {
    throw new ApiError(400, 'URGENCIA_INVALIDA', 'La urgencia declarada no es válida.', { campos: ['urgenciaDeclarada'] })
  }
}

async function crearSolicitud (usuario, cuerpo) {
  validarCampos(cuerpo)
  if (!await repositorioPublico.existeCategoria(cuerpo.categoriaId)) {
    throw new ApiError(400, 'CATEGORIA_INEXISTENTE', 'La categoría indicada no existe o está inactiva.', { campos: ['categoriaId'] })
  }

  // Origen: los internos registran requerimientos como públicos (visitante);
  // el Cliente siempre crea para su propia organización.
  const origen = esInterno(usuario) ? 'PUBLICO' : 'CLIENTE'
  const organizacionNombre = origen === 'PUBLICO'
    ? String(cuerpo.organizacion || '').trim()
    : null
  if (origen === 'PUBLICO' && !organizacionNombre) {
    throw new ApiError(400, 'CAMPOS_FALTANTES', 'El nombre de la organización es obligatorio.', { campos: ['organizacion'] })
  }

  return conTransaccion(async (cliente) => {
    const secuencia = await repositorioPublico.siguienteSecuencia(cliente)
    const codigo = `SOL-${new Date().getUTCFullYear()}-${String(secuencia).padStart(5, '0')}`
    const token = generarToken()

    const solicitud = await repositorioPublico.insertarSolicitud(cliente, {
      codigo,
      tokenPublico: token,
      origen,
      organizacionId: origen === 'CLIENTE' ? usuario.organizacionId : null,
      organizacionNombre,
      createdBy: usuario.id,
      contactoNombre: String(cuerpo.contactoNombre).trim(),
      contactoEmail: String(cuerpo.contactoEmail).trim(),
      contactoTelefono: String(cuerpo.contactoTelefono).trim(),
      categoriaId: cuerpo.categoriaId,
      descripcion: String(cuerpo.descripcion).trim(),
      ubicacion: cuerpo.ubicacion ? String(cuerpo.ubicacion).trim() : null,
      urgenciaDeclarada: cuerpo.urgenciaDeclarada || null
    })

    await repositorio.insertarEvento(cliente, {
      solicitudId: solicitud.id,
      actorId: usuario.id,
      tipo: 'CREACION',
      estadoNuevo: 'RECIBIDA',
      metadata: { origen }
    })

    notificarCambio({ ...solicitud, tokenPublico: token }, 'solicitud.creada')
    return { id: solicitud.id, codigo: solicitud.codigo, token, estado: solicitud.estado }
  })
}

// ─── Máquina de Estados: Configuración Declarativa ──────────────────────────

const TRANSICIONES = {
  'RECIBIDA:EN_REVISION': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'CAMBIO_ESTADO',
    aplicar: async ({ solicitud, usuario, cuerpo, cliente }) => {
      if (cuerpo?.nota) {
        const contenido = textoObligatorio(cuerpo.nota, 'nota', 'NOTA_INVALIDA',
          'La nota debe tener al menos 5 caracteres.')
        const notaCreada = await repositorio.insertarNota(cliente, {
          solicitudId: solicitud.id,
          autorId: usuario.id,
          tipo: 'INTERNA',
          contenido
        })
        await repositorio.insertarEvento(cliente, {
          solicitudId: solicitud.id,
          actorId: usuario.id,
          tipo: 'NOTA',
          metadata: { notaId: notaCreada.id, tipoNota: 'INTERNA' }
        })
      }
      return { cambios: {}, metadata: {} }
    }
  },

  'EN_REVISION:REQUIERE_INFORMACION': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'CAMBIO_ESTADO',
    validar: (cuerpo) => {
      textoObligatorio(cuerpo?.nota, 'nota', 'NOTA_OBLIGATORIA',
        'La solicitud de información requiere una nota interna.')
    },
    aplicar: async ({ solicitud, usuario, cuerpo, cliente }) => {
      const contenido = cuerpo.nota.trim()
      const notaCreada = await repositorio.insertarNota(cliente, {
        solicitudId: solicitud.id,
        autorId: usuario.id,
        tipo: 'SOLICITUD_INFORMACION',
        contenido
      })
      await repositorio.insertarEvento(cliente, {
        solicitudId: solicitud.id,
        actorId: usuario.id,
        tipo: 'NOTA',
        metadata: { notaId: notaCreada.id, tipoNota: 'SOLICITUD_INFORMACION' }
      })
      return { cambios: {}, metadata: {} }
    }
  },

  'REQUIERE_INFORMACION:EN_REVISION': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'CAMBIO_ESTADO',
    validar: (cuerpo) => {
      textoObligatorio(cuerpo?.nota, 'nota', 'NOTA_OBLIGATORIA',
        'Registra la gestión realizada para volver a revisión.')
    },
    aplicar: async ({ solicitud, usuario, cuerpo, cliente }) => {
      const contenido = cuerpo.nota.trim()
      const notaCreada = await repositorio.insertarNota(cliente, {
        solicitudId: solicitud.id,
        autorId: usuario.id,
        tipo: 'INTERNA',
        contenido
      })
      await repositorio.insertarEvento(cliente, {
        solicitudId: solicitud.id,
        actorId: usuario.id,
        tipo: 'NOTA',
        metadata: { notaId: notaCreada.id, tipoNota: 'INTERNA' }
      })
      return { cambios: {}, metadata: {} }
    }
  },

  'EN_REVISION:APROBADA': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'APROBACION',
    validar: (cuerpo, solicitud) => {
      const prioridad = cuerpo?.prioridad
      if (!prioridad || !PRIORIDADES.includes(prioridad)) {
        throw new ApiError(400, 'PRIORIDAD_OBLIGATORIA', 'La prioridad es obligatoria al aprobar.', {
          campos: ['prioridad']
        })
      }
      if (solicitud.origen === 'PUBLICO') {
        const constancia = String(cuerpo?.constanciaAceptacion || '').trim()
        if (!constancia) {
          throw new ApiError(422, 'CONSTANCIA_REQUERIDA',
            'Aprobar una solicitud pública exige la constancia de aceptación del cliente.', {
              campos: ['constanciaAceptacion']
            })
        }
      }
    },
    aplicar: async ({ solicitud, usuario, cuerpo, cliente }) => {
      const horas = await repositorio.obtenerSlaRegla(cliente, cuerpo.prioridad)
      if (!horas) {
        throw new ApiError(400, 'PRIORIDAD_INVALIDA', 'No existe una regla SLA para esa prioridad.')
      }
      const aprobadaEn = new Date()
      const fechaObjetivo = new Date(aprobadaEn.getTime() + horas * 3600 * 1000)
      const constanciaAceptacion = solicitud.origen === 'PUBLICO'
        ? String(cuerpo.constanciaAceptacion).trim()
        : null

      const cambios = {
        prioridad: cuerpo.prioridad,
        fechaObjetivo: fechaObjetivo.toISOString(),
        aprobadaPor: usuario.id,
        aprobadaEn: aprobadaEn.toISOString(),
        constanciaAceptacion
      }

      return {
        cambios,
        metadata: {
          prioridad: cuerpo.prioridad,
          horasSla: horas,
          fechaObjetivo: cambios.fechaObjetivo
        },
        extrasRespuesta: {
          prioridad: cuerpo.prioridad,
          fechaObjetivo: cambios.fechaObjetivo
        }
      }
    }
  },

  'EN_REVISION:RECHAZADA': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'RECHAZO',
    validar: (cuerpo) => {
      textoObligatorio(cuerpo?.motivo, 'motivo', 'MOTIVO_OBLIGATORIO',
        'El rechazo requiere un motivo de al menos 5 caracteres.')
    },
    aplicar: async ({ cuerpo }) => {
      const motivo = cuerpo.motivo.trim()
      return {
        cambios: { rechazadaMotivo: motivo },
        metadata: { motivo }
      }
    }
  },

  'REQUIERE_INFORMACION:RECHAZADA': {
    roles: ['ADMIN', 'COORDINADOR'],
    tipoEvento: 'RECHAZO',
    validar: (cuerpo) => {
      textoObligatorio(cuerpo?.motivo, 'motivo', 'MOTIVO_OBLIGATORIO',
        'El rechazo requiere un motivo de al menos 5 caracteres.')
    },
    aplicar: async ({ cuerpo }) => {
      const motivo = cuerpo.motivo.trim()
      return {
        cambios: { rechazadaMotivo: motivo },
        metadata: { motivo }
      }
    }
  }
}

// Cancelación: permitida desde cualquier estado no terminal con guardas de rol.
const TRANSICION_CANCELAR = {
  roles: ['ADMIN', 'COORDINADOR', 'CLIENTE'],
  tipoEvento: 'CANCELACION',
  guard: (solicitud, usuario) => {
    if (ESTADOS_TERMINALES.includes(solicitud.estado)) {
      throw rechazarTransicion(solicitud.estado, 'CANCELADA')
    }
    if (usuario.rol === 'CLIENTE') {
      if (solicitud.organizacionId !== usuario.organizacionId) {
        throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
      }
      if (!ESTADOS_CANCELABLES_CLIENTE.includes(solicitud.estado)) {
        throw new ApiError(403, 'CANCELACION_NO_PERMITIDA',
          'Una solicitud ya aprobada o finalizada no puede cancelarse.')
      }
    } else if (!esInterno(usuario)) {
      throw new ApiError(403, 'ROL_NO_AUTORIZADO', 'Tu rol no permite esta operación.')
    }
  },
  validar: (cuerpo) => {
    textoObligatorio(cuerpo?.motivo, 'motivo', 'MOTIVO_OBLIGATORIO',
      'La cancelación requiere un motivo de al menos 5 caracteres.')
  },
  aplicar: async ({ cuerpo }) => {
    const motivo = cuerpo.motivo.trim()
    return {
      cambios: { canceladaMotivo: motivo },
      metadata: { motivo }
    }
  }
}

// ─── Motor de Transición Unificado ──────────────────────────────────────────

async function transicionarEstado (usuario, solicitudId, estadoDestino, cuerpo = {}) {
  let eventoPostCommit = null

  const resultado = await conTransaccion(async (cliente) => {
    const solicitud = await repositorio.bloquearPorId(cliente, solicitudId)
    if (!solicitud) {
      throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
    }

    const desde = solicitud.estado
    const clave = `${desde}:${estadoDestino}`
    const regla = TRANSICIONES[clave] || (estadoDestino === 'CANCELADA' ? TRANSICION_CANCELAR : null)

    if (!regla) {
      throw rechazarTransicion(desde, estadoDestino)
    }

    if (!regla.roles.includes(usuario.rol)) {
      throw new ApiError(403, 'ROL_NO_AUTORIZADO', 'Tu rol no permite esta operación.')
    }

    if (regla.guard) {
      regla.guard(solicitud, usuario, cuerpo)
    }

    if (regla.validar) {
      regla.validar(cuerpo, solicitud)
    }

    const { cambios = {}, metadata = {}, extrasRespuesta = {} } = await regla.aplicar({
      solicitud,
      usuario,
      cuerpo,
      cliente
    })

    const solicitudActualizada = await repositorio.aplicarTransicion(cliente, solicitudId, {
      estado: estadoDestino,
      ...cambios
    })

    await repositorio.insertarEvento(cliente, {
      solicitudId,
      actorId: usuario.id,
      tipo: regla.tipoEvento,
      estadoAnterior: desde,
      estadoNuevo: estadoDestino,
      metadata: metadata || {}
    })

    eventoPostCommit = {
      solicitudId,
      codigo: solicitudActualizada.codigo,
      estado: estadoDestino,
      estadoAnterior: desde,
      tokenPublico: solicitud.tokenPublico,
      ...extrasRespuesta
    }

    return eventoPostCommit
  })

  // Efecto secundario SSE estrictamente POST-COMMIT
  notificarCambio(
    {
      solicitudId: resultado.solicitudId,
      codigo: resultado.codigo,
      estado: resultado.estado,
      tokenPublico: resultado.tokenPublico
    },
    'solicitud.estado'
  )

  const { tokenPublico, ...respuesta } = resultado
  return respuesta
}

// Métodos de conveniencia delegados al motor de transición
async function ponerEnRevision (usuario, solicitudId, extras) {
  return transicionarEstado(usuario, solicitudId, 'EN_REVISION', extras)
}

async function solicitarInformacion (usuario, solicitudId, extras) {
  return transicionarEstado(usuario, solicitudId, 'REQUIERE_INFORMACION', extras)
}

async function aprobar (usuario, solicitudId, extras) {
  return transicionarEstado(usuario, solicitudId, 'APROBADA', extras)
}

async function rechazar (usuario, solicitudId, extras) {
  return transicionarEstado(usuario, solicitudId, 'RECHAZADA', extras)
}

async function cancelar (usuario, solicitudId, extras) {
  return transicionarEstado(usuario, solicitudId, 'CANCELADA', extras)
}

// Regenera el token público. Solo Admin. Devuelve el nuevo token y audita.
async function regenerarToken (usuario, solicitudId) {
  return conTransaccion(async (cliente) => {
    const solicitud = await repositorio.bloquearPorId(cliente, solicitudId)
    if (!solicitud) {
      throw new ApiError(404, 'SOLICITUD_NO_ENCONTRADA', 'La solicitud no existe.')
    }
    const token = generarToken()
    await repositorio.actualizarToken(cliente, solicitudId, token)
    await repositorio.insertarEvento(cliente, {
      solicitudId,
      actorId: usuario.id,
      tipo: 'REGENERACION_TOKEN',
      metadata: { origen: solicitud.origen }
    })
    return { solicitudId, codigo: solicitud.codigo, token }
  })
}

// ─── Notas ──────────────────────────────────────────────────────────────────

async function agregarNota (usuario, solicitudId, cuerpo) {
  const solicitud = await repositorio.obtenerPorId(solicitudId)
  asegurarVisible(usuario, solicitud)
  const tipo = cuerpo?.tipo === 'SOLICITUD_INFORMACION' ? 'SOLICITUD_INFORMACION' : 'INTERNA'
  const contenido = textoObligatorio(cuerpo?.contenido, 'contenido', 'NOTA_OBLIGATORIA',
    'La nota no puede estar vacía.')

  return conTransaccion(async (cliente) => {
    const nota = await repositorio.insertarNota(cliente, {
      solicitudId, autorId: usuario.id, tipo, contenido
    })
    await repositorio.insertarEvento(cliente, {
      solicitudId,
      actorId: usuario.id,
      tipo: 'NOTA',
      metadata: { notaId: nota.id, tipoNota: tipo }
    })
    return nota
  })
}

async function listarNotas (usuario, solicitudId) {
  const solicitud = await repositorio.obtenerPorId(solicitudId)
  asegurarVisible(usuario, solicitud)
  return repositorio.listarNotas(solicitudId)
}

async function listarEventos (usuario, solicitudId) {
  const solicitud = await repositorio.obtenerPorId(solicitudId)
  asegurarVisible(usuario, solicitud)
  if (!esInterno(usuario)) {
    // El historial de auditoría es interno; el Cliente y el Técnico no lo ven.
    throw new ApiError(403, 'ROL_NO_AUTORIZADO', 'Tu rol no permite esta operación.')
  }
  return repositorio.listarEventos(solicitudId)
}

module.exports = {
  listar,
  obtenerDetalle,
  crearSolicitud,
  transicionarEstado,
  ponerEnRevision,
  solicitarInformacion,
  aprobar,
  rechazar,
  cancelar,
  regenerarToken,
  agregarNota,
  listarNotas,
  listarEventos,
  puedeVer
}
