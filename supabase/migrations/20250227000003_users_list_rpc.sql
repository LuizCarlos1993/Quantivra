-- RPC para listar usuários: bypassa RLS (SECURITY DEFINER) e retorna dados para administradores.
-- Resolve o problema de "Nenhum usuário encontrado" quando RLS ou policies bloqueiam o SELECT.
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
  -- Só permite se o chamador for Administrador
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
  ORDER BY u.created_at DESC NULLS LAST;
END;
$$;
