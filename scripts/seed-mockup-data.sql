-- Seed dados fictícios do Mockup Figma "Plataforma Monitoramento Ar"
-- NÃO altera users, roles ou user_roles - apenas outros dados
-- Execute no Supabase Dashboard > SQL Editor
-- Pré-requisito: execute scripts/setup-database.sql primeiro

-- ============================================
-- 1. Garantir colunas necessárias (compatibilidade com app)
-- ============================================

-- stations: lat, lng, unit, status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stations' AND column_name = 'lat') THEN
    ALTER TABLE stations ADD COLUMN lat DOUBLE PRECISION;
    ALTER TABLE stations ADD COLUMN lng DOUBLE PRECISION;
    ALTER TABLE stations ADD COLUMN unit TEXT;
    ALTER TABLE stations ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- sensors: brand, model, serial, status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sensors' AND column_name = 'brand') THEN
    ALTER TABLE sensors ADD COLUMN brand TEXT;
    ALTER TABLE sensors ADD COLUMN model TEXT;
    ALTER TABLE sensors ADD COLUMN serial TEXT;
    ALTER TABLE sensors ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- raw_data: timestamp (alias para measured_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'raw_data' AND column_name = 'timestamp') THEN
    ALTER TABLE raw_data ADD COLUMN timestamp TIMESTAMPTZ;
    UPDATE raw_data SET timestamp = measured_at WHERE timestamp IS NULL;
  END IF;
END $$;

-- iqair_results: timestamp, value (para compatibilidade)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iqair_results' AND column_name = 'timestamp') THEN
    ALTER TABLE iqair_results ADD COLUMN timestamp TIMESTAMPTZ;
    ALTER TABLE iqair_results ADD COLUMN value NUMERIC;
    UPDATE iqair_results SET timestamp = calculated_date::timestamptz, value = iqair_value WHERE timestamp IS NULL;
  END IF;
END $$;

-- availability_metrics: date, percentage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'availability_metrics' AND column_name = 'date') THEN
    ALTER TABLE availability_metrics ADD COLUMN date DATE;
    ALTER TABLE availability_metrics ADD COLUMN percentage NUMERIC;
    UPDATE availability_metrics SET date = period_start::date, percentage = availability_percentage WHERE date IS NULL;
  END IF;
END $$;

-- alerts: parameter, type, message, severity, read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'parameter') THEN
    ALTER TABLE alerts ADD COLUMN parameter TEXT;
    ALTER TABLE alerts ADD COLUMN type TEXT;
    ALTER TABLE alerts ADD COLUMN message TEXT;
    ALTER TABLE alerts ADD COLUMN severity TEXT DEFAULT 'warning';
    ALTER TABLE alerts ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 2. Limpar dados (exceto users, roles, user_roles)
-- ============================================
TRUNCATE validated_data CASCADE;
TRUNCATE raw_data CASCADE;
TRUNCATE alerts CASCADE;
TRUNCATE iqair_results CASCADE;
TRUNCATE availability_metrics CASCADE;
DELETE FROM sensors;
DELETE FROM stations;
DELETE FROM networks;

-- ============================================
-- 3. Inserir redes
-- ============================================
INSERT INTO networks (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Rede SP'),
  ('a1000000-0000-0000-0000-000000000002', 'Rede RJ'),
  ('a1000000-0000-0000-0000-000000000003', 'Rede MG')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Inserir estações (dados do mockup MapPage)
-- ============================================
INSERT INTO stations (id, network_id, name, code, location, lat, lng, unit, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Estação REPLAN (Paulínia - SP)', '#294', ST_SetSRID(ST_MakePoint(-47.1475, -22.7545), 4326)::geography, -22.7545, -47.1475, 'Unidade SP', 'active'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Estação UTGCA - Fazenda (Caraguatatuba - SP)', '#317', ST_SetSRID(ST_MakePoint(-45.42, -23.62), 4326)::geography, -23.62, -45.42, 'Unidade SP', 'active'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Estação REDUC - Canal do Meio (Duque de Caxias - RJ)', '#102', ST_SetSRID(ST_MakePoint(-43.29, -22.72), 4326)::geography, -22.72, -43.29, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Estação TECAB (Macaé - RJ)', '#485', ST_SetSRID(ST_MakePoint(-41.787, -22.377), 4326)::geography, -22.377, -41.787, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'Estação Boaventura - Estreito (Itaboraí - RJ)', '#568', ST_SetSRID(ST_MakePoint(-42.8597, -22.7445), 4326)::geography, -22.7445, -42.8597, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Estação REGAP - São Gabriel (MG)', '#721', ST_SetSRID(ST_MakePoint(-43.9378, -19.8543), 4326)::geography, -19.8543, -43.9378, 'REGAP - MG', 'active');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stations' AND column_name = 'is_active') THEN
    UPDATE stations SET is_active = true WHERE status = 'active';
  END IF;
END $$;

-- ============================================
-- 5. Inserir sensores (dados exatos do mockup MapPage stationSensors)
-- ============================================

-- REPLAN (1): O3, NOx, MP10, BTEX
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000001-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'O3', 'Ozônio', 'µg/m³', 'Thermo', '49i', 'S/N: T2941', 'active'),
  ('c1000001-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'NOx', 'NOx', 'ppb', 'Horiba', 'APNA-370', 'S/N: H2942', 'active'),
  ('c1000001-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'MP10', 'MP₁₀', 'µg/m³', 'Met One', 'BAM-1020', 'S/N: M2943', 'active'),
  ('c1000001-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'BTEX', 'BTEX', 'µg/m³', 'Syntech', 'Spectras GC955', 'S/N: S2944', 'active');

-- UTGCA (2): MP10, NOx, O3, HCT
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000002-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'MP10', 'MP₁₀', 'µg/m³', 'Met One', 'BAM-1020', 'S/N: A4522', 'active'),
  ('c1000002-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'NOx', 'NOx', 'ppb', 'Horiba', 'APNA-370', 'S/N: H3178', 'active'),
  ('c1000002-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'O3', 'Ozônio', 'µg/m³', 'Thermo', '49i', 'S/N: T3179', 'active'),
  ('c1000002-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'HCT', 'HCT', 'µg/m³', 'Teledyne', 'T300', 'S/N: TD3180', 'active');

-- REDUC (3): SO2, CO, MP10, MP2.5, NOx, O3
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000003-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'SO2', 'SO₂', 'µg/m³', 'Thermo', '43i', 'S/N: T9981', 'active'),
  ('c1000003-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'CO', 'CO', 'mg/m³', 'Thermo', '48i', 'S/N: T9982', 'active'),
  ('c1000003-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'MP10', 'MP₁₀', 'µg/m³', 'Met One', 'BAM-1020', 'S/N: A4522', 'active'),
  ('c1000003-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'MP2.5', 'MP₂.₅', 'µg/m³', 'Met One', 'BAM-1022', 'S/N: A4523', 'active'),
  ('c1000003-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'NOx', 'NOx', 'ppb', 'Horiba', 'APNA-370', 'S/N: H3180', 'active'),
  ('c1000003-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000003', 'O3', 'Ozônio', 'µg/m³', 'Thermo', '49i', 'S/N: T3181', 'active');

-- TECAB (4): MP10, NOx, O3, SO2, BTEX
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000004-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'MP10', 'MP₁₀', 'µg/m³', 'Thermo Fisher', 'TEOM 1405', 'S/N: TF4851', 'active'),
  ('c1000004-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', 'NOx', 'NOx', 'ppb', 'Horiba', 'APNA-370', 'S/N: H4853', 'active'),
  ('c1000004-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'O3', 'Ozônio', 'µg/m³', 'Thermo', '49i', 'S/N: T4855', 'active'),
  ('c1000004-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'SO2', 'SO₂', 'µg/m³', 'Thermo', '43i', 'S/N: T4856', 'active'),
  ('c1000004-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000004', 'BTEX', 'BTEX', 'µg/m³', 'Syntech', 'Spectras GC955', 'S/N: S4857', 'active');

-- Boaventura (5): MP10, NOx, O3, SO2, MP2.5, HCT
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000005-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'MP10', 'MP₁₀', 'µg/m³', 'Met One', 'BAM-1020', 'S/N: M5681', 'active'),
  ('c1000005-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 'NOx', 'NOx', 'ppb', 'Teledyne', 'T200', 'S/N: TD5683', 'active'),
  ('c1000005-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 'O3', 'Ozônio', 'µg/m³', 'Horiba', 'APOA-370', 'S/N: H5685', 'active'),
  ('c1000005-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000005', 'SO2', 'SO₂', 'µg/m³', 'Thermo', '43i', 'S/N: T5687', 'active'),
  ('c1000005-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'MP2.5', 'MP₂.₅', 'µg/m³', 'Met One', 'BAM-1022', 'S/N: M5686', 'active'),
  ('c1000005-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000005', 'HCT', 'HCT', 'µg/m³', 'Teledyne', 'T300', 'S/N: TD5688', 'active');

-- REGAP (6): O3, NOx, SO2, CO, MP10, MP2.5, HCT, BTEX
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000006-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'O3', 'Ozônio', 'µg/m³', 'Thermo', '49i', 'S/N: T7001', 'active'),
  ('c1000006-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', 'NOx', 'NOx', 'ppb', 'Horiba', 'APNA-370', 'S/N: H7002', 'active'),
  ('c1000006-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000006', 'SO2', 'SO₂', 'µg/m³', 'Thermo', '43i', 'S/N: T7003', 'active'),
  ('c1000006-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 'CO', 'CO', 'mg/m³', 'Thermo', '48i', 'S/N: T7004', 'active'),
  ('c1000006-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000006', 'MP10', 'MP₁₀', 'µg/m³', 'Met One', 'BAM-1020', 'S/N: M7005', 'active'),
  ('c1000006-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'MP2.5', 'MP₂.₅', 'µg/m³', 'Met One', 'BAM-1022', 'S/N: M7006', 'active'),
  ('c1000006-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000006', 'HCT', 'HCT', 'µg/m³', 'Teledyne', 'T300', 'S/N: TD7007', 'active'),
  ('c1000006-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000006', 'BTEX', 'BTEX', 'µg/m³', 'Syntech', 'Spectras GC955', 'S/N: S7008', 'active');

-- Sensores de vento para todas as estações
INSERT INTO sensors (id, station_id, parameter, name, unit, brand, model, serial, status) VALUES
  ('c1000001-0000-0000-0000-000000000101', 'b1000000-0000-0000-0000-000000000001', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W2941', 'active'),
  ('c1000001-0000-0000-0000-000000000102', 'b1000000-0000-0000-0000-000000000001', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W2942', 'active'),
  ('c1wind02-0000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W3171', 'active'),
  ('c1wind02-0000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W3172', 'active'),
  ('c1wind03-0000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W1021', 'active'),
  ('c1wind03-0000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W1022', 'active'),
  ('c1wind04-0000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W4851', 'active'),
  ('c1wind04-0000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W4852', 'active'),
  ('c1wind05-0000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W5681', 'active'),
  ('c1wind05-0000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W5682', 'active'),
  ('c1wind06-0000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'wind_speed', 'Vento', 'km/h', 'Met One', '010C', 'S/N: W7211', 'active'),
  ('c1wind06-0000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', 'wind_direction', 'Direção', '°', 'Met One', '020C', 'S/N: W7212', 'active');

-- ============================================
-- 6. Seed raw_data (últimos 7 dias, horário - valores do mockup)
-- ============================================
DO $$
DECLARE
  r RECORD;
  ts TIMESTAMPTZ;
  hour_offset INT;
  base_val NUMERIC;
  val NUMERIC;
  sensor_config JSONB := '{
    "c1000001-0000-0000-0000-000000000001": 48, "c1000001-0000-0000-0000-000000000002": 15,
    "c1000001-0000-0000-0000-000000000003": 42, "c1000001-0000-0000-0000-000000000004": 3.2,
    "c1000001-0000-0000-0000-000000000101": 12, "c1000001-0000-0000-0000-000000000102": 135,
    "c1000002-0000-0000-0000-000000000001": 15, "c1000002-0000-0000-0000-000000000002": 8,
    "c1000002-0000-0000-0000-000000000003": 45, "c1000002-0000-0000-0000-000000000004": 2.1,
    "c1000002-0000-0000-0000-000000000101": 18, "c1000002-0000-0000-0000-000000000102": 90,
    "c1000003-0000-0000-0000-000000000001": 18, "c1000003-0000-0000-0000-000000000002": 1.2,
    "c1000003-0000-0000-0000-000000000003": 42, "c1000003-0000-0000-0000-000000000004": 28,
    "c1000003-0000-0000-0000-000000000005": 18, "c1000003-0000-0000-0000-000000000006": 80,
    "c1wind03-0000-0000-0000-0000-000000000001": 12, "c1wind03-0000-0000-0000-0000-000000000002": 135,
    "c1000004-0000-0000-0000-000000000001": 58, "c1000004-0000-0000-0000-000000000002": 42,
    "c1000004-0000-0000-0000-000000000003": 88, "c1000004-0000-0000-0000-000000000004": 22,
    "c1000004-0000-0000-0000-000000000005": 4.5,
    "c1wind04-0000-0000-0000-0000-000000000001": 14, "c1wind04-0000-0000-0000-0000-000000000002": 45,
    "c1000005-0000-0000-0000-000000000001": 75, "c1000005-0000-0000-0000-000000000002": 48,
    "c1000005-0000-0000-0000-000000000003": 98, "c1000005-0000-0000-0000-000000000004": 25,
    "c1000005-0000-0000-0000-000000000005": 38, "c1000005-0000-0000-0000-000000000006": 3.8,
    "c1wind05-0000-0000-0000-0000-000000000001": 14, "c1000005-0000-0000-0000-000000000102": 315,
    "c1000006-0000-0000-0000-000000000001": 72, "c1000006-0000-0000-0000-000000000002": 18,
    "c1000006-0000-0000-0000-000000000003": 12, "c1000006-0000-0000-0000-000000000004": 0.8,
    "c1000006-0000-0000-0000-000000000005": 35, "c1000006-0000-0000-0000-000000000006": 18,
    "c1000006-0000-0000-0000-000000000007": 2.5, "c1000006-0000-0000-0000-000000000008": 1.2,
    "c1wind06-0000-0000-0000-0000-000000000001": 9, "c1000006-0000-0000-0000-000000000102": 45
  }'::jsonb;
BEGIN
  FOR r IN SELECT s.id AS sensor_id, s.station_id FROM sensors s LOOP
    base_val := COALESCE((sensor_config ->> r.sensor_id::text)::numeric, 30);
    FOR hour_offset IN 0..167 LOOP
      ts := now() - (hour_offset || ' hours')::interval;
      val := base_val + (sin(hour_offset * 0.26) * base_val * 0.15) + (random() - 0.5) * base_val * 0.1;
      IF val < 0 THEN val := abs(val) * 0.1; END IF;
      INSERT INTO raw_data (station_id, sensor_id, measured_at, value)
      VALUES (r.station_id, r.sensor_id, ts, round(val::numeric, 2));
    END LOOP;
  END LOOP;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='raw_data' AND column_name='timestamp') THEN
    UPDATE raw_data SET timestamp = measured_at WHERE timestamp IS NULL;
  END IF;
END $$;

-- ============================================
-- 7. Seed availability_metrics (últimos 30 dias - mockup stationScenarios)
-- ============================================
DO $$
DECLARE
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000006'
  ];
  base_avail NUMERIC[] := ARRAY[98.5, 99.8, 98.5, 97.2, 96.5, 99.0];
  i INT;
  d DATE;
BEGIN
  FOR i IN 1..6 LOOP
    FOR d IN SELECT generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day')::date LOOP
      INSERT INTO availability_metrics (station_id, period_start, period_end, availability_percentage)
      VALUES (station_ids[i], d::timestamptz, (d + interval '1 day')::timestamptz, LEAST(100, GREATEST(90, base_avail[i] + (random() - 0.5) * 4)));
    END LOOP;
  END LOOP;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='availability_metrics' AND column_name='date') THEN
    UPDATE availability_metrics SET date = period_start::date, percentage = availability_percentage WHERE date IS NULL;
  END IF;
END $$;

-- ============================================
-- 8. Seed iqair_results (últimos 7 dias, horário - baseIQAr do mockup)
-- ============================================
DO $$
DECLARE
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000006'
  ];
  base_iqar NUMERIC[] := ARRAY[42, 15, 42, 58, 68, 38];
  i INT;
  hour_offset INT;
  ts TIMESTAMPTZ;
  val NUMERIC;
BEGIN
  FOR i IN 1..6 LOOP
    FOR hour_offset IN 0..167 LOOP
      ts := now() - (hour_offset || ' hours')::interval;
      val := base_iqar[i] + sin(hour_offset * 0.26) * 15 + (random() - 0.5) * 10;
      IF val < 5 THEN val := 5; END IF;
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='iqair_results' AND column_name='timestamp') THEN
          INSERT INTO iqair_results (station_id, calculated_date, iqair_value, timestamp, value)
          VALUES (station_ids[i], ts::date, round(val::numeric, 1), ts, round(val::numeric, 1));
        ELSE
          INSERT INTO iqair_results (station_id, calculated_date, iqair_value)
          VALUES (station_ids[i], ts::date, round(val::numeric, 1));
        END IF;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 9. Seed alerts (Header allAlerts do mockup)
-- ============================================
-- Alertas com parâmetros que existem na estação (para clicar e abrir Consistência)
INSERT INTO alerts (station_id, parameter, type, message, severity, read, created_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'MP10', 'threshold_exceeded', 'Valor elevado de MP₁₀ - Requer validação', 'critical', false, now() - interval '5 minutes'),
  ('b1000000-0000-0000-0000-000000000001', 'MP10', 'anomaly', 'Valor suspeito de MP₁₀ - Pendente invalidação', 'warning', false, now() - interval '8 minutes'),
  ('b1000000-0000-0000-0000-000000000001', 'O3', 'anomaly', 'Valor Suspeito: O₃ (125.0 µg/m³)', 'warning', false, now() - interval '10 minutes'),
  ('b1000000-0000-0000-0000-000000000003', 'MP10', 'anomaly', 'Anomalia Crítica: MP₁₀ (999.9 µg/m³)', 'critical', false, now() - interval '8 minutes'),
  ('b1000000-0000-0000-0000-000000000003', 'SO2', 'threshold_exceeded', 'Valor Elevado: SO₂ (180.0 µg/m³)', 'warning', false, now() - interval '9 minutes'),
  ('b1000000-0000-0000-0000-000000000002', 'O3', 'flatline', 'Ausência de dados / Flatline em O₃', 'warning', false, now() - interval '12 minutes'),
  ('b1000000-0000-0000-0000-000000000003', 'CO', 'threshold_exceeded', 'Valor Elevado: CO (8.5 ppm)', 'warning', false, now() - interval '18 minutes'),
  ('b1000000-0000-0000-0000-000000000004', 'NOx', 'calibration', 'Período de Calibração Detectado em NOx', 'info', false, now() - interval '15 minutes');

SELECT 'Seed mockup concluído! Dados fictícios do Figma carregados.' AS result;
