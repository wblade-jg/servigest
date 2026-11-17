'use strict'

const { entorno } = require('./config/entorno')
const { migrar } = require('./db/migrar')
const { pool } = require('./config/pool')
const { crearApp } = require('./app')
const eventos = require('./modules/eventos/emisor')
const path = require('path')

async function iniciar () {
  await migrar()
  const uploadDir = path.resolve(__dirname, '..', entorno.uploadDir)
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
