'use strict'

// Errores uniformes: { error: { code, message, details } }

class ApiError extends Error {
  constructor (estado, code, message, details = {}) {
    super(message)
    this.estado = estado
    this.code = code
    this.details = details
  }
}

// eslint-disable-next-line no-unused-vars
function manejarErrores (error, req, res, _siguiente) {
  if (error instanceof ApiError) {
    return res.status(error.estado).json({
      error: { code: error.code, message: error.message, details: error.details }
    })
  }
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: { code: 'ADJUNTO_INVALIDO', message: 'Los archivos enviados superan los límites permitidos (5 MB, 5 archivos).', details: {} }
    })
  }
  if (error.code === '23505' || error.code === '23514') {
    return res.status(400).json({
      error: { code: 'DATOS_INVALIDOS', message: 'Los datos enviados no cumplen las reglas del sistema.', details: {} }
    })
  }
  console.error(error)
  return res.status(500).json({
    error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor.', details: {} }
  })
}

module.exports = { ApiError, manejarErrores }
