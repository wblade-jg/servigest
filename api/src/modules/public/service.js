import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { conTransaccion } from '../../db/transaccion.js'
import { ApiError } from '../../middlewares/errores.js'
import { emitir, notificarPrueba } from '../eventos/emisor.js'
import { EMAIL_RE, generarToken } from '../../lib/validaciones.js'
import * as repositorio from './repository.js'

// Reglas de negocio del flujo público.

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

async function listarCategoriasActivas () {
  return repositorio.listarCategoriasActivas()
}

async function crearSolicitudPublica ({ cuerpo, archivos, uploadDir }) {
  validarCampos(cuerpo)

  if (!await repositorio.existeCategoria(cuerpo.categoriaId)) {
    throw new ApiError(400, 'CATEGORIA_INEXISTENTE', 'La categoría indicada no existe o está inactiva.', { campos: ['categoriaId'] })
  }

  fs.mkdirSync(uploadDir, { recursive: true })

  const resultado = await conTransaccion(async (cliente) => {
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

    return { solicitud, token }
  })

  const datosEvento = {
    solicitudId: resultado.solicitud.id,
    codigo: resultado.solicitud.codigo,
    estado: resultado.solicitud.estado,
    fecha: new Date().toISOString()
  }
  emitir('coordinacion', 'solicitud.creada', datosEvento)
  emitir(`seguimiento:${resultado.token}`, 'solicitud.creada', datosEvento)
  notificarPrueba('solicitud.creada', datosEvento)

  return { codigo: resultado.solicitud.codigo, token: resultado.token }
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

export {
  crearSolicitudPublica,
  obtenerSeguimiento,
  listarCategoriasActivas,
  validarCampos,
  generarToken
}
