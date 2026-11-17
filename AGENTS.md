# ServiGest Ecuador — Instrucciones del proyecto (P0)

## 1. Contexto

ServiGest es una plataforma web académica/demo para servicios tecnológicos gestionados. El P0 incluye sitio público, formulario de requerimiento, seguimiento por token, portal privado con roles, gestión de solicitudes, técnicos, intervenciones, auditoría, dashboard y actualización en vivo por SSE.

El diseño funcional y técnico ya está cerrado. La implementación empieza desde cero.

**Responde en español** y usa la terminología del dominio en español (`solicitud`, `prioridad`, `intervención`, `técnico`, `organización`).

## 2. Fuentes de verdad

1. `docs/acuerdo-diseno.md` — **prevalece** sobre cualquier otra fuente. Léelo completo antes de implementar un módulo.
2. `servigest_mvp_p0.md` — especificación funcional original. Úsala como contexto, no como requisito literal cuando contradiga el acuerdo.

No cargues documentos adicionales de forma anticipada. Si una tarea exige una regla que no está en el acuerdo, detente y pregunta antes de inventarla.

## 3. Stack y estructura

| Capa | Decisión |
|---|---|
| Backend | Node.js + Express |
| Datos | PostgreSQL con `pg`, SQL puro, **sin ORM** |
| Migraciones | `.sql` numerados + runner propio con `schema_migrations` |
| Frontend | React + Vite + TypeScript estricto |
| UI | Tailwind CSS + shadcn/ui |
| Tiempo real | SSE |
| API | REST estricto: recursos en sustantivos, verbos HTTP (`GET`, `POST`, `PATCH`, `DELETE`), sin acciones en la URL salvo transiciones de estado del dominio |
| Auth | Sesión en PostgreSQL + cookie httpOnly + CSRF |
| Pruebas | Jest + Supertest |
| Entorno | Docker Compose: `db`, `api`, `web` |

```
api/
  src/
    config/          # entorno, pool, Swagger
    middlewares/     # auth, csrf, roles, errores, rate limit
    modules/         # auth, solicitudes, intervenciones, adjuntos,
                     # organizaciones, usuarios, tecnicos, catalogos,
                     # dashboard, eventos
    db/              # pool, transacciones, migraciones, seed
  migrations/
  seeds/
  tests/
web/
  src/
    app/             # rutas y layouts
    components/      # UI compartida
    features/        # auth, solicitudes, seguimiento, dashboard, etc.
    lib/             # api, sse, fechas, auth
docs/
uploads/             # volumen local, fuera del web root
```

Cada módulo del backend se separa en `routes`, `controller`, `service`, `repository` y validación de entrada. Las reglas de negocio viven en `service`; el SQL vive en `repository`.

## 4. Comandos

Antes de dar una tarea por terminada: ejecutar las pruebas afectadas y el build del frontend si se tocó la UI.

## 5. Reglas de dominio no negociables

### Estados

```
RECIBIDA → EN_REVISION → REQUIERE_INFORMACION ↔ EN_REVISION
EN_REVISION → APROBADA | RECHAZADA
APROBADA → ASIGNADA → EN_PROCESO → RESUELTA → CERRADA
Cualquier estado no terminal → CANCELADA
```

- Una sola entidad `solicitudes` con `origen` `PUBLICO` o `CLIENTE`.
- Todas las solicitudes, incluso las del Cliente, pasan por revisión y nacen en `RECIBIDA`.
- **No existe `ACEPTADA`.** Aprobar una solicitud pública exige `constancia_aceptacion`.
- `RECHAZADA`, `CERRADA` y `CANCELADA` son terminales. **No se reabre**: se crea una nueva solicitud con `solicitud_relacionada_id`.
- Cada transición se valida en el backend, en transacción y con bloqueo de fila; genera un evento de auditoría.

### Permisos

- **Admin:** todo, incluidos usuarios, catálogos y regeneración de token.
- **Coordinador:** revisa, aprueba, rechaza, asigna, reasigna, cierra y cancela.
- **Técnico:** solo solicitudes asignadas; inicia y resuelve su intervención.
- **Cliente:** crea y consulta solicitudes de su organización; cancela solo antes de `APROBADA`; no ve historial ni notas internas.

El backend aplica autorización en cada operación. Nunca confíes en que React oculta una opción.

### SLA y asignación

- Prioridad la fija el coordinador al aprobar; queda **congelada**. La urgencia del visitante es solo referencia.
- `fecha_objetivo = aprobada_en + horas` según `sla_reglas` (crítica 4, alta 8, media 24, baja 72), en horas calendario.
- Asignar exige: técnico activo, especialidad requerida por la categoría, fecha futura dentro de una franja de disponibilidad, sin choque horario y `fecha_hora_programada <= fecha_objetivo`.
- Reasignación solo en `ASIGNADA`, con motivo auditado.
- Si la intervención ya inició, no se reasigna: se resuelve o se cancela.

### Intervenciones y cierre

- Una sola intervención abierta por solicitud.
- Horas manuales; `fin > inicio`; sin costos.
- `EN_PROCESO → RESUELTA` exige resolución documentada.
- `CERRADA` solo la marca Coordinador/Admin y exige resolución.

### Auditoría y aislamiento

- `eventos_solicitud` es append-only; sin endpoints de edición ni borrado.
- La auditoría la genera el backend en la misma transacción; el frontend no la envía.
- Toda consulta del Cliente filtra por `organizacion_id`.
- Recurso de otra organización: responder `404`, no `403`.
- El Cliente no accede a historial, notas internas ni datos de otras organizaciones.

### Fuera de alcance

No implementes contratos, cobertura, sedes, activos, pagos, facturación, correo, notificaciones persistidas, reapertura, app móvil, geolocalización, inventario, IA, ERP/CRM, permisos por cargo, despliegue en nube ni Playwright. Si una tarea parece requerirlo, consulta primero.

## 6. Convenciones

- Base de datos en español y `snake_case`; claves primarias `uuid`; marcas de tiempo `timestamptz` en UTC.
- JSON de la API en español y `camelCase` (`fechaObjetivo`, `organizacionId`).
- Fechas en ISO 8601; mostrar en `America/Guayaquil`.
- Errores uniformes: `{ "error": { "code", "message", "details" } }`.
- Paginación: `page`, `limit` (máx. 100), respuesta `{ data, page, limit, total }`.
- SQL siempre parametrizado; nunca concatenes valores. Evita `SELECT *` en endpoints.
- Migraciones numeradas y **forward-only**; el seed debe ser idempotente.
- Secretos solo por variables de entorno; nunca en el repositorio.
- Archivos subidos con nombre aleatorio, fuera del web root y servidos solo con autorización.
- Comentarios y documentación en español; identificadores técnicos en inglés cuando no exista término de dominio.

## 7. Seguridad

- Contraseñas con bcrypt (coste 12).
- Cookie `sg_session` httpOnly, `SameSite=Lax`, `Secure` en producción.
- Token de sesión aleatorio; en BD solo su SHA-256. Expiración absoluta de 12 h.
- Bloqueo de 15 minutos tras 5 intentos fallidos.
- CSRF obligatorio en `POST`, `PUT`, `PATCH` y `DELETE` mediante `X-CSRF-Token`.
- Rate limit: 5 solicitudes públicas por hora e IP; 10 intentos de login por 15 minutos e IP.
- Adjuntos: máximo 5 por entidad, 5 MB, jpg/png/pdf, validación por magic bytes.
- Guards de rol, organización y estado en cada endpoint.
- No registres contraseñas, tokens ni contenido de archivos en logs.

## 8. Tiempo real

- Canales SSE: coordinación, técnico y seguimiento público.
- Eventos: `solicitud.creada`, `solicitud.estado`, `solicitud.asignada`, `solicitud.reasignada`, `solicitud.cerrada`, `intervencion.iniciada`, `intervencion.resuelta`.
- Heartbeat cada 25 s; el cliente reconecta y refetch por REST para cubrir eventos perdidos.
- No hay notificaciones persistidas ni estado leído/no leído.
- El canal público nunca emite notas, adjuntos ni datos de contacto.

## 9. Pruebas

- Jest + Supertest contra PostgreSQL de prueba; migraciones y limpieza entre suites.
- Cubre como mínimo: auth/CSRF/bloqueo, transiciones permitidas y prohibidas, aislamiento por organización, asignación (especialidad, franja, choque, SLA), SLA, intervención única, cierre sin resolución, cancelación, token público, adjuntos y métricas del dashboard.
- Sin E2E; los flujos completos se validan con el seed y la demo manual.
- Toda corrección de un bug debe incluir una prueba que lo reproduzca.

## 10. Flujo de trabajo para agentes

USA EL SKILL repo-workflow
1. Lee `docs/acuerdo-diseno.md` y revisa el estado real del repositorio.
2. Identifica el módulo y las reglas afectadas antes de escribir código.
3. Haz cambios pequeños y coherentes con la estructura existente.
4. Ejecuta las pruebas y el build correspondientes.
5. Si una decisión cambia, actualiza `docs/acuerdo-diseno.md` y este archivo **antes** de implementar.
6. No amplíes el alcance por iniciativa propia.

### Definition of done

- La funcionalidad cumple la regla de negocio y los permisos.
- Las consultas están parametrizadas y filtran por organización cuando aplica.
- La transición o cambio relevante queda auditado.
- Hay pruebas para el camino feliz y los rechazos importantes.
- `npm test` pasa y `npm run build` del frontend pasa si se tocó la UI.
- No se introdujeron dependencias ni funcionalidades fuera de alcance.

## 11. Prohibiciones explícitas

- No usar ORM, Prisma, TypeORM ni query builders.
- No implementar pagos, facturación, correo, contratos, sedes o activos.
- No reabrir solicitudes cerradas.
- No persistir notificaciones ni crear campanita con historial.
- No exponer historial o notas internas al Cliente.
- No modificar ni borrar eventos de auditoría.
- No confiar en validaciones o permisos del frontend.
- No agregar Playwright, CI o despliegue en nube en P0.
