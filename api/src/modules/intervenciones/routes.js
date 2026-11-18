'use strict'

const express = require('express')
const { autenticar, exigirCsrf, soloRoles } = require('../../middlewares/autenticacion')
const controller = require('./controller')

const router = express.Router()

// Montado en /api: los middlewares se aplican por ruta (un router.use aquí
// interceptaría todo /api, incluido /auth/login).

// El técnico asignado inicia la intervención de su solicitud.
router.post('/solicitudes/:id/intervenciones',
  autenticar, exigirCsrf, soloRoles('TECNICO'), controller.iniciar)

// Listado de intervenciones de la solicitud (internos y técnico asignado).
router.get('/solicitudes/:id/intervenciones',
  autenticar, soloRoles('ADMIN', 'COORDINADOR', 'TECNICO'), controller.listar)

// El técnico asignado resuelve su intervención con documentación completa.
router.patch('/intervenciones/:id',
  autenticar, exigirCsrf, soloRoles('TECNICO'), controller.resolver)

module.exports = router
