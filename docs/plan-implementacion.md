# Plan de implementación — ServiGest P0

**Fecha:** 2026-11-17
**Estado:** Fase 0 y Fase 1 completas. Iniciando Fase 2.
**Fuente de diseño:** `docs/acuerdo-diseno.md`
**Rama actual:** `feature/api-public-flow` (base `1194577`, landing mergeada a `main`)

---

## 0. Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Repositorio remoto | Crear repo **público** `servigest` en la cuenta `wblade-jg` |
| Navegación móvil | Ajuste responsive simple (dos filas), sin JS adicional |
| Cierre de landing | Commit mergeado a `main` vía fast-forward (`1194577`) |
| Fase 1 | Backend base + flujo público implementado en `feature/api-public-flow` |
| Fase siguiente | Auth + sesiones + RBAC + flujo del coordinador (Fase 2) |

---

## 1. Fases

| Fase | Rama | Estado | Entregable |
|---|---|---|---|
| 0 | `feature/landing-page` | ✅ Mergeada | Landing cerrada: fix visual, header responsive, build/lint, commit |
| 1 | `feature/api-public-flow` | ✅ Implementada | Backend base + formulario público + seguimiento por token |
| 2 | `feature/auth-coordinator` | 🔧 En curso | Login, sesiones, RBAC, bandeja y revisión del coordinador |
| 3 | `feature/technician-client` | ❌ Pendiente | Intervenciones del técnico, portal del cliente y dashboard |
| 4 | `feature/qa-demo` | ❌ Pendiente | Suite completa, seed definitivo, README y guion de demo |

Racional: el riesgo del P0 está en el ciclo de la solicitud, no en la landing. El flujo público es la única parte sin autenticación y valida de una vez PostgreSQL, Express, adjuntos, tokens, rate limiting y SSE.

---

## 2. Fase 0 — Cierre de la landing

### 2.1. Correcciones

1. `web/src/app/pages/Inicio.tsx`: cambiar `bg-papel-honda` por `bg-lavanda-honda` (el tema define `lavanda-honda`; la sección "Cómo funciona" queda sin fondo).
2. `web/src/components/SiteHeader.tsx`: header responsive simple; en pantallas pequeñas el logo y la navegación se acomodan en dos filas (`flex-col` + `gap` con breakpoint `sm:`). Sin hamburguesa ni JavaScript.

### 2.2. Verificación

```bash
cd web && npm run lint
cd web && npm run build
```

### 2.3. Git

```bash
gh repo create servigest --public --source=. --remote=origin
git push -u origin main
git add web            # node_modules y dist ya están ignorados
git commit -m "feat(landing): add public landing page"
git push -u origin feature/landing-page
gh pr create --base main --title "feat(landing): add public landing page"
```

### 2.4. Post-merge

```bash
git checkout main
git pull
git branch -d feature/landing-page
```

---

## 3. Fase 1 — Backend + flujo público (rama `feature/api-public-flow`)

### 3.1. Esqueleto `api/`

```
api/
  src/
    config/          # entorno (env validado), pool pg, Swagger
    middlewares/     # errores uniformes, rate limit, (auth/csrf quedan para fase 2)
    modules/
      public/        # routes, controller, service, repository
      catalogos/     # lectura de categorías para el sitio
      eventos/       # emisor SSE
    db/              # pool, transacciones, runner de migraciones
  migrations/        # 001_esquema.sql, 002_seed_catalogos.sql
  seeds/
  tests/
  Dockerfile
  package.json
```

Principios: SQL puro con `pg` (sin ORM), consultas parametrizadas, reglas de negocio en `service`, SQL en `repository`.

### 3.2. Infraestructura

- `docker-compose.yml` en la raíz: servicios `db` (PostgreSQL 16), `api` y `web`; volúmenes para datos y `uploads/`.
- `.env.example` con todas las variables (`DATABASE_URL`, `PORT`, `UPLOAD_DIR`, `SESSION_SECRET` de cara a fase 2).
- Health check: `GET /api/health`.
- Swagger en `/api/docs`.

### 3.3. Migraciones

`001_esquema.sql` con el esquema completo del acuerdo (todas las tablas, no solo las de esta fase):

- Extensiones: `pgcrypto`, `citext`.
- Enums: `rol_usuario`, `origen_solicitud`, `estado_solicitud`, `prioridad`, `tipo_nota`, `tipo_evento`.
- Tablas: `organizaciones`, `usuarios`, `sesiones`, `especialidades`, `tecnicos`, `tecnico_especialidad`, `categorias_servicio`, `disponibilidad`, `solicitudes`, `intervenciones`, `adjuntos`, `notas_solicitud`, `eventos_solicitud`, `sla_reglas`.
- Índices y restricciones según `docs/acuerdo-diseno.md` (incluido el índice único parcial para una sola intervención abierta).

`002_seed_catalogos.sql` (idempotente): especialidades (Redes, Servidores, Soporte, Seguridad, Respaldo), categorías con especialidad requerida, reglas SLA (CRITICA 4, ALTA 8, MEDIA 24, BAJA 72).

### 3.4. Endpoints públicos

| Método | Ruta | Notas |
|---|---|---|
| GET | `/api/public/categorias` | Categorías activas con su especialidad |
| POST | `/api/public/solicitudes` | Multipart con adjuntos; valida campos, MIME real (magic bytes), tamaño ≤ 5 MB, máx. 5 archivos |
| GET | `/api/public/seguimiento/:token` | Estado y datos de coordinación; sin contacto, notas, adjuntos ni resolución |
| GET | `/api/public/seguimiento/:token/eventos` | SSE; solo cambios de estado y coordinación |

Comportamiento de `POST /api/public/solicitudes`:

1. Validar campos en el servidor (nombre organización, contacto, email, teléfono, categoría, descripción; ubicación condicional).
2. Generar `token_publico` (32 bytes aleatorios base64url) y `codigo` `SOL-<año>-<secuencia>`.
3. Guardar solicitud con `origen='PUBLICO'`, `estado='RECIBIDA'`.
4. Escribir archivos con nombre UUID en `uploads/` (fuera del web root) y metadatos en `adjuntos`.
5. Registrar evento `CREACION` en `eventos_solicitud` (misma transacción).
6. Emitir `solicitud.creada` por el canal de coordinación.
7. Devolver `201` con `codigo` y `token` (la URL de seguimiento la arma el frontend).
8. Rate limit: 5 solicitudes por hora e IP.

Respuesta de seguimiento: `codigo`, `estado`, `prioridad`, `fechaCreacion`, `fechaObjetivo`, `tecnicoAsignado`, `fechaProgramada`.

### 3.5. Frontend

| Ruta | Contenido |
|---|---|
| `/servicios` | Categorías desde `GET /api/public/categorias` |
| `/planes` | Contenido informativo estático |
| `/solicitar` | Formulario completo con adjuntos; al enviar, pantalla de confirmación con código y enlace al seguimiento |
| `/seguimiento/:token` | Estado + timeline de coordinación, suscrito a SSE con reconexión y refetch |
| `/contacto` | Estático |

Cliente HTTP en `web/src/lib/` con manejo de errores uniforme (`{ error: { code, message, details } }`).

### 3.6. Pruebas (Jest + Supertest, PostgreSQL de prueba)

1. Creación pública feliz → `201`, código con formato, token no predecible, evento de auditoría.
2. Validaciones: campos faltantes, categoría inexistente, email inválido.
3. Adjuntos: MIME no permitido, > 5 MB, más de 5 archivos.
4. Rate limit: sexta solicitud en la hora → 429.
5. Seguimiento: token válido devuelve solo campos públicos; token inválido → 404.
6. SSE: evento emitido al crear y al cambiar estado.
7. Aislamiento: el payload de seguimiento nunca incluye contacto, notas ni resolución.

### 3.7. Criterio de aceptación de la fase

- `docker compose up --build` levanta db + api + web.
- Un visitante envía una solicitud con adjuntos, recibe código y token, y ve el estado en `/seguimiento/:token` actualizándose en vivo.
- Los datos quedan persistidos en PostgreSQL y auditados en `eventos_solicitud`.
- `npm test` (api) y `npm run build` (web) pasan.

---

## 4. Fase 2 — Auth + Coordinador (rama `feature/auth-coordinator`)

### 4.1. Objetivos de la fase

Habilitar el acceso autenticado al portal interno e implementar el ciclo completo de revisión y aprobación de solicitudes por parte del Coordinador y el Admin. Al final de la fase, un coordinador debe poder: iniciar sesión, ver la bandeja de solicitudes, revisarlas, aprobarlas (con prioridad y SLA) o rechazarlas, y recibir actualizaciones en tiempo real por SSE.

### 4.2. Backend — Módulo `auth`

**Archivos:** `src/modules/auth/routes.js`, `controller.js`, `service.js`, `repository.js`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Verifica credenciales, registra sesión en `sesiones` con SHA-256 del token, establece cookie `sg_session` httpOnly SameSite=Lax. Bloquea 15 min tras 5 intentos fallidos (`intentos_fallidos`, `bloqueado_hasta`). |
| POST | `/api/auth/logout` | Marca `revocada_en = now()` en la sesión activa. Limpia la cookie. |
| GET | `/api/auth/me` | Devuelve `{ id, nombre, email, rol, organizacionId }` y el token CSRF. Requiere sesión activa. |
| PATCH | `/api/auth/password` | Cambia contraseña propia. Verifica contraseña actual antes de guardar el nuevo hash bcrypt coste 12. |

**Lógica de sesión:**
- Token de sesión: `crypto.randomBytes(32).toString('hex')`. Solo se guarda `sha256(token)` en `sesiones.token_hash`.
- Cookie: nombre `sg_session`, valor = token en crudo, `httpOnly`, `SameSite=Lax`, `Secure` en producción, `Path=/`, `maxAge` = 12 h.
- En cada petición autenticada: actualizar `last_seen_at`.
- Expiración absoluta de 12 horas desde `created_at`; verificar `expira_en` y `revocada_en IS NULL`.

### 4.3. Backend — Middlewares nuevos

**Archivos:** `src/middlewares/auth.js`, `csrf.js`, `roles.js`

| Middleware | Descripción |
|---|---|
| `autenticar` | Lee cookie `sg_session`, busca sesión activa en BD, hidrata `req.usuario`. Responde `401` si no hay sesión válida. |
| `exigirCsrf` | En POST, PUT, PATCH, DELETE: verifica que `X-CSRF-Token` del header coincida con `sesiones.csrf_secret`. Responde `403` si falla. |
| `soloRoles(...roles)` | Factory que genera un middleware que rechaza con `403` si `req.usuario.rol` no está en la lista permitida. |

### 4.4. Backend — Módulo `solicitudes` (transiciones del coordinador)

**Archivos:** `src/modules/solicitudes/routes.js`, `controller.js`, `service.js`, `repository.js`

| Método | Ruta | Rol | Transición |
|---|---|---|---|
| GET | `/api/solicitudes` | Interno + Cliente | Listado con filtros y paginación. Cliente filtra por `organizacion_id` automáticamente. |
| POST | `/api/solicitudes` | Cliente, Coordinador, Admin | Crea solicitud `origen='CLIENTE'` vinculada a `organizacion_id` del usuario en sesión. |
| GET | `/api/solicitudes/:id` | Interno + Cliente propietario | Detalle según rol. Cliente no recibe `notas`, `eventos` ni campos internos. |
| POST | `/api/solicitudes/:id/revision` | Coordinador, Admin | `RECIBIDA → EN_REVISION` |
| POST | `/api/solicitudes/:id/solicitar-informacion` | Coordinador, Admin | `EN_REVISION → REQUIERE_INFORMACION` + nota interna obligatoria |
| POST | `/api/solicitudes/:id/aprobar` | Coordinador, Admin | `EN_REVISION / REQUIERE_INFORMACION → APROBADA` + prioridad + constancia si es PÚBLICO |
| POST | `/api/solicitudes/:id/rechazar` | Coordinador, Admin | `EN_REVISION / REQUIERE_INFORMACION → RECHAZADA` + motivo obligatorio |
| POST | `/api/solicitudes/:id/cancelar` | Cliente propietario (antes APROBADA), Coordinador, Admin | `→ CANCELADA` + motivo obligatorio |
| GET | `/api/solicitudes/:id/eventos` | Coordinador, Admin | Historial de auditoría de la solicitud |
| POST | `/api/solicitudes/:id/notas` | Coordinador, Admin | Crea nota interna (`tipo=INTERNA` o `SOLICITUD_INFORMACION`) |
| GET | `/api/solicitudes/:id/notas` | Coordinador, Admin | Lista notas internas |
| POST | `/api/solicitudes/:id/regenerar-token` | Admin | Genera nuevo `token_publico` y audita `REGENERACION_TOKEN` |

**Lógica transversal de cada transición:**
1. `BEGIN` + `SELECT id FROM solicitudes WHERE id = $1 FOR UPDATE` (bloqueo de fila).
2. Verificar `estado` actual; rechazar si la transición no es válida.
3. Verificar rol y permisos adicionales (organización en caso del Cliente).
4. Aplicar cambios en `solicitudes`.
5. Insertar en `eventos_solicitud` (mismo `client` de transacción).
6. `COMMIT`.
7. Emitir evento SSE.

**Cálculo de SLA al aprobar:**
```js
const regla = await obtenerSlaRegla(prioridad); // consulta sla_reglas
const fechaObjetivo = new Date(aprobadaEn.getTime() + regla.horas * 3600 * 1000);
```

### 4.5. Backend — Canal SSE de coordinación

**Archivo:** `src/modules/eventos/routes.js` (ya tiene el emisor; agregar la ruta autenticada)

- `GET /api/eventos/coordinacion`: autenticación con cookie, roles `ADMIN` y `COORDINADOR`.
- Emite: `solicitud.creada`, `solicitud.estado`, `solicitud.asignada`, `solicitud.reasignada`, `solicitud.cerrada`.
- Heartbeat cada 25 s. Sin persistencia.

### 4.6. Frontend — Autenticación

**Archivos nuevos en `web/src/`:**
- `lib/auth.tsx`: contexto `AuthContext` con `{ usuario, login, logout, loading }`. Hook `useAuth()`.
- `app/layouts/AppLayout.tsx`: layout del portal con sidebar de navegación (ítems según rol), header con nombre del usuario y botón logout.
- `app/pages/Login.tsx`: formulario con email y contraseña; manejo de errores `CREDENCIALES_INVALIDAS` y `CUENTA_BLOQUEADA`.

**Rutas del portal (agregar a `App.tsx`):**
- `/login` → `Login.tsx`
- `/app/*` → protegido con `RequireAuth` (redirige a `/login` si no hay sesión).

### 4.7. Frontend — Bandeja del Coordinador/Admin

**Archivos:**
- `app/pages/solicitudes/Bandeja.tsx` → ruta `/app/solicitudes`
- `app/pages/solicitudes/Detalle.tsx` → ruta `/app/solicitudes/:id`

**Bandeja (`/app/solicitudes`):**
- Tabla paginada con columnas: Código, Origen, Categoría, Estado (badge de color), Prioridad, Fecha, Técnico asignado.
- Filtros en barra lateral o superior: `estado`, `prioridad`, `origen`, `desde`/`hasta`, búsqueda por texto.
- Conexión SSE al canal de coordinación: actualización en vivo sin recarga.

**Detalle (`/app/solicitudes/:id`):**
- Datos del solicitante y la solicitud.
- Timeline de eventos (historial de auditoría, solo Admin/Coordinador).
- Panel de notas internas.
- Panel de acciones: botones visibles según el `estado` actual y el `rol` del usuario:

| Estado actual | Botones visibles (Coordinador/Admin) |
|---|---|
| `RECIBIDA` | "Poner en revisión" |
| `EN_REVISION` | "Solicitar información", "Aprobar", "Rechazar", "Cancelar" |
| `REQUIERE_INFORMACION` | "Volver a revisión", "Aprobar", "Rechazar", "Cancelar" |
| `APROBADA` | "Asignar" *(implementado en Fase 3)*, "Cancelar" |
| `RESUELTA` | "Cerrar" *(implementado en Fase 3)* |

Cada botón abre un modal con el formulario mínimo necesario (prioridad, motivo, constancia, etc.).

### 4.8. Pruebas de la Fase 2 (Jest + Supertest)

1. **Auth:** login correcto → cookie + CSRF; credenciales inválidas → `401`; 5 intentos → bloqueo 15 min; petición sin cookie → `401`; CSRF ausente en POST → `403`; logout revoca sesión.
2. **Sesión expirada:** sesión con `expira_en` pasado → `401`.
3. **Transiciones permitidas:** probar el camino feliz de cada transición documentada en la tabla 4.4.
4. **Transiciones prohibidas:** estado incorrecto → `409 TRANSICION_INVALIDA`; rol sin permiso → `403`.
5. **Aislamiento:** Cliente A no lee, cancela ni accede a solicitudes de Cliente B → `404`.
6. **Cancelación del Cliente:** antes de `APROBADA` → `200`; después de `APROBADA` → `403`.
7. **Aprobación sin constancia en origen público:** → `422`.
8. **Auditoría:** cada transición genera un evento en `eventos_solicitud` con actor, tipo y estados.
9. **SSE de coordinación:** emite evento al hacer cada transición; conexión sin autenticación → `401`.

### 4.9. Criterio de aceptación de la Fase 2

- Un Coordinador inicia sesión, ve la bandeja con las solicitudes existentes (creadas en la Fase 1), pone una en revisión, la aprueba con prioridad ALTA (SLA: 8 h) y la bandeja se actualiza en vivo por SSE.
- Un Admin regenera el token de una solicitud pública y el evento queda en el historial.
- Un Cliente intenta cancelar una solicitud de otra organización y recibe `404`.
- `npm test` pasa con los 9 grupos de la sección 4.8.
- `npm run build` del frontend pasa sin errores.

---

## 5. Fases posteriores (resumen)

- **Fase 3 — Técnico + cliente + dashboard:** asignación con validaciones (especialidad, franja, choque, SLA), reasignación, intervenciones (iniciar + resolver), adjuntos autenticados, portal del cliente, CRUD de técnicos/organizaciones/usuarios/catálogos y dashboard con métricas.
- **Fase 4 — QA y demo:** suite completa (12 grupos de pruebas), seed de demo con 15 solicitudes en todos los estados, README con guion de demostración y `.env.example` definitivo.

---

## 5. Reglas transversales (de `AGENTS.md`)

- Flujo de ramas y PR según el skill `repo-workflow`: sin commit/push/PR salvo petición explícita.
- Al aprobar un PR: `checkout main`, `pull`, borrar rama local con `-d`.
- No implementar nada fuera de alcance (contratos, pagos, correo, notificaciones persistidas, reapertura, etc.).
- Toda regla de negocio se valida en el backend; auditoría generada en la misma transacción.
- Fechas en UTC (`timestamptz`), presentación en `America/Guayaquil`; API en español `camelCase`.
