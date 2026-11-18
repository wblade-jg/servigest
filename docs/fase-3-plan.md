# Plan de Implementación — Fase 3

**Proyecto:** ServiGest Ecuador P0  
**Fase:** Técnico, Cliente, Intervenciones y Dashboard  
**Rama:** `feature/technician-client`  
**Estado:** Planificada  
**Fecha:** 2026-11-17

---

## 1. Objetivo

Completar el ciclo operativo de la solicitud:
- **Asignación** de técnicos con validación de agenda y SLA
- **Intervenciones** técnicas con documentación
- **Portal del cliente** con vista aislada
- **Dashboard** operativo con métricas de SLA
- **Administración** de catálogos (organizaciones, usuarios, técnicos)
- **Pruebas** automatizadas

**Transiciones objetivo:** `APROBADA → ASIGNADA → EN_PROCESO → RESUELTA → CERRADA`

---

## 2. Grupos de Trabajo

| # | Módulo | Dependencias | Prioridad | Días |
|---|---|---|---|---|
| **G1** | Catálogos de Administración | - | 🔴 Alta | 6 |
| **G2** | Asignación y Reasignación | G1 | 🔴 Alta | 3 |
| **G3** | Intervenciones del Técnico | G2 | 🔴 Alta | 4 |
| **G4** | Adjuntos Autenticados | - | 🟡 Media | 2 |
| **G5** | Portal del Cliente | G1, G4 | 🟡 Media | 3 |
| **G6** | Dashboard Operativo | G2, G3 | 🟢 Baja | 3 |
| **G7** | Suite de Pruebas | Todos | 🔴 Alta | 5 |

**Ruta crítica:** G1 → G2 → G3 → G6 → G7 (26 días)

---

## 3. G1: Catálogos de Administración (6 días)

### Backend

**Módulos nuevos:**
- `api/src/modules/organizaciones/` — CRUD de clientes corporativos
- `api/src/modules/usuarios/` — Gestión de usuarios y roles
- `api/src/modules/tecnicos/` — Técnicos, especialidades y disponibilidad
- `api/src/modules/catalogos/` — Especialidades y categorías

**Endpoints clave:**
- `GET/POST /api/organizaciones` (ADMIN)
- `GET/POST /api/usuarios` (ADMIN)
- `POST /api/tecnicos/:id/disponibilidad` (ADMIN) — Franjas horarias semanales
- `PUT /api/tecnicos/:id/especialidades` (ADMIN) — Asignar especialidades

**Reglas:**
- RUC único, email único (citext)
- Rol `CLIENTE` exige `organizacion_id NOT NULL`
- Franjas: `hora_inicio < hora_fin`, sin solapamiento en el mismo día
- Desactivación lógica si no hay relaciones activas

### Frontend

```
web/src/app/pages/admin/
├── Organizaciones.tsx        # Tabla + modal
├── Usuarios.tsx              # Tabla + formulario con validación de rol
├── Tecnicos.tsx              # Tabla con especialidades
├── DisponibilidadModal.tsx   # Vista semanal con franjas
└── Catalogos.tsx             # Especialidades | Categorías
```

### DoD
- [ ] Admin crea organización, usuario Cliente y Técnico
- [ ] Admin asigna especialidades y configura disponibilidad (Lun-Vie, 08:00-17:00)
- [ ] Sistema rechaza franjas solapadas

---

## 4. G2: Asignación y Reasignación (3 días)

### Backend

**Integración en FSM:** Agregar transiciones al motor existente en `api/src/modules/solicitudes/service.js`

**Transiciones:**
- `APROBADA → ASIGNADA` (asignación inicial)
- `ASIGNADA → ASIGNADA` (reasignación con motivo obligatorio)

**Payload:**
```json
{
  "estado": "ASIGNADA",
  "tecnicoId": "uuid",
  "fechaProgramada": "ISO 8601",
  "motivo": "Solo en reasignación"
}
```

**Validaciones (6 pasos):**
1. Estado válido (`APROBADA` o `ASIGNADA`)
2. Técnico activo (rol `TECNICO`, `activo = true` en ambas tablas)
3. Especialidad requerida (si la categoría la exige)
4. Franja horaria válida (convertir a `America/Guayaquil`, verificar `disponibilidad`)
5. Sin choque horario (±1 hora en `ASIGNADA`/`EN_PROCESO`)
6. Cumplimiento de SLA (`fechaProgramada <= fecha_objetivo`)

**Repository:** Agregar funciones en `api/src/modules/solicitudes/repository.js`:
- `tecnicoTieneEspecialidad(tx, tecnicoId, especialidadId)`
- `validarDisponibilidadTecnico(tx, tecnicoId, diaSemana, horaLocal)`
- `detectarChoqueHorario(tx, tecnicoId, fechaProgramada, solicitudActualId)`

### Frontend

**Modal:** `web/src/app/pages/solicitudes/ModalAsignar.tsx`
- Selector de técnico (filtrado por especialidad)
- Date picker con validación visual de SLA
- Mensajes de error específicos

### DoD
- [ ] Coordinador asigna técnico calificado
- [ ] Sistema rechaza: sin especialidad, fuera de franja, choque horario, fecha > SLA
- [ ] Reasignación con motivo obligatorio funciona
- [ ] No se puede reasignar en `EN_PROCESO`
- [ ] Eventos auditados

---

## 5. G3: Intervenciones del Técnico (4 días)

### Backend

**Módulo nuevo:** `api/src/modules/intervenciones/`

**Endpoints:**
- `POST /api/solicitudes/:id/intervenciones` — Iniciar (TECNICO)
- `PATCH /api/intervenciones/:id` — Resolver (TECNICO)
- `GET /api/solicitudes/:id/intervenciones` — Listar

**Reglas:**

**Iniciar (`ASIGNADA → EN_PROCESO`):**
- Solo técnico asignado
- Índice único garantiza una sola abierta: `CREATE UNIQUE INDEX ON intervenciones (solicitud_id) WHERE fin IS NULL`
- Audita `INTERVENCION_INICIO`

**Resolver (`EN_PROCESO → RESUELTA`):**
- Payload: `fin`, `diagnostico`, `actividades`, `resultado`, `observaciones`
- Validar: `fin > inicio`, textos ≥ 10 caracteres
- Copiar `resultado` en `solicitudes.resolucion`
- Audita `INTERVENCION_FIN`

**Cerrar (`RESUELTA → CERRADA`):**
- Via `PATCH /solicitudes/:id/estado` con `{ estado: 'CERRADA' }`
- Roles: ADMIN, COORDINADOR
- Exige `resolucion IS NOT NULL`
- Audita `CIERRE`

### Frontend

```
web/src/app/pages/tecnico/
└── MiAgenda.tsx                    # Lista con botón "Iniciar"

web/src/app/pages/solicitudes/
└── ModalResolverIntervencion.tsx   # Formulario de resolución
```

### DoD
- [ ] Técnico ve agenda y inicia intervención
- [ ] Sistema impide segunda intervención simultánea
- [ ] Técnico resuelve con documentación completa
- [ ] Sistema rechaza `fin <= inicio`
- [ ] Coordinador cierra solicitud
- [ ] Sistema rechaza cierre sin resolución

---

## 6. G4: Adjuntos Autenticados (2 días)

### Backend

**Módulo nuevo:** `api/src/modules/adjuntos/`

**Endpoints:**
- `POST /api/solicitudes/:id/adjuntos` — Subir
- `POST /api/intervenciones/:id/adjuntos` — Subir evidencia
- `GET /api/adjuntos/:id/descargar` — Descargar con streaming
- `DELETE /api/adjuntos/:id` — Eliminar

**Validaciones:**
- Magic bytes: JPEG `[0xFF, 0xD8, 0xFF]`, PNG `[0x89, 0x50, 0x4E, 0x47]`, PDF `[0x25, 0x50, 0x44, 0x46]`
- Límite: 5 adjuntos por entidad, 5 MB por archivo
- Almacenamiento: `uploads/{uuid}` fuera del web root

**Autorización:**
- ADMIN/COORDINADOR: acceso total
- TECNICO: solo solicitudes asignadas
- CLIENTE: solo su organización
- Devolver `404` si no tiene acceso

### Frontend

**Componente:** `web/src/components/SubidaAdjuntos.tsx`

### DoD
- [ ] Cliente sube JPG válido
- [ ] Sistema rechaza archivo con magic bytes inválidos
- [ ] Sistema rechaza archivo > 5 MB
- [ ] Sistema rechaza sexto adjunto
- [ ] Cliente recibe `404` al descargar adjunto ajeno

---

## 7. G5: Portal del Cliente (3 días)

### Backend

**Filtrado automático:** En `api/src/modules/solicitudes/repository.js`
- Si `rol === 'CLIENTE'`: `WHERE organizacion_id = $usuario.organizacionId`
- Responder `404` si intenta acceder a recurso ajeno

### Frontend

**Rutas nuevas:** `web/src/app/ClienteRoutes.tsx`
- `/app/dashboard` → Métricas de su organización
- `/app/mis-solicitudes` → Listado filtrado
- `/app/mis-solicitudes/nueva` → Formulario corporativo
- `/app/mis-solicitudes/:id` → Detalle sin notas internas

**Vistas:**
```
web/src/app/pages/cliente/
├── MisSolicitudes.tsx      # Con botón "Cancelar" antes de APROBADA
├── NuevaSolicitud.tsx      # Origen CLIENTE + organizacion_id
└── DashboardCliente.tsx    # Sin carga de técnicos
```

### DoD
- [ ] Cliente ve solo sus solicitudes
- [ ] Cliente crea solicitud con origen `CLIENTE`
- [ ] Cliente cancela antes de `APROBADA`
- [ ] Cliente no puede cancelar después de `APROBADA`
- [ ] Cliente no ve notas internas ni auditoría
- [ ] Cliente recibe `404` al acceder a solicitud ajena

---

## 8. G6: Dashboard Operativo (3 días)

### Backend

**Módulo nuevo:** `api/src/modules/dashboard/`

**Endpoint:** `GET /api/dashboard`

**Métricas:**
1. Distribución por estado (`COUNT(*) GROUP BY estado`)
2. Distribución por prioridad (solo no terminales)
3. SLA a tiempo (`fecha_objetivo >= NOW()`)
4. SLA próximas a vencer (24h)
5. SLA vencidas (`fecha_objetivo < NOW()` y no terminal)
6. Carga por técnico (solo Admin/Coord)
7. MTTR: `AVG(resuelta_en - aprobada_en)` últimos 30 días

**Filtrado:**
- ADMIN/COORDINADOR: global
- CLIENTE: filtro por `organizacion_id`, sin carga de técnicos

### Frontend

**Vista:** `web/src/app/pages/Dashboard.tsx`
- Grid de tarjetas con métricas
- Gráfico de distribución por estado
- Badges de SLA (verde/amarillo/rojo)
- Tabla de carga de técnicos (solo Admin/Coord)

### DoD
- [ ] Admin/Coordinador ven métricas globales
- [ ] Cliente ve métricas filtradas sin carga de técnicos
- [ ] SLA calculado correctamente
- [ ] MTTR promedio correcto

---

## 9. G7: Suite de Pruebas (5 días)

### Archivos a crear

**1. `api/tests/asignacion.test.js` (8 casos)**
- Asignación exitosa
- Rechazos: sin especialidad, fuera de franja, choque horario, fecha > SLA
- Reasignación con motivo
- Rechazo sin motivo, en `EN_PROCESO`

**2. `api/tests/intervenciones.test.js` (7 casos)**
- Inicio exitoso
- Rechazo por no asignado, segunda simultánea
- Resolución exitosa
- Rechazo con `fin <= inicio`
- Cierre exitoso, rechazo sin resolución

**3. `api/tests/adjuntos.test.js` (6 casos)**
- Subida exitosa PNG
- Rechazos: magic bytes inválidos, > 5 MB, sexto adjunto
- Descarga exitosa, `404` para ajeno

**4. `api/tests/dashboard.test.js` (5 casos)**
- Métricas globales Admin
- Métricas filtradas Cliente
- Cálculos: próximas a vencer, vencidas, MTTR

### Comando
```bash
npm test -- asignacion intervenciones adjuntos dashboard
```

### DoD
- [ ] Todas las pruebas pasan (26 casos)
- [ ] Cobertura > 80% en módulos de Fase 3

---

## 10. Cronograma (4 semanas)

### Semana 1: Fundamentos
- Días 1-2: Organizaciones y Usuarios
- Días 3-5: Técnicos y Disponibilidad
- Día 6: Catálogos
- Día 7: Adjuntos backend

### Semana 2: Operación Técnica
- Días 1-3: Asignación (validaciones + modal)
- Días 4-7: Intervenciones (backend + frontend)

### Semana 3: Cliente y Dashboard
- Días 1-3: Portal del Cliente
- Días 4-6: Dashboard
- Día 7: Integración y refinamiento

### Semana 4: Pruebas
- Días 1-5: Suites automatizadas
- Día 6: Documentación (README, Swagger)
- Día 7: Revisión y merge a `main`

---

## 11. Criterios de Aceptación Global

- [ ] Coordinador asigna técnico con validaciones completas
- [ ] Técnico ejecuta intervención hasta resolución
- [ ] Coordinador cierra solicitud
- [ ] Cliente opera su portal aislado
- [ ] Dashboard muestra métricas reales
- [ ] Todas las pruebas pasan
- [ ] Frontend compila sin errores
- [ ] Documentación actualizada

---

## 12. Riesgos

| Riesgo | Mitigación |
|---|---|
| Complejidad de zonas horarias | Usar `date-fns-tz` para `America/Guayaquil` |
| Índice único de intervención | Probar en PostgreSQL local primero |
| Performance de dashboard | Índices en `fecha_objetivo`, `estado`, `organizacion_id` |
| Aislamiento inconsistente | Revisión exhaustiva con pruebas automatizadas |

---

**Referencias:**
- Acuerdo de Diseño: `docs/acuerdo-diseno.md`
- Plan General: `docs/plan-implementacion.md`
- Instrucciones: `AGENTS.md`
