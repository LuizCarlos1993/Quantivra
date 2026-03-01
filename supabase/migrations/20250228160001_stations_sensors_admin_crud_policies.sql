-- Allow admins to INSERT, UPDATE, DELETE stations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'stations_update_policy') THEN
    CREATE POLICY stations_update_policy ON stations FOR UPDATE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'stations_insert_policy') THEN
    CREATE POLICY stations_insert_policy ON stations FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'stations_delete_policy') THEN
    CREATE POLICY stations_delete_policy ON stations FOR DELETE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

-- Allow admins to INSERT, UPDATE, DELETE sensors
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'sensors_select_policy') THEN
    CREATE POLICY sensors_select_policy ON sensors FOR SELECT USING (
      station_id IN (SELECT id FROM stations WHERE unit IN (SELECT unit FROM users WHERE id = auth.uid()))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'sensors_insert_policy') THEN
    CREATE POLICY sensors_insert_policy ON sensors FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM stations s WHERE s.id = station_id AND s.unit IN (SELECT unit FROM users WHERE id = auth.uid()))
      AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
                  JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'sensors_update_policy') THEN
    CREATE POLICY sensors_update_policy ON sensors FOR UPDATE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sensors' AND policyname = 'sensors_delete_policy') THEN
    CREATE POLICY sensors_delete_policy ON sensors FOR DELETE USING (
      EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id WHERE u.id = auth.uid() AND r.name = 'Administrador')
    );
  END IF;
END $$;
