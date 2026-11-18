'use strict'

// Pruebas del Dashboard Operativo (Grupo G6 - Fase 3)

const {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  loginComo,
  crearSolicitudDirecta,
  CLAVE_PRUEBA
} = require('./auxiliares')
const { pool } = require('../src/config/pool')

let organizacionA = null
let organizacionB = null
let tecnico = null

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()

  organizacionA = await crearOrganizacion('Empresa A S.A.')
  organizacionB = await crearOrganizacion('Empresa B S.A.')

  await crearUsuario({ nombre: 'Admin General', email: 'admin@prueba.com.ec', rol: 'ADMIN' })
  await crearUsuario({ nombre: 'Coordinador', email: 'coordinador@prueba.com.ec', rol: 'COORDINADOR' })
  await crearUsuario({
    nombre: 'Cliente A', email: 'clientea@prueba.com.ec', rol: 'CLIENTE', organizacionId: organizacionA
  })

  const usuarioTecnico = await crearUsuario({
    nombre: 'Técnico Uno', email: 'tecnico@prueba.com.ec', rol: 'TECNICO'
  })
  await pool.query('INSERT INTO tecnicos (usuario_id, activo) VALUES ($1, true)', [usuarioTecnico.id])
  tecnico = usuarioTecnico
})

let contador = 0
async function crear (organizacionId, estado, extras = {}) {
  contador += 1
  return crearSolicitudDirecta({
    codigo: `SOL-2026-${String(contador).padStart(5, '0')}`,
    origen: 'CLIENTE',
    organizacionId,
    estado,
    ...extras
  })
}

describe('G6: Dashboard operativo', () => {
  test('1. Admin ve métricas globales: total, estados y prioridades no terminales', async () => {
    await crear(organizacionA, 'RECIBIDA', { prioridad: 'ALTA' })
    await crear(organizacionA, 'ASIGNADA', { prioridad: 'MEDIA', tecnicoId: tecnico.id })
    await crear(organizacionB, 'EN_PROCESO', { prioridad: 'CRITICA', tecnicoId: tecnico.id })
    const rechazada = await crear(organizacionB, 'RECIBIDA', { prioridad: 'BAJA' })
    await pool.query(`
      UPDATE solicitudes SET estado = 'RECHAZADA', rechazada_motivo = $2 WHERE id = $1
    `, [rechazada.id, 'Fuera de alcance del servicio contratado.'])

    const ag = agente('198.51.100.50')
    const sesion = await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag
      .get('/api/dashboard')
      .set('x-csrf-token', sesion.csrfToken)
      .expect(200)

    expect(res.body.total).toBe(4)
    const estados = Object.fromEntries(res.body.porEstado.map((e) => [e.estado, e.total]))
    expect(estados.RECIBIDA).toBe(1)
    expect(estados.ASIGNADA).toBe(1)
    expect(estados.EN_PROCESO).toBe(1)
    expect(estados.RECHAZADA).toBe(1)

    // Prioridades solo de no terminales: RECHAZADA queda fuera.
    const prioridades = res.body.porPrioridad.map((p) => p.prioridad).sort()
    expect(prioridades).toEqual(['ALTA', 'CRITICA', 'MEDIA'])
    expect(res.body.porPrioridad.find((p) => p.prioridad === 'BAJA')).toBeUndefined()

    // Carga por técnico (solo internos): ASIGNADA + EN_PROCESO
    expect(res.body.cargaTecnicos).toHaveLength(1)
    expect(res.body.cargaTecnicos[0]).toMatchObject({ tecnicoId: tecnico.id, total: 2 })
  })

  test('2. Cliente ve solo su organización y no recibe carga de técnicos', async () => {
    await crear(organizacionA, 'RECIBIDA')
    await crear(organizacionA, 'ASIGNADA', { tecnicoId: tecnico.id })
    await crear(organizacionB, 'RECIBIDA')
    await crear(organizacionB, 'RECIBIDA')

    const ag = agente('198.51.100.51')
    await loginComo(ag, 'clientea@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag.get('/api/dashboard').expect(200)

    expect(res.body.total).toBe(2)
    expect(res.body.cargaTecnicos).toBeNull()
    const estados = Object.fromEntries(res.body.porEstado.map((e) => [e.estado, e.total]))
    expect(estados.RECIBIDA).toBe(1)
    expect(estados.ASIGNADA).toBe(1)
  })

  test('3. Clasificación SLA: en plazo, próximas a vencer (24 h) y vencidas', async () => {
    const enPlazo = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    const porVencer = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
    const vencida = new Date(Date.now() - 2 * 3600 * 1000).toISOString()

    await crear(organizacionA, 'ASIGNADA', { prioridad: 'MEDIA', tecnicoId: tecnico.id, fechaObjetivo: enPlazo })
    await crear(organizacionA, 'ASIGNADA', { prioridad: 'ALTA', tecnicoId: tecnico.id, fechaObjetivo: porVencer })
    await crear(organizacionA, 'EN_PROCESO', { prioridad: 'CRITICA', tecnicoId: tecnico.id, fechaObjetivo: vencida })
    // Terminal con fecha vencida: no cuenta
    await crear(organizacionA, 'CERRADA', { prioridad: 'BAJA', fechaObjetivo: vencida })
    // No terminal sin fecha objetivo
    await crear(organizacionA, 'RECIBIDA')

    const ag = agente('198.51.100.52')
    await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag.get('/api/dashboard').expect(200)

    expect(res.body.sla.enPlazo).toBe(1)
    expect(res.body.sla.porVencer).toBe(1)
    expect(res.body.sla.vencidas).toBe(1)
    expect(res.body.sla.sinFecha).toBe(1)
  })

  test('4. MTTR: promedio en horas de los últimos 30 días', async () => {
    const ahora = Date.now()
    const horasEnMs = (h) => h * 3600 * 1000

    // Dos solicitudes resueltas: 10 h y 20 h → MTTR 15 h
    const a = await crear(organizacionA, 'RESUELTA', { prioridad: 'ALTA' })
    const b = await crear(organizacionA, 'RESUELTA', { prioridad: 'MEDIA' })
    // Una fuera de la ventana de 30 días: no debe contar
    const c = await crear(organizacionA, 'RESUELTA', { prioridad: 'BAJA' })

    await pool.query(`
      UPDATE solicitudes SET aprobada_en = $2, resuelta_en = $3 WHERE id = $1
    `, [a.id, new Date(ahora - horasEnMs(12)), new Date(ahora - horasEnMs(2))])
    await pool.query(`
      UPDATE solicitudes SET aprobada_en = $2, resuelta_en = $3 WHERE id = $1
    `, [b.id, new Date(ahora - horasEnMs(30)), new Date(ahora - horasEnMs(10))])
    await pool.query(`
      UPDATE solicitudes SET aprobada_en = $2, resuelta_en = $3 WHERE id = $1
    `, [c.id, new Date(ahora - 60 * 24 * 3600 * 1000), new Date(ahora - 59 * 24 * 3600 * 1000)])

    const ag = agente('198.51.100.53')
    await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag.get('/api/dashboard').expect(200)

    expect(res.body.mttrHoras).toBe(15)
  })

  test('5. Rechazo de otros roles y acceso del Coordinador con carga de técnicos', async () => {
    const clienteB = await crearUsuario({
      nombre: 'Cliente B', email: 'clienteb@prueba.com.ec', rol: 'CLIENTE', organizacionId: organizacionB
    })
    expect(clienteB.id).toBeDefined()

    const ag = agente('198.51.100.54')
    await loginComo(ag, 'tecnico@prueba.com.ec', CLAVE_PRUEBA)
    const res = await ag.get('/api/dashboard').expect(403)
    expect(res.body.error.code).toBe('ROL_NO_AUTORIZADO')

    const agCoord = agente('198.51.100.55')
    await loginComo(agCoord, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const organizacionC = await crearOrganizacion('Empresa C S.A.')
    await crear(organizacionC, 'ASIGNADA', { tecnicoId: tecnico.id })
    const dashboard = await agCoord.get('/api/dashboard').expect(200)
    expect(Array.isArray(dashboard.body.cargaTecnicos)).toBe(true)
  })
})
