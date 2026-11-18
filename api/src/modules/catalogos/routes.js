'use strict'

const express = require('express')
const controlador = require('./controller')
const { autenticar, exigirCsrf, soloRoles } = require('../../middlewares/autenticacion')

const router = express.Router()

// Todas las rutas de catálogos requieren autenticación y rol ADMIN.
// Los métodos mutantes exigen CSRF.
router.use(autenticar, exigirCsrf)
router.use(soloRoles('ADMIN'))

// Especialidades
router.get('/especialidades', controlador.listarEspecialidades)
router.get('/especialidades/:id', controlador.obtenerEspecialidadPorId)
router.post('/especialidades', controlador.crearEspecialidad)
router.patch('/especialidades/:id', controlador.actualizarEspecialidad)
router.delete('/especialidades/:id', controlador.desactivarEspecialidad)

// Categorías (administración)
router.get('/categorias', controlador.listarCategorias)
router.get('/categorias/admin', controlador.listarCategorias)
router.get('/categorias/:id', controlador.obtenerCategoriaPorId)
router.post('/categorias', controlador.crearCategoria)
router.patch('/categorias/:id', controlador.actualizarCategoria)
router.delete('/categorias/:id', controlador.desactivarCategoria)

module.exports = router
