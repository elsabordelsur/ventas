-- ============================================
-- ESQUEMA DE BASE DE DATOS - El Sabor Del Sur
-- Sistema POS / Facturación para comida rápida
-- ============================================

-- 1. TABLA: configuracion
CREATE TABLE IF NOT EXISTS configuracion (
  id BIGINT PRIMARY KEY DEFAULT 1,
  tasa_bcv NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_fila CHECK (id = 1)
);

-- 2. TABLA: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. TABLA: productos
CREATE TABLE IF NOT EXISTS productos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  precio_usd NUMERIC(10, 2) NOT NULL CHECK (precio_usd > 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  maneja_inventario BOOLEAN NOT NULL DEFAULT FALSE,
  stock INTEGER NOT NULL DEFAULT 0,
  unidades_por_caja INTEGER NOT NULL DEFAULT 1,
  tecla_rapida TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABLA: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_usd NUMERIC(12, 2) NOT NULL,
  tasa_bcv_aplicada NUMERIC(12, 2) NOT NULL,
  total_bs_teorico NUMERIC(12, 2) NOT NULL,
  total_bs_cobrado NUMERIC(12, 2) NOT NULL,
  pago_usd_efectivo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pago_bs_efectivo NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pago_pagomovil NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pago_punto NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vuelto_bs_entregado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ajuste_redondeo_bs NUMERIC(12, 2) NOT NULL DEFAULT 0,
  usuario_id TEXT DEFAULT 'caja1'
);

-- 5. TABLA: venta_detalles
CREATE TABLE IF NOT EXISTS venta_detalles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario_usd NUMERIC(10, 2) NOT NULL,
  subtotal_usd NUMERIC(12, 2) NOT NULL
);

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_detalles ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir todo al rol anon (para POS público)
-- En producción, deberías restringir más estas políticas
CREATE POLICY "Acceso público configuracion" ON configuracion
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acceso público categorias" ON categorias
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acceso público productos" ON productos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acceso público ventas" ON ventas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acceso público venta_detalles" ON venta_detalles
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar tasa BCV por defecto
INSERT INTO configuracion (id, tasa_bcv)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Categorías de ejemplo
INSERT INTO categorias (nombre) VALUES
  ('Venta'),
  ('Empanadas'),
  ('Pastelitos'),
  ('Bebidas'),
  ('Tequeños'),
  ('Pepitos'),
  ('Hamburguesas')
ON CONFLICT DO NOTHING;
