'use strict'

// Catálogos de lectura pública (fase 1); la administración llega en fases posteriores.
const express = require('express')
const { pool } = require('../../config/pool')

const router = express.Router()

router.get('/categorias', async (_req, res, siguiente) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nombre, descripcion, orden,
             especialidad_requerida_id AS "especialidadRequeridaId"
      FROM categorias_servicio
      WHERE activo = true
      ORDER BY orden, nombre
    `)
    res.json({ data: rows })
  } catch (error) { siguiente(error) }
})

module.exports = router
