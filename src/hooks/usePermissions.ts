import { useAuth } from '@/modules/auth/context/AuthContext'
import { canEdit, canManageUsers, canConfigureStations, isReadOnly } from '@/config/permissions'

export function usePermissions() {
  const { user } = useAuth()
  const profile = user?.profile ?? 'Consulta'

  return {
    canEdit: canEdit(profile),
    canManageUsers: canManageUsers(profile),
    canConfigureStations: canConfigureStations(profile),
    isReadOnly: isReadOnly(profile),
    userProfile: profile,
  }
}
