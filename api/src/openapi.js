'use strict'

// Especificación OpenAPI mínima para el flujo de la fase 1.
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'ServiGest API (P0)',
    version: '0.1.0',
    description: 'Endpoints del flujo público. Los módulos autenticados se documentan en fases 2-4.'
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
    }
  }
}
