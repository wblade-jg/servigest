'use strict'

const {
  iniciarEntorno,
  agente,
  limpiarTablas,
  cuerpoValido,
  categoriaReal,
  adjuntoValido,
  cerrarEntorno,
  eventos
} = require('./auxiliares')
const { pool } = require('../src/config/pool')

beforeAll(async () => {
  await iniciarEntorno()
})

afterAll(async () => {
  await cerrarEntorno()
})

beforeEach(async () => {
  await limpiarTablas()
})

describe('POST /api/public/solicitudes', () => {
  test('creación feliz: 201 con código y token, y evento de auditoría', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })

    const respuesta = await agente('198.51.100.11')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(201)

    expect(respuesta.body.codigo).toMatch(/^SOL-\d{4}-\d{5}$/)
    // Token de 32 bytes en base64url: 43 caracteres
    expect(respuesta.body.token).toHaveLength(43)
    expect(respuesta.body.token).toMatch(/^[A-Za-z0-9_-]+$/)

    const { rows } = await pool.query(
      `SELECT tipo, estado_nuevo FROM eventos_solicitud
       WHERE solicitud_id = (SELECT id FROM solicitudes WHERE codigo = $1)
       ORDER BY id`,
      [respuesta.body.codigo]
    )
    expect(rows[0]).toMatchObject({ tipo: 'CREACION', estado_nuevo: 'RECIBIDA' })
  })

  test('registra adjunto con nombre físico aleatorio y MIME real', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })

    const respuesta = await agente('198.51.100.12')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .attach('adjuntos', adjuntoValido('captura.png'), { filename: 'captura.png', contentType: 'image/png' })
      .expect(201)

    const { rows } = await pool.query('SELECT nombre_original, mime_type, tamano_bytes FROM adjuntos')
    expect(rows).toHaveLength(1)
    expect(rows[0].nombre_original).toBe('captura.png')
    expect(rows[0].mime_type).toBe('image/png')
    expect(Number(rows[0].tamano_bytes)).toBeGreaterThan(0)
    expect(respuesta.body.token).toBeTruthy()
  })

  test('emite evento de creación por el emisor', async () => {
    const recibidos = []
    const oyente = (datos) => recibidos.push(datos)
    eventos.enPrueba('solicitud.creada', oyente)

    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    await agente('198.51.100.13')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(201)

    expect(recibidos).toHaveLength(1)
    expect(recibidos[0].codigo).toMatch(/^SOL-/)
    expect(recibidos[0].estado).toBe('RECIBIDA')
  })

  test('validaciones: campos faltantes', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal(), contactoEmail: undefined })
    const respuesta = await agente('198.51.100.14')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(400)

    expect(respuesta.body.error.code).toBe('CAMPOS_FALTANTES')
    expect(respuesta.body.error.details.campos).toContain('contactoEmail')
  })

  test('validaciones: categoría inexistente', async () => {
    const cuerpo = cuerpoValido({ categoriaId: '00000000-0000-0000-0000-000000000001' })
    const respuesta = await agente('198.51.100.15')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(400)

    expect(respuesta.body.error.code).toBe('CATEGORIA_INEXISTENTE')
  })

  test('validaciones: email inválido', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal(), contactoEmail: 'no-es-correo' })
    const respuesta = await agente('198.51.100.16')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(400)

    expect(respuesta.body.error.code).toBe('EMAIL_INVALIDO')
  })

  test('adjuntos: MIME no permitido (texto disfrazado de .pdf)', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    const respuesta = await agente('198.51.100.17')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .attach('adjuntos', Buffer.from('esto no es un pdf'), {
        filename: 'malicioso.pdf',
        contentType: 'application/pdf'
      })
      .expect(400)

    expect(respuesta.body.error.code).toBe('ADJUNTO_NO_PERMITIDO')
    const { rows } = await pool.query('SELECT count(*)::int AS total FROM adjuntos')
    expect(rows[0].total).toBe(0)
  })

  test('adjuntos: tamaño mayor a 5 MB rechazado', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    const respuesta = await agente('198.51.100.18')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .attach('adjuntos', Buffer.alloc(6 * 1024 * 1024), {
        filename: 'grande.png',
        contentType: 'image/png'
      })
      .expect(400)

    expect(respuesta.body.error.code).toBe('ADJUNTO_GRANDE')
  })

  test('adjuntos: más de 5 archivos rechazado', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    let req = agente('198.51.100.19')
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
    for (let i = 0; i < 6; i++) {
      req = req.attach('adjuntos', adjuntoValido(`foto${i}.png`), { filename: `foto${i}.png`, contentType: 'image/png' })
    }
    const respuesta = await req.expect(400)
    expect(['DEMASIADOS_ADJUNTOS', 'ADJUNTO_INVALIDO']).toContain(respuesta.body.error.code)
  })

  test('rate limit: la sexta solicitud en la hora devuelve 429', async () => {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    const crear = () =>
      agente('203.0.113.77')
        .post('/api/public/solicitudes')
        .field('organizacion', cuerpo.organizacion)
        .field('contactoNombre', cuerpo.contactoNombre)
        .field('contactoEmail', cuerpo.contactoEmail)
        .field('contactoTelefono', cuerpo.contactoTelefono)
        .field('categoriaId', cuerpo.categoriaId)
        .field('descripcion', cuerpo.descripcion)

    for (let i = 0; i < 5; i++) {
      await crear().expect(201)
    }
    const respuesta = await crear().expect(429)
    expect(respuesta.body.error.code).toBe('LIMITE_SOLICITUDES')
  })
})

describe('GET /api/public/seguimiento/:token', () => {
  let token
  beforeAll(async () => {
    // Se usa la misma suite (el beforeAll global limpia en cada test, así que
    // creamos la solicitud dentro de cada prueba individual).
  })

  async function crearSolicitud (ip) {
    const cuerpo = cuerpoValido({ categoriaId: await categoriaReal() })
    const respuesta = await agente(ip)
      .post('/api/public/solicitudes')
      .field('organizacion', cuerpo.organizacion)
      .field('contactoNombre', cuerpo.contactoNombre)
      .field('contactoEmail', cuerpo.contactoEmail)
      .field('contactoTelefono', cuerpo.contactoTelefono)
      .field('categoriaId', cuerpo.categoriaId)
      .field('descripcion', cuerpo.descripcion)
      .expect(201)
    return respuesta.body
  }

  test('token válido devuelve solo campos públicos de coordinación', async () => {
    const { token: t } = await crearSolicitud('198.51.100.21')
    token = t

    const respuesta = await agente().get(`/api/public/seguimiento/${token}`).expect(200)

    expect(Object.keys(respuesta.body).sort()).toEqual([
      'codigo', 'estado', 'fechaCreacion', 'fechaObjetivo', 'fechaProgramada', 'prioridad', 'tecnicoAsignado'
    ].sort())
    expect(respuesta.body.estado).toBe('RECIBIDA')
    // Nunca datos internos
    const cuerpo = JSON.stringify(respuesta.body)
    expect(cuerpo).not.toMatch(/contacto|correo|resoluc|nota/i)
    expect(cuerpo).not.toContain('María Torres')
    expect(cuerpo).not.toContain('maria@manabi.com.ec')
  })

  test('token inválido devuelve 404 sin revelar información', async () => {
    const respuesta = await agente()
      .get('/api/public/seguimiento/token-que-no-existe')
      .expect(404)
    expect(respuesta.body.error.code).toBe('SEGUIMIENTO_NO_ENCONTRADO')
  })
})

describe('GET /api/public/categorias', () => {
  test('lista categorías activas con especialidad', async () => {
    const respuesta = await agente().get('/api/public/categorias').expect(200)
    expect(respuesta.body.data.length).toBeGreaterThan(0)
    expect(respuesta.body.data[0]).toHaveProperty('nombre')
  })
})
