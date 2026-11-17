-- 001_esquema.sql — Esquema completo del P0 según docs/acuerdo-diseno.md
-- Ejecutar solo con el runner de migraciones (schema_migrations).

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'COORDINADOR', 'TECNICO', 'CLIENTE');
CREATE TYPE origen_solicitud AS ENUM ('PUBLICO', 'CLIENTE');
CREATE TYPE estado_solicitud AS ENUM (
  'RECIBIDA', 'EN_REVISION', 'REQUIERE_INFORMACION', 'APROBADA', 'RECHAZADA',
  'ASIGNADA', 'EN_PROCESO', 'RESUELTA', 'CERRADA', 'CANCELADA'
);
CREATE TYPE prioridad AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE tipo_nota AS ENUM ('INTERNA', 'SOLICITUD_INFORMACION');
CREATE TYPE tipo_evento AS ENUM (
  'CREACION', 'CAMBIO_ESTADO', 'APROBACION', 'RECHAZO', 'ASIGNACION',
  'REASIGNACION', 'INTERVENCION_INICIO', 'INTERVENCION_FIN', 'NOTA',
  'ADJUNTO', 'CIERRE', 'CANCELACION', 'REGENERACION_TOKEN'
);

-- ─── Organizaciones y usuarios ───────────────────────────────────────────────

CREATE TABLE organizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ruc text NULL,
  telefono text NULL,
  direccion text NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX organizaciones_ruc_unico ON organizaciones (ruc) WHERE ruc IS NOT NULL;

CREATE TABLE usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NULL REFERENCES organizaciones,
  nombre text NOT NULL,
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  rol rol_usuario NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_cliente_con_organizacion
    CHECK (rol <> 'CLIENTE' OR organizacion_id IS NOT NULL)
);

CREATE INDEX usuarios_organizacion_idx ON usuarios (organizacion_id);

CREATE TABLE sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  csrf_secret text NOT NULL,
  expira_en timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revocada_en timestamptz NULL,
  ip inet NULL,
  user_agent text NULL
);

CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);
CREATE INDEX sesiones_expira_idx ON sesiones (expira_en);

-- ─── Técnicos y catálogos ────────────────────────────────────────────────────

CREATE TABLE especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tecnicos (
  usuario_id uuid PRIMARY KEY REFERENCES usuarios ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  notas text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tecnico_especialidad (
  tecnico_id uuid NOT NULL REFERENCES tecnicos ON DELETE CASCADE,
  especialidad_id uuid NOT NULL REFERENCES especialidades ON DELETE RESTRICT,
  PRIMARY KEY (tecnico_id, especialidad_id)
);

CREATE TABLE categorias_servicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text NULL,
  especialidad_requerida_id uuid NULL REFERENCES especialidades,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disponibilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tecnico_id uuid NOT NULL REFERENCES tecnicos ON DELETE CASCADE,
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT disponibilidad_franja_valida CHECK (hora_inicio < hora_fin)
);

CREATE INDEX disponibilidad_tecnico_idx ON disponibilidad (tecnico_id, dia_semana);

-- ─── Solicitudes ─────────────────────────────────────────────────────────────

CREATE TABLE solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  token_publico text NOT NULL UNIQUE,
  origen origen_solicitud NOT NULL,
  organizacion_id uuid NULL REFERENCES organizaciones,
  organizacion_nombre text NULL,
  created_by uuid NULL REFERENCES usuarios,
  contacto_nombre text NOT NULL,
  contacto_email citext NOT NULL,
  contacto_telefono text NOT NULL,
  categoria_id uuid NOT NULL REFERENCES categorias_servicio,
  descripcion text NOT NULL,
  ubicacion text NULL,
  urgencia_declarada prioridad NULL,
  prioridad prioridad NULL,
  estado estado_solicitud NOT NULL DEFAULT 'RECIBIDA',
  tecnico_id uuid NULL REFERENCES tecnicos,
  fecha_hora_programada timestamptz NULL,
  fecha_objetivo timestamptz NULL,
  constancia_aceptacion text NULL,
  aprobada_por uuid NULL REFERENCES usuarios,
  aprobada_en timestamptz NULL,
  rechazada_motivo text NULL,
  cancelada_motivo text NULL,
  resolucion text NULL,
  resuelta_en timestamptz NULL,
  cerrada_por uuid NULL REFERENCES usuarios,
  cerrada_en timestamptz NULL,
  solicitud_relacionada_id uuid NULL REFERENCES solicitudes,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solicitudes_coherencia_origen CHECK (
    (origen = 'PUBLICO'  AND organizacion_id IS NULL AND organizacion_nombre IS NOT NULL)
    OR
    (origen = 'CLIENTE' AND organizacion_id IS NOT NULL)
  ),
  CONSTRAINT solicitudes_rechazo_con_motivo CHECK (
    estado <> 'RECHAZADA' OR rechazada_motivo IS NOT NULL
  ),
  CONSTRAINT solicitudes_cancelacion_con_motivo CHECK (
    estado <> 'CANCELADA' OR cancelada_motivo IS NOT NULL
  )
);

CREATE INDEX solicitudes_estado_idx ON solicitudes (estado);
CREATE INDEX solicitudes_organizacion_idx ON solicitudes (organizacion_id);
CREATE INDEX solicitudes_tecnico_idx ON solicitudes (tecnico_id);
CREATE INDEX solicitudes_categoria_idx ON solicitudes (categoria_id);
CREATE INDEX solicitudes_fecha_objetivo_idx ON solicitudes (fecha_objetivo);
CREATE INDEX solicitudes_created_at_idx ON solicitudes (created_at);
CREATE INDEX solicitudes_token_idx ON solicitudes (token_publico);

CREATE SEQUENCE solicitudes_codigo_seq;

-- ─── Intervenciones ─────────────────────────────────────────────────────────

CREATE TABLE intervenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES solicitudes ON DELETE CASCADE,
  tecnico_id uuid NOT NULL REFERENCES tecnicos,
  inicio timestamptz NOT NULL,
  fin timestamptz NULL,
  diagnostico text NULL,
  actividades text NULL,
  resultado text NULL,
  observaciones text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervencion_fin_valida CHECK (fin IS NULL OR fin > inicio)
);

-- Una sola intervención abierta por solicitud
CREATE UNIQUE INDEX intervencion_abierta_unica
  ON intervenciones (solicitud_id) WHERE fin IS NULL;

CREATE INDEX intervencion_tecnico_idx ON intervenciones (tecnico_id);

-- ─── Adjuntos ────────────────────────────────────────────────────────────────

CREATE TABLE adjuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NULL REFERENCES solicitudes ON DELETE CASCADE,
  intervencion_id uuid NULL REFERENCES intervenciones ON DELETE CASCADE,
  nombre_original text NOT NULL,
  ruta text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  tamano_bytes bigint NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880),
  subido_por uuid NULL REFERENCES usuarios,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adjunto_entidad_unica CHECK (
    (solicitud_id IS NOT NULL AND intervencion_id IS NULL)
    OR (solicitud_id IS NULL AND intervencion_id IS NOT NULL)
  ),
  CONSTRAINT adjunto_mime_permitido CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'application/pdf')
  )
);

CREATE INDEX adjunto_solicitud_idx ON adjuntos (solicitud_id);
CREATE INDEX adjunto_intervencion_idx ON adjuntos (intervencion_id);

-- ─── Notas ───────────────────────────────────────────────────────────────────

CREATE TABLE notas_solicitud (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id uuid NOT NULL REFERENCES solicitudes ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES usuarios,
  tipo tipo_nota NOT NULL,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notas_solicitud_idx ON notas_solicitud (solicitud_id);

-- ─── Auditoría (append-only) ────────────────────────────────────────────────

CREATE TABLE eventos_solicitud (
  id bigserial PRIMARY KEY,
  solicitud_id uuid NOT NULL REFERENCES solicitudes ON DELETE CASCADE,
  actor_id uuid NULL REFERENCES usuarios,
  tipo tipo_evento NOT NULL,
  estado_anterior estado_solicitud NULL,
  estado_nuevo estado_solicitud NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX eventos_solicitud_idx ON eventos_solicitud (solicitud_id, id);

-- ─── SLA ─────────────────────────────────────────────────────────────────────

CREATE TABLE sla_reglas (
  prioridad prioridad PRIMARY KEY,
  horas integer NOT NULL CHECK (horas > 0)
);
