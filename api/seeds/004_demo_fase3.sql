-- 004_demo_fase3.sql — Semilla de técnicos, disponibilidad y solicitudes de prueba para Fase 3 (idempotente)
-- Contraseña de todos los técnicos: Demo1234!

-- ─── 1. Usuarios con rol TECNICO ─────────────────────────────────────────────
INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
VALUES
  ('Carlos Paredes', 'tecnico.redes@servigest.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'TECNICO', true),
  ('Diana Morales', 'tecnico.servidores@servigest.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'TECNICO', true),
  ('Javier Ortiz', 'tecnico.general@servigest.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'TECNICO', true)
ON CONFLICT (email) DO NOTHING;

-- ─── 2. Registro en tabla tecnicos ───────────────────────────────────────────
INSERT INTO tecnicos (usuario_id, activo, notas)
SELECT id, true, 'Técnico de soporte e infraestructura'
FROM usuarios
WHERE email IN (
  'tecnico.redes@servigest.com.ec',
  'tecnico.servidores@servigest.com.ec',
  'tecnico.general@servigest.com.ec'
)
ON CONFLICT (usuario_id) DO NOTHING;

-- ─── 3. Especialidades de técnicos ───────────────────────────────────────────
-- Carlos: Redes y Soporte
INSERT INTO tecnico_especialidad (tecnico_id, especialidad_id)
SELECT u.id, e.id
FROM usuarios u
CROSS JOIN especialidades e
WHERE u.email = 'tecnico.redes@servigest.com.ec'
  AND e.nombre IN ('Redes', 'Soporte')
ON CONFLICT DO NOTHING;

-- Diana: Servidores, Seguridad y Respaldo
INSERT INTO tecnico_especialidad (tecnico_id, especialidad_id)
SELECT u.id, e.id
FROM usuarios u
CROSS JOIN especialidades e
WHERE u.email = 'tecnico.servidores@servigest.com.ec'
  AND e.nombre IN ('Servidores', 'Seguridad', 'Respaldo')
ON CONFLICT DO NOTHING;

-- Javier: Servidores, Redes y Soporte
INSERT INTO tecnico_especialidad (tecnico_id, especialidad_id)
SELECT u.id, e.id
FROM usuarios u
CROSS JOIN especialidades e
WHERE u.email = 'tecnico.general@servigest.com.ec'
  AND e.nombre IN ('Servidores', 'Redes', 'Soporte')
ON CONFLICT DO NOTHING;

-- ─── 4. Franjas de disponibilidad semanal (Lunes a Domingo 08:00 a 17:00) ────
INSERT INTO disponibilidad (tecnico_id, dia_semana, hora_inicio, hora_fin, activo)
SELECT u.id, d.dia, '08:00'::time, '17:00'::time, true
FROM usuarios u
CROSS JOIN (SELECT generate_series(1, 7) AS dia) d
WHERE u.email IN (
  'tecnico.redes@servigest.com.ec',
  'tecnico.servidores@servigest.com.ec',
  'tecnico.general@servigest.com.ec'
)
AND NOT EXISTS (
  SELECT 1 FROM disponibilidad disp
  WHERE disp.tecnico_id = u.id AND disp.dia_semana = d.dia
);

-- ─── 5. Solicitudes de prueba para verificar el flujo ─────────────────────────

-- Solicitud 1: En Revisión (para probar aprobar y asignar)
INSERT INTO solicitudes (
  codigo, token_publico, origen, organizacion_id, organizacion_nombre,
  contacto_nombre, contacto_email, contacto_telefono,
  categoria_id, descripcion, estado, prioridad
)
VALUES (
  'SOL-2026-00010',
  'tok-demo-fase3-00010',
  'CLIENTE',
  (SELECT id FROM organizaciones WHERE nombre = 'Industrias Manabí S.A.'),
  'Industrias Manabí S.A.',
  'María Torres',
  'compras@industriasmanabi.com.ec',
  '+593 99 111 2233',
  (SELECT id FROM categorias_servicio WHERE nombre = 'Mantenimiento preventivo'),
  'Revisión trimestral de estaciones de trabajo y limpieza física de equipos en planta Portoviejo.',
  'EN_REVISION',
  NULL
)
ON CONFLICT (codigo) DO NOTHING;

-- Solicitud 2: Aprobada que exige Servidores (para probar asignación inicial con filtro)
INSERT INTO solicitudes (
  codigo, token_publico, origen, organizacion_id, organizacion_nombre,
  contacto_nombre, contacto_email, contacto_telefono,
  categoria_id, descripcion, estado, prioridad, fecha_objetivo,
  aprobada_en, aprobada_por
)
VALUES (
  'SOL-2026-00011',
  'tok-demo-fase3-00011',
  'CLIENTE',
  (SELECT id FROM organizaciones WHERE nombre = 'Industrias Manabí S.A.'),
  'Industrias Manabí S.A.',
  'María Torres',
  'compras@industriasmanabi.com.ec',
  '+593 99 111 2233',
  (SELECT id FROM categorias_servicio WHERE nombre = 'Administración de servidores'),
  'Migración de clúster de base de datos PostgreSQL y optimización de índices para ERP empresarial.',
  'APROBADA',
  'ALTA',
  now() + interval '5 days',
  now() - interval '2 hours',
  (SELECT id FROM usuarios WHERE email = 'coordinador@servigest.com.ec')
)
ON CONFLICT (codigo) DO NOTHING;

-- Solicitud 3: Aprobada de origen público que exige Redes (para probar constancia de aceptación y asignación)
INSERT INTO solicitudes (
  codigo, token_publico, origen, organizacion_id, organizacion_nombre,
  contacto_nombre, contacto_email, contacto_telefono,
  categoria_id, descripcion, estado, prioridad, fecha_objetivo,
  constancia_aceptacion, aprobada_en, aprobada_por
)
VALUES (
  'SOL-2026-00012',
  'tok-demo-fase3-00012',
  'PUBLICO',
  NULL,
  'Comercial El Ahorro',
  'Galo Benítez',
  'galo@comercialelahorro.com.ec',
  '+593 98 444 5566',
  (SELECT id FROM categorias_servicio WHERE nombre = 'Instalación de redes'),
  'Instalación de 8 puntos de red Gigabit con cableado estructurado categoría 6A en sucursal norte.',
  'APROBADA',
  'MEDIA',
  now() + interval '5 days',
  'Aprobado vía telefónica por Galo Benítez (Ref. Presupuesto P-2026-088)',
  now() - interval '3 hours',
  (SELECT id FROM usuarios WHERE email = 'coordinador@servigest.com.ec')
)
ON CONFLICT (codigo) DO NOTHING;

-- Solicitud 4: Asignada (para probar reasignación con motivo)
INSERT INTO solicitudes (
  codigo, token_publico, origen, organizacion_id, organizacion_nombre,
  contacto_nombre, contacto_email, contacto_telefono,
  categoria_id, descripcion, estado, prioridad, fecha_objetivo,
  tecnico_id, fecha_hora_programada,
  aprobada_en, aprobada_por
)
VALUES (
  'SOL-2026-00013',
  'tok-demo-fase3-00013',
  'CLIENTE',
  (SELECT id FROM organizaciones WHERE nombre = 'Clínica Santa Rosa'),
  'Clínica Santa Rosa',
  'Luis Andrade',
  'tic@clinicasantarosa.com.ec',
  '+593 99 777 8899',
  (SELECT id FROM categorias_servicio WHERE nombre = 'Seguridad informática'),
  'Auditoría perimetral de puertos y configuración de políticas de acceso seguro en firewall corporativo.',
  'ASIGNADA',
  'ALTA',
  now() + interval '5 days',
  (SELECT id FROM usuarios WHERE email = 'tecnico.servidores@servigest.com.ec'),
  (date_trunc('day', now() + interval '1 day') + interval '10 hours'),
  now() - interval '4 hours',
  (SELECT id FROM usuarios WHERE email = 'coordinador@servigest.com.ec')
)
ON CONFLICT (codigo) DO NOTHING;

-- Eventos de auditoría iniciales para las solicitudes creadas
INSERT INTO eventos_solicitud (solicitud_id, actor_id, tipo, estado_anterior, estado_nuevo, metadata)
SELECT s.id, u.id, 'CREACION', NULL, s.estado, '{"origen": "demo"}'::jsonb
FROM solicitudes s
JOIN usuarios u ON u.email = 'coordinador@servigest.com.ec'
WHERE s.codigo IN ('SOL-2026-00010', 'SOL-2026-00011', 'SOL-2026-00012', 'SOL-2026-00013')
  AND NOT EXISTS (
    SELECT 1 FROM eventos_solicitud e WHERE e.solicitud_id = s.id
  );
