-- Quantivra - Initial schema per docs-master-petrobras/07_DATABASE_SCHEMA.md
-- Run with: supabase db push (or apply via Supabase Dashboard)

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('Administrador'), ('Analista'), ('Consulta');

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES networks(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stations_unit ON stations(unit);

CREATE TABLE sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  parameter TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sensors_station ON sensors(station_id);

CREATE TABLE raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  sensor_id UUID NOT NULL REFERENCES sensors(id),
  timestamp TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raw_data_timestamp ON raw_data(timestamp);
CREATE INDEX idx_raw_data_station ON raw_data(station_id);
CREATE INDEX idx_raw_data_sensor ON raw_data(sensor_id);

CREATE TABLE validated_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data_id UUID NOT NULL REFERENCES raw_data(id),
  is_valid BOOLEAN NOT NULL,
  justification TEXT NOT NULL,
  operator_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(raw_data_id)
);

CREATE INDEX idx_validated_data_raw ON validated_data(raw_data_id);

CREATE TABLE validation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data_id UUID NOT NULL REFERENCES raw_data(id),
  flag_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id),
  parameter TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_station ON alerts(station_id);
CREATE INDEX idx_alerts_read ON alerts(read);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE TABLE availability_metrics (
  station_id UUID NOT NULL REFERENCES stations(id),
  date DATE NOT NULL,
  percentage DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (station_id, date)
);

CREATE TABLE iqair_results (
  station_id UUID NOT NULL REFERENCES stations(id),
  timestamp TIMESTAMPTZ NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (station_id, timestamp)
);

-- RLS
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE validated_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Stations: users see stations in their unit
CREATE POLICY stations_select_policy ON stations
  FOR SELECT USING (
    unit IN (SELECT unit FROM users WHERE id = auth.uid())
  );

CREATE POLICY stations_update_policy ON stations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
  );

-- Raw data: station-based segregation
CREATE POLICY raw_data_select_policy ON raw_data
  FOR SELECT USING (
    station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
  );

CREATE POLICY raw_data_insert_policy ON raw_data
  FOR INSERT WITH CHECK (
    station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
  );

-- Validated data: same as raw_data
CREATE POLICY validated_data_select_policy ON validated_data
  FOR SELECT USING (true);

CREATE POLICY validated_data_insert_policy ON validated_data
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name IN ('Administrador', 'Analista'))
  );
