import express from 'express'
import { crearLimitador } from '../../middlewares/limitador.js'
import { autenticar, exigirCsrf } from '../../middlewares/autenticacion.js'
import * as controller from './controller.js'

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

export default router
