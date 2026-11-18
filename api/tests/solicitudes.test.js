// Pruebas del ciclo de coordinación: listado, detalle, creación y transiciones.

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  crearSolicitudDirecta,
  categoriaReal,
  loginComo,
  eventos
} from './auxiliares.js'
import { pool } from '../src/config/pool.js'

let coordAgent
let orgA
let orgB
let ipSecuencial = 20

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()
  orgA = await crearOrganizacion('Industrias Manabí S.A.')
  orgB = await crearOrganizacion('Clínica Santa Rosa')
  await crearUsuario({ email: 'admin@prueba.com.ec', rol: 'ADMIN', nombre: 'Sofía Mendoza' })
  await crearUsuario({ email: 'coord@prueba.com.ec', rol: 'COORDINADOR' })
  await crearUsuario({ email: 'tecnico@prueba.com.ec', rol: 'TECNICO' })
  await crearUsuario({ email: 'cliente-a@prueba.com.ec', rol: 'CLIENTE', organizacionId: orgA })
  await crearUsuario({ email: 'cliente-b@prueba.com.ec', rol: 'CLIENTE', organizacionId: orgB })
  await crearSolicitudDirecta({ codigo: 'SOL-2026-00001', organizacionId: orgA })
  await crearSolicitudDirecta({ codigo: 'SOL-2026-00002', origen: 'PUBLICO', organizacionNombre: 'Comercio Norte' })

  coordAgent = agente(`198.51.${ipSecuencial++}.0`)
  coordAgent.sesion = await loginComo(coordAgent, 'coord@prueba.com.ec')
})

async function agenteComo (email) {
  const a = agente(`198.51.${ipSecuencial++}.0`)
  a.sesion = await loginComo(a, email)
  return a
}

async function idSolicitud (agenteSesion, codigo) {
  const { rows } = await pool.query('SELECT id FROM solicitudes WHERE codigo = $1', [codigo])
  return rows[0].id
}

describe('GET /api/solicitudes', () => {
  test('el coordinador ve todas las solicitudes con paginación', async () => {
    const respuesta = await coordAgent
      .get('/api/solicitudes?limit=1&page=1')
      .expect(200)
    expect(respuesta.body.total).toBe(2)
    expect(respuesta.body.page).toBe(1)
    expect(respuesta.body.limit).toBe(1)
    expect(respuesta.body.data).toHaveLength(1)
  })

  test('el Cliente solo ve las solicitudes de su organización', async () => {
    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    const respuesta = await clienteA.get('/api/solicitudes').expect(200)
    expect(respuesta.body.total).toBe(1)
    expect(respuesta.body.data[0].codigo).toBe('SOL-2026-00001')
    expect(respuesta.body.data[0].organizacionId).toBe(orgA)
  })

  test('filtra por estado, prioridad y texto', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(200)

    const porEstado = await coordAgent.get('/api/solicitudes?estado=EN_REVISION').expect(200)
    expect(porEstado.body.total).toBe(1)

    const porTexto = await coordAgent.get(`/api/solicitudes?q=${encodeURIComponent('Manabí')}`).expect(200)
    expect(porTexto.body.total).toBe(1)

    const sinCoincidencia = await coordAgent.get('/api/solicitudes?estado=CERRADA').expect(200)
    expect(sinCoincidencia.body.total).toBe(0)
  })

  test('el técnico solo ve las solicitudes asignadas a él', async () => {
    const tecnico = await agenteComo('tecnico@prueba.com.ec')
    const respuesta = await tecnico.get('/api/solicitudes').expect(200)
    expect(respuesta.body.total).toBe(0)
  })
})

describe('GET /api/solicitudes/:id', () => {
  test('el coordinador ve el detalle completo', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const respuesta = await coordAgent.get(`/api/solicitudes/${id}`).expect(200)
    expect(respuesta.body).toMatchObject({ codigo: 'SOL-2026-00001', origen: 'CLIENTE', estado: 'RECIBIDA' })
    expect(respuesta.body.categoriaNombre).toBeTruthy()
  })

  test('el Cliente ve su solicitud pero no recibe notas ni eventos', async () => {
    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    const id = await idSolicitud(clienteA, 'SOL-2026-00001')
    await clienteA.get(`/api/solicitudes/${id}`).expect(200)
    await clienteA.get(`/api/solicitudes/${id}/notas`).expect(403)
    await clienteA.get(`/api/solicitudes/${id}/eventos`).expect(403)
  })

  test('un recurso ajeno responde 404, no 403', async () => {
    const clienteB = await agenteComo('cliente-b@prueba.com.ec')
    const id = await idSolicitud(clienteB, 'SOL-2026-00001') // pertenece a orgA
    await clienteB.get(`/api/solicitudes/${id}`).expect(404)
    await clienteB
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', clienteB.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'CANCELADA', motivo: 'Ya no la necesito, gracias.' })
      .expect(404)
  })
})

describe('POST /api/solicitudes', () => {
  test('el Cliente crea una solicitud con origen CLIENTE para su organización', async () => {
    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    const respuesta = await clienteA
      .post('/api/solicitudes')
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({
        contactoNombre: 'María Torres',
        contactoEmail: 'maria@manabi.com.ec',
        contactoTelefono: '+593 99 123 4567',
        categoriaId: await categoriaReal(),
        descripcion: 'El aire acondicionado de la sala de servidores no enfría.',
        urgenciaDeclarada: 'MEDIA'
      })
      .expect(201)
    expect(respuesta.body.origen).toBeUndefined() // el payload solo trae id/codigo/token/estado
    expect(respuesta.body.codigo).toMatch(/^SOL-\d{4}-\d{5}$/)

    const { rows } = await pool.query(
      'SELECT origen, organizacion_id, created_by FROM solicitudes ORDER BY created_at DESC LIMIT 1'
    )
    expect(rows[0]).toMatchObject({ origen: 'CLIENTE', organizacion_id: orgA })
    expect(rows[0].created_by).toBeTruthy()
  })

  test('el coordinador crea una solicitud como origen PUBLICO con organizacion', async () => {
    const respuesta = await coordAgent
      .post('/api/solicitudes')
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({
        organizacion: 'Comercio Este S.A.',
        contactoNombre: 'Julian Garzón',
        contactoEmail: 'julian@comercioeste.com',
        contactoTelefono: '0950292490',
        categoriaId: await categoriaReal(),
        descripcion: 'La impresora principal de facturación no responde al encenderla.'
      })
      .expect(201)
    expect(respuesta.body.token).toHaveLength(43)

    const { rows } = await pool.query(
      "SELECT origen, organizacion_id, organizacion_nombre FROM solicitudes WHERE token_publico = (SELECT token_publico FROM solicitudes ORDER BY created_at DESC LIMIT 1)"
    )
    expect(rows[0]).toMatchObject({ origen: 'PUBLICO', organizacion_nombre: 'Comercio Este S.A.' })
  })

  test('validaciones: campos faltantes, email y categoría', async () => {
    const respuesta = await coordAgent
      .post('/api/solicitudes')
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ contactoEmail: 'no-es-email' })
      .expect(400)
    expect(respuesta.body.error.code).toBe('CAMPOS_FALTANTES')

    await coordAgent
      .post('/api/solicitudes')
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({
        organizacion: 'X',
        contactoNombre: 'Ana',
        contactoEmail: 'ana@ejemplo.com',
        contactoTelefono: '0999999999',
        descripcion: 'Este es un problema suficientemente largo para ser válido.',
        categoriaId: '00000000-0000-0000-0000-000000000000'
      })
      .expect(400)
  })

  test('el coordinador no puede crear sin organización (origen PUBLICO exige nombre)', async () => {
    await coordAgent
      .post('/api/solicitudes')
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({
        contactoNombre: 'Ana',
        contactoEmail: 'ana@ejemplo.com',
        contactoTelefono: '0999999999',
        descripcion: 'Este es un problema suficientemente largo para ser válido.'
      })
      .expect(400)
  })
})

describe('Transiciones permitidas', () => {
  test('RECIBIDA → EN_REVISION', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(200)
    expect(respuesta.body.estado).toBe('EN_REVISION')
    expect(respuesta.body.estadoAnterior).toBe('RECIBIDA')
  })

  test('EN_REVISION → REQUIERE_INFORMACION con nota obligatoria', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })

    const sinNota = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'REQUIERE_INFORMACION' })
      .expect(400)
    expect(sinNota.body.error.code).toBe('NOTA_OBLIGATORIA')

    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'REQUIERE_INFORMACION', nota: 'Falta el número de serie del equipo afectado.' })
      .expect(200)
  })

  test('REQUIERE_INFORMACION → EN_REVISION exige nota de gestión', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'REQUIERE_INFORMACION', nota: 'Falta el número de serie del equipo afectado.' })

    const sinNota = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(400)
    expect(sinNota.body.error.code).toBe('NOTA_OBLIGATORIA')

    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION', nota: 'El cliente envió el número de serie por teléfono.' })
      .expect(200)
  })

  test('EN_REVISION → APROBADA calcula el SLA según la prioridad', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })

    const sinPrioridad = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA' })
      .expect(400)
    expect(sinPrioridad.body.error.code).toBe('PRIORIDAD_OBLIGATORIA')

    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'ALTA' })
      .expect(200)

    expect(respuesta.body.prioridad).toBe('ALTA')
    const aprobadaEn = new Date()
    const objetivo = new Date(respuesta.body.fechaObjetivo)
    const horas = (objetivo.getTime() - aprobadaEn.getTime()) / 3600000
    expect(horas).toBeGreaterThan(7.9)
    expect(horas).toBeLessThan(8.1)
  })

  test('EN_REVISION → RECHAZADA con motivo obligatorio', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })

    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'RECHAZADA' })
      .expect(400)

    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'RECHAZADA', motivo: 'El requerimiento queda fuera del catálogo de servicios.' })
      .expect(200)
    expect(respuesta.body.estado).toBe('RECHAZADA')

    const { rows } = await pool.query(
      'SELECT rechazada_motivo FROM solicitudes WHERE id = $1', [id]
    )
    expect(rows[0].rechazada_motivo).toContain('catálogo')
  })

  test('el Cliente cancela antes de APROBADA y no después', async () => {
    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    const id = await idSolicitud(clienteA, 'SOL-2026-00001')

    await clienteA
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'CANCELADA', motivo: 'Ya resolvimos el problema internamente.' })
      .expect(200)
  })

  test('el Cliente no puede cancelar una solicitud ya aprobada → 403', async () => {
    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    const id = await idSolicitud(clienteA, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'MEDIA' })

    const respuesta = await clienteA
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'CANCELADA', motivo: 'Ya resolvimos el problema internamente.' })
      .expect(403)
    expect(respuesta.body.error.code).toBe('CANCELACION_NO_PERMITIDA')
  })
})

describe('Transiciones prohibidas', () => {
  test('RECIBIDA → APROBADA: 409 TRANSICION_INVALIDA', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'ALTA' })
      .expect(409)
    expect(respuesta.body.error.code).toBe('TRANSICION_INVALIDA')
  })

  test('REQUIERE_INFORMACION → APROBADA: 409 TRANSICION_INVALIDA (debe volver a EN_REVISION)', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'REQUIERE_INFORMACION', nota: 'Falta información del equipo.' })

    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'ALTA' })
      .expect(409)
    expect(respuesta.body.error.code).toBe('TRANSICION_INVALIDA')
  })

  test('los estados terminales no tienen salida: 409', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'RECHAZADA', motivo: 'El requerimiento queda fuera del catálogo de servicios.' })

    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(409)
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'CANCELADA', motivo: 'Intento sobre una solicitud terminal.' })
      .expect(409)
  })

  test('un rol sin permiso no coordina estados: 403', async () => {
    const tecnico = await agenteComo('tecnico@prueba.com.ec')
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await tecnico
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', tecnico.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(403)

    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    await clienteA
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
      .expect(403)
  })
})

describe('Aprobación de origen público', () => {
  test('sin constancia de aceptación → 422 CONSTANCIA_REQUERIDA', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00002')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })

    const respuesta = await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'CRITICA' })
      .expect(422)
    expect(respuesta.body.error.code).toBe('CONSTANCIA_REQUERIDA')
  })

  test('con constancia la aprobación procede y congela la prioridad', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00002')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'CRITICA', constanciaAceptacion: 'Aceptada por teléfono, ref. AT-991' })
      .expect(200)

    const { rows } = await pool.query(`
      SELECT prioridad, constancia_aceptacion, aprobada_por, fecha_objetivo, aprobada_en
      FROM solicitudes WHERE id = $1
    `, [id])
    expect(rows[0].prioridad).toBe('CRITICA')
    expect(rows[0].constancia_aceptacion).toContain('AT-991')
    expect(rows[0].aprobada_por).toBeTruthy()

    // SLA CRITICA = 4 h
    const horas = (new Date(rows[0].fecha_objetivo) - new Date(rows[0].aprobada_en)) / 3600000
    expect(horas).toBeCloseTo(4, 1)
  })

  test('una solicitud de CLIENTE se aprueba sin constancia', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'APROBADA', prioridad: 'BAJA' })
      .expect(200)
  })
})

describe('Notas internas', () => {
  test('el técnico asignado puede leer y crear notas; el Cliente nunca', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .post(`/api/solicitudes/${id}/notas`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ contenido: 'Revisar contrato de soporte antes de responder.', tipo: 'INTERNA' })
      .expect(201)

    const tecnico = await agenteComo('tecnico@prueba.com.ec')
    await tecnico.get(`/api/solicitudes/${id}/notas`).expect(404) // no asignado → ajeno

    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    await clienteA.get(`/api/solicitudes/${id}/notas`).expect(403)
    await clienteA
      .post(`/api/solicitudes/${id}/notas`)
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .send({ contenido: 'Intento de nota del cliente.' })
      .expect(403)
  })

  test('una nota genera evento de auditoría tipo NOTA', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .post(`/api/solicitudes/${id}/notas`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ contenido: 'Revisar contrato de soporte antes de responder.' })
      .expect(201)

    const { rows } = await pool.query(
      "SELECT actor_id, metadata FROM eventos_solicitud WHERE solicitud_id = $1 AND tipo = 'NOTA'",
      [id]
    )
    expect(rows[0].actor_id).toBeTruthy()
    expect(rows[0].metadata.tipoNota).toBe('INTERNA')
  })
})

describe('Regeneración de token (solo Admin)', () => {
  test('el Admin regenera y el evento queda auditado', async () => {
    const admin = await agenteComo('admin@prueba.com.ec')
    const id = await idSolicitud(admin, 'SOL-2026-00002')
    const { rows: antes } = await pool.query('SELECT token_publico FROM solicitudes WHERE id = $1', [id])

    const respuesta = await admin
      .post(`/api/solicitudes/${id}/token`)
      .set('X-CSRF-Token', admin.sesion.csrfToken)
      .expect(200)
    expect(respuesta.body.token).toHaveLength(43)
    expect(respuesta.body.token).not.toBe(antes[0].token_publico)

    const { rows } = await pool.query(
      "SELECT 1 FROM eventos_solicitud WHERE solicitud_id = $1 AND tipo = 'REGENERACION_TOKEN'",
      [id]
    )
    expect(rows).toHaveLength(1)
  })

  test('el Coordinador no puede regenerar → 403', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00002')
    await coordAgent
      .post(`/api/solicitudes/${id}/token`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .expect(403)
  })
})

describe('Auditoría', () => {
  test('cada transición genera un evento con actor y estados', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    const csrf = coordAgent.sesion.csrfToken
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'REQUIERE_INFORMACION', nota: 'Falta el número de serie del equipo afectado.' })
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', csrf)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION', nota: 'El cliente envió el número de serie por teléfono.' })

    const { rows } = await pool.query(`
      SELECT tipo, estado_anterior, estado_nuevo, actor_id
      FROM eventos_solicitud WHERE solicitud_id = $1 ORDER BY id
    `, [id])
    expect(rows.map(r => r.tipo)).toEqual([
      'CREACION', 'CAMBIO_ESTADO', 'NOTA', 'CAMBIO_ESTADO', 'NOTA', 'CAMBIO_ESTADO'
    ])
    expect(rows[1]).toMatchObject({ estado_anterior: 'RECIBIDA', estado_nuevo: 'EN_REVISION' })
    expect(rows[1].actor_id).toBeTruthy()
  })

  test('el historial es visible para Admin y Coordinador, y lista en orden', async () => {
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    const respuesta = await coordAgent.get(`/api/solicitudes/${id}/eventos`).expect(200)
    expect(respuesta.body.data.map(e => e.tipo)).toEqual(['CREACION', 'CAMBIO_ESTADO'])
    expect(respuesta.body.data[1].actorNombre).toBe('Usuario de prueba')
  })
})

describe('SSE', () => {
  test('cada transición emite solicitud.estado por el canal de coordinación', async () => {
    const recibidos = []
    eventos.enPrueba('solicitud.estado', (datos) => recibidos.push(datos))
    const id = await idSolicitud(coordAgent, 'SOL-2026-00001')
    await coordAgent
      .patch(`/api/solicitudes/${id}/estado`)
      .set('X-CSRF-Token', coordAgent.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({ estado: 'EN_REVISION' })
    expect(recibidos[0]).toMatchObject({
      solicitudId: id,
      codigo: 'SOL-2026-00001',
      estado: 'EN_REVISION'
    })
  })

  test('la creación emite solicitud.creada y llega al canal público de seguimiento', async () => {
    const coordinacion = []
    const seguimiento = []
    eventos.enPrueba('solicitud.creada', (datos) => coordinacion.push(datos))

    const clienteA = await agenteComo('cliente-a@prueba.com.ec')
    await clienteA
      .post('/api/solicitudes')
      .set('X-CSRF-Token', clienteA.sesion.csrfToken)
      .set('Content-Type', 'application/json')
      .send({
        contactoNombre: 'María Torres',
        contactoEmail: 'maria@manabi.com.ec',
        contactoTelefono: '+593 99 123 4567',
        categoriaId: await categoriaReal(),
        descripcion: 'El aire acondicionado de la sala de servidores no enfría.'
      })
      .expect(201)

    expect(coordinacion[0].estado).toBe('RECIBIDA')

    // El canal público de seguimiento emite cambios de estado de esa solicitud.
    const { rows } = await pool.query('SELECT token_publico FROM solicitudes ORDER BY created_at DESC LIMIT 1')
    eventos.enPrueba('solicitud.estado', (datos) => seguimiento.push(datos))
    const respuesta = await agente('198.51.100.34')
      .get(`/api/public/seguimiento/${rows[0].token_publico}`)
      .expect(200)
    expect(respuesta.body.estado).toBe('RECIBIDA')
    expect(respuesta.body).not.toHaveProperty('contactoEmail')
  })
})
