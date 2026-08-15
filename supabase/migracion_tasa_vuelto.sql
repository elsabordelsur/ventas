-- ============================================
-- MIGRACIÓN: agregar tasa_vuelto a configuracion
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS tasa_vuelto NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Si la tasa de vuelto está en 0, usar la tasa BCV como respaldo
UPDATE configuracion SET tasa_vuelto = tasa_bcv WHERE tasa_vuelto = 0;
