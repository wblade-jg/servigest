// Pruebas del Portal del Cliente (Grupo G5 - Fase 3)

import {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cerrarEntorno,
  crearOrganizacion,
  crearUsuario,
  loginComo,
  crearSolicitudDirecta,
  categoriaReal,
  CLAVE_PRUEBA
} from './auxiliares.js'
import { pool } from '../src/config/pool.js'

let organizacionA = null
let organizacionB = null
const EMAIL_CLIENTE = 'clientea@prueba.com.ec'

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
  await crearUsuario({
    nombre: 'Cliente A', email: EMAIL_CLIENTE, rol: 'CLIENTE', organizacionId: organizacionA
  })
  await crearUsuario({
    nombre: 'Cliente B', email: 'clienteb@prueba.com.ec', rol: 'CLIENTE', organizacionId: organizacionB
  })
  await crearUsuario({ nombre: 'Coordinador', email: 'coordinador@prueba.com.ec', rol: 'COORDINADOR' })
})

async function sesionClienteA (ip = '198.51.100.60') {
  const ag = agente(ip)
  const sesion = await loginComo(ag, EMAIL_CLIENTE, CLAVE_PRUEBA)
  return { ag, sesion }
}

describe('G5: Aislamiento por organización', () => {
  test('1. El Cliente ve solo las solicitudes de su organización', async () => {
    await crearSolicitudDirecta({ codigo: 'SOL-2026-00001', organizacionId: organizacionA, estado: 'RECIBIDA' })
    await crearSolicitudDirecta({ codigo: 'SOL-2026-00002', organizacionId: organizacionA, estado: 'APROBADA' })
    await crearSolicitudDirecta({ codigo: 'SOL-2026-00003', organizacionId: organizacionB, estado: 'RECIBIDA' })

    const { ag } = await sesionClienteA()
    const res = await ag.get('/api/solicitudes').expect(200)

    expect(res.body.total).toBe(2)
    expect(res.body.data.every((s) => s.organizacionId === organizacionA)).toBe(true)
  })

  test('2. Recurso de otra organización: 404 en detalle', async () => {
    const ajena = await crearSolicitudDirecta({
      codigo: 'SOL-2026-00004', organizacionId: organizacionB, estado: 'RECIBIDA'
    })

    const { ag } = await sesionClienteA()
    const res = await ag.get(`/api/solicitudes/${ajena.id}`).expect(404)
    expect(res.body.error.code).toBe('SOLICITUD_NO_ENCONTRADA')
  })

  test('3. El Cliente no accede a notas, auditoría ni intervenciones', async () => {
    const { ag, sesion } = await sesionClienteA()
    const solicitud = await crearSolicitudDirecta({
      codigo: 'SOL-2026-00005', organizacionId: organizacionA, estado: 'EN_PROCESO'
    })

    const notas = await ag.get(`/api/solicitudes/${solicitud.id}/notas`).expect(403)
    expect(notas.body.error.code).toBe('ROL_NO_AUTORIZADO')

    const eventos = await ag.get(`/api/solicitudes/${solicitud.id}/eventos`).expect(403)
    expect(eventos.body.error.code).toBe('ROL_NO_AUTORIZADO')

    const intervenciones = await ag.get(`/api/solicitudes/${solicitud.id}/intervenciones`).expect(403)
    expect(intervenciones.body.error.code).toBe('ROL_NO_AUTORIZADO')

    // Tampoco puede crear notas internas.
    await ag
      .post(`/api/solicitudes/${solicitud.id}/notas`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ contenido: 'Intento de nota del cliente.' })
      .expect(403)
  })
})

describe('G5: Creación de solicitudes del Cliente', () => {
  test('4. Creación con origen CLIENTE y organización de la sesión', async () => {
    const { ag, sesion } = await sesionClienteA()
    const categoriaId = await categoriaReal()

    const res = await ag
      .post('/api/solicitudes')
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        // Intento de manipulación: se ignora en el backend.
        origen: 'PUBLICO',
        organizacionId: organizacionB,
        organizacion: 'Empresa B S.A.',
        contactoNombre: 'Contacto A',
        contactoEmail: 'contacto@a.com.ec',
        contactoTelefono: '+593 99 111 2222',
        categoriaId,
        descripcion: 'El servidor de facturación presenta lentitud desde esta mañana.',
        ubicacion: 'Sede matriz, piso 2',
        urgenciaDeclarada: 'ALTA'
      })
      .expect(201)

    expect(res.body.estado).toBe('RECIBIDA')
    expect(res.body.codigo).toMatch(/^SOL-\d{4}-\d{5}$/)

    const { rows } = await pool.query(
      'SELECT origen, organizacion_id, organizacion_nombre FROM solicitudes WHERE id = $1',
      [res.body.id])
    expect(rows[0].origen).toBe('CLIENTE')
    expect(rows[0].organizacion_id).toBe(organizacionA)
    expect(rows[0].organizacion_nombre).toBeNull()
  })

  test('5. Creación inválida: descripción corta o categoría inexistente', async () => {
    const { ag, sesion } = await sesionClienteA()
    const categoriaId = await categoriaReal()

    const corta = await ag
      .post('/api/solicitudes')
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        contactoNombre: 'Contacto A',
        contactoEmail: 'contacto@a.com.ec',
        contactoTelefono: '+593 99 111 2222',
        categoriaId,
        descripcion: 'Muy corta'
      })
      .expect(400)
    expect(corta.body.error.code).toBe('DESCRIPCION_INVALIDA')

    const inexistente = await ag
      .post('/api/solicitudes')
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        contactoNombre: 'Contacto A',
        contactoEmail: 'contacto@a.com.ec',
        contactoTelefono: '+593 99 111 2222',
        categoriaId: '00000000-0000-4000-8000-000000000000',
        descripcion: 'El servidor de facturación presenta lentitud desde esta mañana.'
      })
      .expect(400)
    expect(inexistente.body.error.code).toBe('CATEGORIA_INEXISTENTE')
  })
})

describe('G5: Cancelación del Cliente', () => {
  test('6. Puede cancelar antes de APROBADA y queda auditado', async () => {
    const { ag, sesion } = await sesionClienteA()
    const solicitud = await crearSolicitudDirecta({
      codigo: 'SOL-2026-00006', organizacionId: organizacionA, estado: 'EN_REVISION'
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CANCELADA', motivo: 'Ya no requerimos el servicio.' })
      .expect(200)
    expect(res.body.estado).toBe('CANCELADA')

    const { rows } = await pool.query(
      'SELECT estado, cancelada_motivo FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('CANCELADA')
    expect(rows[0].cancelada_motivo).toBe('Ya no requerimos el servicio.')

    const { rows: eventos } = await pool.query(`
      SELECT tipo, estado_nuevo FROM eventos_solicitud
      WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1`, [solicitud.id])
    expect(eventos[0].tipo).toBe('CANCELACION')
    expect(eventos[0].estado_nuevo).toBe('CANCELADA')
  })

  test('7. No puede cancelar desde APROBADA → 403', async () => {
    const { ag, sesion } = await sesionClienteA()
    const solicitud = await crearSolicitudDirecta({
      codigo: 'SOL-2026-00007', organizacionId: organizacionA, estado: 'APROBADA', prioridad: 'MEDIA'
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CANCELADA', motivo: 'Cambio de decisión.' })
      .expect(403)
    expect(res.body.error.code).toBe('CANCELACION_NO_PERMITIDA')

    const { rows } = await pool.query('SELECT estado FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('APROBADA')
  })

  test('8. No puede cancelar una solicitud de otra organización → 404', async () => {
    const { ag, sesion } = await sesionClienteA()
    const ajena = await crearSolicitudDirecta({
      codigo: 'SOL-2026-00008', organizacionId: organizacionB, estado: 'RECIBIDA'
    })

    const res = await ag
      .patch(`/api/solicitudes/${ajena.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({ estado: 'CANCELADA', motivo: 'Intento sobre otra organización.' })
      .expect(404)
    expect(res.body.error.code).toBe('SOLICITUD_NO_ENCONTRADA')
  })
})
