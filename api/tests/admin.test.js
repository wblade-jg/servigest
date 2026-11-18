// Pruebas de módulos administrativos: CSRF, validaciones y formato de paginación uniforme.

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearUsuario,
  loginComo,
  CLAVE_PRUEBA
} from './auxiliares.js'

let admin = null

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()
  admin = await crearUsuario({
    email: 'admin@prueba.com.ec',
    rol: 'ADMIN',
    nombre: 'Super Administrador'
  })
})

describe('Protección CSRF en módulos administrativos', () => {
  test('POST /api/organizaciones sin CSRF → 403 CSRF_INVALIDO; con CSRF → 201', async () => {
    const ag = agente('198.51.100.10')
    const sesion = await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    // Sin token CSRF
    const sinCsrf = await ag
      .post('/api/organizaciones')
      .send({ nombre: 'Org Sin CSRF' })
      .expect(403)
    expect(sinCsrf.body.error.code).toBe('CSRF_INVALIDO')

    // Con token CSRF
    const conCsrf = await ag
      .post('/api/organizaciones')
      .set('x-csrf-token', sesion.csrfToken)
      .send({ nombre: 'Org Con CSRF' })
      .expect(201)
    expect(conCsrf.body.nombre).toBe('Org Con CSRF')
  })

  test('POST /api/usuarios sin CSRF → 403 CSRF_INVALIDO; con CSRF → 201', async () => {
    const ag = agente('198.51.100.11')
    const sesion = await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    // Sin token CSRF
    const sinCsrf = await ag
      .post('/api/usuarios')
      .send({
        nombre: 'Nuevo Usuario',
        email: 'nuevo@prueba.com.ec',
        password: CLAVE_PRUEBA,
        rol: 'COORDINADOR'
      })
      .expect(403)
    expect(sinCsrf.body.error.code).toBe('CSRF_INVALIDO')

    // Con token CSRF
    const conCsrf = await ag
      .post('/api/usuarios')
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        nombre: 'Nuevo Usuario',
        email: 'nuevo@prueba.com.ec',
        password: CLAVE_PRUEBA,
        rol: 'COORDINADOR'
      })
      .expect(201)
    expect(conCsrf.body.email).toBe('nuevo@prueba.com.ec')
  })

  test('POST /api/catalogos/especialidades sin CSRF → 403 CSRF_INVALIDO; con CSRF → 201', async () => {
    const ag = agente('198.51.100.12')
    const sesion = await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const nombre = `Redes y Fibra ${Date.now()}`
    // Sin token CSRF
    const sinCsrf = await ag
      .post('/api/catalogos/especialidades')
      .send({ nombre })
      .expect(403)
    expect(sinCsrf.body.error.code).toBe('CSRF_INVALIDO')

    // Con token CSRF
    const conCsrf = await ag
      .post('/api/catalogos/especialidades')
      .set('x-csrf-token', sesion.csrfToken)
      .send({ nombre })
      .expect(201)
    expect(conCsrf.body.nombre).toBe(nombre)
  })
})

describe('Validación de formato de email en usuarios', () => {
  test('POST /api/usuarios con email malformado → 400 EMAIL_INVALIDO', async () => {
    const ag = agente('198.51.100.13')
    const sesion = await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const res = await ag
      .post('/api/usuarios')
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        nombre: 'Usuario Email Roto',
        email: 'correo-sin-arroba',
        password: CLAVE_PRUEBA,
        rol: 'COORDINADOR'
      })
      .expect(400)

    expect(res.body.error.code).toBe('EMAIL_INVALIDO')
  })
})

describe('Formato de respuesta de paginación uniforme { data, page, limit, total }', () => {
  test('GET /api/organizaciones incluye page y limit', async () => {
    const ag = agente('198.51.100.14')
    await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const res = await ag.get('/api/organizaciones?page=2&limit=5').expect(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('page', 2)
    expect(res.body).toHaveProperty('limit', 5)
    expect(res.body).toHaveProperty('total')
  })

  test('GET /api/usuarios incluye page y limit', async () => {
    const ag = agente('198.51.100.15')
    await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const res = await ag.get('/api/usuarios?page=1&limit=10').expect(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('page', 1)
    expect(res.body).toHaveProperty('limit', 10)
    expect(res.body).toHaveProperty('total')
  })

  test('GET /api/tecnicos incluye page y limit', async () => {
    const ag = agente('198.51.100.16')
    await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const res = await ag.get('/api/tecnicos?page=1&limit=10').expect(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('page', 1)
    expect(res.body).toHaveProperty('limit', 10)
    expect(res.body).toHaveProperty('total')
  })

  test('GET /api/catalogos/especialidades incluye page y limit', async () => {
    const ag = agente('198.51.100.17')
    await loginComo(ag, 'admin@prueba.com.ec', CLAVE_PRUEBA)

    const res = await ag.get('/api/catalogos/especialidades?page=1&limit=25').expect(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('page', 1)
    expect(res.body).toHaveProperty('limit', 25)
    expect(res.body).toHaveProperty('total')
  })
})
