import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL required. Get from Supabase Dashboard > Project Settings > Database > Connection string (URI) - use the Transaction pooler format.')
    console.error('Add it to .env and run: npm run db:create-users')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString: dbUrl })
  try {
    await client.connect()
    const sql = readFileSync(join(__dirname, 'create-users-table.sql'), 'utf8')
    await client.query(sql)
    console.log('Created public.users and public.user_roles.')
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  } finally {
    await client.end()
  }
}
main()
