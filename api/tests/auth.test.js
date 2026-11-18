// Pruebas del módulo de autenticación: login, bloqueo, CSRF, sesión y password.

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  loginComo,
  CLAVE_PRUEBA
} from './auxiliares.js'
import { pool } from '../src/config/pool.js'

let coordinador = null

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()
  coordinador = await crearUsuario({
    email: 'coord@prueba.com.ec',
    rol: 'COORDINADOR',
    nombre: 'Andrés Cáceres'
  })
})

describe('POST /api/auth/login', () => {
  test('login correcto: 200 con usuario, CSRF y cookie de sesión', async () => {
    const respuesta = await agente('198.51.100.1')
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'coord@prueba.com.ec', password: CLAVE_PRUEBA })
      .expect(200)

    expect(respuesta.body.usuario).toMatchObject({
      id: coordinador.id,
      email: 'coord@prueba.com.ec',
      rol: 'COORDINADOR',
      nombre: 'Andrés Cáceres'
    })
    expect(respuesta.body.csrfToken).toMatch(/^[a-f0-9]{64}$/)

    const cookie = respuesta.headers['set-cookie'].join(';')
    expect(cookie).toMatch(/sg_session=/)
    expect(cookie).toMatch(/HttpOnly/i)

    // En la base de datos solo queda el SHA-256 del token, nunca el token en claro.
    const tokenCookie = cookie.match(/sg_session=([^;]+)/)[1]
    const { rows } = await pool.query('SELECT token_hash, csrf_secret FROM sesiones')
    expect(rows[0].token_hash).not.toBe(tokenCookie)
    expect(rows[0].token_hash).toMatch(/^[a-f0-9]{64}$/)
  })

  test('credenciales inválidas: 401 CREDENCIALES_INVALIDAS', async () => {
    const respuesta = await agente('198.51.100.2')
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'coord@prueba.com.ec', password: 'Incorrecta1' })
      .expect(401)
    expect(respuesta.body.error.code).toBe('CREDENCIALES_INVALIDAS')
  })

  test('correo inexistente responde igual que contraseña incorrecta', async () => {
    const respuesta = await agente('198.51.100.2')
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'nadie@prueba.com.ec', password: 'Incorrecta1' })
      .expect(401)
    expect(respuesta.body.error.code).toBe('CREDENCIALES_INVALIDAS')
  })

  test('bloqueo de 15 minutos tras 5 intentos fallidos', async () => {
    const solicitor = agente('198.51.100.3')
    for (let i = 0; i < 5; i++) {
      await solicitor
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'coord@prueba.com.ec', password: 'Incorrecta1' })
        .expect(401)
    }
    // Aun con la contraseña correcta, la cuenta está bloqueada.
    const respuesta = await solicitor
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'coord@prueba.com.ec', password: CLAVE_PRUEBA })
      .expect(423)
    expect(respuesta.body.error.code).toBe('CUENTA_BLOQUEADA')
    expect(respuesta.body.error.details.bloqueadoHasta).toBeTruthy()
  })

  test('rate limit de login: 11 intentos por IP → 429', async () => {
    const solicitor = agente('198.51.100.4')
    let estado = null
    for (let i = 0; i < 11; i++) {
      const respuesta = await solicitor
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({ email: 'nadie@prueba.com.ec', password: 'Incorrecta1' })
      estado = respuesta.status
    }
    expect(estado).toBe(429)
  }, 30000)
})

describe('Sesión', () => {
  test('GET /me sin cookie → 401', async () => {
    const respuesta = await agente('198.51.100.5').get('/api/auth/me').expect(401)
    expect(respuesta.body.error.code).toBe('NO_AUTENTICADO')
  })

  test('GET /me con sesión devuelve usuario y CSRF', async () => {
    const solicitor = agente('198.51.100.5')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')
    const respuesta = await solicitor.get('/api/auth/me').expect(200)
    expect(respuesta.body.usuario.id).toBe(coordinador.id)
    expect(respuesta.body.csrfToken).toBe(sesion.csrfToken)
  })

  test('logout revoca la sesión', async () => {
    const solicitor = agente('198.51.100.6')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')
    await solicitor
      .post('/api/auth/logout')
      .set('X-CSRF-Token', sesion.csrfToken)
      .expect(204)
    await solicitor.get('/api/auth/me').expect(401)
  })

  test('sesión expirada → 401 SESION_EXPIRADA', async () => {
    const solicitor = agente('198.51.100.7')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')

    // Se antedatan expira_en y created_at para simular 12 h transcurridas.
    await pool.query(`
      UPDATE sesiones
      SET expira_en = now() - interval '1 minute', created_at = now() - interval '13 hours'
      WHERE token_hash = (SELECT token_hash FROM sesiones LIMIT 1)
    `)
    const respuesta = await solicitor.get('/api/auth/me').expect(401)
    expect(respuesta.body.error.code).toBe('SESION_EXPIRADA')
  })
})

describe('CSRF', () => {
  test('POST sin cabecera X-CSRF-Token → 403 CSRF_INVALIDO', async () => {
    const solicitor = agente('198.51.100.8')
    await loginComo(solicitor, 'coord@prueba.com.ec')
    const respuesta = await solicitor
      .post('/api/solicitudes')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(403)
    expect(respuesta.body.error.code).toBe('CSRF_INVALIDO')
  })

  test('POST con cabecera incorrecta → 403', async () => {
    const solicitor = agente('198.51.100.8')
    await loginComo(solicitor, 'coord@prueba.com.ec')
    await solicitor
      .post('/api/solicitudes')
      .set('X-CSRF-Token', 'falsificado')
      .set('Content-Type', 'application/json')
      .send({})
      .expect(403)
  })
})

describe('PATCH /api/auth/password', () => {
  test('cambia la contraseña y la nueva sirve para iniciar sesión', async () => {
    const solicitor = agente('198.51.100.9')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')
    await solicitor
      .patch('/api/auth/password')
      .set('X-CSRF-Token', sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ actual: CLAVE_PRUEBA, nueva: 'NuevaClave99' })
      .expect(204)

    await agente('198.51.100.10')
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'coord@prueba.com.ec', password: 'NuevaClave99' })
      .expect(200)
  })

  test('contraseña actual incorrecta → 400', async () => {
    const solicitor = agente('198.51.100.11')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')
    const respuesta = await solicitor
      .patch('/api/auth/password')
      .set('X-CSRF-Token', sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ actual: 'Incorrecta1', nueva: 'NuevaClave99' })
      .expect(400)
    expect(respuesta.body.error.code).toBe('PASSWORD_ACTUAL_INCORRECTA')
  })

  test('nueva contraseña demasiado corta → 400 PASSWORD_INVALIDA', async () => {
    const solicitor = agente('198.51.100.12')
    const sesion = await loginComo(solicitor, 'coord@prueba.com.ec')
    const respuesta = await solicitor
      .patch('/api/auth/password')
      .set('X-CSRF-Token', sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ actual: CLAVE_PRUEBA, nueva: 'corta' })
      .expect(400)
    expect(respuesta.body.error.code).toBe('PASSWORD_INVALIDA')
  })
})

describe('Roles', () => {
  test('un Cliente no accede al historial de auditoría → 403', async () => {
    await crearUsuario({
      email: 'cliente@prueba.com.ec',
      rol: 'CLIENTE',
      organizacionId: await crearOrganizacion()
    })
    const solicitor = agente('198.51.100.13')
    await loginComo(solicitor, 'cliente@prueba.com.ec')
    const respuesta = await solicitor
      .get('/api/solicitudes/00000000-0000-0000-0000-000000000000/eventos')
      .expect(403)
    expect(respuesta.body.error.code).toBe('ROL_NO_AUTORIZADO')
  })
})
