'use strict'

const express = require('express')
const controlador = require('./controller')
const { autenticar, exigirCsrf, soloRoles } = require('../../middlewares/autenticacion')

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

module.exports = router
