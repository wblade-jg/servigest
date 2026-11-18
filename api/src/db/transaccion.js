'use strict'

const { pool } = require('../config/pool')

// Ejecuta el trabajo dentro de BEGIN/COMMIT con rollback ante error.
async function conTransaccion (trabajo) {
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const resultado = await trabajo(cliente)
    await cliente.query('COMMIT')
    return resultado
  } catch (error) {
    await cliente.query('ROLLBACK')
    throw error
  } finally {
    cliente.release()
  }
}

module.exports = { conTransaccion }
