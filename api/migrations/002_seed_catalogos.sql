-- 002_seed_catalogos.sql — Catálogos iniciales (idempotente)

INSERT INTO especialidades (nombre) VALUES
  ('Redes'), ('Servidores'), ('Soporte'), ('Seguridad'), ('Respaldo')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categorias_servicio (nombre, descripcion, especialidad_requerida_id, orden)
VALUES
  ('Mantenimiento preventivo', 'Revisión periódica de equipos e infraestructura', (SELECT id FROM especialidades WHERE nombre = 'Soporte'), 1),
  ('Instalación de redes', 'Cableado, puntos de red y equipamiento de conectividad', (SELECT id FROM especialidades WHERE nombre = 'Redes'), 2),
  ('Soporte técnico', 'Atención de fallas y asistencia a usuarios', (SELECT id FROM especialidades WHERE nombre = 'Soporte'), 3),
  ('Administración de servidores', 'Instalación, configuración y monitoreo de servidores', (SELECT id FROM especialidades WHERE nombre = 'Servidores'), 4),
  ('Seguridad informática', 'Análisis de vulnerabilidades y endurecimiento de sistemas', (SELECT id FROM especialidades WHERE nombre = 'Seguridad'), 5),
  ('Respaldo y recuperación', 'Planificación y verificación de copias de seguridad', (SELECT id FROM especialidades WHERE nombre = 'Respaldo'), 6)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO sla_reglas (prioridad, horas) VALUES
  ('CRITICA', 4),
  ('ALTA', 8),
  ('MEDIA', 24),
  ('BAJA', 72)
ON CONFLICT (prioridad) DO NOTHING;
