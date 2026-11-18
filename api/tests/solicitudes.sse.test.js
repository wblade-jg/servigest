// Pruebas del canal SSE de coordinación: autenticación por cookie y roles.

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  loginComo
} from './auxiliares.js'

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()
  const orgA = await crearOrganizacion('Industrias Manabí S.A.')
  await crearOrganizacion('Clínica Santa Rosa')
  await crearUsuario({ email: 'coord@prueba.com.ec', rol: 'COORDINADOR' })
  await crearUsuario({
    email: 'cliente@prueba.com.ec',
    rol: 'CLIENTE',
    organizacionId: orgA
  })
})

describe('GET /api/eventos/coordinacion', () => {
  test('sin sesión → 401', async () => {
    await agente('198.51.100.40').get('/api/eventos/coordinacion').expect(401)
  })

  test('rol sin permiso → 403', async () => {
    const a = agente('198.51.100.41')
    await loginComo(a, 'cliente@prueba.com.ec')
    await a.get('/api/eventos/coordinacion').expect(403)
  })

  test('con sesión válida abre el flujo text/event-stream y envía latidos', async () => {
    const a = agente('198.51.100.42')
    await loginComo(a, 'coord@prueba.com.ec')
    const respuesta = await a
      .get('/api/eventos/coordinacion')
      .parse((res, done) => {
        let cuerpo = ''
        res.setEncoding('utf8')
        const temporizador = setTimeout(() => {
          res.destroy()
          done(null, Buffer.from(cuerpo))
        }, 1500)
        res.on('data', (trozo) => { cuerpo += trozo })
        res.on('error', () => {
          clearTimeout(temporizador)
          done(null, Buffer.from(cuerpo))
        })
        res.on('end', () => {
          clearTimeout(temporizador)
          done(null, Buffer.from(cuerpo))
        })
      })
      .expect(200)
    expect(respuesta.headers['content-type']).toMatch(/text\/event-stream/)
    expect(respuesta.body.toString()).toContain(': conectado')
  })
})
