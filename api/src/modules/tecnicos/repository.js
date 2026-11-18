import { pool } from '../../config/pool.js'

// SQL del módulo de técnicos.

// Listado con filtros, paginación y orden. Devuelve { data, total }.
async function listar ({ filtros }) {
  const condiciones = ['t.activo = true', 'u.activo = true']
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  if (filtros.especialidadId) {
    condiciones.push(`EXISTS (
      SELECT 1 FROM tecnico_especialidad te
      WHERE te.tecnico_id = t.usuario_id AND te.especialidad_id = ${agregados(filtros.especialidadId)}
    )`)
  }

  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`u.nombre ILIKE ${agregados(patron)}`)
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`
  const orden = filtros.orden === 'nombre-asc' ? 'ASC' : 'DESC'

  const { rows: data } = await pool.query(`
    SELECT t.usuario_id AS id, u.nombre, u.email, t.notas, t.activo,
           (
             SELECT json_agg(e.nombre)
             FROM tecnico_especialidad te
             JOIN especialidades e ON e.id = te.especialidad_id
             WHERE te.tecnico_id = t.usuario_id
           ) AS especialidades,
           t.created_at AS "createdAt", t.updated_at AS "updatedAt"
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.usuario_id
    ${donde}
    ORDER BY ${filtros.orden === 'nombre-asc' ? 'u.nombre' : 't.created_at'} ${orden}
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.usuario_id
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

// Obtener técnico por ID. Devuelve null si no existe.
async function obtenerPorId (id) {
  const { rows } = await pool.query(`
    SELECT t.usuario_id AS id, u.nombre, u.email, t.notas, t.activo,
           (
             SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre))
             FROM tecnico_especialidad te
             JOIN especialidades e ON e.id = te.especialidad_id
             WHERE te.tecnico_id = t.usuario_id
           ) AS especialidades,
           t.created_at AS "createdAt", t.updated_at AS "updatedAt"
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.usuario_id = $1
  `, [id])
  return rows[0] || null
}

// Verificar si un usuario es técnico (activo o no).
async function obtenerTecnicoPorUsuarioId (usuarioId) {
  const { rows } = await pool.query(`
    SELECT usuario_id, activo
    FROM tecnicos
    WHERE usuario_id = $1
  `, [usuarioId])
  return rows[0] || null
}

// Crear técnico (habilitar usuario como técnico).
async function crear ({ usuarioId, notas }) {
  const { rows } = await pool.query(`
    INSERT INTO tecnicos (usuario_id, notas)
    VALUES ($1, $2)
    ON CONFLICT (usuario_id) DO UPDATE
      SET activo = true, notas = $2, updated_at = now()
    RETURNING usuario_id AS id, activo, created_at AS "createdAt"
  `, [usuarioId, notas || null])
  return rows[0]
}

// Actualizar técnico.
async function actualizar (id, { notas }) {
  const { rows } = await pool.query(`
    UPDATE tecnicos
    SET notas = $2, updated_at = now()
    WHERE usuario_id = $1
    RETURNING usuario_id AS id, activo
  `, [id, notas || null])
  return rows[0] || null
}

// Desactivar técnico.
async function desactivar (id) {
  const { rows } = await pool.query(`
    UPDATE tecnicos
    SET activo = false, updated_at = now()
    WHERE usuario_id = $1
    RETURNING usuario_id AS id
  `, [id])
  return rows[0] || null
}

// Asignar especialidades (reemplaza el conjunto completo).
async function asignarEspecialidades (cliente, tecnicoId, especialidadIds) {
  // Eliminar las existentes.
  await cliente.query('DELETE FROM tecnico_especialidad WHERE tecnico_id = $1', [tecnicoId])

  // Insertar las nuevas.
  if (especialidadIds && especialidadIds.length > 0) {
    const valores = especialidadIds.map((eid, i) => `($1, $${i + 2})`).join(', ')
    await cliente.query(
      `INSERT INTO tecnico_especialidad (tecnico_id, especialidad_id) VALUES ${valores}`,
      [tecnicoId, ...especialidadIds]
    )
  }

  return { ok: true, count: especialidadIds ? especialidadIds.length : 0 }
}

// Obtener especialidades de un técnico.
async function obtenerEspecialidades (tecnicoId) {
  const { rows } = await pool.query(`
    SELECT e.id, e.nombre
    FROM tecnico_especialidad te
    JOIN especialidades e ON e.id = te.especialidad_id
    WHERE te.tecnico_id = $1
    ORDER BY e.nombre
  `, [tecnicoId])
  return rows
}

// Verificar si tiene una especialidad específica.
async function tieneEspecialidad (tecnicoId, especialidadId) {
  const { rows } = await pool.query(`
    SELECT 1
    FROM tecnico_especialidad
    WHERE tecnico_id = $1 AND especialidad_id = $2
  `, [tecnicoId, especialidadId])
  return rows.length > 0
}

// --- Disponibilidad ---

// Listar disponibilidad de un técnico.
async function listarDisponibilidad (tecnicoId) {
  const { rows } = await pool.query(`
    SELECT id, dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin", activo
    FROM disponibilidad
    WHERE tecnico_id = $1
    ORDER BY dia_semana, hora_inicio
  `, [tecnicoId])
  return rows
}

// Crear franja de disponibilidad.
async function crearDisponibilidad ({ tecnicoId, diaSemana, horaInicio, horaFin }) {
  const { rows } = await pool.query(`
    INSERT INTO disponibilidad (tecnico_id, dia_semana, hora_inicio, hora_fin)
    VALUES ($1, $2, $3, $4)
    RETURNING id, dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin", activo
  `, [tecnicoId, diaSemana, horaInicio, horaFin])
  return rows[0]
}

// Verificar solapamiento de franjas.
async function verificarSolapamiento ({ tecnicoId, diaSemana, horaInicio, horaFin, excluirId = null }) {
  const condiciones = [
    'tecnico_id = $1',
    'dia_semana = $2',
    'activo = true',
    '(hora_inicio, hora_fin) OVERLAPS ($3::time, $4::time)'
  ]
  const valores = [tecnicoId, diaSemana, horaInicio, horaFin]

  if (excluirId) {
    condiciones.push(`id != $${valores.push(excluirId)}`)
  }

  const { rows } = await pool.query(`
    SELECT id
    FROM disponibilidad
    WHERE ${condiciones.join(' AND ')}
  `, valores)

  return rows.length > 0
}

// Actualizar franja de disponibilidad.
async function actualizarDisponibilidad (id, { diaSemana, horaInicio, horaFin }) {
  const { rows } = await pool.query(`
    UPDATE disponibilidad
    SET dia_semana = $2, hora_inicio = $3, hora_fin = $4
    WHERE id = $1
    RETURNING id, dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin", activo
  `, [id, diaSemana, horaInicio, horaFin])
  return rows[0] || null
}

// Obtener el ID del técnico asociado a una franja de disponibilidad.
async function obtenerTecnicoIdDeFranja (franjaId) {
  const { rows } = await pool.query(
    'SELECT tecnico_id AS "tecnicoId" FROM disponibilidad WHERE id = $1',
    [franjaId]
  )
  return rows[0] ? rows[0].tecnicoId : null
}

// Desactivar franja de disponibilidad.
async function desactivarDisponibilidad (id) {
  const { rows } = await pool.query(`
    UPDATE disponibilidad
    SET activo = false
    WHERE id = $1
    RETURNING id
  `, [id])
  return rows[0] || null
}

export {
  listar,
  obtenerPorId,
  obtenerTecnicoPorUsuarioId,
  crear,
  actualizar,
  desactivar,
  asignarEspecialidades,
  obtenerEspecialidades,
  tieneEspecialidad,
  listarDisponibilidad,
  crearDisponibilidad,
  verificarSolapamiento,
  actualizarDisponibilidad,
  desactivarDisponibilidad,
  obtenerTecnicoIdDeFranja
}
