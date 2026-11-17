'use strict'

const { ApiError } = require('./errores')

// Limitador en memoria: máximo `max` peticiones por `ventanaMs` por clave.
// Sin persistencia: al reiniciar la API el contador se reinicia (aceptable en P0).
function crearLimitador ({ max, ventanaMs, code, message }) {
  const accesos = new Map()
  setInterval(() => accesos.clear(), ventanaMs).unref()
  return function limitador (req, res, siguiente) {
    const clave = req.ip || 'desconocida'
    const ahora = Date.now()
    const registro = accesos.get(clave) || { inicio: ahora, cuenta: 0 }
    if (ahora - registro.inicio > ventanaMs) {
      registro.inicio = ahora
      registro.cuenta = 0
    }
    registro.cuenta += 1
    accesos.set(clave, registro)
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - registro.cuenta)))
    if (registro.cuenta > max) {
      return siguiente(new ApiError(429, code, message, {
        reintentaEnSegundos: Math.ceil((registro.inicio + ventanaMs - ahora) / 1000)
      }))
    }
    return siguiente()
  }
}

module.exports = { crearLimitador }
