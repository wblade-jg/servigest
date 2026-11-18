import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../../config/pool.js'

// SQL del módulo de autenticación.

// Nunca se devuelve password_hash fuera de este módulo.
async function buscarUsuarioPorEmail (email) {
  const { rows } = await pool.query(`
    SELECT id, organizacion_id, nombre, email, password_hash, rol, activo,
           intentos_fallidos, bloqueado_hasta
    FROM usuarios
    WHERE email = $1
  `, [String(email).trim()])
  return rows[0] || null
}

// Un hash bcrypt válido para comparar aunque el usuario no exista,
// de modo que el tiempo de respuesta no delate la existencia de la cuenta.
// Se calcula una sola vez al cargar el módulo.
const HASH_CORTESIA = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12)

async function buscarUsuarioPorId (usuarioId) {
  const { rows } = await pool.query(
    'SELECT id, password_hash FROM usuarios WHERE id = $1',
    [usuarioId]
  )
  return rows[0] || null
}

async function crearSesion ({ usuarioId, tokenHash, csrfSecret, horas, ip, userAgent }) {
  const { rows } = await pool.query(`
    INSERT INTO sesiones (usuario_id, token_hash, csrf_secret, expira_en, ip, user_agent)
    VALUES ($1, $2, $3, now() + make_interval(hours => $4), $5::inet, $6)
    RETURNING id, expira_en
  `, [usuarioId, tokenHash, csrfSecret, horas, ip || null, userAgent || null])
  return rows[0]
}

async function buscarSesionActiva (tokenHash) {
  const { rows } = await pool.query(`
    SELECT
      s.id               AS "sesionId",
      s.csrf_secret      AS "csrfSecret",
      s.expira_en        AS "expiraEn",
      u.id               AS id,
      u.nombre           AS nombre,
      u.email            AS email,
      u.rol              AS rol,
      u.organizacion_id  AS "organizacionId"
    FROM sesiones s
    JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = $1
      AND s.revocada_en IS NULL
      AND s.expira_en > now()
      AND u.activo = true
  `, [tokenHash])
  return rows[0] || null
}

async function actualizarUltimoAcceso (sesionId) {
  await pool.query('UPDATE sesiones SET last_seen_at = now() WHERE id = $1', [sesionId])
}

async function revocarSesion (sesionId) {
  await pool.query(
    'UPDATE sesiones SET revocada_en = now() WHERE id = $1 AND revocada_en IS NULL',
    [sesionId]
  )
}

// Registra el intento fallido y bloquea la cuenta al quinto intento.
async function registrarIntentoFallido (usuarioId) {
  const { rows } = await pool.query(`
    UPDATE usuarios
    SET intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta = CASE
          WHEN intentos_fallidos + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE bloqueado_hasta
        END
    WHERE id = $1
    RETURNING intentos_fallidos, bloqueado_hasta
  `, [usuarioId])
  return rows[0]
}

async function limpiarIntentosFallidos (usuarioId) {
  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
    [usuarioId]
  )
}

async function actualizarPassword (usuarioId, passwordHash) {
  await pool.query(
    'UPDATE usuarios SET password_hash = $1, updated_at = now() WHERE id = $2',
    [passwordHash, usuarioId]
  )
}

export {
  buscarUsuarioPorEmail,
  buscarUsuarioPorId,
  HASH_CORTESIA,
  crearSesion,
  buscarSesionActiva,
  actualizarUltimoAcceso,
  revocarSesion,
  registrarIntentoFallido,
  limpiarIntentosFallidos,
  actualizarPassword
}
