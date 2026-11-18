import { entorno } from './config/entorno.js'
import { migrar } from './db/migrar.js'
import { pool } from './config/pool.js'
import { crearApp } from './app.js'
import * as eventos from './modules/eventos/emisor.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directorioActual = path.dirname(fileURLToPath(import.meta.url))

async function iniciar () {
  await migrar()
  const uploadDir = path.resolve(directorioActual, '..', entorno.uploadDir)
  const app = crearApp({ uploadDir, eventos })
  app.listen(entorno.port, () => {
    console.log(`API ServiGest escuchando en http://localhost:${entorno.port}`)
  })
}

iniciar().catch(async error => {
  console.error(error)
  await pool.end()
  process.exit(1)
})
