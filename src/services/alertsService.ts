import { supabase } from '@/lib/supabase'

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
}
