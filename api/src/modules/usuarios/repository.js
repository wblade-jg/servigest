import { pool } from '../../config/pool.js'

// SQL del módulo de usuarios.

// Listado con filtros, paginación y orden. Devuelve { data, total }.
async function listar ({ filtros }) {
  const condiciones = ['u.activo = true']
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  if (filtros.rol) condiciones.push(`u.rol = ${agregados(filtros.rol)}`)
  if (filtros.organizacionId) condiciones.push(`u.organizacion_id = ${agregados(filtros.organizacionId)}`)
  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`(u.nombre ILIKE ${agregados(patron)} OR u.email ILIKE ${agregados(patron)})`)
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`
  const orden = filtros.orden === 'nombre-asc' ? 'ASC' : 'DESC'

  const { rows: data } = await pool.query(`
    SELECT u.id, u.nombre, u.email, u.rol, u.organizacion_id AS "organizacionId",
           o.nombre AS "organizacionNombre", u.activo,
           u.created_at AS "createdAt", u.updated_at AS "updatedAt"
    FROM usuarios u
    LEFT JOIN organizaciones o ON o.id = u.organizacion_id
    ${donde}
    ORDER BY ${filtros.orden === 'nombre-asc' ? 'u.nombre' : 'u.created_at'} ${orden}
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM usuarios u
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

// Obtener usuario por ID. Devuelve null si no existe.
async function obtenerPorId (id) {
  const { rows } = await pool.query(`
    SELECT u.id, u.nombre, u.email, u.rol, u.organizacion_id AS "organizacionId",
           o.nombre AS "organizacionNombre", u.activo,
           u.created_at AS "createdAt", u.updated_at AS "updatedAt"
    FROM usuarios u
    LEFT JOIN organizaciones o ON o.id = u.organizacion_id
    WHERE u.id = $1
  `, [id])
  return rows[0] || null
}

// Buscar por email (para validar unicidad). Devuelve null si no existe.
async function obtenerPorEmail (email) {
  const { rows } = await pool.query(`
    SELECT id, nombre, email, rol
    FROM usuarios
    WHERE email = $1 AND activo = true
  `, [email])
  return rows[0] || null
}

// Crear usuario. Devuelve el registro creado.
async function crear ({ nombre, email, passwordHash, rol, organizacionId }) {
  const { rows } = await pool.query(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, organizacion_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, nombre, email, rol, organizacion_id AS "organizacionId", activo,
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [nombre, email, passwordHash, rol, organizacionId || null])
  return rows[0]
}

// Actualizar usuario. Devuelve el registro actualizado.
async function actualizar (id, { nombre, email, rol, organizacionId }) {
  const { rows } = await pool.query(`
    UPDATE usuarios
    SET nombre = $2, email = $3, rol = $4, organizacion_id = $5, updated_at = now()
    WHERE id = $1
    RETURNING id, nombre, email, rol, organizacion_id AS "organizacionId", activo,
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [id, nombre, email, rol, organizacionId || null])
  return rows[0] || null
}

// Actualizar contraseña.
async function actualizarPassword (id, passwordHash) {
  const { rows } = await pool.query(`
    UPDATE usuarios
    SET password_hash = $2, updated_at = now()
    WHERE id = $1
    RETURNING id
  `, [id, passwordHash])
  return rows[0] || null
}

// Desactivar usuario (borrado lógico).
async function desactivar (id) {
  const { rows } = await pool.query(`
    UPDATE usuarios
    SET activo = false, updated_at = now()
    WHERE id = $1
    RETURNING id
  `, [id])
  return rows[0] || null
}

// Verificar si es técnico activo.
async function esTecnicoActivo (id) {
  const { rows } = await pool.query(`
    SELECT t.usuario_id
    FROM tecnicos t
    JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.usuario_id = $1 AND t.activo = true AND u.activo = true
  `, [id])
  return rows.length > 0
}

export {
  listar,
  obtenerPorId,
  obtenerPorEmail,
  crear,
  actualizar,
  actualizarPassword,
  desactivar,
  esTecnicoActivo
}
