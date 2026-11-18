import { pool } from '../../config/pool.js'

// SQL del módulo de catálogos (especialidades y categorías).

// --- Especialidades ---

async function listarEspecialidades ({ filtros }) {
  const condiciones = ['activo = true']
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`nombre ILIKE ${agregados(patron)}`)
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`

  const { rows: data } = await pool.query(`
    SELECT id, nombre, activo, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM especialidades
    ${donde}
    ORDER BY nombre
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM especialidades
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

async function obtenerEspecialidadPorId (id) {
  const { rows } = await pool.query(`
    SELECT id, nombre, activo, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM especialidades
    WHERE id = $1
  `, [id])
  return rows[0] || null
}

async function obtenerEspecialidadPorNombre (nombre) {
  const { rows } = await pool.query(`
    SELECT id, nombre
    FROM especialidades
    WHERE nombre = $1 AND activo = true
  `, [nombre])
  return rows[0] || null
}

async function crearEspecialidad ({ nombre }) {
  const { rows } = await pool.query(`
    INSERT INTO especialidades (nombre)
    VALUES ($1)
    RETURNING id, nombre, activo, created_at AS "createdAt", updated_at AS "updatedAt"
  `, [nombre])
  return rows[0]
}

async function actualizarEspecialidad (id, { nombre }) {
  const { rows } = await pool.query(`
    UPDATE especialidades
    SET nombre = $2, updated_at = now()
    WHERE id = $1
    RETURNING id, nombre, activo, created_at AS "createdAt", updated_at AS "updatedAt"
  `, [id, nombre])
  return rows[0] || null
}

async function desactivarEspecialidad (id) {
  const { rows } = await pool.query(`
    UPDATE especialidades
    SET activo = false, updated_at = now()
    WHERE id = $1
    RETURNING id
  `, [id])
  return rows[0] || null
}

async function especialidadEnUso (id) {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM tecnico_especialidad WHERE especialidad_id = $1) +
      (SELECT count(*) FROM categorias_servicio WHERE especialidad_requerida_id = $1) AS total
  `, [id])
  return rows[0].total > 0
}

// --- Categorías ---

async function listarCategorias ({ filtros }) {
  const condiciones = ['c.activo = true']
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`(c.nombre ILIKE ${agregados(patron)} OR c.descripcion ILIKE ${agregados(patron)})`)
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`

  const { rows: data } = await pool.query(`
    SELECT c.id, c.nombre, c.descripcion, c.orden,
           c.especialidad_requerida_id AS "especialidadRequeridaId",
           e.nombre AS "especialidadRequeridaNombre",
           c.activo, c.created_at AS "createdAt", c.updated_at AS "updatedAt"
    FROM categorias_servicio c
    LEFT JOIN especialidades e ON e.id = c.especialidad_requerida_id
    ${donde}
    ORDER BY c.orden, c.nombre
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM categorias_servicio c
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

async function obtenerCategoriaPorId (id) {
  const { rows } = await pool.query(`
    SELECT c.id, c.nombre, c.descripcion, c.orden,
           c.especialidad_requerida_id AS "especialidadRequeridaId",
           e.nombre AS "especialidadRequeridaNombre",
           c.activo, c.created_at AS "createdAt", c.updated_at AS "updatedAt"
    FROM categorias_servicio c
    LEFT JOIN especialidades e ON e.id = c.especialidad_requerida_id
    WHERE c.id = $1
  `, [id])
  return rows[0] || null
}

async function obtenerCategoriaPorNombre (nombre) {
  const { rows } = await pool.query(`
    SELECT id, nombre
    FROM categorias_servicio
    WHERE nombre = $1 AND activo = true
  `, [nombre])
  return rows[0] || null
}

async function crearCategoria ({ nombre, descripcion, especialidadRequeridaId, orden }) {
  const { rows } = await pool.query(`
    INSERT INTO categorias_servicio (nombre, descripcion, especialidad_requerida_id, orden)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, descripcion, orden,
              especialidad_requerida_id AS "especialidadRequeridaId",
              activo, created_at AS "createdAt", updated_at AS "updatedAt"
  `, [nombre, descripcion || null, especialidadRequeridaId || null, orden || 0])
  return rows[0]
}

async function actualizarCategoria (id, { nombre, descripcion, especialidadRequeridaId, orden }) {
  const { rows } = await pool.query(`
    UPDATE categorias_servicio
    SET nombre = $2, descripcion = $3, especialidad_requerida_id = $4, orden = $5, updated_at = now()
    WHERE id = $1
    RETURNING id, nombre, descripcion, orden,
              especialidad_requerida_id AS "especialidadRequeridaId",
              activo, created_at AS "createdAt", updated_at AS "updatedAt"
  `, [id, nombre, descripcion || null, especialidadRequeridaId || null, orden || 0])
  return rows[0] || null
}

async function desactivarCategoria (id) {
  const { rows } = await pool.query(`
    UPDATE categorias_servicio
    SET activo = false, updated_at = now()
    WHERE id = $1
    RETURNING id
  `, [id])
  return rows[0] || null
}

async function categoriaEnUso (id) {
  const { rows } = await pool.query(`
    SELECT count(*)::int AS total
    FROM solicitudes
    WHERE categoria_id = $1
  `, [id])
  return rows[0].total > 0
}

export {
  listarEspecialidades,
  obtenerEspecialidadPorId,
  obtenerEspecialidadPorNombre,
  crearEspecialidad,
  actualizarEspecialidad,
  desactivarEspecialidad,
  especialidadEnUso,
  listarCategorias,
  obtenerCategoriaPorId,
  obtenerCategoriaPorNombre,
  crearCategoria,
  actualizarCategoria,
  desactivarCategoria,
  categoriaEnUso
}
