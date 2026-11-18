import express from 'express'
import * as controlador from './controller.js'
import { autenticar, exigirCsrf, soloRoles } from '../../middlewares/autenticacion.js'

const router = express.Router()

// Todas las rutas de organizaciones requieren autenticación y rol ADMIN.
// Los métodos mutantes exigen CSRF.
router.use(autenticar, exigirCsrf)
router.use(soloRoles('ADMIN'))

// CRUD de organizaciones.
router.get('/', controlador.listar)
router.get('/:id', controlador.obtenerPorId)
router.post('/', controlador.crear)
router.patch('/:id', controlador.actualizar)
router.delete('/:id', controlador.desactivar)

export default router
