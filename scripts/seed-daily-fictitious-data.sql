-- ============================================
-- Seed diário de dados fictícios - Quantivra
-- ============================================
-- Gera dados para uma data específica (padrão: hoje).
-- Use com pg_cron para rodar todo dia (ex: 00:05 UTC).
-- Ou execute manualmente no SQL Editor do Supabase.
--
-- Uso:
--   SELECT seed_daily_fictitious_data();                    -- hoje
--   SELECT seed_daily_fictitious_data(CURRENT_DATE);        -- hoje
--   SELECT seed_daily_fictitious_data('2026-02-28'::date);  -- data específica
-- ============================================

CREATE OR REPLACE FUNCTION seed_daily_fictitious_data(p_target_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  ts TIMESTAMPTZ;
  h INT;
  base_val NUMERIC;
  val NUMERIC;
  day_start TIMESTAMPTZ;
  day_end TIMESTAMPTZ;
  seed_val FLOAT;
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
    "c1000005-0000-0000-0000-0000-000000000001": 75, "c1000005-0000-0000-0000-0000-000000000002": 48,
    "c1000005-0000-0000-0000-0000-000000000003": 98, "c1000005-0000-0000-0000-000000000004": 25,
    "c1000005-0000-0000-0000-0000-000000000005": 38, "c1000005-0000-0000-0000-0000-000000000006": 3.8,
    "c1wind05-0000-0000-0000-0000-000000000001": 14, "c1wind05-0000-0000-0000-0000-000000000002": 315,
    "c1000006-0000-0000-0000-0000-000000000001": 72, "c1000006-0000-0000-0000-0000-000000000002": 18,
    "c1000006-0000-0000-0000-0000-000000000003": 12, "c1000006-0000-0000-0000-000000000004": 0.8,
    "c1000006-0000-0000-0000-000000000005": 35, "c1000006-0000-0000-0000-000000000006": 18,
    "c1000006-0000-0000-0000-000000000007": 2.5, "c1000006-0000-0000-0000-000000000008": 1.2,
    "c1wind06-0000-0000-0000-0000-000000000001": 9, "c1wind06-0000-0000-0000-0000-000000000002": 45
  }'::jsonb;
  st RECORD;
  raw_count INT := 0;
  iqair_count INT := 0;
  avail_count INT := 0;
BEGIN
  day_start := p_target_date::timestamptz;
  day_end := (p_target_date + 1)::timestamptz;

  -- Seed determinístico por data (valores diferentes a cada dia, mas estáveis no mesmo dia)
  seed_val := 0.5 + 0.5 * sin(extract(doy from p_target_date)::double precision * 2.1 + extract(year from p_target_date)::double precision * 0.1);
  PERFORM setseed(seed_val);

  -- 1. Remover dados existentes do dia (para evitar duplicatas)
  DELETE FROM raw_data
  WHERE measured_at >= day_start AND measured_at < day_end;

  DELETE FROM iqair_results
  WHERE calculated_date = p_target_date
     OR (timestamp IS NOT NULL AND timestamp >= day_start AND timestamp < day_end);

  DELETE FROM availability_metrics
  WHERE date = p_target_date OR (period_start >= day_start AND period_start < day_end);

  -- 2. Inserir raw_data (24 horas, 1 leitura/hora por sensor)
  FOR r IN SELECT s.id AS sensor_id, s.station_id FROM sensors s WHERE s.status = 'active' LOOP
    base_val := COALESCE((sensor_config ->> r.sensor_id::text)::numeric, 30);
    FOR h IN 0..23 LOOP
      ts := day_start + (h || ' hours')::interval;
      val := base_val + (sin(h * 0.26) * base_val * 0.15) + (random() - 0.5) * base_val * 0.1;
      IF val < 0 THEN val := abs(val) * 0.1; END IF;
      INSERT INTO raw_data (station_id, sensor_id, measured_at, value, timestamp)
      VALUES (r.station_id, r.sensor_id, ts, round(val::numeric, 2), ts);
      raw_count := raw_count + 1;
    END LOOP;
  END LOOP;

  -- 3. Inserir iqair_results (24 por estação)
  FOR st IN SELECT id FROM stations WHERE status = 'active' LOOP
    FOR h IN 0..23 LOOP
      ts := day_start + (h || ' hours')::interval;
      val := 45 + sin(h * 0.26) * 15 + (random() - 0.5) * 10;
      IF val < 5 THEN val := 5; END IF;
      BEGIN
        INSERT INTO iqair_results (station_id, calculated_date, iqair_value, timestamp, value)
        VALUES (st.id, p_target_date, round(val::numeric, 1), ts, round(val::numeric, 1));
        iqair_count := iqair_count + 1;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
    END LOOP;
  END LOOP;

  -- 4. Inserir availability_metrics (1 por estação)
  FOR st IN SELECT id FROM stations WHERE status = 'active' LOOP
    val := LEAST(100, GREATEST(90, 98 + (random() - 0.5) * 4));
    INSERT INTO availability_metrics (station_id, period_start, period_end, availability_percentage, date, percentage)
    VALUES (st.id, day_start, day_end, round(val::numeric, 2), p_target_date, round(val::numeric, 2));
    avail_count := avail_count + 1;
  END LOOP;

  RETURN format('OK: raw_data=%s, iqair_results=%s, availability_metrics=%s para %s',
    raw_count, iqair_count, avail_count, p_target_date);
END;
$$;

-- ============================================
-- Agendar execução diária (pg_cron)
-- ============================================
-- Descomente e execute se tiver pg_cron habilitado no Supabase:
--
-- SELECT cron.schedule(
--   'seed-daily-quantivra',
--   '5 0 * * *',  -- Todo dia às 00:05 UTC
--   $$SELECT seed_daily_fictitious_data(CURRENT_DATE)$$
-- );
--
-- Para ver os jobs: SELECT * FROM cron.job;
-- Para remover: SELECT cron.unschedule('seed-daily-quantivra');
-- ============================================

-- Executar para hoje (teste imediato)
SELECT seed_daily_fictitious_data(CURRENT_DATE) AS resultado;
