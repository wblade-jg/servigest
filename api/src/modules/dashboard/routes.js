'use strict'

const express = require('express')
const { autenticar, soloRoles } = require('../../middlewares/autenticacion')
const controller = require('./controller')

const router = express.Router()

// Dashboard operativo: internos ven lo global; el Cliente, su organización.
router.get('/',
  autenticar,
  soloRoles('ADMIN', 'COORDINADOR', 'CLIENTE'),
  controller.obtener)

module.exports = router
