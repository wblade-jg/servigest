'use strict'

const { ApiError } = require('../../middlewares/errores')
const servicio = require('./service')
const { detectarMime, MIME_PERMITIDOS, TAMANO_MAX, MAX_ADJUNTOS, sanitizarNombre, extensionDe } = require('./mime')

// Handlers del módulo público.

async function getCategorias (req, res, siguiente) {
  try {
    const filas = await servicio.listarCategoriasActivas()
    res.json({ data: filas })
  } catch (error) { siguiente(error) }
}

async function postSolicitud (req, res, siguiente) {
  try {
    const archivos = []
    for (const archivo of req.files || []) {
      if (archivo.size > TAMANO_MAX) {
        throw new ApiError(400, 'ADJUNTO_GRANDE', `El archivo "${sanitizarNombre(archivo.originalname)}" supera el máximo de 5 MB.`)
      }
      const mimeReal = detectarMime(archivo.buffer)
      if (!mimeReal || !MIME_PERMITIDOS.has(mimeReal)) {
        throw new ApiError(400, 'ADJUNTO_NO_PERMITIDO', `El archivo "${sanitizarNombre(archivo.originalname)}" no es jpg, png ni pdf válido.`)
      }
      archivos.push({
        buffer: archivo.buffer,
        nombreOriginal: sanitizarNombre(archivo.originalname),
        mimeType: mimeReal,
        tamanoBytes: archivo.size,
        extension: extensionDe(mimeReal)
      })
    }
    if (archivos.length > MAX_ADJUNTOS) {
      throw new ApiError(400, 'DEMASIADOS_ADJUNTOS', `Se permiten como máximo ${MAX_ADJUNTOS} archivos.`)
    }

    const resultado = await servicio.crearSolicitudPublica({
      cuerpo: req.body,
      archivos,
      uploadDir: req.app.locals.uploadDir
    })
    res.status(201).json(resultado)
  } catch (error) { siguiente(error) }
}

async function getSeguimiento (req, res, siguiente) {
  try {
    const datos = await servicio.obtenerSeguimiento(req.params.token)
    res.json(datos)
  } catch (error) { siguiente(error) }
}

// SSE de seguimiento público: solo cambios de estado y coordinación.
function getSeguimientoSse (req, res) {
  const canal = `seguimiento:${req.params.token}`
  req.app.locals.eventos.suscribir(canal, res)
  req.on('close', () => { /* el emisor limpia al cerrar */ })
}

module.exports = { getCategorias, postSolicitud, getSeguimiento, getSeguimientoSse }
