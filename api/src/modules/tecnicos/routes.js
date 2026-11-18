import express from 'express'
import * as controlador from './controller.js'
import { autenticar, exigirCsrf, soloRoles } from '../../middlewares/autenticacion.js'

const router = express.Router()

// Todas las rutas de técnicos requieren autenticación.
// Los métodos mutantes exigen CSRF.
router.use(autenticar, exigirCsrf)

// Listar y obtener técnicos: Admin y Coordinador.
router.get('/', soloRoles('ADMIN', 'COORDINADOR'), controlador.listar)
router.get('/:id', soloRoles('ADMIN', 'COORDINADOR'), controlador.obtenerPorId)

// Gestión de técnicos: solo Admin.
router.post('/', soloRoles('ADMIN'), controlador.habilitar)
router.patch('/:id', soloRoles('ADMIN'), controlador.actualizar)
router.delete('/:id', soloRoles('ADMIN'), controlador.desactivar)

// Especialidades: solo Admin.
router.put('/:id/especialidades', soloRoles('ADMIN'), controlador.asignarEspecialidades)

// Disponibilidad: solo Admin.
router.get('/:id/disponibilidad', soloRoles('ADMIN', 'COORDINADOR'), controlador.listarDisponibilidad)
router.post('/:id/disponibilidad', soloRoles('ADMIN'), controlador.crearDisponibilidad)
router.patch('/disponibilidad/:franjaId', soloRoles('ADMIN'), controlador.actualizarDisponibilidad)
router.delete('/disponibilidad/:franjaId', soloRoles('ADMIN'), controlador.desactivarDisponibilidad)

export default router
