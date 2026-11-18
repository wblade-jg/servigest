// Pruebas del flujo de Intervenciones del Técnico (Grupo G3 - Fase 3)

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  loginComo,
  crearSolicitudDirecta,
  CLAVE_PRUEBA
} from './auxiliares.js'
import { pool } from '../src/config/pool.js'

let admin = null
let coordinador = null
let organizacionId = null
const EMAIL_COORDINADOR = 'coordinador@prueba.com.ec'

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()

  organizacionId = await crearOrganizacion('Empresa Demo S.A.')
  admin = await crearUsuario({
    nombre: 'Admin General',
    email: 'admin@prueba.com.ec',
    rol: 'ADMIN'
  })
  coordinador = await crearUsuario({
    nombre: 'Coordinador Operaciones',
    email: EMAIL_COORDINADOR,
    rol: 'COORDINADOR'
  })
})

// Crea un técnico con sesión válida (hash real) y fila en tecnicos.
async function crearTecnico ({ nombre = 'Carlos Técnico', email = 'tecnico@prueba.com.ec' } = {}) {
  const usuario = await crearUsuario({ nombre, email, rol: 'TECNICO' })
  await pool.query('INSERT INTO tecnicos (usuario_id, activo) VALUES ($1, true)', [usuario.id])
  return { id: usuario.id, nombre, email }
}

// Solicitud ASIGNADA al técnico indicado.
async function crearSolicitudAsignada (tecnicoId, estado = 'ASIGNADA', extras = {}) {
  return crearSolicitudDirecta({
    estado,
    prioridad: 'ALTA',
    organizacionId,
    tecnicoId,
    ...extras
  })
}

// Lleva una solicitud ASIGNADA a EN_PROCESO iniciando la intervención (vía API).
async function iniciarIntervencion (ag, solicitudId, csrf) {
  const res = await ag
    .post(`/api/solicitudes/${solicitudId}/intervenciones`)
    .set('x-csrf-token', csrf)
    .send({})
    .expect(res => {
      if (![201, 403, 404, 409].includes(res.status)) {
        throw new Error(`iniciarIntervencion falló: ${res.status}`)
      }
    })
  return res
}

// Crea una intervención abierta y cerrada directamente en la base de datos.
async function crearIntervencionDirecta (solicitudId, tecnicoId, { abierta = false } = {}) {
  const inicio = new Date(Date.now() - 2 * 3600 * 1000)
  const fin = abierta ? null : new Date(Date.now() - 3600 * 1000)
  const { rows } = await pool.query(`
    INSERT INTO intervenciones (solicitud_id, tecnico_id, inicio, fin)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [solicitudId, tecnicoId, inicio, fin])
  return rows[0]
}

describe('G3: Inicio de intervención', () => {
  test('1. Inicio exitoso: técnico asignado inicia y la solicitud pasa a EN_PROCESO', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.30')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)

    const res = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)
    expect(res.status).toBe(201)
    expect(res.body.solicitudId).toBe(solicitud.id)
    expect(res.body.tecnicoId).toBe(tecnico.id)
    expect(res.body.estado).toBe('EN_PROCESO')
    expect(res.body.intervencionId).toBeDefined()

    // Estado de la solicitud y de la intervención
    const { rows } = await pool.query('SELECT estado FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('EN_PROCESO')
    const { rows: intervenciones } = await pool.query(
      'SELECT fin FROM intervenciones WHERE solicitud_id = $1', [solicitud.id])
    expect(intervenciones).toHaveLength(1)
    expect(intervenciones[0].fin).toBeNull()

    // Auditoría
    const { rows: eventos } = await pool.query(`
      SELECT tipo, estado_anterior, estado_nuevo FROM eventos_solicitud
      WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1`, [solicitud.id])
    expect(eventos[0].tipo).toBe('INTERVENCION_INICIO')
    expect(eventos[0].estado_anterior).toBe('ASIGNADA')
    expect(eventos[0].estado_nuevo).toBe('EN_PROCESO')
  })

  test('2. Rechazo: un técnico distinto del asignado recibe 404 (recurso oculto)', async () => {
    const tecnicoAsignado = await crearTecnico({ email: 'asignado@prueba.com.ec' })
    const tecnicoAjeno = await crearTecnico({ email: 'ajeno@prueba.com.ec' })
    const solicitud = await crearSolicitudAsignada(tecnicoAsignado.id)

    const ag = agente('198.51.100.31')
    const sesion = await loginComo(ag, tecnicoAjeno.email, CLAVE_PRUEBA)
    const res = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('SOLICITUD_NO_ENCONTRADA')

    // La solicitud no cambió de estado
    const { rows } = await pool.query('SELECT estado FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('ASIGNADA')
  })

  test('3. Rechazo: coordinador no puede iniciar intervención → 403 ROL_NO_AUTORIZADO', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.32')
    const sesion = await loginComo(ag, EMAIL_COORDINADOR, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)

    const res = await ag
      .post(`/api/solicitudes/${solicitud.id}/intervenciones`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({})
      .expect(403)
    expect(res.body.error.code).toBe('ROL_NO_AUTORIZADO')
  })

  test('4. Rechazo: segunda intervención simultánea → 409', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.33')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)

    await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)
    const res = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)
    expect(res.status).toBe(409)

    const { rows } = await pool.query(
      'SELECT count(*)::int AS total FROM intervenciones WHERE solicitud_id = $1', [solicitud.id])
    expect(rows[0].total).toBe(1)
  })
})

describe('G3: Resolución de intervención', () => {
  function cuerpoResolucionValido (sobrescribir = {}) {
    return {
      fin: new Date(Date.now() + 3600 * 1000).toISOString(),
      diagnostico: 'La fuente de poder del servidor está quemada y necesita reemplazo.',
      actividades: 'Se diagnosticó el equipo, se cambió la fuente y se ejecutaron pruebas.',
      resultado: 'Servidor operativo tras el reemplazo de la fuente de poder.',
      ...sobrescribir
    }
  }

  test('5. Resolución exitosa: documento completo, copia resolucion y audita INTERVENCION_FIN', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.34')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    const inicio = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)

    const cuerpo = cuerpoResolucionValido()
    const res = await ag
      .patch(`/api/intervenciones/${inicio.body.intervencionId}`)
      .set('x-csrf-token', sesion.csrfToken)
      .send(cuerpo)
      .expect(200)

    expect(res.body.estado).toBe('RESUELTA')
    expect(res.body.solicitudId).toBe(solicitud.id)

    // La intervención quedó cerrada
    const { rows: intervenciones } = await pool.query(
      'SELECT fin, diagnostico, resultado, observaciones FROM intervenciones WHERE id = $1',
      [inicio.body.intervencionId])
    expect(intervenciones[0].fin).not.toBeNull()
    expect(intervenciones[0].diagnostico).toBe(cuerpo.diagnostico)
    expect(intervenciones[0].resultado).toBe(cuerpo.resultado)
    expect(intervenciones[0].observaciones).toBeNull()

    // La solicitud quedó RESUELTA con la resolución copiada
    const { rows: solicitudes } = await pool.query(`
      SELECT estado, resolucion, resuelta_en FROM solicitudes WHERE id = $1`, [solicitud.id])
    expect(solicitudes[0].estado).toBe('RESUELTA')
    expect(solicitudes[0].resolucion).toBe(cuerpo.resultado)
    expect(solicitudes[0].resuelta_en).not.toBeNull()

    // Auditoría
    const { rows: eventos } = await pool.query(`
      SELECT tipo, estado_anterior, estado_nuevo FROM eventos_solicitud
      WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1`, [solicitud.id])
    expect(eventos[0].tipo).toBe('INTERVENCION_FIN')
    expect(eventos[0].estado_anterior).toBe('EN_PROCESO')
    expect(eventos[0].estado_nuevo).toBe('RESUELTA')
  })

  test('6. Rechazo: fin <= inicio → 422 FIN_ANTES_DE_INICIO', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.35')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    const inicio = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)

    const res = await ag
      .patch(`/api/intervenciones/${inicio.body.intervencionId}`)
      .set('x-csrf-token', sesion.csrfToken)
      .send(cuerpoResolucionValido({
        fin: new Date(Date.now() - 3 * 3600 * 1000).toISOString() // antes del inicio
      }))
      .expect(422)
    expect(res.body.error.code).toBe('FIN_ANTES_DE_INICIO')

    // La intervención sigue abierta y la solicitud EN_PROCESO
    const { rows } = await pool.query(
      'SELECT fin FROM intervenciones WHERE id = $1', [inicio.body.intervencionId])
    expect(rows[0].fin).toBeNull()
  })

  test('7. Rechazo: textos de documentación con menos de 10 caracteres → 400', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.36')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    const inicio = await iniciarIntervencion(ag, solicitud.id, sesion.csrfToken)

    const res = await ag
      .patch(`/api/intervenciones/${inicio.body.intervencionId}`)
      .set('x-csrf-token', sesion.csrfToken)
      .send(cuerpoResolucionValido({ diagnostico: 'corto' }))
      .expect(400)
    expect(res.body.error.code).toBe('DIAGNOSTICO_INVALIDO')
    expect(res.body.error.details.campos).toEqual(['diagnostico'])
  })

  test('8. Rechazo: un técnico distinto del asignado no puede resolver → 404', async () => {
    const tecnico = await crearTecnico({ email: 'dueño@prueba.com.ec' })
    const ajeno = await crearTecnico({ email: 'ajeno2@prueba.com.ec' })
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    const intervencion = await crearIntervencionDirecta(solicitud.id, tecnico.id)

    const ag = agente('198.51.100.37')
    const sesion = await loginComo(ag, ajeno.email, CLAVE_PRUEBA)
    const res = await ag
      .patch(`/api/intervenciones/${intervencion.id}`)
      .set('x-csrf-token', sesion.csrfToken)
      .send(cuerpoResolucionValido())
      .expect(404)
    expect(res.body.error.code).toBe('INTERVENCION_NO_ENCONTRADA')
  })

  test('9. Rechazo: resolver una intervención ya cerrada → 409', async () => {
    const tecnico = await crearTecnico()
    const ag = agente('198.51.100.38')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    const intervencion = await crearIntervencionDirecta(solicitud.id, tecnico.id) // ya cerrada

    const res = await ag
      .patch(`/api/intervenciones/${intervencion.id}`)
      .set('x-csrf-token', sesion.csrfToken)
      .send(cuerpoResolucionValido())
      .expect(409)
    expect(res.body.error.code).toBe('INTERVENCION_CERRADA')
  })
})

describe('G3: Cierre de solicitud', () => {
  test('10. Cierre exitoso: coordinador cierra una solicitud RESUELTA con resolución', async () => {
    const tecnico = await crearTecnico()
    const solicitud = await crearSolicitudAsignada(tecnico.id, 'RESUELTA', {
      fechaObjetivo: null
    })
    // La solicitud RESUELTA directa no tiene resolucion; la copiamos para simular el flujo real.
    await pool.query('UPDATE solicitudes SET resolucion = $1 WHERE id = $2',
      ['Equipo reparado y validado en sitio.', solicitud.id])
    const intervencion = await crearIntervencionDirecta(solicitud.id, tecnico.id)
    expect(intervencion.id).toBeDefined()

    const ag = agente('198.51.100.39')
    const sesion = await loginComo(ag, EMAIL_COORDINADOR, CLAVE_PRUEBA)
    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CERRADA' })
      .expect(200)

    expect(res.body.estado).toBe('CERRADA')

    const { rows } = await pool.query(`
      SELECT estado, cerrada_en FROM solicitudes WHERE id = $1`, [solicitud.id])
    expect(rows[0].estado).toBe('CERRADA')
    expect(rows[0].cerrada_en).not.toBeNull()

    const { rows: eventos } = await pool.query(`
      SELECT tipo, estado_anterior, estado_nuevo FROM eventos_solicitud
      WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1`, [solicitud.id])
    expect(eventos[0].tipo).toBe('CIERRE')
    expect(eventos[0].estado_anterior).toBe('RESUELTA')
    expect(eventos[0].estado_nuevo).toBe('CERRADA')
  })

  test('11. Rechazo: cierre sin resolución → 409 CIERRE_SIN_RESOLUCION', async () => {
    const tecnico = await crearTecnico()
    const solicitud = await crearSolicitudAsignada(tecnico.id, 'RESUELTA')
    // Sin resolucion: simula una RESUELTA sin documentación (no alcanzable por la API).

    const ag = agente('198.51.100.40')
    const sesion = await loginComo(ag, EMAIL_COORDINADOR, CLAVE_PRUEBA)
    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CERRADA' })
      .expect(409)
    expect(res.body.error.code).toBe('CIERRE_SIN_RESOLUCION')

    const { rows } = await pool.query('SELECT estado FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('RESUELTA')
  })

  test('12. Rechazo: el técnico no puede cerrar la solicitud → 403', async () => {
    const tecnico = await crearTecnico()
    const solicitud = await crearSolicitudAsignada(tecnico.id, 'RESUELTA')
    await pool.query('UPDATE solicitudes SET resolucion = $1 WHERE id = $2',
      ['Equipo reparado y validado en sitio.', solicitud.id])

    const ag = agente('198.51.100.41')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CERRADA' })
      .expect(403)
    expect(res.body.error.code).toBe('ROL_NO_AUTORIZADO')
  })
})

describe('G3: Listado de intervenciones', () => {
  test('13. El técnico ve todas las intervenciones de su solicitud asignada', async () => {
    const tecnico = await crearTecnico()
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    await crearIntervencionDirecta(solicitud.id, tecnico.id)
    await crearIntervencionDirecta(solicitud.id, tecnico.id)

    const ag = agente('198.51.100.42')
    const sesion = await loginComo(ag, tecnico.email, CLAVE_PRUEBA)
    const res = await ag
      .get(`/api/solicitudes/${solicitud.id}/intervenciones`)
      .expect(200)
    expect(res.body.data).toHaveLength(2)
  })

  test('14. Rechazo: el Cliente no accede al listado de intervenciones', async () => {
    const tecnico = await crearTecnico()
    const cliente = await crearUsuario({
      nombre: 'Cliente Demo',
      email: 'cliente@prueba.com.ec',
      rol: 'CLIENTE',
      organizacionId
    })
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    await crearIntervencionDirecta(solicitud.id, tecnico.id)

    const ag = agente('198.51.100.43')
    await loginComo(ag, 'cliente@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag
      .get(`/api/solicitudes/${solicitud.id}/intervenciones`)
      .expect(403)
    expect(res.body.error.code).toBe('ROL_NO_AUTORIZADO')
  })

  test('15. Rechazo: técnico recibe 404 por solicitud que no tiene asignada', async () => {
    const tecnicoAsignado = await crearTecnico({ email: 'dueño2@prueba.com.ec' })
    const ajeno = await crearTecnico({ email: 'ajeno3@prueba.com.ec' })
    const solicitud = await crearSolicitudAsignada(tecnicoAsignado.id)
    await crearIntervencionDirecta(solicitud.id, tecnicoAsignado.id)

    const ag = agente('198.51.100.44')
    await loginComo(ag, ajeno.email, CLAVE_PRUEBA)
    const res = await ag
      .get(`/api/solicitudes/${solicitud.id}/intervenciones`)
      .expect(404)
    expect(res.body.error.code).toBe('SOLICITUD_NO_ENCONTRADA')
  })

  test('16. El coordinador ve las intervenciones de cualquier solicitud', async () => {
    const tecnico = await crearTecnico()
    const solicitud = await crearSolicitudAsignada(tecnico.id)
    await crearIntervencionDirecta(solicitud.id, tecnico.id)

    const ag = agente('198.51.100.45')
    await loginComo(ag, EMAIL_COORDINADOR, CLAVE_PRUEBA)
    const res = await ag
      .get(`/api/solicitudes/${solicitud.id}/intervenciones`)
      .expect(200)
    expect(res.body.data).toHaveLength(1)
  })
})
