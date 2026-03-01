import { supabase } from '@/lib/supabase'

export interface UserRecord {
  id: string
  name: string
  email: string
  profile: 'Administrador' | 'Analista' | 'Consulta'
  unit: string
  status: 'Ativo' | 'Inativo'
  createdAt: Date
}

const ROLE_ID_MAP: Record<string, string> = {
  '1d89d633-75b5-441c-bdcd-c4ff694b1b7a': 'Administrador',
  '7e08b306-2fac-4026-bd49-2e8d80a1d714': 'Analista',
  'eb8063e6-414b-4492-b617-33828f73c62f': 'Consulta',
}

const PROFILE_TO_ROLE_ID: Record<string, string> = {
  Administrador: '1d89d633-75b5-441c-bdcd-c4ff694b1b7a',
  Analista: '7e08b306-2fac-4026-bd49-2e8d80a1d714',
  Consulta: 'eb8063e6-414b-4492-b617-33828f73c62f',
}

async function resolveRoleName(roleId: string): Promise<string> {
  if (ROLE_ID_MAP[roleId]) return ROLE_ID_MAP[roleId]
  const { data } = await supabase.from('roles').select('name').eq('id', roleId).maybeSingle()
  return data?.name ?? 'Consulta'
}

function mapRpcToRecord(row: { id: string; email: string; name: string; unit: string; status: string; created_at: string; profile: string }): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    profile: (row.profile || 'Consulta') as UserRecord['profile'],
    unit: row.unit,
    status: (row.status || 'Ativo') as UserRecord['status'],
    createdAt: new Date(row.created_at),
  }
}

export const usersService = {
  async getAll(): Promise<UserRecord[]> {
    const { data, error } = await supabase.rpc('list_users_for_admin', { unit_filter: null })
    if (!error && data?.length) return data.map(mapRpcToRecord)
    return this.getAllFallback()
  },

  async getAllFallback(): Promise<UserRecord[]> {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, name, unit, status, created_at')
      .order('created_at', { ascending: false })

    const rows = users ?? []
    if (!rows.length) {
      const { data: minimal } = await supabase.from('users').select('id, email, name, unit')
      if (!minimal?.length) return []
      rows.push(...minimal.map((u) => ({ ...u, status: 'Ativo', created_at: new Date().toISOString() })))
    }

    const userIds = rows.map((u) => u.id)
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role_id')
      .in('user_id', userIds)

    const userRoleMap = new Map<string, string>()
    for (const row of roleRows ?? []) {
      userRoleMap.set(row.user_id, row.role_id)
    }

    const results: UserRecord[] = []
    for (const user of rows) {
      const roleId = userRoleMap.get(user.id)
      const profile = roleId ? await resolveRoleName(roleId) : 'Consulta'

      results.push({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: profile as UserRecord['profile'],
        unit: user.unit,
        status: ((user as { status?: string }).status as UserRecord['status']) ?? 'Ativo',
        createdAt: new Date((user as { created_at?: string }).created_at ?? Date.now()),
      })
    }

    return results
  },

  async getAllUnits(): Promise<string[]> {
    const { data, error } = await supabase.rpc('list_users_for_admin', { unit_filter: null })
    let fromUsers: string[] = []
    if (!error && data?.length) fromUsers = data.map((r: { unit?: string }) => r.unit).filter(Boolean)
    else {
      const { data: userRows } = await supabase.from('users').select('unit')
      fromUsers = (userRows ?? []).map((r) => r.unit).filter(Boolean)
    }
    const { data: stationUnits } = await supabase.from('stations').select('unit')
    const fromStations = (stationUnits ?? []).map((r) => r.unit).filter(Boolean)
    return [...new Set([...fromUsers, ...fromStations])].sort()
  },

  async getByUnit(unit: string): Promise<UserRecord[]> {
    const { data, error } = await supabase.rpc('list_users_for_admin', { unit_filter: unit })
    if (!error) return (data ?? []).map(mapRpcToRecord)
    return this.getByUnitFallback(unit)
  },

  async getByUnitFallback(unit: string): Promise<UserRecord[]> {
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, name, unit, status, created_at')
      .eq('unit', unit)
      .order('created_at', { ascending: false })

    let users = usersData ?? []
    if (!users.length) {
      const { data: minimal } = await supabase
        .from('users')
        .select('id, email, name, unit')
        .eq('unit', unit)
      users = (minimal ?? []).map((u) => ({ ...u, status: 'Ativo', created_at: new Date().toISOString() }))
    }
    if (!users.length) return []

    const userIds = users.map((u) => u.id)
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('user_id, role_id')
      .in('user_id', userIds)

    const userRoleMap = new Map<string, string>()
    for (const row of roleRows ?? []) {
      userRoleMap.set(row.user_id, row.role_id)
    }

    const results: UserRecord[] = []
    for (const user of users) {
      const roleId = userRoleMap.get(user.id)
      const profile = roleId ? await resolveRoleName(roleId) : 'Consulta'

      results.push({
        id: user.id,
        name: user.name,
        email: user.email,
        profile: profile as UserRecord['profile'],
        unit: user.unit,
        status: (user.status as UserRecord['status']) ?? 'Ativo',
        createdAt: new Date(user.created_at),
      })
    }

    return results
  },

  async create(data: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: data.email,
        name: data.name,
        unit: data.unit,
        status: data.status ?? 'Ativo',
      })
      .select()
      .single()

    if (error || !newUser) throw new Error(error?.message ?? 'Failed to create user')

    const roleId = PROFILE_TO_ROLE_ID[data.profile]
    if (roleId) {
      await supabase.from('user_roles').insert({ user_id: newUser.id, role_id: roleId })
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      profile: data.profile,
      unit: newUser.unit,
      status: (newUser.status as UserRecord['status']) ?? 'Ativo',
      createdAt: new Date(newUser.created_at),
    }
  },

  async update(id: string, data: Partial<UserRecord>): Promise<UserRecord | null> {
    const updates: Record<string, unknown> = {}
    if (data.name) updates.name = data.name
    if (data.email) updates.email = data.email
    if (data.unit) updates.unit = data.unit
    if (data.status) updates.status = data.status

    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', id)
    }

    if (data.profile) {
      const roleId = PROFILE_TO_ROLE_ID[data.profile]
      if (roleId) {
        await supabase.from('user_roles').delete().eq('user_id', id)
        await supabase.from('user_roles').insert({ user_id: id, role_id: roleId })
      }
    }

    const { data: updated } = await supabase
      .from('users')
      .select('id, email, name, unit, status, created_at')
      .eq('id', id)
      .single()

    if (!updated) return null

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', id)
      .maybeSingle()

    const profile = roleRow ? await resolveRoleName(roleRow.role_id) : 'Consulta'

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      profile: profile as UserRecord['profile'],
      unit: updated.unit,
      status: (updated.status as UserRecord['status']) ?? 'Ativo',
      createdAt: new Date(updated.created_at),
    }
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('users').delete().eq('id', id)
    return !error
  },

  async toggleStatus(id: string): Promise<UserRecord | null> {
    const { data: current } = await supabase
      .from('users')
      .select('status')
      .eq('id', id)
      .single()

    if (!current) return null
    const newStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo'
    return this.update(id, { status: newStatus as UserRecord['status'] })
  },
}
