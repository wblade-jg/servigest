'use strict'

const { pool } = require('../../config/pool')

// SQL del módulo de solicitudes. Las reglas de negocio viven en service.js.

const CAMPOS_SOLICITUD = `
  s.id, s.codigo, s.origen, s.estado, s.prioridad, s.urgencia_declarada AS "urgenciaDeclarada",
  s.descripcion, s.ubicacion,
  s.contacto_nombre AS "contactoNombre", s.contacto_email AS "contactoEmail",
  s.contacto_telefono AS "contactoTelefono",
  s.organizacion_id AS "organizacionId", o.nombre AS "organizacionNombre",
  s.categoria_id AS "categoriaId", c.nombre AS "categoriaNombre",
  c.especialidad_requerida_id AS "especialidadRequeridaId", esp.nombre AS "especialidadRequeridaNombre",
  s.tecnico_id AS "tecnicoId", u.nombre AS "tecnicoNombre",
  s.fecha_hora_programada AS "fechaProgramada", s.fecha_objetivo AS "fechaObjetivo",
  s.constancia_aceptacion AS "constanciaAceptacion",
  s.aprobada_en AS "aprobadaEn", s.rechazada_motivo AS "rechazadaMotivo",
  s.cancelada_motivo AS "canceladaMotivo",
  s.resolucion, s.resuelta_en AS "resueltaEn", s.cerrada_en AS "cerradaEn",
  s.created_at AS "fechaCreacion", s.updated_at AS "fechaActualizacion"
`

// Listado con filtros, paginación y orden. Devuelve { data, total }.
async function listar ({ usuario, filtros }) {
  const condiciones = []
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  // El aislamiento del Cliente se aplica SIEMPRE en la consulta, no en la vista.
  if (usuario.rol === 'CLIENTE') condiciones.push(`s.organizacion_id = ${agregados(usuario.organizacionId)}`)
  if (usuario.rol === 'TECNICO') condiciones.push(`s.tecnico_id = ${agregados(usuario.id)}`)

  if (filtros.estado) condiciones.push(`s.estado = ${agregados(filtros.estado)}`)
  if (filtros.prioridad) condiciones.push(`s.prioridad = ${agregados(filtros.prioridad)}`)
  if (filtros.origen) condiciones.push(`s.origen = ${agregados(filtros.origen)}`)
  if (filtros.categoriaId) condiciones.push(`s.categoria_id = ${agregados(filtros.categoriaId)}`)
  if (filtros.tecnicoId && usuario.rol !== 'TECNICO') condiciones.push(`s.tecnico_id = ${agregados(filtros.tecnicoId)}`)
  if (filtros.desde) condiciones.push(`s.created_at >= ${agregados(filtros.desde)}::timestamptz`)
  if (filtros.hasta) condiciones.push(`s.created_at < (${agregados(filtros.hasta)}::timestamptz + interval '1 day')`)
  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`(s.codigo ILIKE ${agregados(patron)} OR s.descripcion ILIKE ${agregados(patron)} OR s.contacto_nombre ILIKE ${agregados(patron)} OR s.organizacion_nombre ILIKE ${agregados(patron)} OR o.nombre ILIKE ${agregados(patron)})`)
  }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const orden = filtros.orden === 'creacion-asc' ? 'ASC' : 'DESC'

  const { rows: data } = await pool.query(`
    SELECT ${CAMPOS_SOLICITUD}
    FROM solicitudes s
    LEFT JOIN categorias_servicio c ON c.id = s.categoria_id
    LEFT JOIN especialidades esp ON esp.id = c.especialidad_requerida_id
    LEFT JOIN organizaciones o ON o.id = s.organizacion_id
    LEFT JOIN tecnicos t ON t.usuario_id = s.tecnico_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    ${donde}
    ORDER BY s.created_at ${orden}, s.codigo ${orden}
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM solicitudes s
    LEFT JOIN organizaciones o ON o.id = s.organizacion_id
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

// Detalle con datos de coordinación. Devuelve null si no existe.
async function obtenerPorId (id) {
  const { rows } = await pool.query(`
    SELECT ${CAMPOS_SOLICITUD}
    FROM solicitudes s
    LEFT JOIN categorias_servicio c ON c.id = s.categoria_id
    LEFT JOIN especialidades esp ON esp.id = c.especialidad_requerida_id
    LEFT JOIN organizaciones o ON o.id = s.organizacion_id
    LEFT JOIN tecnicos t ON t.usuario_id = s.tecnico_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    WHERE s.id = $1
  `, [id])
  return rows[0] || null
}

// Bloqueo de fila dentro de la transacción de cada transición de estado.
async function bloquearPorId (cliente, id) {
  const { rows } = await cliente.query(`
    SELECT ${CAMPOS_SOLICITUD}, s.token_publico AS "tokenPublico"
    FROM solicitudes s
    LEFT JOIN categorias_servicio c ON c.id = s.categoria_id
    LEFT JOIN especialidades esp ON esp.id = c.especialidad_requerida_id
    LEFT JOIN organizaciones o ON o.id = s.organizacion_id
    LEFT JOIN tecnicos t ON t.usuario_id = s.tecnico_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    WHERE s.id = $1
    FOR UPDATE OF s
  `, [id])
  return rows[0] || null
}

// camelCase (API) → snake_case (columnas de la base de datos)
function aSnakeCase (clave) {
  return clave.replace(/[A-Z]/g, letra => `_${letra.toLowerCase()}`)
}

// Aplica los cambios de una transición de estado (el estado y sus marcas).
async function aplicarTransicion (cliente, id, cambios) {
  const claves = Object.keys(cambios)
  const asignaciones = claves.map((clave, i) => `"${aSnakeCase(clave)}" = $${i + 2}`)
  const { rows } = await cliente.query(`
    UPDATE solicitudes SET ${asignaciones.join(', ')}, updated_at = now()
    WHERE id = $1
    RETURNING id, codigo, estado
  `, [id, ...claves.map(clave => cambios[clave])])
  return rows[0]
}

async function insertarEvento (cliente, evento) {
  const { rows } = await cliente.query(`
    INSERT INTO eventos_solicitud (solicitud_id, actor_id, tipo, estado_anterior, estado_nuevo, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at
  `, [
    evento.solicitudId,
    evento.actorId || null,
    evento.tipo,
    evento.estadoAnterior || null,
    evento.estadoNuevo || null,
    JSON.stringify(evento.metadata || {})
  ])
  return rows[0]
}

async function listarEventos (solicitudId) {
  const { rows } = await pool.query(`
    SELECT e.id, e.tipo, e.estado_anterior AS "estadoAnterior", e.estado_nuevo AS "estadoNuevo",
           e.metadata, e.created_at AS "fecha",
           a.nombre AS "actorNombre", a.rol AS "actorRol"
    FROM eventos_solicitud e
    LEFT JOIN usuarios a ON a.id = e.actor_id
    WHERE e.solicitud_id = $1
    ORDER BY e.id
  `, [solicitudId])
  return rows
}

async function insertarNota (cliente, nota) {
  const { rows } = await cliente.query(`
    INSERT INTO notas_solicitud (solicitud_id, autor_id, tipo, contenido)
    VALUES ($1, $2, $3, $4)
    RETURNING id, tipo, contenido, created_at
  `, [nota.solicitudId, nota.autorId, nota.tipo, nota.contenido])
  return rows[0]
}

async function listarNotas (solicitudId) {
  const { rows } = await pool.query(`
    SELECT n.id, n.tipo, n.contenido, n.created_at AS "fecha",
           a.id AS "autorId", a.nombre AS "autorNombre", a.rol AS "autorRol"
    FROM notas_solicitud n
    JOIN usuarios a ON a.id = n.autor_id
    WHERE n.solicitud_id = $1
    ORDER BY n.created_at DESC, n.id DESC
  `, [solicitudId])
  return rows
}

// Reglas SLA sembradas: CRITICA=4, ALTA=8, MEDIA=24, BAJA=72.
// Acepta (cliente, prioridad) o directamente (prioridad).
async function obtenerSlaRegla (clienteOPrioridad, prioridad) {
  const c = prioridad !== undefined ? clienteOPrioridad : pool
  const p = prioridad !== undefined ? prioridad : clienteOPrioridad
  const { rows } = await c.query(
    'SELECT horas FROM sla_reglas WHERE prioridad = $1',
    [p]
  )
  return rows[0] ? rows[0].horas : null
}

// Regenera el token público (solo Admin) y audita fuera de este módulo.
async function actualizarToken (cliente, solicitudId, tokenPublico) {
  const { rows } = await cliente.query(
    'UPDATE solicitudes SET token_publico = $1, updated_at = now() WHERE id = $2 RETURNING id',
    [tokenPublico, solicitudId]
  )
  return rows[0]
}

// ─── Funciones auxiliares para asignación de técnicos ─────────────────────────

async function validarTecnicoActivo (cliente, tecnicoId) {
  const { rows } = await cliente.query(`
    SELECT t.usuario_id AS id, u.nombre, u.email
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.usuario_id = $1
      AND t.activo = true
      AND u.activo = true
      AND u.rol = 'TECNICO'
  `, [tecnicoId])
  return rows[0] || null
}

async function obtenerEspecialidadRequerida (cliente, categoriaId) {
  const { rows } = await cliente.query(`
    SELECT especialidad_requerida_id AS "especialidadRequeridaId"
    FROM categorias_servicio
    WHERE id = $1
  `, [categoriaId])
  return rows[0]?.especialidadRequeridaId || null
}

async function tecnicoTieneEspecialidad (cliente, tecnicoId, especialidadId) {
  const { rows } = await cliente.query(`
    SELECT 1 FROM tecnico_especialidad
    WHERE tecnico_id = $1 AND especialidad_id = $2
  `, [tecnicoId, especialidadId])
  return rows.length > 0
}

async function validarDisponibilidadTecnico (cliente, tecnicoId, fechaProgramada) {
  // EXTRACT(ISODOW FROM ...) devuelve 1 (lunes) a 7 (domingo)
  // La comparación de horario se realiza convirtiendo a la zona horaria del sistema (America/Guayaquil)
  const { rows } = await cliente.query(`
    SELECT id
    FROM disponibilidad
    WHERE tecnico_id = $1
      AND activo = true
      AND dia_semana = EXTRACT(ISODOW FROM ($2::timestamptz AT TIME ZONE 'America/Guayaquil'))
      AND hora_inicio <= ($2::timestamptz AT TIME ZONE 'America/Guayaquil')::time
      AND hora_fin >= ($2::timestamptz AT TIME ZONE 'America/Guayaquil')::time
  `, [tecnicoId, fechaProgramada])
  return rows.length > 0
}

async function detectarChoqueHorario (cliente, tecnicoId, fechaProgramada, solicitudActualId) {
  const { rows } = await cliente.query(`
    SELECT id, codigo, fecha_hora_programada AS "fechaProgramada"
    FROM solicitudes
    WHERE tecnico_id = $1
      AND id != $2
      AND estado IN ('ASIGNADA', 'EN_PROCESO')
      AND fecha_hora_programada IS NOT NULL
      AND fecha_hora_programada >= ($3::timestamptz - interval '1 hour')
      AND fecha_hora_programada <= ($3::timestamptz + interval '1 hour')
  `, [tecnicoId, solicitudActualId, fechaProgramada])
  return rows
}

module.exports = {
  listar,
  obtenerPorId,
  bloquearPorId,
  aplicarTransicion,
  insertarEvento,
  listarEventos,
  insertarNota,
  listarNotas,
  obtenerSlaRegla,
  actualizarToken,
  validarTecnicoActivo,
  obtenerEspecialidadRequerida,
  tecnicoTieneEspecialidad,
  validarDisponibilidadTecnico,
  detectarChoqueHorario
}
