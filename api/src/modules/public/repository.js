'use strict'

const { pool } = require('../../config/pool')

// SQL del módulo público.

async function listarCategoriasActivas () {
  const { rows } = await pool.query(`
    SELECT c.id, c.nombre, c.descripcion, e.nombre AS especialidad
    FROM categorias_servicio c
    LEFT JOIN especialidades e ON e.id = c.especialidad_requerida_id
    WHERE c.activo = true
    ORDER BY c.orden, c.nombre
  `)
  return rows
}

// Secuencia global para el código legible (no se reinicia por año).
async function siguienteSecuencia (cliente) {
  const { rows } = await cliente.query('SELECT nextval(\'solicitudes_codigo_seq\') AS seq')
  return Number(rows[0].seq)
}

async function insertarSolicitud (cliente, solicitud) {
  const { rows } = await cliente.query(`
    INSERT INTO solicitudes (
      codigo, token_publico, origen, organizacion_id, organizacion_nombre, created_by,
      contacto_nombre, contacto_email, contacto_telefono,
      categoria_id, descripcion, ubicacion, urgencia_declarada, estado
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'RECIBIDA'
    )
    RETURNING id, codigo, token_publico, estado, created_at
  `, [
    solicitud.codigo,
    solicitud.tokenPublico,
    solicitud.origen,
    solicitud.organizacionId || null,
    solicitud.organizacionNombre || null,
    solicitud.createdBy || null,
    solicitud.contactoNombre,
    solicitud.contactoEmail,
    solicitud.contactoTelefono,
    solicitud.categoriaId,
    solicitud.descripcion,
    solicitud.ubicacion || null,
    solicitud.urgenciaDeclarada || null
  ])
  return rows[0]
}

async function insertarAdjunto (cliente, adjunto) {
  const { rows } = await cliente.query(`
    INSERT INTO adjuntos (solicitud_id, nombre_original, ruta, mime_type, tamano_bytes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [adjunto.solicitudId, adjunto.nombreOriginal, adjunto.ruta, adjunto.mimeType, adjunto.tamanoBytes])
  return rows[0]
}

async function insertarEvento (cliente, evento) {
  const { rows } = await cliente.query(`
    INSERT INTO eventos_solicitud (solicitud_id, actor_id, tipo, estado_anterior, estado_nuevo, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [evento.solicitudId, evento.actorId || null, evento.tipo, evento.estadoAnterior || null, evento.estadoNuevo || null, JSON.stringify(evento.metadata || {})])
  return rows[0]
}

async function contarAdjuntosSolicitud (cliente, solicitudId) {
  const { rows } = await cliente.query(
    'SELECT count(*)::int AS total FROM adjuntos WHERE solicitud_id = $1',
    [solicitudId]
  )
  return rows[0].total
}

async function existeCategoria (id) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM categorias_servicio WHERE id = $1 AND activo = true',
    [id]
  )
  return rowCount > 0
}

// Seguimiento público: solo datos de coordinación, nunca contacto ni resolución.
async function buscarPorToken (token) {
  const { rows } = await pool.query(`
    SELECT
      s.codigo,
      s.estado,
      s.prioridad,
      s.created_at        AS "fechaCreacion",
      s.fecha_objetivo    AS "fechaObjetivo",
      s.fecha_hora_programada AS "fechaProgramada",
      u.nombre            AS "tecnicoAsignado"
    FROM solicitudes s
    LEFT JOIN tecnicos t ON t.usuario_id = s.tecnico_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    WHERE s.token_publico = $1
  `, [token])
  return rows[0] || null
}

async function buscarIdPorToken (token) {
  const { rows } = await pool.query(
    'SELECT id, estado FROM solicitudes WHERE token_publico = $1',
    [token]
  )
  return rows[0] || null
}

module.exports = {
  listarCategoriasActivas,
  siguienteSecuencia,
  insertarSolicitud,
  insertarAdjunto,
  insertarEvento,
  contarAdjuntosSolicitud,
  existeCategoria,
  buscarPorToken,
  buscarIdPorToken
}
