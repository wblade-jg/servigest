import express from 'express'
import { autenticar, exigirCsrf, soloRoles } from '../../middlewares/autenticacion.js'
import * as controller from './controller.js'

const router = express.Router()

const INTERNO = soloRoles('ADMIN', 'COORDINADOR')
const INTERNO_CLIENTE = soloRoles('ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE')

router.use(autenticar, exigirCsrf)

// Los métodos mutantes exigirán CSRF; las lecturas solo sesión.
router.get('/', INTERNO_CLIENTE, controller.listar)
router.post('/', soloRoles('ADMIN', 'COORDINADOR', 'CLIENTE'), controller.crear)
router.get('/:id', INTERNO_CLIENTE, controller.obtener)

// Transiciones de estado del ciclo de vida (REST estricto).
router.patch('/:id/estado', soloRoles('ADMIN', 'COORDINADOR', 'CLIENTE'), controller.transicionar)

// Auditoría (solo internos) y notas internas (también el técnico asignado;
// la pertenencia la valida el servicio). El Cliente nunca accede a notas.
router.get('/:id/eventos', INTERNO, controller.eventos)
router.get('/:id/notas', soloRoles('ADMIN', 'COORDINADOR', 'TECNICO'), controller.notas)
router.post('/:id/notas', soloRoles('ADMIN', 'COORDINADOR', 'TECNICO'), controller.crearNota)

// Subrecurso administrativo para regenerar el token público.
router.post('/:id/token', soloRoles('ADMIN'), controller.regenerarToken)

export default router
