export const PARAMETERS = ['O₃', 'NOx', 'SO₂', 'CO', 'HCT', 'BTEX', 'MP₁₀', 'MP₂.₅'] as const

/** Converte parâmetro do alerta (MP10, SO2) para formato do select (MP₁₀, SO₂) */
export const PARAM_KEY_TO_DISPLAY: Record<string, string> = {
  MP10: 'MP₁₀', 'MP2.5': 'MP₂.₅', O3: 'O₃', SO2: 'SO₂',
  NOx: 'NOx', CO: 'CO', HCT: 'HCT', BTEX: 'BTEX',
}

/** Converte display (MP₁₀) para parâmetro do banco (MP10) */
export const DISPLAY_TO_PARAM_KEY: Record<string, string> = {
  'MP₁₀': 'MP10', 'MP₂.₅': 'MP2.5', 'O₃': 'O3', 'SO₂': 'SO2',
  'NOx': 'NOx', 'CO': 'CO', 'HCT': 'HCT', 'BTEX': 'BTEX',
}

export const PERIODS = [
  'Últimas 24 horas',
  'Últimos 7 dias',
  'Últimos 30 dias',
  'Últimos 90 dias',
] as const
