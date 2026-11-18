import { pool } from '../../config/pool.js'

// SQL del dashboard operativo. El filtro por organización es opcional: se
// aplica siempre que la consulta sea de un Cliente (aislamiento en la BD).

const NO_TERMINALES = "('RECHAZADA', 'CERRADA', 'CANCELADA')"

async function porEstado (organizacionId) {
  const { rows } = await pool.query(`
    SELECT estado, count(*)::int AS total
    FROM solicitudes
    WHERE ($1::uuid IS NULL OR organizacion_id = $1)
    GROUP BY estado
    ORDER BY estado
  `, [organizacionId])
  return rows
}

async function porPrioridad (organizacionId) {
  const { rows } = await pool.query(`
    SELECT prioridad, count(*)::int AS total
    FROM solicitudes
    WHERE estado NOT IN ${NO_TERMINALES}
      AND prioridad IS NOT NULL
      AND ($1::uuid IS NULL OR organizacion_id = $1)
    GROUP BY prioridad
    ORDER BY prioridad
  `, [organizacionId])
  return rows
}

async function resumenSla (organizacionId) {
  const { rows } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE fecha_objetivo > now() + interval '24 hours')::int AS "enPlazo",
      count(*) FILTER (WHERE fecha_objetivo >= now() AND fecha_objetivo <= now() + interval '24 hours')::int AS "porVencer",
      count(*) FILTER (WHERE fecha_objetivo < now())::int AS "vencidas",
      count(*) FILTER (WHERE fecha_objetivo IS NULL)::int AS "sinFecha"
    FROM solicitudes
    WHERE estado NOT IN ${NO_TERMINALES}
      AND ($1::uuid IS NULL OR organizacion_id = $1)
  `, [organizacionId])
  return rows[0]
}

async function cargaPorTecnico (organizacionId) {
  const { rows } = await pool.query(`
    SELECT s.tecnico_id AS "tecnicoId", u.nombre, count(*)::int AS total
    FROM solicitudes s
    JOIN usuarios u ON u.id = s.tecnico_id
    WHERE s.estado IN ('ASIGNADA', 'EN_PROCESO')
      AND ($1::uuid IS NULL OR s.organizacion_id = $1)
    GROUP BY s.tecnico_id, u.nombre
    ORDER BY total DESC, u.nombre
  `, [organizacionId])
  return rows
}

// MTTR: promedio de horas entre aprobación y resolución en los últimos 30 días.
async function mttrHoras (organizacionId) {
  const { rows } = await pool.query(`
    SELECT round(avg(EXTRACT(EPOCH FROM (resuelta_en - aprobada_en)) / 3600)::numeric, 2) AS "mttrHoras"
    FROM solicitudes
    WHERE resuelta_en IS NOT NULL
      AND aprobada_en IS NOT NULL
      AND resuelta_en >= now() - interval '30 days'
      AND ($1::uuid IS NULL OR organizacion_id = $1)
  `, [organizacionId])
  return rows[0]?.mttrHoras === null || rows[0]?.mttrHoras === undefined
    ? null
    : Number(rows[0].mttrHoras)
}

async function total (organizacionId) {
  const { rows } = await pool.query(`
    SELECT count(*)::int AS total
    FROM solicitudes
    WHERE ($1::uuid IS NULL OR organizacion_id = $1)
  `, [organizacionId])
  return rows[0].total
}

export {
  porEstado,
  porPrioridad,
  resumenSla,
  cargaPorTecnico,
  mttrHoras,
  total
}
