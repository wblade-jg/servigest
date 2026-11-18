'use strict'

const express = require('express')
const controlador = require('./controller')
const { autenticar, exigirCsrf, soloRoles } = require('../../middlewares/autenticacion')

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

module.exports = router
