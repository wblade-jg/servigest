import { pool } from '../../config/pool.js'

// SQL del módulo de intervenciones. Las reglas de negocio viven en service.js.

const CAMPOS_INTERVENCION = `
  i.id, i.solicitud_id AS "solicitudId", i.tecnico_id AS "tecnicoId",
  u.nombre AS "tecnicoNombre",
  i.inicio, i.fin, i.diagnostico, i.actividades, i.resultado, i.observaciones,
  i.created_at AS "fechaCreacion", i.updated_at AS "fechaActualizacion"
`

// Intervenciones de una solicitud (todas: abiertas y cerradas).
async function listarPorSolicitud (solicitudId) {
  const { rows } = await pool.query(`
    SELECT ${CAMPOS_INTERVENCION}
    FROM intervenciones i
    LEFT JOIN usuarios u ON u.id = i.tecnico_id
    WHERE i.solicitud_id = $1
    ORDER BY i.inicio DESC, i.id DESC
  `, [solicitudId])
  return rows
}

// Detalle de una intervención. Devuelve null si no existe.
async function obtenerPorId (id) {
  const { rows } = await pool.query(`
    SELECT ${CAMPOS_INTERVENCION}, s.estado AS "estadoSolicitud"
    FROM intervenciones i
    LEFT JOIN usuarios u ON u.id = i.tecnico_id
    LEFT JOIN solicitudes s ON s.id = i.solicitud_id
    WHERE i.id = $1
  `, [id])
  return rows[0] || null
}

// Bloqueo de fila dentro de la transacción de resolución.
async function bloquearPorId (cliente, id) {
  const { rows } = await cliente.query(`
    SELECT ${CAMPOS_INTERVENCION}, s.estado AS "estadoSolicitud"
    FROM intervenciones i
    LEFT JOIN usuarios u ON u.id = i.tecnico_id
    JOIN solicitudes s ON s.id = i.solicitud_id
    WHERE i.id = $1
    FOR UPDATE OF i
  `, [id])
  return rows[0] || null
}

// Crea la intervención abierta. El índice único parcial (una sola abierta
// por solicitud) es la última línea de defensa; el servicio valida antes.
async function insertarAbierta (cliente, { solicitudId, tecnicoId }) {
  const { rows } = await cliente.query(`
    INSERT INTO intervenciones (solicitud_id, tecnico_id, inicio)
    VALUES ($1, $2, now())
    RETURNING id, inicio
  `, [solicitudId, tecnicoId])
  return rows[0]
}

// Registra la resolución de la intervención abierta.
async function cerrar (cliente, id, { fin, diagnostico, actividades, resultado, observaciones }) {
  const { rows } = await cliente.query(`
    UPDATE intervenciones
    SET fin = $2, diagnostico = $3, actividades = $4, resultado = $5,
        observaciones = $6, updated_at = now()
    WHERE id = $1 AND fin IS NULL
    RETURNING id, fin
  `, [id, fin, diagnostico, actividades, resultado, observaciones || null])
  return rows[0]
}

export {
  listarPorSolicitud,
  obtenerPorId,
  bloquearPorId,
  insertarAbierta,
  cerrar
}
