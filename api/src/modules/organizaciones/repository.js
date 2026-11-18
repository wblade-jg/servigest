'use strict'

const { pool } = require('../../config/pool')

// SQL del módulo de organizaciones.

// Listado con filtros, paginación y orden. Devuelve { data, total }.
async function listar ({ filtros }) {
  const condiciones = ['activo = true']
  const valores = []
  const agregados = (valor) => `$${valores.push(valor)}`

  if (filtros.q) {
    const patron = `%${filtros.q}%`
    condiciones.push(`(nombre ILIKE ${agregados(patron)} OR ruc ILIKE ${agregados(patron)})`)
  }

  const donde = `WHERE ${condiciones.join(' AND ')}`
  const orden = filtros.orden === 'nombre-asc' ? 'ASC' : 'DESC'

  const { rows: data } = await pool.query(`
    SELECT id, nombre, ruc, telefono, direccion, activo,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM organizaciones
    ${donde}
    ORDER BY ${filtros.orden === 'nombre-asc' ? 'nombre' : 'created_at'} ${orden}
    LIMIT ${agregados(filtros.limit)} OFFSET ${agregados(filtros.limit * (filtros.page - 1))}
  `, valores)

  const { rows: conteo } = await pool.query(`
    SELECT count(*)::int AS total
    FROM organizaciones
    ${donde}
  `, valores.slice(0, valores.length - 2))

  return { data, total: conteo[0].total }
}

// Obtener organización por ID. Devuelve null si no existe.
async function obtenerPorId (id) {
  const { rows } = await pool.query(`
    SELECT id, nombre, ruc, telefono, direccion, activo,
           created_at AS "createdAt", updated_at AS "updatedAt"
    FROM organizaciones
    WHERE id = $1
  `, [id])
  return rows[0] || null
}

// Buscar por RUC (para validar unicidad). Devuelve null si no existe.
async function obtenerPorRuc (ruc) {
  const { rows } = await pool.query(`
    SELECT id, nombre, ruc
    FROM organizaciones
    WHERE ruc = $1 AND activo = true
  `, [ruc])
  return rows[0] || null
}

// Crear organización. Devuelve el registro creado.
async function crear ({ nombre, ruc, telefono, direccion }) {
  const { rows } = await pool.query(`
    INSERT INTO organizaciones (nombre, ruc, telefono, direccion)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, ruc, telefono, direccion, activo,
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [nombre, ruc || null, telefono || null, direccion || null])
  return rows[0]
}

// Actualizar organización. Devuelve el registro actualizado.
async function actualizar (id, { nombre, ruc, telefono, direccion }) {
  const { rows } = await pool.query(`
    UPDATE organizaciones
    SET nombre = $2, ruc = $3, telefono = $4, direccion = $5, updated_at = now()
    WHERE id = $1
    RETURNING id, nombre, ruc, telefono, direccion, activo,
              created_at AS "createdAt", updated_at AS "updatedAt"
  `, [id, nombre, ruc || null, telefono || null, direccion || null])
  return rows[0] || null
}

// Desactivar organización (borrado lógico).
async function desactivar (id) {
  const { rows } = await pool.query(`
    UPDATE organizaciones
    SET activo = false, updated_at = now()
    WHERE id = $1
    RETURNING id
  `, [id])
  return rows[0] || null
}

// Verificar si tiene usuarios activos (para impedir desactivación).
async function tieneUsuariosActivos (id) {
  const { rows } = await pool.query(`
    SELECT count(*)::int AS total
    FROM usuarios
    WHERE organizacion_id = $1 AND activo = true
  `, [id])
  return rows[0].total > 0
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerPorRuc,
  crear,
  actualizar,
  desactivar,
  tieneUsuariosActivos
}
