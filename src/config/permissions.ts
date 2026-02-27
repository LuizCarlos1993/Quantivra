import type { UserProfile } from '@/types'

export type Permission =
  | 'view_data'
  | 'validate_data'
  | 'configure_stations'
  | 'manage_users'
  | 'export_csv'

const ROLE_MATRIX: Record<UserProfile, Record<Permission, boolean>> = {
  Administrador: {
    view_data: true,
    validate_data: true,
    configure_stations: true,
    manage_users: true,
    export_csv: true,
  },
  Analista: {
    view_data: true,
    validate_data: true,
    configure_stations: false,
    manage_users: false,
    export_csv: true,
  },
  Consulta: {
    view_data: true,
    validate_data: false,
    configure_stations: false,
    manage_users: false,
    export_csv: true,
  },
}

export function hasPermission(profile: UserProfile, permission: Permission): boolean {
  return ROLE_MATRIX[profile]?.[permission] ?? false
}

export function canEdit(profile: UserProfile): boolean {
  return hasPermission(profile, 'validate_data')
}

export function canManageUsers(profile: UserProfile): boolean {
  return hasPermission(profile, 'manage_users')
}

export function canConfigureStations(profile: UserProfile): boolean {
  return hasPermission(profile, 'configure_stations')
}

export function isReadOnly(profile: UserProfile): boolean {
  return profile === 'Consulta'
}
