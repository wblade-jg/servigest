# ServiGest Ecuador — Acuerdo de diseño del P0

**Versión:** 1.0
**Estado:** Acuerdo cerrado para implementación
**Fecha:** 2026-11-16
**Base:** `servigest_mvp_p0.md`
**Naturaleza:** proyecto académico / demo evaluable

---

## 1. Objetivo del documento

Registrar las decisiones acordadas para construir el P0 de ServiGest, resolver las ambigüedades del documento funcional y dejar una referencia única para implementación, pruebas y demostración.

Cuando este documento y el documento funcional difieran, **prevalece este acuerdo** para el alcance del P0.

---

## 2. Alcance acordado

### 2.1. Incluido

- Sitio público informativo con formulario de requerimiento.
- Seguimiento público mediante token.
- Autenticación y autorización por roles.
- Una única entidad de **solicitud** con origen público o cliente.
- Revisión, aprobación, rechazo, asignación, ejecución y cierre.
- Gestión de organizaciones, usuarios, técnicos, especialidades y categorías.
- Disponibilidad semanal por franjas horarias.
- Intervenciones con una sola intervención activa por solicitud.
- Adjuntos en disco local con metadatos en base de datos.
- Auditoría de solicitudes.
- Dashboard operativo calculado desde datos persistidos.
- Actualización en vivo por SSE en tres vistas.
- Pruebas unitarias e integración, Swagger y seed de demo.
- Ejecución local con Docker Compose.

### 2.2. Excluido

- Contratos, suscripciones, sedes y activos.
- Verificación automática de cobertura contractual.
- Pagos, pasarela, facturación y firma electrónica.
- Cotizador automático.
- Correo electrónico transaccional.
- Notificaciones persistidas o centro de notificaciones.
- Reapertura de solicitudes cerradas.
- Aplicación móvil, geolocalización y rutas.
- Inventario, repuestos, mantenimiento predictivo e IA.
- Integraciones ERP/CRM.
- Permisos granulares por cargo dentro de una organización.
- Despliegue en nube y pruebas E2E con Playwright.

---

## 3. Stack y arquitectura

| Capa | Decisión |
|---|---|
| Backend | Node.js + Express |
| Acceso a datos | `pg` con SQL puro, sin ORM |
| Base de datos | PostgreSQL |
| Migraciones | Archivos `.sql` numerados y runner propio con tabla `schema_migrations` |
| Frontend | React + Vite + TypeScript |
| Estilos y componentes | Tailwind CSS + shadcn/ui |
| Tiempo real | Server-Sent Events (SSE) |
| Autenticación | Sesión persistida en PostgreSQL + cookie httpOnly |
| Documentación API | OpenAPI / Swagger |
| Pruebas | Jest + Supertest |
| Contenedores | Docker Compose: `db`, `api`, `web` |
| Zona horaria | Almacenar UTC; mostrar `America/Guayaquil` |
| Idioma | Español |
| Moneda | USD solo como referencia; no se calculan costos |

### 3.1. Estructura del repositorio

```
servigest/
├── api/
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   ├── db/
│   │   └── app.js
│   ├── migrations/
│   ├── seeds/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── web/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── acuerdo-diseno.md
├── uploads/            # volumen local, fuera del web root
├── docker-compose.yml
├── .env.example
└── README.md
```

### 3.2. Principios de implementación

- Toda regla de negocio crítica se valida en el backend.
- Las transiciones de estado se ejecutan en transacción y con bloqueo de fila (`SELECT ... FOR UPDATE`).
- Las consultas usan parámetros, nunca concatenación de SQL.
- El backend genera la auditoría; el frontend no la envía.
- El aislamiento por organización se aplica en cada consulta del rol Cliente.
- Los catálogos y usuarios se desactivan, no se eliminan físicamente.

---

## 4. Modelo de datos

Extensiones requeridas: `pgcrypto` para `gen_random_uuid()` y `citext` para correos.

### 4.1. Enumeraciones

```sql
rol_usuario:        ADMIN | COORDINADOR | TECNICO | CLIENTE
origen_solicitud:   PUBLICO | CLIENTE
estado_solicitud:   RECIBIDA | EN_REVISION | REQUIERE_INFORMACION |
                    APROBADA | RECHAZADA | ASIGNADA | EN_PROCESO |
                    RESUELTA | CERRADA | CANCELADA
prioridad:          BAJA | MEDIA | ALTA | CRITICA
tipo_nota:          INTERNA | SOLICITUD_INFORMACION
tipo_evento:        CREACION | CAMBIO_ESTADO | APROBACION | RECHAZO |
                    ASIGNACION | REASIGNACION | INTERVENCION_INICIO |
                    INTERVENCION_FIN | NOTA | ADJUNTO | CIERRE |
                    CANCELACION | REGENERACION_TOKEN
```

### 4.2. Tablas

#### `organizaciones`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `nombre` | text | not null |
| `ruc` | text | null, unique cuando no es null |
| `telefono` | text | null |
| `direccion` | text | null |
| `activo` | boolean | not null, default true |
| `created_at` | timestamptz | not null, default now() |
| `updated_at` | timestamptz | not null, default now() |

#### `usuarios`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `organizacion_id` | uuid | FK `organizaciones`, null para internos |
| `nombre` | text | not null |
| `email` | citext | not null, unique |
| `password_hash` | text | not null |
| `rol` | `rol_usuario` | not null |
| `activo` | boolean | not null, default true |
| `intentos_fallidos` | integer | not null, default 0 |
| `bloqueado_hasta` | timestamptz | null |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Regla: `rol = 'CLIENTE'` exige `organizacion_id`; los roles internos lo tienen nulo.

#### `sesiones`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `usuario_id` | uuid | FK `usuarios`, on delete cascade |
| `token_hash` | text | not null, unique; SHA-256 del token de sesión |
| `csrf_secret` | text | not null |
| `expira_en` | timestamptz | not null |
| `created_at` | timestamptz | not null |
| `last_seen_at` | timestamptz | not null |
| `revocada_en` | timestamptz | null |
| `ip` | inet | null |
| `user_agent` | text | null |

Índices: `usuario_id`, `expira_en`.

#### `especialidades`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | text | not null, unique |
| `activo` | boolean | not null, default true |

#### `tecnicos`

| Columna | Tipo | Restricción |
|---|---|---|
| `usuario_id` | uuid | PK, FK `usuarios`, on delete cascade |
| `activo` | boolean | not null, default true |
| `notas` | text | null |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

El técnico debe tener rol `TECNICO` y estar activo tanto en `usuarios` como en `tecnicos` para recibir asignaciones.

#### `tecnico_especialidad`

| Columna | Tipo | Restricción |
|---|---|---|
| `tecnico_id` | uuid | FK `tecnicos`, on delete cascade |
| `especialidad_id` | uuid | FK `especialidades`, on delete restrict |
| — | — | PK compuesta (`tecnico_id`, `especialidad_id`) |

#### `categorias_servicio`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | text | not null, unique |
| `descripcion` | text | null |
| `especialidad_requerida_id` | uuid | FK `especialidades`, null si no exige |
| `activo` | boolean | not null, default true |
| `orden` | integer | not null, default 0 |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Regla: **una sola especialidad requerida por categoría**, nullable. Si está definida, la asignación exige que el técnico la tenga.

#### `disponibilidad`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `tecnico_id` | uuid | FK `tecnicos`, on delete cascade |
| `dia_semana` | smallint | not null, ISO: 1=lunes … 7=domingo |
| `hora_inicio` | time | not null |
| `hora_fin` | time | not null |
| `activo` | boolean | not null, default true |

Restricciones: `hora_inicio < hora_fin`; sin solapamiento entre franjas activas del mismo técnico y día (validado en backend).

#### `solicitudes`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `codigo` | text | not null, unique; formato `SOL-2026-00001` |
| `token_publico` | text | not null, unique; 32 bytes aleatorios base64url |
| `origen` | `origen_solicitud` | not null |
| `organizacion_id` | uuid | FK `organizaciones`, null en origen público |
| `organizacion_nombre` | text | null; obligatorio en origen público |
| `created_by` | uuid | FK `usuarios`, null en origen público |
| `contacto_nombre` | text | not null |
| `contacto_email` | citext | not null |
| `contacto_telefono` | text | not null |
| `categoria_id` | uuid | FK `categorias_servicio`, not null |
| `descripcion` | text | not null |
| `ubicacion` | text | null |
| `urgencia_declarada` | `prioridad` | null; solo referencia |
| `prioridad` | `prioridad` | null hasta la aprobación |
| `estado` | `estado_solicitud` | not null, default `RECIBIDA` |
| `tecnico_id` | uuid | FK `tecnicos`, null hasta asignar |
| `fecha_hora_programada` | timestamptz | null hasta asignar |
| `fecha_objetivo` | timestamptz | null hasta aprobar |
| `constancia_aceptacion` | text | null; obligatoria al aprobar origen público |
| `aprobada_por` | uuid | FK `usuarios`, null |
| `aprobada_en` | timestamptz | null |
| `rechazada_motivo` | text | null |
| `cancelada_motivo` | text | null |
| `resolucion` | text | null |
| `resuelta_en` | timestamptz | null |
| `cerrada_por` | uuid | FK `usuarios`, null |
| `cerrada_en` | timestamptz | null |
| `solicitud_relacionada_id` | uuid | FK `solicitudes`, null; usada al crear una nueva tras un cierre |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Restricciones de coherencia (validadas en backend y, cuando sea posible, con `CHECK`):

- Origen `PUBLICO`: `organizacion_id` nulo y `organizacion_nombre` obligatorio.
- Origen `CLIENTE`: `organizacion_id` obligatorio.
- `APROBADA` en adelante: `prioridad`, `aprobada_por`, `aprobada_en` y `fecha_objetivo` no nulos.
- `ASIGNADA` en adelante: `tecnico_id` y `fecha_hora_programada` no nulos.
- `RESUELTA` y `CERRADA`: `resolucion` no nula.
- `RECHAZADA`: `rechazada_motivo` no nulo.
- `CANCELADA`: `cancelada_motivo` no nulo.
- `CERRADA`: `cerrada_por` y `cerrada_en` no nulos.

Índices: `estado`, `organizacion_id`, `tecnico_id`, `categoria_id`, `fecha_objetivo`, `created_at`, `token_publico`.

Código legible: secuencia PostgreSQL global y formato `SOL-<año de creación>-<secuencia con 5 dígitos>`. La secuencia no se reinicia por año; el año solo es informativo.

#### `intervenciones`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `solicitud_id` | uuid | FK `solicitudes`, on delete cascade |
| `tecnico_id` | uuid | FK `tecnicos`, not null |
| `inicio` | timestamptz | not null |
| `fin` | timestamptz | null mientras está abierta |
| `diagnostico` | text | null |
| `actividades` | text | null |
| `resultado` | text | null |
| `observaciones` | text | null |
| `created_at` | timestamptz | not null |
| `updated_at` | timestamptz | not null |

Reglas:

- `fin` nulo o mayor que `inicio`.
- **Una sola intervención abierta por solicitud**, garantizada con índice único parcial sobre `solicitud_id` donde `fin IS NULL`.
- El ejecutor puede diferir del técnico responsable de la solicitud.

#### `adjuntos`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `solicitud_id` | uuid | FK `solicitudes`, null |
| `intervencion_id` | uuid | FK `intervenciones`, null |
| `nombre_original` | text | not null |
| `ruta` | text | not null, unique |
| `mime_type` | text | not null |
| `tamano_bytes` | bigint | not null |
| `subido_por` | uuid | FK `usuarios`, null en formulario público |
| `created_at` | timestamptz | not null |

Restricciones:

- Exactamente uno de `solicitud_id` o `intervencion_id` no nulo.
- `tamano_bytes <= 5 MB`.
- MIME permitido: `image/jpeg`, `image/png`, `application/pdf`.
- Máximo 5 adjuntos por solicitud y 5 por intervención.
- Archivo físico con nombre UUID fuera del web root; nunca se sirve como estático.

#### `notas_solicitud`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `solicitud_id` | uuid | FK `solicitudes`, on delete cascade |
| `autor_id` | uuid | FK `usuarios`, not null |
| `tipo` | `tipo_nota` | not null |
| `contenido` | text | not null |
| `created_at` | timestamptz | not null |

Son internas. El Cliente no las ve en ninguna vista ni endpoint.

#### `eventos_solicitud`

| Columna | Tipo | Restricción |
|---|---|---|
| `id` | bigserial | PK |
| `solicitud_id` | uuid | FK `solicitudes`, on delete cascade |
| `actor_id` | uuid | FK `usuarios`, null si lo genera el sistema |
| `tipo` | `tipo_evento` | not null |
| `estado_anterior` | `estado_solicitud` | null |
| `estado_nuevo` | `estado_solicitud` | null |
| `metadata` | jsonb | not null, default `'{}'` |
| `created_at` | timestamptz | not null, default now() |

Tabla append-only: sin endpoints de actualización ni borrado. Se escribe en la misma transacción que el cambio que audita.

#### `sla_reglas`

| Columna | Tipo | Restricción |
|---|---|---|
| `prioridad` | `prioridad` | PK |
| `horas` | integer | not null, > 0 |

Seed: `CRITICA=4`, `ALTA=8`, `MEDIA=24`, `BAJA=72`. En P0 se siembra y se consulta; no se edita desde la UI.

### 4.3. Relaciones principales

```
organizaciones 1 ── N usuarios
usuarios 1 ── 1 tecnicos
tecnicos N ── N especialidades
categorias_servicio N ── 1 especialidades (requerida, opcional)
tecnicos 1 ── N disponibilidad
organizaciones 1 ── N solicitudes
solicitudes 1 ── N intervenciones
solicitudes 1 ── N adjuntos
intervenciones 1 ── N adjuntos
solicitudes 1 ── N notas_solicitud
solicitudes 1 ── N eventos_solicitud
solicitudes 1 ── 0..1 solicitudes (relacionada)
```

---

## 5. Máquina de estados

### 5.1. Diagrama

```
RECIBIDA
   │ (coordinador/admin)
   ▼
EN_REVISION ──────────────► RECHAZADA
   │  ▲                          
   │  │ (coordinador/admin)     
   ▼  │                         
REQUIERE_INFORMACION           
   │
   │ (coordinador/admin)
   ▼
APROBADA
   │ (coordinador/admin, valida técnico + agenda + SLA)
   ▼
ASIGNADA ──► ASIGNADA (reasignación con motivo)
   │ (técnico asignado inicia intervención)
   ▼
EN_PROCESO
   │ (técnico asignado resuelve y documenta)
   ▼
RESUELTA
   │ (coordinador/admin)
   ▼
CERRADA

Cualquier estado no terminal ──► CANCELADA
```

### 5.2. Transiciones permitidas

| Desde | Hacia | Rol | Condiciones |
|---|---|---|---|
| `RECIBIDA` | `EN_REVISION` | Coordinador, Admin | — |
| `EN_REVISION` | `REQUIERE_INFORMACION` | Coordinador, Admin | Nota interna obligatoria |
| `REQUIERE_INFORMACION` | `EN_REVISION` | Coordinador, Admin | Nota con la gestión realizada |
| `EN_REVISION` | `APROBADA` | Coordinador, Admin | Prioridad, cálculo de SLA y, en origen público, constancia de aceptación |
| `EN_REVISION` | `RECHAZADA` | Coordinador, Admin | Motivo obligatorio |
| `REQUIERE_INFORMACION` | `RECHAZADA` | Coordinador, Admin | Motivo obligatorio |
| `APROBADA` | `ASIGNADA` | Coordinador, Admin | Técnico activo, especialidad, franja, sin choque, fecha ≤ objetivo |
| `ASIGNADA` | `ASIGNADA` | Coordinador, Admin | Reasignación con motivo; mismas validaciones |
| `ASIGNADA` | `EN_PROCESO` | Técnico asignado | Crea intervención abierta |
| `EN_PROCESO` | `RESUELTA` | Técnico asignado | Cierra intervención y registra resolución |
| `RESUELTA` | `CERRADA` | Coordinador, Admin | Resolución no vacía |
| No terminal | `CANCELADA` | Cliente (antes de `APROBADA`), Coordinador, Admin | Motivo obligatorio |

Estados terminales: `RECHAZADA`, `CERRADA`, `CANCELADA`. No hay transición de salida.

### 5.3. Reglas de transición

- Cada transición se valida contra el estado actual dentro de una transacción con bloqueo de fila.
- Toda transición genera un registro en `eventos_solicitud` con actor, fecha y estados.
- El Cliente no puede mover una solicitud a ningún estado distinto de `CANCELADA`, y solo si pertenece a su organización y el estado es anterior a `APROBADA`.
- Un técnico solo puede iniciar o resolver solicitudes asignadas a él.
- No se puede cerrar sin resolución documentada.
- No se puede reabrir una solicitud cerrada; se crea una nueva con `solicitud_relacionada_id`.

---

## 6. Reglas de negocio

### 6.1. SLA

- La prioridad la fija el coordinador al aprobar. La urgencia declarada por el visitante es solo referencia.
- `fecha_objetivo = aprobada_en + sla_reglas.horas` en horas calendario.
- La prioridad queda **congelada al aprobar**. No se recalcula el SLA después.
- `próxima a vencer`: solicitud en `APROBADA`, `ASIGNADA` o `EN_PROCESO` con `fecha_objetivo` dentro de las próximas 24 horas.
- `vencida`: solicitud no terminal con `fecha_objetivo < now()`.
- La asignación se bloquea si la `fecha_hora_programada` supera `fecha_objetivo`.

### 6.2. Asignación

La asignación valida, en orden:

1. Solicitud en estado `APROBADA` o `ASIGNADA` (reasignación).
2. Técnico existente, con rol `TECNICO` y activo en `usuarios` y `tecnicos`.
3. Especialidad requerida por la categoría, si existe.
4. `fecha_hora_programada` futura y dentro de una franja activa del técnico para ese día.
5. Sin solapamiento con otra solicitud activa del mismo técnico en un rango de una hora.
6. `fecha_hora_programada <= fecha_objetivo`.
7. En reasignación, motivo obligatorio.

Si falla cualquier validación, la operación se rechaza con un mensaje específico. No hay asignación automática ni optimizador.

### 6.3. Intervenciones

- Una intervención abierta por solicitud como máximo.
- El técnico asignado inicia la intervención: se registra `inicio` (editable, por defecto ahora) y la solicitud pasa a `EN_PROCESO`.
- Al resolver: se registra `fin` (manual, mayor que `inicio`), diagnóstico, actividades y resultado. La solicitud pasa a `RESUELTA` y se guarda la resolución.
- El coordinador cierra después de revisar.
- Las horas son informativas; no se calculan costos ni bolsas de horas.
- Se permiten adjuntos de evidencia en la intervención.

### 6.4. Cancelación y rechazo

- El Cliente cancela solo solicitudes de su organización en `RECIBIDA`, `EN_REVISION` o `REQUIERE_INFORMACION`.
- Coordinador y Admin cancelan en cualquier estado no terminal.
- El motivo es obligatorio y se audita.
- El rechazo solo ocurre en `EN_REVISION` o `REQUIERE_INFORMACION`, con motivo obligatorio.

### 6.5. Auditoría

Se registra como mínimo:

- Creación de la solicitud.
- Cambios de estado.
- Aprobación y rechazo.
- Asignación y reasignación.
- Inicio y fin de intervención.
- Notas internas.
- Adjuntos.
- Cierre y cancelación.
- Regeneración del token público.

El historial completo es visible solo para Admin y Coordinador. El Cliente ve únicamente el estado actual y los datos de coordinación definidos; no ve historial, notas ni auditoría.

### 6.6. Aislamiento por organización

- Toda consulta del rol Cliente filtra por su `organizacion_id`.
- Un Cliente no puede leer, cancelar, adjuntar ni descargar recursos de otra organización.
- Ante un recurso ajeno se responde `404`, no `403`, para no revelar existencia.
- Técnicos y coordinadores ven el ámbito global; el Cliente nunca.

---

## 7. API REST

Base: `/api`. Errores uniformes:

```json
{
  "error": {
    "code": "TRANSICION_INVALIDA",
    "message": "No se puede pasar de RECIBIDA a ASIGNADA.",
    "details": {}
  }
}
```

Paginación: `page`, `limit` (máximo 100). Respuesta: `{ data, page, limit, total }`.

### 7.1. Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Crea sesión y cookie httpOnly |
| POST | `/auth/logout` | Revoca sesión |
| GET | `/auth/me` | Usuario actual y token CSRF |
| PATCH | `/auth/password` | Cambio de contraseña propia |

### 7.2. Público

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/public/categorias` | Categorías activas |
| POST | `/public/solicitudes` | Crea solicitud pública (multipart con adjuntos) |
| GET | `/public/seguimiento/:token` | Estado y datos de coordinación |
| GET | `/public/seguimiento/:token/eventos` | SSE de seguimiento |

El seguimiento devuelve: código, estado, prioridad, fecha de creación, fecha objetivo, nombre del técnico asignado y fecha programada. No devuelve contacto, adjuntos, notas ni resolución.

### 7.3. Solicitudes

| Método | Ruta | Rol |
|---|---|---|
| GET | `/solicitudes` | Internos y Cliente (filtrado por organización) |
| POST | `/solicitudes` | Cliente (su organización), Coordinador, Admin |
| GET | `/solicitudes/:id` | Internos y Cliente propietario |
| POST | `/solicitudes/:id/revision` | Coordinador, Admin |
| POST | `/solicitudes/:id/solicitar-informacion` | Coordinador, Admin |
| POST | `/solicitudes/:id/aprobar` | Coordinador, Admin |
| POST | `/solicitudes/:id/rechazar` | Coordinador, Admin |
| POST | `/solicitudes/:id/asignar` | Coordinador, Admin |
| POST | `/solicitudes/:id/reasignar` | Coordinador, Admin |
| POST | `/solicitudes/:id/cancelar` | Cliente propietario, Coordinador, Admin |
| POST | `/solicitudes/:id/cerrar` | Coordinador, Admin |
| GET | `/solicitudes/:id/eventos` | Coordinador, Admin |
| POST | `/solicitudes/:id/notas` | Coordinador, Admin, Técnico asignado |
| GET | `/solicitudes/:id/notas` | Coordinador, Admin, Técnico asignado |
| POST | `/solicitudes/:id/regenerar-token` | Admin |

Filtros de listado: `estado`, `prioridad`, `categoria_id`, `tecnico_id`, `origen`, `desde`, `hasta`, `q`, `page`, `limit`, `orden`.

### 7.4. Intervenciones y adjuntos

| Método | Ruta | Rol |
|---|---|---|
| POST | `/solicitudes/:id/intervenciones/iniciar` | Técnico asignado |
| PATCH | `/intervenciones/:id/resolver` | Técnico asignado |
| POST | `/solicitudes/:id/adjuntos` | Internos; Cliente en su organización |
| POST | `/intervenciones/:id/adjuntos` | Técnico asignado, Coordinador, Admin |
| GET | `/adjuntos/:id` | Internos; Cliente propietario |

### 7.5. Administración

| Recurso | Rutas | Rol |
|---|---|---|
| Organizaciones | CRUD `/organizaciones` | Admin |
| Usuarios | CRUD `/usuarios` | Admin |
| Técnicos | CRUD `/tecnicos`, `PUT /tecnicos/:id/especialidades` | Admin |
| Disponibilidad | CRUD `/tecnicos/:id/disponibilidad` | Admin, Coordinador |
| Categorías | CRUD `/categorias` | Admin |
| Especialidades | CRUD `/especialidades` | Admin |
| Reglas SLA | `GET /sla-reglas` | Admin, Coordinador |

### 7.6. Dashboard

`GET /dashboard` devuelve, según el rol:

- Solicitudes por estado.
- Solicitudes por prioridad.
- Pendientes de asignación (`APROBADA` sin técnico).
- Próximas a vencer (24 h).
- Vencidas.
- Carga por técnico (solicitudes no terminales asignadas).
- Tiempo promedio de resolución (`cerrada_en - created_at`, solo `CERRADA`).
- Evolución semanal de solicitudes creadas (últimas 8 semanas).

Para el rol Cliente, el endpoint devuelve solo métricas de su organización y omite la carga por técnico. Admin y Coordinador ven el ámbito global. No existe rol Gerencia separado en P0.

Documentación interactiva en `/api/docs` (Swagger).

---

## 8. Tiempo real con SSE

### 8.1. Canales

| Canal | Endpoint | Autenticación |
|---|---|---|
| Coordinación | `GET /api/eventos/coordinacion` | Cookie, roles Admin/Coordinador |
| Técnico | `GET /api/eventos/tecnico` | Cookie, rol Técnico; solo sus solicitudes |
| Seguimiento público | `GET /api/public/seguimiento/:token/eventos` | Token en la ruta |

### 8.2. Eventos

- `solicitud.creada`
- `solicitud.estado`
- `solicitud.asignada`
- `solicitud.reasignada`
- `solicitud.cerrada`
- `intervencion.iniciada`
- `intervencion.resuelta`

Cada evento incluye `solicitudId`, `codigo`, `estado`, `fecha` y los datos mínimos para actualizar la vista. No se persisten notificaciones ni estados de lectura.

### 8.3. Comportamiento

- Heartbeat cada 25 segundos.
- `EventSource` reconecta automáticamente.
- Al reconectar, el cliente vuelve a consultar el listado por REST para cubrir eventos perdidos.
- Si el usuario está desconectado, el evento no se recupera; la auditoría permanece en la base de datos.
- El canal público solo emite cambios de estado y coordinación, nunca notas, adjuntos ni datos de contacto.

---

## 9. Frontend

### 9.1. Rutas públicas

| Ruta | Contenido |
|---|---|
| `/` | Inicio, propuesta de valor y llamadas a la acción |
| `/servicios` | Categorías activas desde la API |
| `/planes` | Modalidades informativas; sin contratación |
| `/solicitar` | Formulario público con adjuntos |
| `/contacto` | Canales y datos de la empresa |
| `/login` | Acceso al portal |
| `/seguimiento/:token` | Estado público con SSE |

### 9.2. Portal interno

| Ruta | Rol |
|---|---|
| `/app/dashboard` | Admin, Coordinador, Cliente (vista propia) |
| `/app/solicitudes` | Admin, Coordinador |
| `/app/solicitudes/:id` | Admin, Coordinador, Técnico asignado, Cliente propietario |
| `/app/clientes` | Admin, Coordinador |
| `/app/tecnicos` | Admin, Coordinador |
| `/app/catalogos` | Admin |
| `/app/usuarios` | Admin |
| `/app/mis-solicitudes` | Técnico |
| `/app/mis-solicitudes/nueva` | Cliente |
| `/app/perfil` | Todos |

### 9.3. Comportamiento por rol

- **Admin:** todo, incluida gestión de usuarios, catálogos y regeneración de token.
- **Coordinador:** operación completa salvo gestión de usuarios y catálogos.
- **Técnico:** solo solicitudes asignadas; iniciar y resolver intervención; adjuntar evidencias.
- **Cliente:** crear y consultar solicitudes de su organización; cancelar antes de aprobar; ver adjuntos propios; sin historial ni notas internas.

Cuando una solicitud cambia por SSE, la lista se actualiza sin recarga. Las notificaciones son avisos efímeros (toast); no hay campanita ni historial de notificaciones.

---

## 10. Seguridad

- Contraseñas con bcrypt (coste 12).
- Cookie de sesión `sg_session`: `httpOnly`, `SameSite=Lax`, `Secure` en producción, `Path=/`.
- Token de sesión aleatorio; en base de datos se guarda solo su SHA-256.
- Sesión con expiración absoluta de 12 horas; `last_seen_at` se actualiza en cada petición.
- Bloqueo temporal de 15 minutos tras 5 intentos fallidos.
- CSRF: token ligado a la sesión, devuelto por `/auth/me` y exigido en `POST`, `PUT`, `PATCH` y `DELETE` mediante cabecera `X-CSRF-Token`.
- Rate limiting: 5 solicitudes públicas por hora e IP; 10 intentos de login por 15 minutos e IP.
- Validación de archivos por MIME real (magic bytes), tamaño y cantidad; nombres aleatorios; descarga autenticada con `Content-Disposition: attachment`.
- Consultas parametrizadas; transacciones y bloqueo de fila en transiciones.
- Guards de rol, pertenencia a organización y coherencia de estado en cada operación.
- El frontend nunca recibe datos que el rol no pueda ver; el backend no confía en ocultar opciones en React.

---

## 11. Pruebas

Framework: Jest + Supertest contra una base PostgreSQL de prueba, con migraciones y limpieza entre suites.

Casos mínimos:

1. Login, logout, sesión expirada, bloqueo por intentos y CSRF.
2. Todas las transiciones permitidas y prohibidas por rol y estado.
3. Aislamiento: Cliente A no lee, cancela, adjunta ni descarga recursos de Cliente B.
4. Asignación: técnico inactivo, sin especialidad, fuera de franja, solapamiento, fecha pasada y fecha posterior al SLA.
5. SLA: cálculo por prioridad, próximas a vencer y vencidas.
6. Intervención: una sola abierta, `fin > inicio`, resolución obligatoria.
7. Cierre sin resolución rechazado.
8. Cancelación por Cliente antes y después de aprobar.
9. Formulario público: token no predecible, rate limit y respuesta sin datos internos.
10. Adjuntos: tipo, tamaño, cantidad y control de acceso.
11. Dashboard: métricas calculadas desde datos persistidos.
12. Auditoría: evento generado en cada transición con actor y estados.

Sin pruebas E2E. La validación de flujos completos se hace manualmente con el seed de demo.

---

## 12. Entregables y ejecución

- `docker compose up` levanta PostgreSQL, API y frontend.
- Migraciones y seed ejecutables con scripts de npm.
- Swagger en `/api/docs`.
- `README.md` con requisitos, variables de entorno, credenciales de demo y guion de demostración.
- `.env.example` con todas las variables.
- Volumen para `uploads/` y para datos de PostgreSQL.
- Sin despliegue en nube ni CI en P0.

### 12.1. Seed de demostración

- 2 organizaciones: una empresa industrial y una clínica.
- 7 usuarios: 1 Admin, 1 Coordinador, 2 Técnicos, 2 Clientes y 1 usuario adicional de la segunda organización.
- 5 especialidades: Redes, Servidores, Soporte, Seguridad, Respaldo.
- 6 categorías de servicio con su especialidad requerida.
- Franjas de disponibilidad de lunes a viernes, 08:00–17:00, para ambos técnicos.
- 15 solicitudes distribuidas en todos los estados, incluidas 3 de origen público con token.
- Intervenciones, notas y eventos de auditoría de ejemplo.
- Contraseña de demo documentada en el README; sin datos personales reales.

---

## 13. Decisiones derivadas y supuestos

Estas decisiones no se votaron de forma explícita, pero se derivan de lo acordado y quedan fijadas para la implementación:

1. **Aprobación de origen público:** al no existir el estado `ACEPTADA`, la aceptación del cliente se registra en `constancia_aceptacion` y es obligatoria para aprobar una solicitud pública.
2. **Solicitud de cliente:** nace en `RECIBIDA` y sigue el mismo flujo de revisión que la pública.
3. **Reglas SLA:** se siembran en la tabla y no se editan desde la UI en P0.
4. **Dashboard del Cliente:** solo métricas de su organización, sin carga por técnico ni comparativas.
5. **Auditoría:** cubre solicitudes; los cambios de usuarios y catálogos no generan eventos en P0.
6. **Token público:** sin vencimiento; el Admin puede regenerarlo y el evento queda auditado.
7. **Adjuntos del Cliente:** puede ver y subir adjuntos de sus propias solicitudes, incluidas las evidencias de intervención; no ve notas internas ni el historial.
8. **Reasignación:** solo en `ASIGNADA`; si la intervención ya inició, se resuelve o se cancela.
9. **Catálogos:** se desactivan con `activo=false`; no se eliminan si están en uso.
10. **Historial:** el Cliente no accede a `/solicitudes/:id/eventos`; solo ve estado y datos de coordinación.

---

## 14. Trazabilidad con el documento funcional

| Documento original | Acuerdo P0 |
|---|---|
| Requerimiento y solicitud como entidades separadas | Una sola entidad `solicitudes` con `origen` |
| Estados `APROBADA → ACEPTADA` | Solo `APROBADA`; constancia de aceptación en campo |
| Consulta de contratos, sedes y activos | Fuera de P0; decisión manual del coordinador |
| Reapertura autorizada de solicitud cerrada | No se reabre; nueva solicitud vinculada |
| Notificaciones dentro de la plataforma | Solo SSE y toasts; sin persistencia |
| Correo electrónico opcional | Sin correo en P0 |
| WebSocket o SSE | SSE |
| React genérico | React + Vite + TS + Tailwind/shadcn |
| Backend Express o NestJS | Express con SQL puro y `pg` |
| Pruebas unitarias, integración y flujos | Jest + Supertest; flujos manuales con seed |
| Aplicación desplegada | Docker Compose local documentado |

---

## 15. Criterio de cierre del acuerdo

El diseño se considera cerrado y listo para implementación cuando:

- El equipo confirma este documento como referencia única del P0.
- No quedan decisiones abiertas sobre alcance, modelo de datos, estados, permisos, SLA, asignación, auditoría, SSE o entrega.
- Cualquier cambio posterior se registra como enmienda en este documento antes de implementarse.
