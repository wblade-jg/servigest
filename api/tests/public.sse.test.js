// Prueba el endpoint SSE real: se conecta, recibe el evento emitido al canal
// de seguimiento y verifica la cabecera text/event-stream.

import http from 'node:http'
import { createServer } from 'node:http'
import { getApp, iniciarEntorno, cerrarEntorno, categoriaReal } from './auxiliares.js'
import * as servicio from '../src/modules/public/service.js'
import { emitir } from '../src/modules/eventos/emisor.js'
import { pool } from '../src/config/pool.js'

describe('SSE de seguimiento público', () => {
  const { crearSolicitudPublica } = servicio

  beforeAll(async () => {
    await iniciarEntorno()
  })
  afterAll(async () => {
    await cerrarEntorno()
  })

  test('emite eventos a los suscriptores del canal de seguimiento', async () => {
    const servidor = createServer(getApp())
    await new Promise(resolver => servidor.listen(0, '127.0.0.1', resolver))
    const { port } = servidor.address()

    const cuerpo = {
      organizacion: 'Clínica Los Ceibos',
      contactoNombre: 'Andrés Vera',
      contactoEmail: 'andres@ceibos.ec',
      contactoTelefono: '+593 98 555 1122',
      categoriaId: await categoriaReal(),
      descripcion: 'El equipo de rayos X presenta fallas intermitentes al encender cada mañana.'
    }

    // Primero creamos la solicitud para conocer el token...
    const creada = await crearSolicitudPublica({
      cuerpo,
      archivos: [],
      uploadDir: getApp().locals.uploadDir
    })

    // ...y después nos suscribimos al canal y forzamos un evento.
    const peticion = http.get(
      `http://127.0.0.1:${port}/api/public/seguimiento/${creada.token}/eventos`,
      { headers: { Accept: 'text/event-stream' } },
      (respuesta) => {
        respuesta.resume()
      }
    )
    const meta = await new Promise((resolver, rechazar) => {
      peticion.on('response', r => resolver(r))
      peticion.on('error', rechazar)
    })

    expect(meta.statusCode).toBe(200)
    expect(meta.headers['content-type']).toContain('text/event-stream')

    // Recolecta chunks en un buffer accesible desde fuera.
    const fragmentos = []
    meta.on('data', c => fragmentos.push(c.toString()))

    // La fase 1 no tiene endpoints de transición; el cambio de estado se simula
    // con la misma vía que usará la fase 2: emisión al canal de seguimiento.
    emitir(`seguimiento:${creada.token}`, 'solicitud.estado', {
      codigo: creada.codigo,
      estado: 'EN_REVISION'
    })

    const esperar = () => new Promise(resolver => setTimeout(resolver, 100))
    const texto = () => fragmentos.join('')
    for (let i = 0; i < 20 && !texto().includes('solicitud.estado'); i++) {
      await esperar()
    }

    const acumulado = texto()
    // El chunk inicial ': conectado' puede haberse entregado antes de que
    // este listener se registrara; el evento sí debe llegar.
    expect(acumulado).toContain('event: solicitud.estado')
    expect(acumulado).toContain('EN_REVISION')

    peticion.destroy()
    await new Promise(resolver => servidor.close(resolver))
    await pool.query('TRUNCATE adjuntos, eventos_solicitud, solicitudes RESTART IDENTITY CASCADE')
  }, 15000)
})
