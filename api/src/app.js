'use strict'

const express = require('express')
const swaggerUi = require('swagger-ui-express')
const cookieParser = require('cookie-parser')
const { manejarErrores } = require('./middlewares/errores')

function crearApp ({ uploadDir, eventos }) {
  const app = express()
  app.locals.uploadDir = uploadDir
  app.locals.eventos = eventos
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(cookieParser())

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ estado: 'ok' })
  })

  app.use('/api/public', require('./modules/public/routes'))
  app.use('/api/catalogos', require('./modules/catalogos/routes'))
  app.use('/api/auth', require('./modules/auth/routes'))
  app.use('/api/organizaciones', require('./modules/organizaciones/routes'))
  app.use('/api/usuarios', require('./modules/usuarios/routes'))
  app.use('/api/tecnicos', require('./modules/tecnicos/routes'))
  app.use('/api', require('./modules/intervenciones/routes'))
  app.use('/api/solicitudes', require('./modules/solicitudes/routes'))
  app.use('/api/eventos', require('./modules/eventos/routes'))

  const openapi = require('./openapi')
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

  app.use(manejarErrores)
  return app
}

module.exports = { crearApp }
