-- Quantivra - Full Database Setup
-- Run this in Supabase Dashboard > SQL Editor
-- This script is idempotent (safe to run multiple times)

-- ============================================
-- 1. Fix roles table (add name column if missing)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name'
  ) THEN
    ALTER TABLE roles ADD COLUMN name TEXT;
  END IF;
END $$;

UPDATE roles SET name = 'Administrador' WHERE id = '1d89d633-75b5-441c-bdcd-c4ff694b1b7a' AND name IS NULL;
UPDATE roles SET name = 'Analista'      WHERE id = '7e08b306-2fac-4026-bd49-2e8d80a1d714' AND name IS NULL;
UPDATE roles SET name = 'Consulta'      WHERE id = 'eb8063e6-414b-4492-b617-33828f73c62f' AND name IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_name_key'
  ) THEN
    ALTER TABLE roles ALTER COLUMN name SET NOT NULL;
    ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'roles_name_key constraint may already exist: %', SQLERRM;
END $$;

-- ============================================
-- 2. Fix users table (add status + created_at)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'Ativo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================
-- 3. Fix alerts table (add message + severity)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'message'
  ) THEN
    ALTER TABLE alerts ADD COLUMN message TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'alerts' AND column_name = 'severity'
  ) THEN
    ALTER TABLE alerts ADD COLUMN severity TEXT NOT NULL DEFAULT 'warning';
  END IF;
END $$;

-- ============================================
-- 4. Create networks
-- ============================================
INSERT INTO networks (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Rede SP'),
  ('a1000000-0000-0000-0000-000000000002', 'Rede RJ'),
  ('a1000000-0000-0000-0000-000000000003', 'Rede MG')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Insert stations
-- ============================================
INSERT INTO stations (id, network_id, name, code, lat, lng, unit, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
   'Estação REPLAN (Paulínia - SP)', '#294', -22.7545, -47.1475, 'Unidade SP', 'active'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001',
   'Estação UTGCA - Fazenda (Caraguatatuba - SP)', '#317', -23.62, -45.42, 'Unidade SP', 'active'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',
   'Estação REDUC - Canal do Meio (Duque de Caxias - RJ)', '#102', -22.72, -43.29, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',
   'Estação TECAB (Macaé - RJ)', '#485', -22.377, -41.787, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002',
   'Estação Boaventura - Estreito (Itaboraí - RJ)', '#568', -22.7445, -42.8597, 'Unidade RJ', 'active'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003',
   'Estação REGAP - São Gabriel (MG)', '#721', -19.8543, -43.9378, 'REGAP - MG', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, code = EXCLUDED.code, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  unit = EXCLUDED.unit, status = EXCLUDED.status, network_id = EXCLUDED.network_id;

-- ============================================
-- 6. Insert sensors (8 parameters per station)
-- ============================================
DO $$
DECLARE
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000006'
  ];
  params TEXT[] := ARRAY['O3', 'NOx', 'SO2', 'CO', 'HCT', 'BTEX', 'MP10', 'MP2.5',
                          'wind_speed', 'wind_direction', 'temperature', 'humidity'];
  sid UUID;
  p TEXT;
BEGIN
  FOREACH sid IN ARRAY station_ids LOOP
    FOREACH p IN ARRAY params LOOP
      INSERT INTO sensors (station_id, parameter, brand, model, serial, status)
      VALUES (sid, p, 'Teledyne', 'T-Series', 'SN-' || substr(md5(sid::text || p), 1, 8), 'active')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 7. Seed raw_data (last 7 days, hourly)
-- ============================================
DO $$
DECLARE
  sid UUID;
  sensor_rec RECORD;
  ts TIMESTAMPTZ;
  base_val DOUBLE PRECISION;
  val DOUBLE PRECISION;
  hour_offset INT;
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000006'
  ];
  base_values JSONB := '{
    "O3": {"REPLAN": 48, "UTGCA": 45, "REDUC": 85, "TECAB": 95, "Boaventura": 105, "REGAP": 72},
    "NOx": {"REPLAN": 42, "UTGCA": 28, "REDUC": 95, "TECAB": 88, "Boaventura": 92, "REGAP": 18},
    "SO2": {"REPLAN": 35, "UTGCA": 8, "REDUC": 18, "TECAB": 22, "Boaventura": 25, "REGAP": 12},
    "CO": {"REPLAN": 0.8, "UTGCA": 0.4, "REDUC": 1.8, "TECAB": 1.5, "Boaventura": 1.9, "REGAP": 0.8},
    "HCT": {"REPLAN": 45, "UTGCA": 18, "REDUC": 52, "TECAB": 68, "Boaventura": 82, "REGAP": 38},
    "BTEX": {"REPLAN": 12, "UTGCA": 5, "REDUC": 15, "TECAB": 18, "Boaventura": 22, "REGAP": 8},
    "MP10": {"REPLAN": 32, "UTGCA": 15, "REDUC": 42, "TECAB": 58, "Boaventura": 75, "REGAP": 35},
    "MP2.5": {"REPLAN": 18, "UTGCA": 12, "REDUC": 28, "TECAB": 38, "Boaventura": 45, "REGAP": 18},
    "wind_speed": {"REPLAN": 12, "UTGCA": 18, "REDUC": 12, "TECAB": 14, "Boaventura": 14, "REGAP": 9},
    "wind_direction": {"REPLAN": 135, "UTGCA": 90, "REDUC": 135, "TECAB": 45, "Boaventura": 315, "REGAP": 45},
    "temperature": {"REPLAN": 25, "UTGCA": 23, "REDUC": 27, "TECAB": 26, "Boaventura": 26, "REGAP": 22},
    "humidity": {"REPLAN": 65, "UTGCA": 75, "REDUC": 70, "TECAB": 68, "Boaventura": 72, "REGAP": 60}
  }'::jsonb;
  station_keys TEXT[] := ARRAY['REPLAN', 'UTGCA', 'REDUC', 'TECAB', 'Boaventura', 'REGAP'];
  station_key TEXT;
  i INT;
BEGIN
  IF EXISTS (SELECT 1 FROM raw_data LIMIT 1) THEN
    RAISE NOTICE 'raw_data already has data, skipping seed';
    RETURN;
  END IF;

  FOR i IN 1..array_length(station_ids, 1) LOOP
    sid := station_ids[i];
    station_key := station_keys[i];

    FOR sensor_rec IN SELECT id, parameter FROM sensors WHERE station_id = sid LOOP
      base_val := COALESCE(
        (base_values -> sensor_rec.parameter ->> station_key)::double precision,
        30.0
      );

      FOR hour_offset IN 0..167 LOOP  -- 7 days * 24 hours
        ts := now() - (hour_offset || ' hours')::interval;
        val := base_val + (sin(hour_offset * 0.26) * base_val * 0.15) + (random() - 0.5) * base_val * 0.1;
        IF val < 0 THEN val := abs(val) * 0.1; END IF;

        INSERT INTO raw_data (station_id, sensor_id, timestamp, value)
        VALUES (sid, sensor_rec.id, ts, round(val::numeric, 2));
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 8. Seed availability_metrics (last 30 days)
-- ============================================
DO $$
DECLARE
  sid UUID;
  d DATE;
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000006'
  ];
  base_avail DOUBLE PRECISION[] := ARRAY[98.5, 99.8, 98.5, 97.2, 96.5, 99.0];
  i INT;
BEGIN
  IF EXISTS (SELECT 1 FROM availability_metrics LIMIT 1) THEN
    RETURN;
  END IF;

  FOR i IN 1..6 LOOP
    FOR d IN SELECT generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day')::date LOOP
      INSERT INTO availability_metrics (station_id, date, percentage)
      VALUES (station_ids[i], d, LEAST(100, GREATEST(90, base_avail[i] + (random() - 0.5) * 4)))
      ON CONFLICT (station_id, date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 9. Seed iqair_results (last 7 days, hourly)
-- ============================================
DO $$
DECLARE
  sid UUID;
  ts TIMESTAMPTZ;
  station_ids UUID[] := ARRAY[
    'b1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000006'
  ];
  base_iqar DOUBLE PRECISION[] := ARRAY[42, 15, 42, 58, 68, 38];
  i INT;
  hour_offset INT;
  val DOUBLE PRECISION;
BEGIN
  IF EXISTS (SELECT 1 FROM iqair_results LIMIT 1) THEN
    RETURN;
  END IF;

  FOR i IN 1..6 LOOP
    FOR hour_offset IN 0..167 LOOP
      ts := now() - (hour_offset || ' hours')::interval;
      val := base_iqar[i] + sin(hour_offset * 0.26) * 15 + (random() - 0.5) * 10;
      IF val < 5 THEN val := 5; END IF;

      INSERT INTO iqair_results (station_id, timestamp, value)
      VALUES (station_ids[i], ts, round(val::numeric, 1))
      ON CONFLICT (station_id, timestamp) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- 10. Seed alerts
-- ============================================
INSERT INTO alerts (station_id, parameter, type, message, severity, read, created_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'SO2', 'threshold_exceeded',
   'Valor Crítico de SO₂ (250 µg/m³)', 'critical', false, now() - interval '5 minutes'),
  ('b1000000-0000-0000-0000-000000000003', 'MP10', 'anomaly',
   'Anomalia Crítica: MP₁₀ (999.9 µg/m³)', 'critical', false, now() - interval '8 minutes'),
  ('b1000000-0000-0000-0000-000000000002', 'O3', 'flatline',
   'Ausência de dados / Flatline em O₃', 'warning', false, now() - interval '12 minutes'),
  ('b1000000-0000-0000-0000-000000000004', 'NOx', 'calibration',
   'Período de Calibração Detectado em NOx', 'info', false, now() - interval '15 minutes')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11. RLS Policies
-- ============================================

-- Sensors: users see sensors for stations in their unit
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'sensors_select_policy') THEN
    ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
    CREATE POLICY sensors_select_policy ON sensors FOR SELECT USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
  END IF;
END $$;

-- Alerts: users see alerts for stations in their unit
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_select_policy') THEN
    CREATE POLICY alerts_select_policy ON alerts FOR SELECT USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
    CREATE POLICY alerts_update_policy ON alerts FOR UPDATE USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
  END IF;
END $$;

-- Availability metrics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'availability_metrics' AND policyname = 'avail_select_policy') THEN
    ALTER TABLE availability_metrics ENABLE ROW LEVEL SECURITY;
    CREATE POLICY avail_select_policy ON availability_metrics FOR SELECT USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
  END IF;
END $$;

-- IQAr results
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'iqair_results' AND policyname = 'iqar_select_policy') THEN
    ALTER TABLE iqair_results ENABLE ROW LEVEL SECURITY;
    CREATE POLICY iqar_select_policy ON iqair_results FOR SELECT USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
  END IF;
END $$;

-- Users: admins can manage, all authenticated can read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_all') THEN
    CREATE POLICY users_select_all ON users FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_admin_insert') THEN
    CREATE POLICY users_admin_insert ON users FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_admin_update') THEN
    CREATE POLICY users_admin_update ON users FOR UPDATE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_admin_delete') THEN
    CREATE POLICY users_admin_delete ON users FOR DELETE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

-- Audit logs: all authenticated can insert, admins can read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_insert_policy') THEN
    CREATE POLICY audit_insert_policy ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'audit_select_policy') THEN
    CREATE POLICY audit_select_policy ON audit_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

-- Validated data: select needs station access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'validated_data' AND policyname = 'validated_data_select_by_station') THEN
    DROP POLICY IF EXISTS validated_data_select_policy ON validated_data;
    CREATE POLICY validated_data_select_by_station ON validated_data FOR SELECT USING (
      raw_data_id IN (
        SELECT rd.id FROM raw_data rd
        WHERE rd.station_id IN (SELECT s.id FROM stations s WHERE s.unit IN (SELECT u.unit FROM users u WHERE u.id = auth.uid()))
      )
    );
  END IF;
END $$;

-- ============================================
-- Done
-- ============================================
SELECT 'Database setup complete!' AS result;
