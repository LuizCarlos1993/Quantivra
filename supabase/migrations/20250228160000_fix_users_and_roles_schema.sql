-- Add status and created_at to users if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Ativo';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add name column to roles if missing (required for list_users_for_admin RPC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name') THEN
    ALTER TABLE roles ADD COLUMN name TEXT;
    UPDATE roles SET name = 'Administrador' WHERE id = '1d89d633-75b5-441c-bdcd-c4ff694b1b7a';
    UPDATE roles SET name = 'Analista' WHERE id = '7e08b306-2fac-4026-bd49-2e8d80a1d714';
    UPDATE roles SET name = 'Consulta' WHERE id = 'eb8063e6-414b-4492-b617-33828f73c62f';
    ALTER TABLE roles ALTER COLUMN name SET NOT NULL;
    ALTER TABLE roles ADD CONSTRAINT roles_name_unique UNIQUE (name);
  END IF;
END $$;

-- RLS policy for users (allow authenticated read)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' AND policyname = 'users_select_all') THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY users_select_all ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create or replace list_users_for_admin RPC
CREATE OR REPLACE FUNCTION public.list_users_for_admin(unit_filter TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  unit TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  profile TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'Administrador'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.unit,
    COALESCE(u.status, 'Ativo'),
    u.created_at,
    COALESCE(
      (SELECT r2.name FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id LIMIT 1),
      'Consulta'
    )
  FROM public.users u
  WHERE (unit_filter IS NULL OR unit_filter = '' OR u.unit = unit_filter)
  ORDER BY u.created_at DESC NULLS LAST, u.email;
END;
$$;
