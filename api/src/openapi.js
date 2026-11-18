// Especificación OpenAPI mínima para el flujo de la fase 1.
export default {
  openapi: '3.0.0',
  info: {
    title: 'ServiGest API (P0)',
    version: '0.2.0',
    description: 'Flujo público y portal autenticado (auth + coordinación). Técnicos, cliente, dashboard y administración llegan en fases 3-4.'
  },
  paths: {
    '/api/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'OK' } } }
    },
    '/api/public/categorias': {
      get: { summary: 'Categorías activas', responses: { '200': { description: 'OK' } } }
    },
    '/api/public/solicitudes': {
      post: {
        summary: 'Crea una solicitud pública (multipart, hasta 5 adjuntos de 5 MB)',
        responses: {
          '201': { description: 'Solicitud creada, devuelve codigo y token' },
          '400': { description: 'Datos inválidos' },
          '429': { description: 'Límite de 5 solicitudes por hora' }
        }
      }
    },
    '/api/public/seguimiento/{token}': {
      get: {
        summary: 'Seguimiento público por token',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Token desconocido' } }
      }
    },
    '/api/public/seguimiento/{token}/eventos': {
      get: {
        summary: 'SSE de seguimiento',
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Flujo text/event-stream' } }
      }
    },

    '/api/auth/login': {
      post: {
        summary: 'Crea sesión y cookie httpOnly (10 intentos por 15 min por IP)',
        responses: {
          '200': { description: 'Sesión creada; devuelve usuario y CSRF' },
          '401': { description: 'CREDENCIALES_INVALIDAS' },
          '423': { description: 'CUENTA_BLOQUEADA' },
          '429': { description: 'LIMITE_LOGIN' }
        }
      }
    },
    '/api/auth/logout': {
      post: { summary: 'Revoca la sesión activa', responses: { '204': { description: 'OK' } } }
    },
    '/api/auth/me': {
      get: { summary: 'Usuario en sesión y token CSRF', responses: { '200': { description: 'OK' }, '401': { description: 'Sin sesión' } } }
    },
    '/api/auth/password': {
      patch: { summary: 'Cambia la contraseña propia (mínimo 8 caracteres)', responses: { '204': { description: 'OK' }, '400': { description: 'Datos inválidos' } } }
    },
    '/api/solicitudes': {
      get: {
        summary: 'Listado paginado con filtros (aislado por rol y organización)',
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string' } },
          { name: 'prioridad', in: 'query', schema: { type: 'string' } },
          { name: 'origen', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } }
        ],
        responses: { '200': { description: 'OK' } }
      },
      post: {
        summary: 'Crea solicitud: origen PUBLICO si la registra un interno, CLIENTE si es un usuario cliente',
        responses: { '201': { description: 'Creada con codigo y token' }, '400': { description: 'Datos inválidos' } }
      }
    },
    '/api/solicitudes/{id}': {
      get: { summary: 'Detalle por rol (recurso ajeno → 404)', responses: { '200': { description: 'OK' }, '404': { description: 'No existe o es ajena' } } }
    },
    '/api/solicitudes/{id}/estado': {
      patch: {
        summary: 'Transición de estado del ciclo de vida (EN_REVISION, REQUIERE_INFORMACION, APROBADA, RECHAZADA, CANCELADA)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: { type: 'string', enum: ['EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA', 'CANCELADA'] },
                  nota: { type: 'string' },
                  motivo: { type: 'string' },
                  prioridad: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] },
                  constanciaAceptacion: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Transición exitosa' },
          '400': { description: 'Datos inválidos o faltantes' },
          '403': { description: 'Rol no autorizado o cancelación no permitida' },
          '409': { description: 'TRANSICION_INVALIDA' },
          '422': { description: 'CONSTANCIA_REQUERIDA' }
        }
      }
    },
    '/api/solicitudes/{id}/eventos': {
      get: { summary: 'Historial de auditoría (Admin y Coordinador)', responses: { '200': { description: 'OK' } } }
    },
    '/api/solicitudes/{id}/notas': {
      get: { summary: 'Notas internas', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Crea nota interna', responses: { '201': { description: 'OK' } } }
    },
    '/api/solicitudes/{id}/token': {
      post: { summary: 'Regenera el token público (solo Admin)', responses: { '200': { description: 'Nuevo token' }, '403': { description: 'ROL_NO_AUTORIZADO' } } }
    },
    '/api/eventos/coordinacion': {
      get: { summary: 'SSE de coordinación (cookie, Admin y Coordinador)', responses: { '200': { description: 'Flujo text/event-stream' }, '401': { description: 'Sin sesión' } } }
    }
  }
}
