import express from 'express'
import { autenticar, soloRoles } from '../../middlewares/autenticacion.js'
import * as controller from './controller.js'

const router = express.Router()

// Dashboard operativo: internos ven lo global; el Cliente, su organización.
router.get('/',
  autenticar,
  soloRoles('ADMIN', 'COORDINADOR', 'CLIENTE'),
  controller.obtener)

export default router
