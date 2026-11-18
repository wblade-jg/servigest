# Plan de Refactorización: Endpoints a REST Estricto

## 1. Contexto y Justificación

En cumplimiento con la regla de arquitectura del proyecto establecida en `AGENTS.md`:

> *"REST estricto: recursos en sustantivos, verbos HTTP (`GET`, `POST`, `PATCH`, `DELETE`), **sin acciones en la URL**. Las transiciones de estado se expresan como `PATCH /:id/estado` con el estado destino en el cuerpo; las acciones administrativas como subrecursos (`POST /:id/token`)."*

Los endpoints actuales del módulo de solicitudes utilizaban verbos en las URLs para las transiciones (`POST /:id/revision`, `POST /:id/aprobar`, etc.) y para acciones administrativas (`POST /:id/regenerar-token`). Esta refactorización alinea la API con los estándares REST del acuerdo de diseño.

---

## 2. Mapeo de Endpoints (Antes vs. Después)

| Operación | Método/Ruta Anterior | Método/Ruta Nueva | Cuerpo de la Solicitud (JSON) | Roles Autorizados |
|---|---|---|---|---|
| Poner en revisión | `POST /solicitudes/:id/revision` | `PATCH /solicitudes/:id/estado` | `{"estado": "EN_REVISION", "nota"?: "..."}` | Coordinador, Admin |
| Solicitar información | `POST /solicitudes/:id/solicitar-informacion` | `PATCH /solicitudes/:id/estado` | `{"estado": "REQUIERE_INFORMACION", "nota": "..."}` | Coordinador, Admin |
| Aprobar solicitud | `POST /solicitudes/:id/aprobar` | `PATCH /solicitudes/:id/estado` | `{"estado": "APROBADA", "prioridad": "ALTA", "constanciaAceptacion"?: "..."}` | Coordinador, Admin |
| Rechazar solicitud | `POST /solicitudes/:id/rechazar` | `PATCH /solicitudes/:id/estado` | `{"estado": "RECHAZADA", "motivo": "..."}` | Coordinador, Admin |
| Cancelar solicitud | `POST /solicitudes/:id/cancelar` | `PATCH /solicitudes/:id/estado` | `{"estado": "CANCELADA", "motivo": "..."}` | Cliente (antes de aprobar), Coordinador, Admin |
| Regenerar token público | `POST /solicitudes/:id/regenerar-token` | `POST /solicitudes/:id/token` | *(sin cuerpo)* | Admin |

---

## 3. Componentes y Cambios Requeridos

### 3.1. Backend (`api/src/modules/solicitudes`)

1. **`routes.js`**:
   - Eliminar las 6 rutas con acciones en la URL.
   - Declarar `router.patch('/:id/estado', soloRoles('ADMIN', 'COORDINADOR', 'CLIENTE'), controller.transicionar)`.
   - Declarar `router.post('/:id/token', soloRoles('ADMIN'), controller.regenerarToken)`.

2. **`controller.js`**:
   - Reemplazar los controladores de acción individuales (`revision`, `solicitarInformacion`, `aprobar`, `rechazar`, `cancelar`) por un controlador unificado `transicionar(req, res, siguiente)`.
   - Validar presencia obligatoria del campo `estado` en el cuerpo.
   - Mantener `regenerarToken(req, res, siguiente)` apuntando a la nueva ruta.

3. **`service.js`**:
   - Agregar método de entrada principal `transicionarEstado(usuario, solicitudId, estadoDestino, extras)`.
   - Despachar a los métodos de negocio correspondientes según `estadoDestino`.
   - Corregir la consulta de regla SLA en `aprobar()` para que se ejecute dentro de la transacción y evitar condiciones de carrera.

4. **`api/src/openapi.js`**:
   - Actualizar el documento OpenAPI sustituyendo las rutas antiguas por `PATCH /api/solicitudes/{id}/estado` y `POST /api/solicitudes/{id}/token`.

### 3.2. Frontend (`web/src`)

1. **`web/src/app/pages/solicitudes/Detalle.tsx`**:
   - Cambiar todas las ejecuciones de acciones en el modal para invocar `patch(`/solicitudes/${id}/estado`, { estado: '...', ... })`.
   - Cambiar la regeneración del token a `post(`/solicitudes/${id}/token`)`.

### 3.3. Suite de Pruebas (`api/tests`)

1. **`solicitudes.test.js`**:
   - Actualizar todas las llamadas a las rutas de transición por `patch('/api/solicitudes/:id/estado').send({ estado, ... })`.
   - Actualizar la prueba de regeneración de token a `post('/api/solicitudes/:id/token')`.
   - Actualizar pruebas de transiciones prohibidas y de control de acceso.

---

## 4. Plan de Verificación

1. **Pruebas Automatizadas Backend**:
   ```bash
   cd api && npm test
   ```
2. **Compilación Frontend**:
   ```bash
   cd web && npm run build
   ```
