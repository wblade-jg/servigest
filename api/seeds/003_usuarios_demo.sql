-- 003_usuarios_demo.sql — Semilla mínima para la demo de la Fase 2 (idempotente)
-- Contraseña de demo para todos los usuarios: Demo1234!  (bcrypt, coste 12)
-- La semilla completa (7 usuarios, técnicos y 15 solicitudes) llega en la fase 4.

INSERT INTO organizaciones (nombre, ruc, telefono, direccion)
VALUES
  ('Industrias Manabí S.A.', '1301234567001', '+593 5 262 0001', 'Av. Carlos Arizaga 104, Portoviejo'),
  ('Clínica Santa Rosa', '0998765432001', '+593 4 288 0002', 'Av.boyacá 502, Guayaquil')
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (nombre, email, password_hash, rol, organizacion_id)
VALUES
  ('Sofía Mendoza', 'admin@servigest.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'ADMIN', NULL),
  ('Andrés Cáceres', 'coordinador@servigest.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'COORDINADOR', NULL),
  ('María Torres', 'compras@industriasmanabi.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'CLIENTE',
   (SELECT id FROM organizaciones WHERE nombre = 'Industrias Manabí S.A.')),
  ('Luis Andrade', 'tic@clinicasantarosa.com.ec',
   '$2b$12$Fr.qC23jr8annTQWfRlyDuMnmer0AiEqApcN6ToNSr5XKsCX1CRVa', 'CLIENTE',
   (SELECT id FROM organizaciones WHERE nombre = 'Clínica Santa Rosa'))
ON CONFLICT (email) DO NOTHING;
