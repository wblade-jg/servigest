'use strict'

// Pruebas del flujo de Asignación y Reasignación de Técnicos (Grupo G2 - Fase 3)

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

let admin = null
let coordinador = null
let organizacionId = null
let especialidadServidoresId = null
let especialidadRedesId = null

beforeAll(async () => {
  await iniciarEntorno()
  const { rows: esp } = await pool.query(
    "SELECT id, nombre FROM especialidades WHERE nombre IN ('Servidores', 'Redes')"
  )
  for (const e of esp) {
    if (e.nombre === 'Servidores') especialidadServidoresId = e.id
    if (e.nombre === 'Redes') especialidadRedesId = e.id
  }
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
    email: 'coordinador@prueba.com.ec',
    rol: 'COORDINADOR'
  })
})

// Helper para crear un técnico con especialidades y disponibilidad
async function crearTecnicoConDisponibilidad ({
  nombre = 'Técnico Especialista',
  email = 'tecnico@prueba.com.ec',
  activo = true,
  usuarioActivo = true,
  rol = 'TECNICO',
  especialidades = [especialidadServidoresId],
  franjas = []
} = {}) {
  const { rows: uRows } = await pool.query(`
    INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
    VALUES ($1, $2, 'hash_invalido', $3, $4)
    RETURNING id
  `, [nombre, email, rol, usuarioActivo])
  const usuarioId = uRows[0].id

  if (rol === 'TECNICO') {
    await pool.query(`
      INSERT INTO tecnicos (usuario_id, activo)
      VALUES ($1, $2)
    `, [usuarioId, activo])

    for (const espId of especialidades) {
      if (espId) {
        await pool.query(`
          INSERT INTO tecnico_especialidad (tecnico_id, especialidad_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [usuarioId, espId])
      }
    }

    for (const franja of franjas) {
      await pool.query(`
        INSERT INTO disponibilidad (tecnico_id, dia_semana, hora_inicio, hora_fin, activo)
        VALUES ($1, $2, $3, $4, $5)
      `, [usuarioId, franja.diaSemana, franja.horaInicio, franja.horaFin, franja.activo !== false])
    }
  }

  return { id: usuarioId, nombre, email }
}

// Obtener una fecha futura determinista calculando el día de la semana en America/Guayaquil
function calcularFechaFuturaEnHorario (diasHaciaAdelante, horaEcuador, minutosEcuador = 0) {
  const d = new Date()
  d.setDate(d.getDate() + diasHaciaAdelante)

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d) // Formato "YYYY-MM-DD"

  const hh = String(horaEcuador).padStart(2, '0')
  const mm = String(minutosEcuador).padStart(2, '0')

  return `${partes}T${hh}:${mm}:00-05:00`
}

function obtenerDiaSemanaGuayaquil (isoString) {
  const d = new Date(isoString)
  const diaTexto = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guayaquil',
    weekday: 'short'
  }).format(d)
  const mapa = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return mapa[diaTexto]
}

describe('G2: Asignación y Reasignación de Técnicos', () => {
  test('1. Asignación exitosa: técnico activo, con especialidad y en franja horaria válida', async () => {
    const ag = agente('198.51.100.20')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fechaFutura = calcularFechaFuturaEnHorario(2, 10, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fechaFutura)

    const tecnico = await crearTecnicoConDisponibilidad({
      nombre: 'Carlos Redes y Servidores',
      email: 'carlos@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [
        { diaSemana, horaInicio: '08:00', horaFin: '17:00' }
      ]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'APROBADA',
      prioridad: 'ALTA',
      organizacionId,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico.id,
        fechaProgramada: fechaFutura
      })
      .expect(200)

    expect(res.body.estado).toBe('ASIGNADA')
    expect(res.body.tecnicoId).toBe(tecnico.id)
    expect(new Date(res.body.fechaProgramada).toISOString()).toBe(new Date(fechaFutura).toISOString())

    // Verificar en BD
    const { rows } = await pool.query('SELECT estado, tecnico_id FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].estado).toBe('ASIGNADA')
    expect(rows[0].tecnico_id).toBe(tecnico.id)

    // Verificar auditoría
    const { rows: eventos } = await pool.query(
      'SELECT tipo, estado_anterior, estado_nuevo FROM eventos_solicitud WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1',
      [solicitud.id]
    )
    expect(eventos[0].tipo).toBe('ASIGNACION')
    expect(eventos[0].estado_anterior).toBe('APROBADA')
    expect(eventos[0].estado_nuevo).toBe('ASIGNADA')
  })

  test('2. Rechazo por técnico inactivo o con rol incorrecto → 422 TECNICO_INACTIVO', async () => {
    const ag = agente('198.51.100.21')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fechaFutura = calcularFechaFuturaEnHorario(2, 10, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fechaFutura)

    // Caso A: Técnico inactivo en tabla tecnicos
    const tecnicoInactivo = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Desactivado',
      email: 'inactivo@prueba.com.ec',
      activo: false,
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'APROBADA',
      prioridad: 'ALTA',
      organizacionId,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const resInactivo = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnicoInactivo.id,
        fechaProgramada: fechaFutura
      })
      .expect(422)

    expect(resInactivo.body.error.code).toBe('TECNICO_INACTIVO')

    // Caso B: Usuario con rol COORDINADOR en vez de TECNICO
    const resRolErroneo = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: coordinador.id,
        fechaProgramada: fechaFutura
      })
      .expect(422)

    expect(resRolErroneo.body.error.code).toBe('TECNICO_INACTIVO')
  })

  test('3. Rechazo por falta de especialidad requerida → 422 ESPECIALIDAD_NO_COINCIDE', async () => {
    const ag = agente('198.51.100.22')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fechaFutura = calcularFechaFuturaEnHorario(2, 10, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fechaFutura)

    // Técnico que SOLO tiene Redes, pero la categoría requiere Servidores
    const tecnicoSoloRedes = await crearTecnicoConDisponibilidad({
      nombre: 'Solo Redes',
      email: 'redes@prueba.com.ec',
      especialidades: [especialidadRedesId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'APROBADA',
      prioridad: 'ALTA',
      organizacionId,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnicoSoloRedes.id,
        fechaProgramada: fechaFutura
      })
      .expect(422)

    expect(res.body.error.code).toBe('ESPECIALIDAD_NO_COINCIDE')
  })

  test('4. Rechazo por fecha fuera de la franja de disponibilidad semanal → 422 FUERA_DE_DISPONIBILIDAD', async () => {
    const ag = agente('198.51.100.23')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fechaFutura = calcularFechaFuturaEnHorario(2, 16, 0) // 16:00
    const diaSemana = obtenerDiaSemanaGuayaquil(fechaFutura)

    // Disponibilidad solo en la mañana (08:00 a 12:00)
    const tecnicoManana = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Matutino',
      email: 'matutino@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '12:00' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'APROBADA',
      prioridad: 'ALTA',
      organizacionId,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnicoManana.id,
        fechaProgramada: fechaFutura // 16:00 está fuera de 08:00 a 12:00
      })
      .expect(422)

    expect(res.body.error.code).toBe('FUERA_DE_DISPONIBILIDAD')
  })

  test('5. Rechazo por choque horario (solicitud en rango de ±1 hora) → 422 CHOQUE_HORARIO', async () => {
    const ag = agente('198.51.100.24')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fechaExistente = calcularFechaFuturaEnHorario(2, 10, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fechaExistente)

    const tecnico = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Ocupado',
      email: 'ocupado@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    // Solicitud 1 ya asignada a las 10:00
    await crearSolicitudDirecta({
      codigo: 'SOL-2026-CHOQ1',
      estado: 'ASIGNADA',
      prioridad: 'ALTA',
      organizacionId,
      tecnicoId: tecnico.id,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })
    await pool.query(
      'UPDATE solicitudes SET fecha_hora_programada = $1 WHERE codigo = $2',
      [fechaExistente, 'SOL-2026-CHOQ1']
    )

    // Solicitud 2 a las 10:30 (a 30 minutos de distancia → choque horario)
    const fechaSolapada = calcularFechaFuturaEnHorario(2, 10, 30)
    const solicitud2 = await crearSolicitudDirecta({
      codigo: 'SOL-2026-CHOQ2',
      estado: 'APROBADA',
      prioridad: 'ALTA',
      organizacionId,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud2.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico.id,
        fechaProgramada: fechaSolapada
      })
      .expect(422)

    expect(res.body.error.code).toBe('CHOQUE_HORARIO')
  })

  test('6. Rechazo por fecha posterior al SLA (fechaProgramada > fechaObjetivo) → 422 FECHA_SUPERA_SLA', async () => {
    const ag = agente('198.51.100.25')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    // Fecha objetivo en 2 horas
    const fechaObjetivo = new Date(Date.now() + 2 * 3600 * 1000).toISOString()
    // Programación en 4 horas (supera el SLA de 2 horas)
    const fechaProgramada = new Date(Date.now() + 4 * 3600 * 1000).toISOString()

    const d = new Date(fechaProgramada)
    const localDate = new Date(d.getTime() - 5 * 3600 * 1000)
    const day = localDate.getUTCDay()
    const diaSemana = day === 0 ? 7 : day

    const tecnico = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico SLA',
      email: 'sla@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '00:00', horaFin: '23:59' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'APROBADA',
      prioridad: 'CRITICA',
      organizacionId,
      fechaObjetivo
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico.id,
        fechaProgramada
      })
      .expect(422)

    expect(res.body.error.code).toBe('FECHA_SUPERA_SLA')
  })

  test('7. Reasignación con motivo obligatorio y actualización de agenda → 200', async () => {
    const ag = agente('198.51.100.26')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fecha1 = calcularFechaFuturaEnHorario(2, 9, 0)
    const fecha2 = calcularFechaFuturaEnHorario(2, 14, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fecha1)

    const tecnico1 = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Primero',
      email: 'primero@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    const tecnico2 = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Segundo Reemplazo',
      email: 'segundo@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'ASIGNADA',
      prioridad: 'ALTA',
      organizacionId,
      tecnicoId: tecnico1.id,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })
    await pool.query(
      'UPDATE solicitudes SET fecha_hora_programada = $1 WHERE id = $2',
      [fecha1, solicitud.id]
    )

    // Intento de reasignar SIN motivo → 400 MOTIVO_REASIGNACION_REQUERIDO
    const resSinMotivo = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico2.id,
        fechaProgramada: fecha2
      })
      .expect(400)

    expect(resSinMotivo.body.error.code).toBe('MOTIVO_REASIGNACION_REQUERIDO')

    // Reasignación CON motivo válido → 200
    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico2.id,
        fechaProgramada: fecha2,
        motivo: 'Técnico 1 presenta problemas de salud imprevistos.'
      })
      .expect(200)

    expect(res.body.estado).toBe('ASIGNADA')
    expect(res.body.tecnicoId).toBe(tecnico2.id)

    // Verificar en BD
    const { rows } = await pool.query('SELECT estado, tecnico_id FROM solicitudes WHERE id = $1', [solicitud.id])
    expect(rows[0].tecnico_id).toBe(tecnico2.id)

    // Verificar auditoría con tipo REASIGNACION y motivo guardado
    const { rows: eventos } = await pool.query(
      'SELECT tipo, metadata FROM eventos_solicitud WHERE solicitud_id = $1 ORDER BY created_at DESC LIMIT 1',
      [solicitud.id]
    )
    expect(eventos[0].tipo).toBe('REASIGNACION')
    expect(eventos[0].metadata.motivo).toBe('Técnico 1 presenta problemas de salud imprevistos.')
  })

  test('8. Intento de reasignar una solicitud en EN_PROCESO → 409 TRANSICION_INVALIDA', async () => {
    const ag = agente('198.51.100.27')
    const sesion = await loginComo(ag, 'coordinador@prueba.com.ec', CLAVE_PRUEBA)

    const fecha = calcularFechaFuturaEnHorario(2, 10, 0)
    const diaSemana = obtenerDiaSemanaGuayaquil(fecha)

    const tecnico = await crearTecnicoConDisponibilidad({
      nombre: 'Técnico Proceso',
      email: 'proceso@prueba.com.ec',
      especialidades: [especialidadServidoresId],
      franjas: [{ diaSemana, horaInicio: '08:00', horaFin: '17:00' }]
    })

    const solicitud = await crearSolicitudDirecta({
      estado: 'EN_PROCESO',
      prioridad: 'ALTA',
      organizacionId,
      tecnicoId: tecnico.id,
      fechaObjetivo: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
    })

    const res = await ag
      .patch(`/api/solicitudes/${solicitud.id}/estado`)
      .set('x-csrf-token', sesion.csrfToken)
      .send({
        estado: 'ASIGNADA',
        tecnicoId: tecnico.id,
        fechaProgramada: fecha,
        motivo: 'Reasignar aunque ya inició'
      })
      .expect(409)

    expect(res.body.error.code).toBe('TRANSICION_INVALIDA')
  })
})
