'use strict'

const express = require('express')
const swaggerUi = require('swagger-ui-express')
const { manejarErrores } = require('./middlewares/errores')

function crearApp ({ uploadDir, eventos }) {
  const app = express()
  app.locals.uploadDir = uploadDir
  app.locals.eventos = eventos
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ estado: 'ok' })
  })

  app.use('/api/public', require('./modules/public/routes'))
  app.use('/api/catalogos', require('./modules/catalogos/routes'))

  const openapi = require('./openapi')
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

  app.use(manejarErrores)
  return app
}

module.exports = { crearApp }
