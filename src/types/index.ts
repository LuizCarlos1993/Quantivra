export type { Database } from './database'

export type UserProfile = 'Administrador' | 'Analista' | 'Consulta'

export interface AppUser {
  id: string
  name: string
  email: string
  profile: UserProfile
  unit: string
}

export interface Station {
  id: string
  code: string
  name: string
  lat: number
  lng: number
  status: string
  unit: string
  pm10?: number
  wind?: string
  windSpeed?: number
  windDirection?: number
  lastUpdate?: string
  iqar?: number
  iqarLabel?: string
  parameters?: { name: string; value: number; unit: string; status: string }[]
  trend?: number[]
}
