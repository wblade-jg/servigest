import express from 'express'
import * as controlador from './controller.js'
import { autenticar, exigirCsrf, soloRoles } from '../../middlewares/autenticacion.js'

const router = express.Router()

// Todas las rutas de usuarios requieren autenticación y rol ADMIN.
// Los métodos mutantes exigen CSRF.
router.use(autenticar, exigirCsrf)
router.use(soloRoles('ADMIN'))

// CRUD de usuarios.
router.get('/', controlador.listar)
router.get('/:id', controlador.obtenerPorId)
router.post('/', controlador.crear)
router.patch('/:id', controlador.actualizar)
router.patch('/:id/password', controlador.cambiarPassword)
router.delete('/:id', controlador.desactivar)

export default router
