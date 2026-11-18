import express from 'express'
import { autenticar, soloRoles } from '../../middlewares/autenticacion.js'
import { suscribir } from './emisor.js'

const router = express.Router()

// Canal de coordinación: solicitudes creadas, cambios de estado, asignaciones
// y cierre. Cookie de sesión; solo Admin y Coordinador.
router.get('/coordinacion', autenticar, soloRoles('ADMIN', 'COORDINADOR'), (req, res) => {
  suscribir('coordinacion', res)
  req.on('close', () => { /* el emisor limpia al cerrar */ })
})

// Canal del técnico: intervenciones iniciadas/resueltas y estado de sus asignaciones.
router.get('/tecnico', autenticar, soloRoles('TECNICO'), (req, res) => {
  suscribir('tecnico', res)
  req.on('close', () => { /* el emisor limpia al cerrar */ })
})

export default router
