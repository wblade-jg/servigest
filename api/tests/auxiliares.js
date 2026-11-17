'use strict'

// Utilidades de pruebas: base de datos de prueba, migraciones y app bajo prueba.

// Debe definirse ANTES de requerir config/pool.
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ||
  'postgres://servigest:servigest@localhost:5432/servigest_test'

const fs = require('fs')
const os = require('os')
const path = require('path')
const supertest = require('supertest')

const { migrar } = require('../src/db/migrar')
const { pool } = require('../src/config/pool')
const { crearApp } = require('../src/app')
const eventos = require('../src/modules/eventos/emisor')

let app
let directorioSubidas

async function iniciarEntorno () {
  await migrar()
  directorioSubidas = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-uploads-'))
  app = crearApp({ uploadDir: directorioSubidas, eventos })
  return app
}

function getApp () {
  return app
}

function agente (ip) {
  const req = supertest.agent(app)
  return ip ? req.set('X-Forwarded-For', ip) : req
}

async function limpiarTablas () {
  // Cuestas tablas de la fase 1; el resto se limpia en fases posteriores.
  await pool.query(
    'TRUNCATE adjuntos, eventos_solicitud, solicitudes RESTART IDENTITY CASCADE'
  )
}

function cuerpoValido (sobrescribir = {}) {
  return {
    organizacion: 'Industrias Manabí S.A.',
    contactoNombre: 'María Torres',
    contactoEmail: 'maria@manabi.com.ec',
    contactoTelefono: '+593 99 123 4567',
    categoriaId: 'cualquier-uuid', // se sobrescribe con una categoría real
    descripcion: 'El servidor principal no enciende tras el corte eléctrico de anoche.',
    ...sobrescribir
  }
}

let categoriaCache = null
async function categoriaReal () {
  if (!categoriaCache) {
    const { rows } = await pool.query(
      'SELECT id FROM categorias_servicio WHERE nombre = $1',
      ['Administración de servidores']
    )
    categoriaCache = rows[0].id
  }
  return categoriaCache
}

function adjuntoValido (nombre = 'foto.png') {
  // PNG mínimo válido de 1x1
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  return Buffer.from(base64, 'base64')
}

async function cerrarEntorno () {
  if (directorioSubidas) {
    fs.rmSync(directorioSubidas, { recursive: true, force: true })
  }
  await pool.end()
}

module.exports = {
  iniciarEntorno,
  getApp,
  agente,
  limpiarTablas,
  cuerpoValido,
  categoriaReal,
  adjuntoValido,
  cerrarEntorno,
  eventos
}
