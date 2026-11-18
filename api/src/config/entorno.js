// Validación del entorno. Falla rápido si falta una variable obligatoria.
import 'dotenv/config'

function requerida (nombre) {
  const valor = process.env[nombre]
  if (!valor) {
    throw new Error(`Variable de entorno obligatoria no definida: ${nombre}`)
  }
  return valor
}

const entorno = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: requerida('DATABASE_URL'),
  uploadDir: process.env.UPLOAD_DIR || '../uploads',
  sessionSecret: process.env.SESSION_SECRET || ''
}

export { entorno }
