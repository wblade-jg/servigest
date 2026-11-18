'use strict'

const express = require('express')
const { crearLimitador } = require('../../middlewares/limitador')
const { autenticar, exigirCsrf } = require('../../middlewares/autenticacion')
const controller = require('./controller')

const router = express.Router()

// Bloqueo por IP: 10 intentos de login por 15 minutos.
router.post('/login',
  crearLimitador({    max: 10,
    ventanaMs: 15 * 60 * 1000,
    code: 'LIMITE_LOGIN',
    message: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.'
  }),
  controller.login
)

router.post('/logout', autenticar, exigirCsrf, controller.logout)
router.get('/me', autenticar, controller.me)
router.patch('/password', autenticar, exigirCsrf, controller.cambiarPassword)

module.exports = router
