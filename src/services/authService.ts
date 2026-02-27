import { supabase } from '@/lib/supabase'
import { auditService } from './auditService'
import type { AppUser } from '@/types'

const STORAGE_KEY = 'quantivra_user'

const ROLE_ID_MAP: Record<string, AppUser['profile']> = {
  '1d89d633-75b5-441c-bdcd-c4ff694b1b7a': 'Administrador',
  '7e08b306-2fac-4026-bd49-2e8d80a1d714': 'Analista',
  'eb8063e6-414b-4492-b617-33828f73c62f': 'Consulta',
}

export const authService = {
  async login(email: string, password: string): Promise<AppUser | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) return null

    const profile = await this.fetchUserProfile(data.user.id)
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      await auditService.log('login', { user_id: profile.id })
      return profile
    }
    return null
  },

  async logout(): Promise<void> {
    const userStr = localStorage.getItem(STORAGE_KEY)
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as AppUser
        await auditService.log('logout', { user_id: user.id })
      } catch { /* ignore */ }
    }
    await supabase.auth.signOut()
    localStorage.removeItem(STORAGE_KEY)
  },

  async getSession(): Promise<AppUser | null> {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
      const profile = await this.fetchUserProfile(data.session.user.id)
      if (profile) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
        return profile
      }
    }

    localStorage.removeItem(STORAGE_KEY)
    return null
  },

  async fetchUserProfile(authId: string): Promise<AppUser | null> {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, name, unit')
        .eq('id', authId)
        .single()

      if (!profile) return null

      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', authId)
        .limit(1)

      let profileRole: AppUser['profile'] = 'Consulta'
      if (roleRows?.[0]) {
        const roleId = roleRows[0].role_id as string

        if (ROLE_ID_MAP[roleId]) {
          profileRole = ROLE_ID_MAP[roleId]
        } else {
          const { data: role } = await supabase
            .from('roles')
            .select('name')
            .eq('id', roleId)
            .maybeSingle()

          const validRoles: Record<string, AppUser['profile']> = {
            Administrador: 'Administrador',
            Analista: 'Analista',
            Consulta: 'Consulta',
          }
          if (role?.name && validRoles[role.name]) {
            profileRole = validRoles[role.name]
          }
        }
      }

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        unit: profile.unit,
        profile: profileRole,
      }
    } catch {
      return null
    }
  },
}
