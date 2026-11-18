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
  // Limpieza completa entre pruebas: solicitudes y usuarios en cascada.
  await pool.query(`
    TRUNCATE notas_solicitud, eventos_solicitud, adjuntos, intervenciones,
             sesiones, solicitudes, usuarios, organizaciones
    RESTART IDENTITY CASCADE
  `)
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

// ─── Usuarios y sesiones (fase 2) ───────────────────────────────────────────

const bcrypt = require('bcryptjs')

// Hash compartido para no pagar bcrypt coste 12 en cada creación.
const CLAVE_PRUEBA = 'Prueba1234'
const HASH_PRUEBA = bcrypt.hashSync(CLAVE_PRUEBA, 12)

async function crearOrganizacion (nombre = 'Industrias Manabí S.A.') {
  const { rows } = await pool.query(
    'INSERT INTO organizaciones (nombre) VALUES ($1) RETURNING id',
    [nombre]
  )
  return rows[0].id
}

async function crearUsuario ({ nombre = 'Usuario de prueba', email, rol = 'COORDINADOR', organizacionId = null, password = null } = {}) {
  if (rol === 'CLIENTE' && !organizacionId) {
    throw new Error('El rol CLIENTE exige organizacionId')
  }
  const { rows } = await pool.query(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, organizacion_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, rol, organizacion_id
  `, [nombre, email, password ? bcrypt.hashSync(password, 12) : HASH_PRUEBA, rol, organizacionId])
  return rows[0]
}

// Inicia sesión con el agente de supertest y devuelve { usuario, csrfToken }.
async function loginComo (agente, email, password = CLAVE_PRUEBA) {
  const respuesta = await agente
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, password })
    .expect(respuesta => {
      if (![200, 401, 423, 429].includes(respuesta.status)) {
        throw new Error(`loginComo falló: ${respuesta.status}`)
      }
    })
  return respuesta.body
}

// Crea una solicitud directamente en la base de datos (rápido y determinista).
async function crearSolicitudDirecta ({
  codigo = 'SOL-2026-00001',
  origen = 'CLIENTE',
  organizacionId = null,
  organizacionNombre = null,
  estado = 'RECIBIDA',
  prioridad = null,
  tecnicoId = null,
  fechaObjetivo = null
} = {}) {
  const categoriaId = await categoriaReal()
  const { rows } = await pool.query(`
    INSERT INTO solicitudes (
      codigo, token_publico, origen, organizacion_id, organizacion_nombre,
      contacto_nombre, contacto_email, contacto_telefono,
      categoria_id, descripcion, estado, prioridad, tecnico_id, fecha_objetivo
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING id, codigo, token_publico, estado
  `, [
    codigo,
    codigo.toLowerCase().replace(/[^a-z0-9]/g, '') + '-tok',
    origen, organizacionId, organizacionNombre,
    'María Torres', 'maria@ejemplo.com.ec', '+593 99 123 4567',
    categoriaId, 'El servidor principal no enciende tras el corte eléctrico de anoche.',
    estado, prioridad, tecnicoId, fechaObjetivo
  ])
  await pool.query(`
    INSERT INTO eventos_solicitud (solicitud_id, tipo, estado_nuevo, metadata)
    VALUES ($1, 'CREACION', $2, $3)
  `, [rows[0].id, estado, JSON.stringify({ origen })])
  return rows[0]
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
  eventos,
  crearOrganizacion,
  crearUsuario,
  loginComo,
  crearSolicitudDirecta,
  CLAVE_PRUEBA
}
