// Especificación OpenAPI para la API de ServiGest (Fase 3 completa).
export default {
  openapi: '3.0.0',
  info: {
    title: 'ServiGest API (P0)',
    version: '0.3.0',
    description: 'API REST de ServiGest Ecuador. Cubre flujo público, autenticación con sesiones y CSRF, gestión de solicitudes, técnicos e intervenciones, catálogo, organizaciones, usuarios, dashboard y eventos SSE en tiempo real.'
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sg_session',
        description: 'Cookie de sesión httpOnly gestionada por el servidor tras login exitoso.'
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'Token CSRF requerido en todos los métodos mutantes (POST, PUT, PATCH, DELETE).'
      }
    }
  },
  tags: [
    { name: 'Público', description: 'Endpoints accesibles sin autenticación para radicación y consulta pública' },
    { name: 'Autenticación', description: 'Gestión de sesiones, credenciales y usuario actual' },
    { name: 'Solicitudes', description: 'Ciclo de vida, auditoría, notas y gestión de solicitudes' },
    { name: 'Intervenciones', description: 'Registro y resolución de intervenciones técnicas' },
    { name: 'Técnicos', description: 'Gestión de técnicos, especialidades y franjas de disponibilidad' },
    { name: 'Organizaciones', description: 'Administración de organizaciones clientes' },
    { name: 'Usuarios', description: 'Administración de cuentas de usuario y credenciales' },
    { name: 'Catálogos', description: 'Administración de categorías y especialidades técnicas' },
    { name: 'Dashboard', description: 'Métricas operativas y estadísticas de SLA' },
    { name: 'Eventos (SSE)', description: 'Canales de Server-Sent Events para actualización en vivo' },
    { name: 'Sistema', description: 'Chequeo de salud del servicio' }
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Chequeo de salud de la API',
        responses: {
          '200': {
            description: 'Servicio en funcionamiento',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ─── Público ─────────────────────────────────────────────────────────────

    '/api/public/categorias': {
      get: {
        tags: ['Público'],
        summary: 'Lista categorías activas para el formulario público',
        responses: {
          '200': {
            description: 'Lista de categorías activas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      codigo: { type: 'string', example: 'HW-SRV' },
                      nombre: { type: 'string', example: 'Servidores' },
                      descripcion: { type: 'string' },
                      nivelUrgenciaSugerido: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/public/solicitudes': {
      post: {
        tags: ['Público'],
        summary: 'Crea una solicitud pública (multipart/form-data, hasta 5 adjuntos de 5 MB)',
        description: 'Rate limit: 5 solicitudes por hora e IP.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['solicitanteNombre', 'solicitanteEmail', 'categoriaId', 'descripcion', 'urgenciaVisitante'],
                properties: {
                  solicitanteNombre: { type: 'string', example: 'Juan Pérez' },
                  solicitanteEmail: { type: 'string', format: 'email', example: 'juan.perez@empresa.com' },
                  solicitanteTelefono: { type: 'string', example: '0991234567' },
                  categoriaId: { type: 'string', format: 'uuid' },
                  descripcion: { type: 'string', example: 'Fallo crítico en servidor de base de datos principal.' },
                  urgenciaVisitante: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA'] },
                  adjuntos: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Hasta 5 archivos (jpg, png, pdf) de máx 5 MB cada uno.'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Solicitud creada exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    codigo: { type: 'string', example: 'SOL-2026-00001' },
                    tokenPublico: { type: 'string', example: 'AbCdEf123456...' },
                    estado: { type: 'string', example: 'RECIBIDA' }
                  }
                }
              }
            }
          },
          '400': { description: 'Datos inválidos o faltantes' },
          '429': { description: 'Límite de solicitudes por hora excedido' }
        }
      }
    },

    '/api/public/seguimiento/{token}': {
      get: {
        tags: ['Público'],
        summary: 'Consulta pública del estado de una solicitud por su token',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' }, description: 'Token público de 32 bytes' }
        ],
        responses: {
          '200': {
            description: 'Estado público de la solicitud',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    codigo: { type: 'string' },
                    estado: { type: 'string' },
                    categoria: { type: 'string' },
                    descripcion: { type: 'string' },
                    fechaCreacion: { type: 'string', format: 'date-time' },
                    fechaActualizacion: { type: 'string', format: 'date-time' },
                    eventos: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          tipo: { type: 'string' },
                          estadoNuevo: { type: 'string' },
                          fecha: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': { description: 'Token desconocido o inválido' }
        }
      }
    },

    '/api/public/seguimiento/{token}/eventos': {
      get: {
        tags: ['Público'],
        summary: 'Stream SSE de actualizaciones en tiempo real para el seguimiento público',
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Flujo de eventos en tiempo real (text/event-stream)' },
          '404': { description: 'Token inexistente' }
        }
      }
    },

    // ─── Autenticación ───────────────────────────────────────────────────────

    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Inicio de sesión (crea cookie de sesión sg_session)',
        description: 'Bloqueo: máximo 10 intentos por 15 minutos por IP; 5 intentos fallidos bloquean la cuenta 15 minutos.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Autenticación exitosa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usuario: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                        nombre: { type: 'string' },
                        rol: { type: 'string', enum: ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] },
                        organizacionId: { type: 'string', nullable: true },
                        activo: { type: 'boolean' }
                      }
                    },
                    csrfToken: { type: 'string' },
                    expiraEn: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          '400': { description: 'CAMPOS_FALTANTES' },
          '401': { description: 'CREDENCIALES_INVALIDAS' },
          '423': { description: 'CUENTA_BLOQUEADA' },
          '429': { description: 'LIMITE_LOGIN' }
        }
      }
    },

    '/api/auth/logout': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cierra y revoca la sesión activa',
        security: [{ cookieAuth: [], csrfToken: [] }],
        responses: {
          '204': { description: 'Sesión revocada y cookie eliminada' },
          '401': { description: 'Sin sesión activa' }
        }
      }
    },

    '/api/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtiene los datos del usuario autenticado y su CSRF token actual',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Usuario en sesión',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usuario: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string' },
                        nombre: { type: 'string' },
                        rol: { type: 'string', enum: ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] },
                        organizacionId: { type: 'string', nullable: true },
                        activo: { type: 'boolean' }
                      }
                    },
                    csrfToken: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { description: 'No autenticado' }
        }
      }
    },

    '/api/auth/password': {
      patch: {
        tags: ['Autenticación'],
        summary: 'Cambia la contraseña propia del usuario autenticado',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['actual', 'nueva'],
                properties: {
                  actual: { type: 'string' },
                  nueva: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '204': { description: 'Contraseña actualizada' },
          '400': { description: 'Datos inválidos o contraseña débil' },
          '401': { description: 'Contraseña actual incorrecta' }
        }
      }
    },

    // ─── Solicitudes ─────────────────────────────────────────────────────────

    '/api/solicitudes': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Lista solicitudes con filtros y paginación (aislado por rol y organización)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string' } },
          { name: 'prioridad', in: 'query', schema: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] } },
          { name: 'origen', in: 'query', schema: { type: 'string', enum: ['PUBLICO', 'CLIENTE'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'orden', in: 'query', schema: { type: 'string', default: 'creacion-desc' } }
        ],
        responses: {
          '200': {
            description: 'Lista paginada de solicitudes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Solicitudes'],
        summary: 'Crea una solicitud desde el portal interno o cliente',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoriaId', 'descripcion'],
                properties: {
                  categoriaId: { type: 'string', format: 'uuid' },
                  descripcion: { type: 'string' },
                  organizacionId: { type: 'string', format: 'uuid' },
                  solicitanteNombre: { type: 'string' },
                  solicitanteEmail: { type: 'string', format: 'email' },
                  solicitanteTelefono: { type: 'string' },
                  urgenciaVisitante: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA'] }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Solicitud creada' },
          '400': { description: 'Datos inválidos' }
        }
      }
    },

    '/api/solicitudes/{id}': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Detalle de solicitud según rol (recurso ajeno retorna 404)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle de la solicitud' },
          '404': { description: 'Solicitud no encontrada' }
        }
      }
    },

    '/api/solicitudes/{id}/estado': {
      patch: {
        tags: ['Solicitudes'],
        summary: 'Transición del ciclo de vida de la solicitud (REST estricto)',
        description: 'Permite transicionar entre estados: EN_REVISION, REQUIERE_INFORMACION, APROBADA, ASIGNADA, RECHAZADA, CERRADA, CANCELADA.',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: {
                  estado: {
                    type: 'string',
                    enum: ['EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'ASIGNADA', 'RECHAZADA', 'CERRADA', 'CANCELADA']
                  },
                  nota: { type: 'string', description: 'Nota explicativa obligatoria en REQUIERE_INFORMACION' },
                  motivo: { type: 'string', description: 'Motivo obligatorio en RECHAZADA, CANCELADA y reasignación' },
                  prioridad: { type: 'string', enum: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'], description: 'Obligatoria al APROBAR' },
                  constanciaAceptacion: { type: 'string', description: 'Obligatoria al APROBAR solicitudes con origen PUBLICO' },
                  tecnicoId: { type: 'string', format: 'uuid', description: 'Obligatorio en ASIGNADA' },
                  fechaProgramada: { type: 'string', format: 'date-time', description: 'Obligatorio en ASIGNADA (debe ser futura y dentro de franja)' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Transición exitosa' },
          '400': { description: 'Datos inválidos o faltantes' },
          '403': { description: 'Rol no autorizado para la transición' },
          '409': { description: 'TRANSICION_INVALIDA o choque horario' },
          '422': { description: 'CONSTANCIA_REQUERIDA o validación de reglas de asignación/SLA fallida' }
        }
      }
    },

    '/api/solicitudes/{id}/eventos': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Historial de auditoría inmutable de la solicitud (solo Admin y Coordinador)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Historial de eventos de auditoría' },
          '403': { description: 'No autorizado' },
          '404': { description: 'Solicitud no encontrada' }
        }
      }
    },

    '/api/solicitudes/{id}/notas': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Lista notas internas (Admin, Coordinador y Técnico asignado)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Lista de notas internas' }
        }
      },
      post: {
        tags: ['Solicitudes'],
        summary: 'Crea una nota interna (Admin, Coordinador y Técnico asignado)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contenido'],
                properties: {
                  contenido: { type: 'string', minLength: 3 }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Nota creada' },
          '400': { description: 'Contenido inválido' }
        }
      }
    },

    '/api/solicitudes/{id}/token': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Regenera el token de seguimiento público (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Nuevo token generado' },
          '403': { description: 'Solo administradores' }
        }
      }
    },

    // ─── Intervenciones ──────────────────────────────────────────────────────

    '/api/solicitudes/{id}/intervenciones': {
      get: {
        tags: ['Intervenciones'],
        summary: 'Lista intervenciones de una solicitud (Admin, Coordinador y Técnico asignado)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Lista de intervenciones' },
          '403': { description: 'No autorizado' }
        }
      },
      post: {
        tags: ['Intervenciones'],
        summary: 'Inicia la intervención (transiciona solicitud de ASIGNADA a EN_PROCESO)',
        description: 'Exclusivo del técnico asignado a la solicitud.',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '201': { description: 'Intervención iniciada' },
          '404': { description: 'Solicitud no encontrada o técnico no asignado' },
          '409': { description: 'La solicitud no está en estado ASIGNADA' }
        }
      }
    },

    '/api/intervenciones/{id}': {
      patch: {
        tags: ['Intervenciones'],
        summary: 'Resuelve la intervención (transiciona solicitud de EN_PROCESO a RESUELTA)',
        description: 'Exclusivo del técnico asignado. Exige documentación técnica completa (mínimo 10 caracteres cada campo) y fin posterior a inicio.',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fin', 'diagnostico', 'actividades', 'resultado'],
                properties: {
                  fin: { type: 'string', format: 'date-time' },
                  diagnostico: { type: 'string', minLength: 10 },
                  actividades: { type: 'string', minLength: 10 },
                  resultado: { type: 'string', minLength: 10 },
                  observaciones: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Intervención resuelta y solicitud marcada como RESUELTA' },
          '400': { description: 'Campos requeridos o longitud insuficiente' },
          '422': { description: 'Fecha de fin previa o igual al inicio' }
        }
      }
    },

    // ─── Técnicos ────────────────────────────────────────────────────────────

    '/api/tecnicos': {
      get: {
        tags: ['Técnicos'],
        summary: 'Lista técnicos habilitados (Admin y Coordinador)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'especialidadId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'orden', in: 'query', schema: { type: 'string', default: 'creacion-desc' } }
        ],
        responses: {
          '200': { description: 'Lista paginada de técnicos' }
        }
      },
      post: {
        tags: ['Técnicos'],
        summary: 'Habilita un usuario existente con rol TECNICO en el equipo técnico (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['usuarioId'],
                properties: {
                  usuarioId: { type: 'string', format: 'uuid' },
                  notas: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Técnico habilitado' },
          '400': { description: 'El usuario no tiene rol TECNICO' },
          '404': { description: 'Usuario no encontrado' }
        }
      }
    },

    '/api/tecnicos/{id}': {
      get: {
        tags: ['Técnicos'],
        summary: 'Obtiene el detalle de un técnico con sus especialidades y disponibilidad (Admin y Coordinador)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle del técnico' },
          '404': { description: 'Técnico no encontrado' }
        }
      },
      patch: {
        tags: ['Técnicos'],
        summary: 'Actualiza notas del técnico (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  notas: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Técnico actualizado' }
        }
      },
      delete: {
        tags: ['Técnicos'],
        summary: 'Desactiva un técnico (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Técnico desactivado' }
        }
      }
    },

    '/api/tecnicos/{id}/especialidades': {
      put: {
        tags: ['Técnicos'],
        summary: 'Reemplaza el conjunto completo de especialidades del técnico (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['especialidadIds'],
                properties: {
                  especialidadIds: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Especialidades actualizadas exitosamente' }
        }
      }
    },

    '/api/tecnicos/{id}/disponibilidad': {
      get: {
        tags: ['Técnicos'],
        summary: 'Lista franjas de disponibilidad de un técnico (Admin y Coordinador)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Franjas de disponibilidad horaria' }
        }
      },
      post: {
        tags: ['Técnicos'],
        summary: 'Crea una franja de disponibilidad recurrente (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['diaSemana', 'horaInicio', 'horaFin'],
                properties: {
                  diaSemana: { type: 'integer', minimum: 1, maximum: 7, description: '1 = Lunes, 7 = Domingo' },
                  horaInicio: { type: 'string', example: '08:00' },
                  horaFin: { type: 'string', example: '12:00' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Franja creada' }
        }
      }
    },

    '/api/tecnicos/disponibilidad/{franjaId}': {
      patch: {
        tags: ['Técnicos'],
        summary: 'Actualiza una franja de disponibilidad (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'franjaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  diaSemana: { type: 'integer', minimum: 1, maximum: 7 },
                  horaInicio: { type: 'string', example: '09:00' },
                  horaFin: { type: 'string', example: '13:00' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Franja actualizada' }
        }
      },
      delete: {
        tags: ['Técnicos'],
        summary: 'Elimina una franja de disponibilidad (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'franjaId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Franja eliminada' }
        }
      }
    },

    // ─── Organizaciones ──────────────────────────────────────────────────────

    '/api/organizaciones': {
      get: {
        tags: ['Organizaciones'],
        summary: 'Lista organizaciones cliente (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'orden', in: 'query', schema: { type: 'string', default: 'creacion-desc' } }
        ],
        responses: {
          '200': { description: 'Lista paginada de organizaciones' }
        }
      },
      post: {
        tags: ['Organizaciones'],
        summary: 'Registra una nueva organización cliente (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string' },
                  ruc: { type: 'string', example: '1790012345001', description: 'RUC de 13 dígitos numéricos' },
                  telefono: { type: 'string' },
                  direccion: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Organización creada' },
          '400': { description: 'RUC inválido o nombre faltante' }
        }
      }
    },

    '/api/organizaciones/{id}': {
      get: {
        tags: ['Organizaciones'],
        summary: 'Obtiene detalle de una organización (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle de la organización' },
          '404': { description: 'Organización no encontrada' }
        }
      },
      patch: {
        tags: ['Organizaciones'],
        summary: 'Actualiza datos de una organización (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  ruc: { type: 'string' },
                  telefono: { type: 'string' },
                  direccion: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Organización actualizada' }
        }
      },
      delete: {
        tags: ['Organizaciones'],
        summary: 'Desactiva una organización (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Organización desactivada' }
        }
      }
    },

    // ─── Usuarios ────────────────────────────────────────────────────────────

    '/api/usuarios': {
      get: {
        tags: ['Usuarios'],
        summary: 'Lista usuarios del sistema (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'rol', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] } },
          { name: 'organizacionId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'activo', in: 'query', schema: { type: 'boolean' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          '200': { description: 'Lista paginada de usuarios' }
        }
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crea un usuario (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'nombre', 'rol'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  nombre: { type: 'string' },
                  rol: { type: 'string', enum: ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] },
                  organizacionId: { type: 'string', format: 'uuid', description: 'Requerido si rol=CLIENTE' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Usuario creado' },
          '400': { description: 'Datos inválidos' },
          '409': { description: 'Correo ya registrado' }
        }
      }
    },

    '/api/usuarios/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Detalle de un usuario (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle del usuario' },
          '404': { description: 'Usuario no encontrado' }
        }
      },
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualiza datos de un usuario (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  nombre: { type: 'string' },
                  rol: { type: 'string', enum: ['ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE'] },
                  organizacionId: { type: 'string', format: 'uuid', nullable: true },
                  activo: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Usuario actualizado' }
        }
      },
      delete: {
        tags: ['Usuarios'],
        summary: 'Desactiva un usuario (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Usuario desactivado' }
        }
      }
    },

    '/api/usuarios/{id}/password': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Cambio administrativo de contraseña (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Contraseña actualizada' }
        }
      }
    },

    // ─── Catálogos ───────────────────────────────────────────────────────────

    '/api/catalogos/especialidades': {
      get: {
        tags: ['Catálogos'],
        summary: 'Lista especialidades técnicas (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': { description: 'Lista de especialidades' }
        }
      },
      post: {
        tags: ['Catálogos'],
        summary: 'Crea una nueva especialidad técnica (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Especialidad creada' },
          '409': { description: 'Especialidad ya existente' }
        }
      }
    },

    '/api/catalogos/especialidades/{id}': {
      get: {
        tags: ['Catálogos'],
        summary: 'Detalle de especialidad (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle de la especialidad' }
        }
      },
      patch: {
        tags: ['Catálogos'],
        summary: 'Actualiza nombre de la especialidad (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Especialidad actualizada' }
        }
      },
      delete: {
        tags: ['Catálogos'],
        summary: 'Desactiva una especialidad (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Especialidad desactivada' }
        }
      }
    },

    '/api/catalogos/categorias': {
      get: {
        tags: ['Catálogos'],
        summary: 'Lista categorías en módulo administrativo (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': { description: 'Lista de categorías' }
        }
      },
      post: {
        tags: ['Catálogos'],
        summary: 'Crea una categoría de servicio (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'nombre'],
                properties: {
                  codigo: { type: 'string', example: 'SEG-RED' },
                  nombre: { type: 'string', example: 'Seguridad de Redes' },
                  descripcion: { type: 'string' },
                  especialidadId: { type: 'string', format: 'uuid' }
                }
              }
            }
          }
        },
        responses: {
          '201': { description: 'Categoría creada' },
          '409': { description: 'Código duplicado' }
        }
      }
    },

    '/api/catalogos/categorias/{id}': {
      get: {
        tags: ['Catálogos'],
        summary: 'Detalle de categoría (solo Admin)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Detalle de categoría' }
        }
      },
      patch: {
        tags: ['Catálogos'],
        summary: 'Actualiza categoría (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  especialidadId: { type: 'string', format: 'uuid', nullable: true },
                  activo: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Categoría actualizada' }
        }
      },
      delete: {
        tags: ['Catálogos'],
        summary: 'Desactiva una categoría (solo Admin)',
        security: [{ cookieAuth: [], csrfToken: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Categoría desactivada' }
        }
      }
    },

    // ─── Dashboard ───────────────────────────────────────────────────────────

    '/api/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Métricas operativas del sistema (aislado por rol)',
        description: 'Admin y Coordinador ven métricas globales y carga por técnico; Cliente ve exclusivamente métricas de su organización.',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Métricas operativas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total: { type: 'integer' },
                    porEstado: { type: 'object' },
                    porPrioridad: { type: 'object' },
                    sla: {
                      type: 'object',
                      properties: {
                        cumplidas: { type: 'integer' },
                        incumplidas: { type: 'integer' },
                        enRiesgo: { type: 'integer' }
                      }
                    },
                    mttrHoras: { type: 'number', nullable: true },
                    cargaTecnicos: {
                      type: 'array',
                      nullable: true,
                      items: {
                        type: 'object',
                        properties: {
                          tecnicoId: { type: 'string', format: 'uuid' },
                          nombre: { type: 'string' },
                          asignadas: { type: 'integer' },
                          enProceso: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    // ─── Eventos en tiempo real (SSE) ────────────────────────────────────────

    '/api/eventos/coordinacion': {
      get: {
        tags: ['Eventos (SSE)'],
        summary: 'Canal SSE de coordinación operativa (Admin y Coordinador)',
        description: 'Emite eventos en tiempo real: solicitud.creada, solicitud.estado, solicitud.asignada, solicitud.reasignada, solicitud.cerrada, intervencion.iniciada, intervencion.resuelta.',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Flujo SSE text/event-stream' },
          '401': { description: 'Sin sesión' },
          '403': { description: 'Rol no autorizado' }
        }
      }
    },

    '/api/eventos/tecnico': {
      get: {
        tags: ['Eventos (SSE)'],
        summary: 'Canal SSE específico para técnicos',
        description: 'Emite actualizaciones de intervenciones y solicitudes asignadas al técnico.',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Flujo SSE text/event-stream' },
          '401': { description: 'Sin sesión' },
          '403': { description: 'Rol no autorizado' }
        }
      }
    }
  }
}
