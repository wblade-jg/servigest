import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { pool } from '../config/pool.js'

const directorioActual = path.dirname(fileURLToPath(import.meta.url))

// Runner de migraciones forward-only con registro en schema_migrations.
async function migrar () {
  const cliente = await pool.connect()
  try {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre text PRIMARY KEY,
        aplicada_en timestamptz NOT NULL DEFAULT now()
      )
    `)
    const dir = path.resolve(directorioActual, '../../migrations')
    const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    for (const archivo of archivos) {
      const { rowCount } = await cliente.query(
        'SELECT 1 FROM schema_migrations WHERE nombre = $1',
        [archivo]
      )
      if (rowCount > 0) continue
      const sql = fs.readFileSync(path.join(dir, archivo), 'utf8')
      try {
        await cliente.query('BEGIN')
        await cliente.query(sql)
        await cliente.query(
          'INSERT INTO schema_migrations (nombre) VALUES ($1)',
          [archivo]
        )
        await cliente.query('COMMIT')
        console.log(`Migración aplicada: ${archivo}`)
      } catch (error) {
        await cliente.query('ROLLBACK')
        throw new Error(`Error aplicando migración ${archivo}: ${error.message}`)
      }
    }
  } finally {
    cliente.release()
  }
}

// Ejecuta un archivo de seed (idempotente) individual.
// Busca primero en seeds/; los catálogos de fase 1 viven en migrations/.
async function sembrar (archivo) {
  const candidatos = ['../../seeds', '../../migrations']
    .map(ruta => path.resolve(directorioActual, ruta, archivo))
  const ruta = candidatos.find(ruta => fs.existsSync(ruta))
  if (!ruta) {
    throw new Error(`Seed no encontrado: ${archivo}`)
  }
  const sql = fs.readFileSync(ruta, 'utf8')
  await pool.query(sql)
  console.log(`Seed ejecutado: ${archivo}`)
}

export { migrar, sembrar }

const esEjecucionDirecta =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url

if (esEjecucionDirecta) {
  const indice = process.argv.indexOf('--seed')
  const tarea = indice > -1 ? sembrar(process.argv[indice + 1]) : migrar()
  tarea
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
