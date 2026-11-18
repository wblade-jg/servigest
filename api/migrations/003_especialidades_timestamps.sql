-- Migración 003: agregar created_at y updated_at a especialidades
-- La tabla fue creada originalmente sin estas columnas.

ALTER TABLE especialidades
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
