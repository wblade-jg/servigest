import express from 'express'
import swaggerUi from 'swagger-ui-express'
import cookieParser from 'cookie-parser'
import { manejarErrores } from './middlewares/errores.js'
import openapi from './openapi.js'
import rutasPublic from './modules/public/routes.js'
import rutasCatalogos from './modules/catalogos/routes.js'
import rutasAuth from './modules/auth/routes.js'
import rutasOrganizaciones from './modules/organizaciones/routes.js'
import rutasUsuarios from './modules/usuarios/routes.js'
import rutasTecnicos from './modules/tecnicos/routes.js'
import rutasIntervenciones from './modules/intervenciones/routes.js'
import rutasSolicitudes from './modules/solicitudes/routes.js'
import rutasDashboard from './modules/dashboard/routes.js'
import rutasEventos from './modules/eventos/routes.js'

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

  app.use('/api/public', rutasPublic)
  app.use('/api/catalogos', rutasCatalogos)
  app.use('/api/auth', rutasAuth)
  app.use('/api/organizaciones', rutasOrganizaciones)
  app.use('/api/usuarios', rutasUsuarios)
  app.use('/api/tecnicos', rutasTecnicos)
  app.use('/api', rutasIntervenciones)
  app.use('/api/solicitudes', rutasSolicitudes)
  app.use('/api/dashboard', rutasDashboard)
  app.use('/api/eventos', rutasEventos)

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi))

  app.use(manejarErrores)
  return app
}

export { crearApp }
