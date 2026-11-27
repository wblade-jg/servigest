<div align="center">

<img src="web/public/servigest-logo-alt.png" alt="servigest logo" width="500"/>

# ServiGest Ecuador

</div>

Plataforma web académica/demo para la gestión de servicios tecnológicos gestionados. Centraliza el ciclo de vida completo de las solicitudes de soporte: radicación pública, revisión, asignación de técnicos, ejecución de intervenciones y cierre, con seguimiento en tiempo real vía SSE.

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express (ESM nativo) |
| Base de datos | PostgreSQL 16 · SQL puro sin ORM |
| Frontend | React 19 + Vite + TypeScript · Material UI 9 + Emotion |
| Tiempo real | Server-Sent Events (SSE) |
| Autenticación | Sesión persistida en PostgreSQL · Cookie httpOnly · CSRF |
| Documentación API | OpenAPI / Swagger (`/api/docs`) |
| Pruebas | Jest + Supertest |
| Infraestructura local | Docker Compose (`db`, `api`, `web`) |

---

## Inicio rápido

### Requisitos previos

- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/) instalados.

### 1. Clonar y configurar

```bash
git clone https://github.com/wblade-jg/servigest.git
cd servigest
cp .env.example .env        # ajustar variables según el entorno
```

### 2. Levantar los servicios

```bash
docker compose up -d
```

Esto inicia tres contenedores: `db` (PostgreSQL), `api` (puerto 4000) y `web` (puerto 5173).

### 3. Ejecutar migraciones

```bash
docker compose exec api npm run migrate
```

Las migraciones incluyen el esquema completo y los catálogos iniciales (especialidades, categorías, reglas SLA).

### 4. Cargar el seed de demo

```bash
docker compose exec api npm run seed
```

Crea los usuarios de demostración listados en la sección [Credenciales de demo](#credenciales-de-demo).

### 5. Acceder

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API REST | http://localhost:4000/api |
| Documentación interactiva (Swagger) | http://localhost:4000/api/docs |

---

## Desarrollo local (sin Docker)

### API

```bash
cd api
npm install
npm run migrate     # requiere PostgreSQL local accesible en DATABASE_URL
npm run dev         # recarga automática con --watch
```

### Frontend

```bash
cd web
npm install
npm run dev
npm run build
npm run lint
```

### Pruebas

```bash
cd api
npm test
```

> Las pruebas se ejecutan contra una base de datos PostgreSQL separada definida en `TEST_DATABASE_URL`. Migraciones y limpieza entre suites se gestionan automáticamente.

---

## Credenciales de demo

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@servigest.com.ec` | `Demo1234!` |
| Coordinador | `coordinador@servigest.com.ec` | `Demo1234!` |
| Cliente A | `cliente1@empresa.com.ec` | `Demo1234!` |
| Cliente B | `cliente2@empresa.com.ec` | `Demo1234!` |

> [!CAUTION]
> Estas credenciales son exclusivas para demostración local. No usar en producción.

---

## Estructura del repositorio

```
servigest/
├── api/
│   ├── src/
│   │   ├── config/          # Entorno, pool de conexiones, Swagger
│   │   ├── middlewares/     # Auth, CSRF, roles, errores, rate limit
│   │   ├── modules/         # auth, solicitudes, intervenciones, adjuntos,
│   │   │                    # organizaciones, usuarios, tecnicos,
│   │   │                    # catalogos, dashboard, eventos
│   │   └── db/              # Pool, transacciones, runner de migraciones
│   ├── migrations/          # Archivos .sql numerados (forward-only)
│   ├── seeds/               # Datos de demo
│   ├── tests/               # Suites Jest + Supertest
│   └── Dockerfile
├── web/
│   ├── src/
│   │   ├── app/             # Rutas y layouts
│   │   ├── components/      # UI compartida
│   │   ├── features/        # auth, solicitudes, seguimiento, dashboard
│   │   └── lib/             # api client, sse, fechas, auth
│   └── Dockerfile
├── docs/                    # Documentación técnica del proyecto
├── uploads/                 # Volumen local de adjuntos (excluido del repo)
├── docker-compose.yml
└── AGENTS.md                # Instrucciones y reglas para agentes de IA
```

---

## Documentación

| Documento | Descripción |
|---|---|
| [`docs/referencia-api.md`](docs/referencia-api.md) | Referencia completa de endpoints, permisos, FSM y códigos de error |
| [`docs/plan-implementacion.md`](docs/plan-implementacion.md) | Plan general por fases y decisiones de arquitectura (fuente de verdad) |
| [`docs/fase-3-plan.md`](docs/fase-3-plan.md) | Plan detallado de la Fase 3 en curso (fuente de verdad) |
| [`AGENTS.md`](AGENTS.md) | Reglas de dominio, stack y convenciones para agentes de IA |
