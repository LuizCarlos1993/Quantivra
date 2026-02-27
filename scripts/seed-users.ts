/**
 * Seed test users in Supabase for Quantivra.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (get from Supabase Dashboard > Settings > API > service_role).
 * Optional: DATABASE_URL for direct Postgres - ensures roles table exists before seeding.
 *   Get from: Supabase Dashboard > Project Settings > Database > Connection string (URI)
 *
 * Run: npm run seed:users
 */

import 'dotenv/config'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tvgczvtsaelcnsaflffg.supabase.co'

const ROLES_MIGRATION_SQL = `
-- Fix roles table: drop and recreate if schema is wrong (roles.name missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name') THEN
      DROP TABLE IF EXISTS user_roles;
      DROP TABLE roles;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('Administrador'), ('Analista'), ('Consulta')
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    CREATE TABLE user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id),
      PRIMARY KEY (user_id, role_id)
    );
  END IF;
END $$;
`

async function ensureRolesTableViaDb() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return false
  const client = new pg.Client({ connectionString: dbUrl })
  try {
    await client.connect()
    await client.query(ROLES_MIGRATION_SQL)
    console.log('Roles table ensured via DATABASE_URL')
    return true
  } catch (err: any) {
    console.warn('Could not ensure roles via DATABASE_URL:', err.message)
    return false
  } finally {
    await client.end()
  }
}

const TEST_USERS = [
  { email: 'carlos.silva@petrobras.com.br', password: 'admin123', name: 'Carlos Silva', unit: 'Unidade SP', roleName: 'Administrador' },
  { email: 'ana.santos@petrobras.com.br', password: 'analista123', name: 'Ana Paula Santos', unit: 'Unidade SP', roleName: 'Analista' },
  { email: 'mariana.costa@petrobras.com.br', password: 'consulta123', name: 'Mariana Costa', unit: 'Unidade SP', roleName: 'Consulta' },
]

async function findAuthUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  let page = 1
  const perPage = 100
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage })
    const user = data.users?.find((u) => u.email === email)
    if (user) return user
    if (!data.users?.length) return null
    page++
  }
}

async function main() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required. Get it from Supabase Dashboard > Settings > API > service_role')
    process.exit(1)
  }

  await ensureRolesTableViaDb()

  const supabase = createClient(SUPABASE_URL, serviceRoleKey, { auth: { persistSession: false } })

  let roleMap: Map<string, string>
  const { data: rolesWithName, error: errName } = await supabase.from('roles').select('id, name')
  if (!errName && rolesWithName?.length && 'name' in rolesWithName[0]) {
    roleMap = new Map(rolesWithName.map((r: { id: string; name: string }) => [r.name, r.id]))
  } else {
    const { data: rolesIdOnly, error: rolesError } = await supabase.from('roles').select('id').order('id')
    if (rolesError || !rolesIdOnly?.length) {
      console.error('Failed to fetch roles:', rolesError?.message ?? 'No roles found')
      process.exit(1)
    }
    if (rolesIdOnly.length < 3) {
      console.error('Expected at least 3 roles (Administrador, Analista, Consulta). Run scripts/init-schema-for-seed.sql in SQL Editor.')
      process.exit(1)
    }
    roleMap = new Map([
      ['Administrador', rolesIdOnly[0].id],
      ['Analista', rolesIdOnly[1].id],
      ['Consulta', rolesIdOnly[2].id],
    ])
  }
  console.log('Roles:', Object.fromEntries(roleMap))

  for (const user of TEST_USERS) {
    const roleId = roleMap.get(user.roleName)
    if (!roleId) {
      console.error(`Role "${user.roleName}" not found. Skipping ${user.email}`)
      continue
    }

    const existingUser = await findAuthUserByEmail(supabase, user.email)
    if (existingUser) {
      console.log(`Auth user ${user.email} already exists, ensuring public.users and user_roles`)
      const userId = existingUser.id

      const { data: pubUser } = await supabase.from('users').select('id').eq('id', userId).single()
      if (!pubUser) {
        const { error: insErr } = await supabase.from('users').insert({ id: userId, email: user.email, name: user.name, unit: user.unit })
        if (insErr) console.error(`  Failed to insert users row: ${insErr.message}`)
        else console.log(`  Inserted public.users for ${user.email}`)
      }

      const { data: ur } = await supabase.from('user_roles').select('user_id').eq('user_id', userId).eq('role_id', roleId).single()
      if (!ur) {
        const { error: urErr } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId })
        if (urErr) console.error(`  Failed to insert user_roles: ${urErr.message}`)
        else console.log(`  Inserted user_roles for ${user.email}`)
      }
      continue
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true })
    if (authError) {
      console.error(`Failed to create auth user ${user.email}:`, authError.message)
      continue
    }
    const userId = authData.user.id
    console.log(`Created auth user: ${user.email} (${userId})`)

    const { error: usersError } = await supabase.from('users').insert({ id: userId, email: user.email, name: user.name, unit: user.unit })
    if (usersError) { console.error(`  Failed to insert users: ${usersError.message}`); continue }
    console.log(`  Inserted public.users`)

    const { error: urError } = await supabase.from('user_roles').insert({ user_id: userId, role_id: roleId })
    if (urError) { console.error(`  Failed to insert user_roles: ${urError.message}`); continue }
    console.log(`  Inserted user_roles (${user.roleName})`)
  }

  console.log('\nDone. Test users:')
  console.log('  1. carlos.silva@petrobras.com.br / admin123 - Administrador, Unidade SP')
  console.log('  2. ana.santos@petrobras.com.br / analista123 - Analista, Unidade SP')
  console.log('  3. mariana.costa@petrobras.com.br / consulta123 - Consulta, Unidade SP')
}

main().catch((err) => { console.error(err); process.exit(1) })

