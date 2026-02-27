export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  CONSISTENCY: '/consistencia',
  MAP: '/mapa',
  REPORTS: '/relatorios',
  USERS: '/usuarios',
  SETTINGS: '/configuracoes',
} as const

export const PUBLIC_ROUTES = [ROUTES.LOGIN] as const
