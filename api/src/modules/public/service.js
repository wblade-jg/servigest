'use strict'

const crypto = require('crypto')
const { pool } = require('../../config/pool')
const { ApiError } = require('../../middlewares/errores')
const { emitir, notificarPrueba } = require('../eventos/emisor')
const repositorio = require('./repository')

// Reglas de negocio del flujo público.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ANIO = () => new Date().getUTCFullYear()

function validarCampos (cuerpo) {
  const faltantes = []
  const obligatorios = ['organizacion', 'contactoNombre', 'contactoEmail', 'contactoTelefono', 'categoriaId', 'descripcion']
  for (const campo of obligatorios) {
    if (!cuerpo[campo] || String(cuerpo[campo]).trim() === '') faltantes.push(campo)
  }
  if (faltantes.length > 0) {
    throw new ApiError(400, 'CAMPOS_FALTANTES', 'Faltan campos obligatorios.', { campos: faltantes })
  }
  if (!EMAIL_RE.test(String(cuerpo.contactoEmail))) {
    throw new ApiError(400, 'EMAIL_INVALIDO', 'El correo de contacto no es válido.', { campos: ['contactoEmail'] })
  }
  const telefono = String(cuerpo.contactoTelefono).trim()
  if (!/^[+()\d\s-]{7,20}$/.test(telefono)) {
    throw new ApiError(400, 'TELEFONO_INVALIDO', 'El teléfono de contacto no es válido.', { campos: ['contactoTelefono'] })
  }
  const descripcion = String(cuerpo.descripcion).trim()
  if (descripcion.length < 20 || descripcion.length > 2000) {
    throw new ApiError(400, 'DESCRIPCION_INVALIDA', 'La descripción debe tener entre 20 y 2000 caracteres.', { campos: ['descripcion'] })
  }
  if (cuerpo.urgenciaDeclarada && !['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].includes(cuerpo.urgenciaDeclarada)) {
    throw new ApiError(400, 'URGENCIA_INVALIDA', 'La urgencia declarada no es válida.', { campos: ['urgenciaDeclarada'] })
  }
}

function generarToken () {
  return crypto.randomBytes(32).toString('base64url')
}

async function crearSolicitudPublica ({ cuerpo, archivos, uploadDir }) {
  validarCampos(cuerpo)

  if (!await repositorio.existeCategoria(cuerpo.categoriaId)) {
    throw new ApiError(400, 'CATEGORIA_INEXISTENTE', 'La categoría indicada no existe o está inactiva.', { campos: ['categoriaId'] })
  }

  const fs = require('fs')
  const path = require('path')
  fs.mkdirSync(uploadDir, { recursive: true })

  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')

    const secuencia = await repositorio.siguienteSecuencia(cliente)
    const codigo = `SOL-${ANIO()}-${String(secuencia).padStart(5, '0')}`
    const token = generarToken()

    const solicitud = await repositorio.insertarSolicitud(cliente, {
      codigo,
      tokenPublico: token,
      origen: 'PUBLICO',
      organizacionNombre: String(cuerpo.organizacion).trim(),
      contactoNombre: String(cuerpo.contactoNombre).trim(),
      contactoEmail: String(cuerpo.contactoEmail).trim(),
      contactoTelefono: String(cuerpo.contactoTelefono).trim(),
      categoriaId: cuerpo.categoriaId,
      descripcion: String(cuerpo.descripcion).trim(),
      ubicacion: cuerpo.ubicacion ? String(cuerpo.ubicacion).trim() : null,
      urgenciaDeclarada: cuerpo.urgenciaDeclarada || null
    })

    for (const archivo of archivos) {
      const nombreFisico = `${crypto.randomUUID()}${archivo.extension}`
      const rutaAbsoluta = path.join(uploadDir, nombreFisico)
      fs.writeFileSync(rutaAbsoluta, archivo.buffer)
      await repositorio.insertarAdjunto(cliente, {
        solicitudId: solicitud.id,
        nombreOriginal: archivo.nombreOriginal,
        ruta: nombreFisico,
        mimeType: archivo.mimeType,
        tamanoBytes: archivo.tamanoBytes
      })
      await repositorio.insertarEvento(cliente, {
        solicitudId: solicitud.id,
        tipo: 'ADJUNTO',
        metadata: { nombreOriginal: archivo.nombreOriginal, mimeType: archivo.mimeType }
      })
    }

    await repositorio.insertarEvento(cliente, {
      solicitudId: solicitud.id,
      tipo: 'CREACION',
      estadoNuevo: 'RECIBIDA',
      metadata: { origen: 'PUBLICO' }
    })

    await cliente.query('COMMIT')

    const datosEvento = {
      solicitudId: solicitud.id,
      codigo: solicitud.codigo,
      estado: solicitud.estado,
      fecha: new Date().toISOString()
    }
    emitir('coordinacion', 'solicitud.creada', datosEvento)
    emitir(`seguimiento:${token}`, 'solicitud.creada', datosEvento)
    notificarPrueba('solicitud.creada', datosEvento)

    return { codigo: solicitud.codigo, token }
  } catch (error) {
    await cliente.query('ROLLBACK')
    // Los archivos ya escritos quedan huérfanos; en P0 es aceptable (disco temporal).
    throw error
  } finally {
    cliente.release()
  }
}

async function obtenerSeguimiento (token) {
  const datos = await repositorio.buscarPorToken(token)
  if (!datos) {
    throw new ApiError(404, 'SEGUIMIENTO_NO_ENCONTRADO', 'No existe una solicitud con ese código de seguimiento.')
  }
  // El payload público nunca incluye contacto, notas, adjuntos ni resolución.
  return {
    codigo: datos.codigo,
    estado: datos.estado,
    prioridad: datos.prioridad,
    fechaCreacion: datos.fechaCreacion,
    fechaObjetivo: datos.fechaObjetivo,
    fechaProgramada: datos.fechaProgramada,
    tecnicoAsignado: datos.tecnicoAsignado
  }
}

module.exports = { crearSolicitudPublica, obtenerSeguimiento, validarCampos, generarToken }
