'use strict'

const express = require('express')
const multer = require('multer')
const { crearLimitador } = require('../../middlewares/limitador')
const controller = require('./controller')

const router = express.Router()

// Multipart: máximo 6 archivos en memoria (5 válidos + 1 para detectar el exceso).
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { files: 6, fileSize: 6 * 1024 * 1024, fieldSize: 10 * 1024 }
})

router.get('/categorias', controller.getCategorias)

// Rate limit: 5 solicitudes por hora e IP.
router.post(
  '/solicitudes',
  crearLimitador({
    max: 5,
    ventanaMs: 60 * 60 * 1000,
    code: 'LIMITE_SOLICITUDES',
    message: 'Has alcanzado el límite de 5 solicitudes por hora. Inténtalo más tarde.'
  }),
  subida.array('adjuntos', 6),
  controller.postSolicitud
)

router.get('/seguimiento/:token', controller.getSeguimiento)
router.get('/seguimiento/:token/eventos', controller.getSeguimientoSse)

module.exports = router
