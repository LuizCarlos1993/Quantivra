import { supabase } from '@/lib/supabase'

export interface DataRow {
  id: number
  dateTime: string
  rawValue: string
  finalValue: string
  unit: string
  status: 'valid' | 'invalid' | 'pending'
  justification: string
  operator: string
  alertId?: number
  parameter?: string
  rawDataId?: string
}

const PARAM_UNITS: Record<string, string> = {
  O3: 'µg/m³', NOx: 'ppb', SO2: 'µg/m³', CO: 'mg/m³',
  HCT: 'µg/m³', BTEX: 'µg/m³', MP10: 'µg/m³', 'MP2.5': 'µg/m³',
}

function normalizeParamKey(param: string): string {
  const p = param
    .replace(/\u2080/g, '0').replace(/\u2081/g, '1').replace(/\u2082/g, '2')
    .replace(/\u2083/g, '3').replace(/\u2084/g, '4').replace(/\u2085/g, '5')
    .replace(/\u2086/g, '6').replace(/\u2087/g, '7').replace(/\u2088/g, '8')
    .replace(/\u2089/g, '9')
    .split(' ')[0] ?? param

  if (p.startsWith('MP1') || p === 'MP10') return 'MP10'
  if (p.startsWith('MP2') || p.includes('2.5') || p.includes('2_5')) return 'MP2.5'
  if (p === 'O3') return 'O3'
  if (p === 'SO2') return 'SO2'
  return p
}

function periodToInterval(period: string): { hours: number } {
  switch (period) {
    case 'Últimas 24 horas': return { hours: 24 }
    case 'Últimos 7 dias': return { hours: 168 }
    case 'Últimos 30 dias': return { hours: 720 }
    case 'Últimos 90 dias': return { hours: 2160 }
    default: return { hours: 24 }
  }
}

function formatDateTime(ts: string): string {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function findStationAndSensor(stationName: string, paramKey: string) {
  const { data: station } = await supabase
    .from('stations')
    .select('id')
    .eq('name', stationName)
    .single()

  if (!station) return null

  const { data: sensor } = await supabase
    .from('sensors')
    .select('id')
    .eq('station_id', station.id)
    .eq('parameter', paramKey)
    .maybeSingle()

  return sensor ? { stationId: station.id, sensorId: sensor.id } : null
}

export async function generateConsistencyData(
  station: string,
  parameter: string,
  period: string,
  _resolvedAlertIds: number[] = []
): Promise<DataRow[]> {
  const paramKey = normalizeParamKey(parameter)
  const ids = await findStationAndSensor(station, paramKey)
  if (!ids) return []

  const { hours } = periodToInterval(period)
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const { data: rawRows } = await supabase
    .from('raw_data')
    .select('id, value, timestamp')
    .eq('sensor_id', ids.sensorId)
    .gte('timestamp', since)
    .order('timestamp', { ascending: true })
    .limit(500)

  if (!rawRows?.length) return []

  const rawIds = rawRows.map((r) => r.id)
  const { data: validations } = await supabase
    .from('validated_data')
    .select('raw_data_id, is_valid, justification, operator_id')
    .in('raw_data_id', rawIds)

  const validationMap = new Map(
    (validations ?? []).map((v) => [v.raw_data_id, v])
  )

  const unit = PARAM_UNITS[paramKey] ?? 'µg/m³'

  return rawRows.map((row, index) => {
    const validation = validationMap.get(row.id)
    let status: DataRow['status'] = 'valid'
    let justification = '-'
    let operator = 'Sistema'

    if (validation) {
      status = validation.is_valid ? 'valid' : 'invalid'
      justification = validation.justification || '-'
      operator = validation.operator_id || 'Sistema'
    }

    const valueStr = row.value.toFixed(1)

    return {
      id: index + 1,
      dateTime: formatDateTime(row.timestamp),
      rawValue: valueStr,
      finalValue: status === 'invalid' ? '-' : valueStr,
      unit,
      status,
      justification,
      operator,
      rawDataId: row.id,
    }
  })
}

export async function generateDataBetweenDates(
  station: string,
  parameter: string,
  startDate: Date,
  endDate: Date,
  _intervalMinutes: number = 60
): Promise<DataRow[]> {
  const paramKey = normalizeParamKey(parameter)
  const ids = await findStationAndSensor(station, paramKey)
  if (!ids) return []

  const { data: rawRows } = await supabase
    .from('raw_data')
    .select('id, value, timestamp')
    .eq('sensor_id', ids.sensorId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true })
    .limit(2000)

  if (!rawRows?.length) return []

  const rawIds = rawRows.map((r) => r.id)
  const { data: validations } = await supabase
    .from('validated_data')
    .select('raw_data_id, is_valid, justification, operator_id')
    .in('raw_data_id', rawIds)

  const validationMap = new Map(
    (validations ?? []).map((v) => [v.raw_data_id, v])
  )

  const unit = PARAM_UNITS[paramKey] ?? 'µg/m³'

  return rawRows.map((row, index) => {
    const validation = validationMap.get(row.id)
    let status: DataRow['status'] = 'valid'
    let justification = '-'
    let operator = 'Sistema'

    if (validation) {
      status = validation.is_valid ? 'valid' : 'invalid'
      justification = validation.justification || '-'
      operator = validation.operator_id || 'Sistema'
    }

    const valueStr = row.value.toFixed(1)

    return {
      id: index + 1,
      dateTime: formatDateTime(row.timestamp),
      rawValue: valueStr,
      finalValue: status === 'invalid' ? '-' : valueStr,
      unit,
      status,
      justification,
      operator,
      rawDataId: row.id,
    }
  })
}

export function aggregateDataByGranularity(
  data: DataRow[],
  granularity: '1min' | '15min' | '1h' | '24h'
): DataRow[] {
  if (granularity === '1min') return data

  const minutesMap: Record<string, number> = { '15min': 15, '1h': 60, '24h': 1440 }
  const intervalMinutes = minutesMap[granularity] ?? 60
  const groups: Record<string, DataRow[]> = {}

  data.forEach((row) => {
    const [datePart, timePart] = row.dateTime.split(' ')
    const [day, month, year] = datePart.split('/')
    const [hours, minutes] = timePart.split(':')
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hours, 10), parseInt(minutes, 10))
    const totalMinutes = date.getHours() * 60 + date.getMinutes()
    const groupIndex = Math.floor(totalMinutes / intervalMinutes)
    const groupKey = `${datePart}_${groupIndex}`

    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(row)
  })

  const aggregated: DataRow[] = []
  let id = 1
  Object.keys(groups)
    .sort()
    .forEach((groupKey) => {
      const groupRows = groups[groupKey]
      const validRows = groupRows.filter((r) => r.status !== 'invalid')
      if (validRows.length === 0) return

      const avgValue =
        validRows.reduce((sum, r) => sum + parseFloat(r.rawValue), 0) / validRows.length
      const firstRow = validRows[0]
      const hasPending = groupRows.some((r) => r.status === 'pending')

      aggregated.push({
        ...firstRow,
        id: id++,
        rawValue: avgValue.toFixed(1),
        finalValue: avgValue.toFixed(1),
        status: hasPending ? 'pending' : 'valid',
      })
    })

  return aggregated
}
