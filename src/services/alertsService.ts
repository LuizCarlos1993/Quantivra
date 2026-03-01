import { supabase } from '@/lib/supabase'
import { PARAM_KEY_TO_DISPLAY } from '@/config/stations'

export interface AlertRecord {
  id: string
  type: string
  title: string
  station: string
  stationId: string
  parameter: string
  severity: 'critical' | 'warning' | 'info'
  time: string
  read: boolean
}

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export const alertsService = {
  async getUnreadAlerts(stationFilter?: (name: string) => boolean): Promise<AlertRecord[]> {
    const { data } = await supabase
      .from('alerts')
      .select('id, station_id, parameter, type, message, severity, read, created_at, stations(name)')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!data?.length) return []

    return data
      .filter((a) => {
        const stationName = (a.stations as unknown as { name: string })?.name ?? ''
        return !stationFilter || stationFilter(stationName)
      })
      .map((a) => {
        const stationName = (a.stations as unknown as { name: string })?.name ?? ''
        return {
          id: a.id,
          type: a.type,
          title: a.message ?? `${a.type}: ${a.parameter}`,
          station: stationName,
          stationId: a.station_id,
          parameter: a.parameter,
          severity: (a.severity as AlertRecord['severity']) ?? 'warning',
          time: formatTimeAgo(a.created_at),
          read: a.read,
        }
      })
  },

  async markAsRead(alertId: string): Promise<void> {
    await supabase.from('alerts').update({ read: true }).eq('id', alertId)
  },

  async markAllAsRead(): Promise<void> {
    await supabase.from('alerts').update({ read: true }).eq('read', false)
  },

  /** Marca todos os alertas como não vistos. Não altera validated_data. */
  async markAllAsUnread(): Promise<void> {
    await supabase.from('alerts').update({ read: false })
  },

  async markAlertsAsReadForStationParameter(stationId: string, parameter: string): Promise<void> {
    await supabase
      .from('alerts')
      .update({ read: true })
      .eq('station_id', stationId)
      .eq('parameter', parameter)
      .eq('read', false)
  },

  /**
   * Garante que toda estação+parâmetro com dados pendentes de invalidação
   * tenha um alerta não lido no sino. Sem isso, o sino ficaria vazio com pendentes.
   */
  async ensureAlertsForPendingData(
    canAccessStation?: (stationName: string) => boolean
  ): Promise<void> {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: rawRows } = await supabase
      .from('raw_data')
      .select('id, station_id, sensors(parameter)')
      .gte('timestamp', since)
      .limit(2000)

    if (!rawRows?.length) return

    const rawIds = rawRows.map((r) => r.id)
    const { data: validations } = await supabase
      .from('validated_data')
      .select('raw_data_id, validation_status')
      .in('raw_data_id', rawIds)

    const validatedMap = new Map(
      (validations ?? []).map((v) => [
        v.raw_data_id,
        (v as { validation_status?: string }).validation_status,
      ])
    )

    const pendingKeys = new Set<string>()
    for (const row of rawRows) {
      const v = validatedMap.get(row.id)
      const status = v?.toUpperCase?.()
      const isPending = !v || (status !== 'VALID' && status !== 'INVALID')
      if (isPending) {
        const param =
          (row.sensors as { parameter?: string } | null)?.parameter ?? ''
        if (param) pendingKeys.add(`${row.station_id}::${param}`)
      }
    }

    const { data: stations } = await supabase.from('stations').select('id, name')
    const stationMap = new Map((stations ?? []).map((s) => [s.id, s.name]))

    const { data: existingAlerts } = await supabase
      .from('alerts')
      .select('station_id, parameter')
      .eq('read', false)

    const existingKeys = new Set(
      (existingAlerts ?? []).map((a) => `${a.station_id}::${a.parameter}`)
    )

    const paramDisplay = (p: string) =>
      PARAM_KEY_TO_DISPLAY[p] ?? p

    for (const key of pendingKeys) {
      const [stationId, parameter] = key.split('::')
      if (existingKeys.has(key)) continue
      const stationName = stationMap.get(stationId) ?? ''
      if (canAccessStation && !canAccessStation(stationName)) continue

      await supabase.from('alerts').insert({
        station_id: stationId,
        parameter,
        type: 'pending_validation',
        message: `Dados pendentes de validação - ${paramDisplay(parameter)}`,
        severity: 'warning',
        read: false,
      })
      existingKeys.add(key)
    }
  },
}
