import { supabase } from '@/lib/supabase'

export interface DashboardData {
  availability: number
  iqar: { value: number; quality: string; color: string }
  windData: { direction: string; velocity: number }[]
  pollutantData: { direction: string; concentration: number }[]
  parameters: { name: string; value: string; unit: string; status: 'normal' | 'alert' | 'critical' }[]
  timelineData: { time: string; value: number; invalidated?: boolean }[]
}

const DIRECTIONS = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']

const PARAM_DISPLAY: Record<string, { label: string; unit: string }> = {
  O3: { label: 'Ozônio (O₃)', unit: 'µg/m³' },
  'MP2.5': { label: 'Material Particulado (PM2.5)', unit: 'µg/m³' },
  MP10: { label: 'Material Particulado (PM10)', unit: 'µg/m³' },
  NOx: { label: 'Dióxido de Nitrogênio (NO₂)', unit: 'µg/m³' },
  CO: { label: 'Monóxido de Carbono (CO)', unit: 'mg/m³' },
  SO2: { label: 'Dióxido de Enxofre (SO₂)', unit: 'µg/m³' },
}

const PARAM_THRESHOLDS: Record<string, { alert: number; critical: number }> = {
  O3: { alert: 100, critical: 200 },
  'MP2.5': { alert: 50, critical: 100 },
  MP10: { alert: 100, critical: 200 },
  NOx: { alert: 150, critical: 300 },
  CO: { alert: 3, critical: 9 },
  SO2: { alert: 100, critical: 200 },
}

function classifyIQAr(value: number): { quality: string; color: string } {
  if (value <= 50) return { quality: 'BOA', color: 'green' }
  if (value <= 100) return { quality: 'MODERADA', color: 'yellow' }
  if (value <= 150) return { quality: 'RUIM', color: 'orange' }
  if (value <= 200) return { quality: 'MUITO RUIM', color: 'red' }
  return { quality: 'PÉSSIMA', color: 'purple' }
}

function paramStatus(param: string, value: number): 'normal' | 'alert' | 'critical' {
  const t = PARAM_THRESHOLDS[param]
  if (!t) return 'normal'
  if (value >= t.critical) return 'critical'
  if (value >= t.alert) return 'alert'
  return 'normal'
}

function directionBucket(degrees: number): string {
  const idx = Math.round(degrees / 45) % 8
  return DIRECTIONS[idx] ?? 'N'
}

export const dashboardService = {
  async getDashboardData(stationName: string, date: string): Promise<DashboardData> {
    const { data: station } = await supabase
      .from('stations')
      .select('id')
      .eq('name', stationName)
      .single()

    if (!station) return emptyDashboard()

    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59`

    const [iqarRes, availRes, sensorsRes] = await Promise.all([
      supabase
        .from('iqair_results')
        .select('value')
        .eq('station_id', station.id)
        .gte('timestamp', dayStart)
        .lte('timestamp', dayEnd)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('availability_metrics')
        .select('percentage')
        .eq('station_id', station.id)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('sensors')
        .select('id, parameter')
        .eq('station_id', station.id),
    ])

    const iqarValue = iqarRes.data?.value ?? 0
    const iqarInfo = classifyIQAr(iqarValue)
    const availability = availRes.data?.percentage ?? 0

    const sensorMap = new Map<string, string>()
    for (const s of sensorsRes.data ?? []) {
      sensorMap.set(s.parameter, s.id)
    }

    const sensorIds = Array.from(sensorMap.values())
    const { data: rawRows } = await supabase
      .from('raw_data')
      .select('sensor_id, value, timestamp')
      .in('sensor_id', sensorIds)
      .gte('timestamp', dayStart)
      .lte('timestamp', dayEnd)
      .order('timestamp', { ascending: true })

    const sensorIdToParam = new Map<string, string>()
    for (const [param, id] of sensorMap.entries()) {
      sensorIdToParam.set(id, param)
    }

    const paramLatest = new Map<string, number>()
    const windSpeedByDir = new Map<string, number[]>()
    const timelineMap = new Map<string, number[]>()

    for (const row of rawRows ?? []) {
      const param = sensorIdToParam.get(row.sensor_id) ?? ''
      paramLatest.set(param, row.value)

      if (param === 'wind_direction') {
        const dir = directionBucket(row.value)
        const speedSensorId = sensorMap.get('wind_speed')
        if (speedSensorId) {
          const speeds = windSpeedByDir.get(dir) ?? []
          speeds.push(row.value)
          windSpeedByDir.set(dir, speeds)
        }
      }

      if (param === 'wind_speed') {
        const ts = new Date(row.timestamp)
        const hourKey = `${ts.getHours().toString().padStart(2, '0')}h`
        const vals = timelineMap.get(hourKey) ?? []
        vals.push(row.value)
        timelineMap.set(hourKey, vals)
      }

      if (param === 'MP10') {
        const ts = new Date(row.timestamp)
        const hourKey = `${ts.getHours().toString().padStart(2, '0')}h`
        const vals = timelineMap.get(hourKey) ?? []
        vals.push(row.value)
        timelineMap.set(hourKey, vals)
      }
    }

    // Build wind data and pollutant data from raw readings grouped by wind direction
    const windReadings = new Map<string, { speeds: number[]; pollutants: number[] }>()
    for (const row of rawRows ?? []) {
      const param = sensorIdToParam.get(row.sensor_id) ?? ''
      if (param === 'wind_direction') {
        const dir = directionBucket(row.value)
        if (!windReadings.has(dir)) windReadings.set(dir, { speeds: [], pollutants: [] })
      }
    }

    // Pair wind direction with wind speed by timestamp proximity
    const windDirReadings = (rawRows ?? []).filter((r) => sensorIdToParam.get(r.sensor_id) === 'wind_direction')
    const windSpdReadings = (rawRows ?? []).filter((r) => sensorIdToParam.get(r.sensor_id) === 'wind_speed')
    const mp10Readings = (rawRows ?? []).filter((r) => sensorIdToParam.get(r.sensor_id) === 'MP10')

    const windData: { direction: string; velocity: number }[] = []
    const pollutantData: { direction: string; concentration: number }[] = []

    for (const dir of DIRECTIONS) {
      const dirReadings = windDirReadings.filter((r) => directionBucket(r.value) === dir)
      const matchedSpeeds = dirReadings.map((dr) => {
        const closest = windSpdReadings.reduce((best, sr) =>
          Math.abs(new Date(sr.timestamp).getTime() - new Date(dr.timestamp).getTime()) <
          Math.abs(new Date(best.timestamp).getTime() - new Date(dr.timestamp).getTime()) ? sr : best,
          windSpdReadings[0]
        )
        return closest?.value ?? 0
      })
      const matchedPollutants = dirReadings.map((dr) => {
        const closest = mp10Readings.reduce((best, pr) =>
          Math.abs(new Date(pr.timestamp).getTime() - new Date(dr.timestamp).getTime()) <
          Math.abs(new Date(best.timestamp).getTime() - new Date(dr.timestamp).getTime()) ? pr : best,
          mp10Readings[0]
        )
        return closest?.value ?? 0
      })

      const avgSpeed = matchedSpeeds.length
        ? matchedSpeeds.reduce((a, b) => a + b, 0) / matchedSpeeds.length
        : 0
      const avgPollutant = matchedPollutants.length
        ? matchedPollutants.reduce((a, b) => a + b, 0) / matchedPollutants.length
        : 0

      windData.push({ direction: dir, velocity: Math.round(avgSpeed * 10) / 10 })
      pollutantData.push({ direction: dir, concentration: Math.round(avgPollutant) })
    }

    // Build parameters from latest readings
    const parameters: DashboardData['parameters'] = []
    for (const [param, display] of Object.entries(PARAM_DISPLAY)) {
      const value = paramLatest.get(param)
      if (value === undefined) continue
      parameters.push({
        name: display.label,
        value: display.unit.includes('mg') ? value.toFixed(1) : Math.round(value).toString(),
        unit: display.unit,
        status: paramStatus(param, value),
      })
    }

    // Build timeline from MP10 hourly averages
    const timelineData: DashboardData['timelineData'] = []
    for (let h = 0; h < 24; h++) {
      const key = `${h.toString().padStart(2, '0')}h`
      const vals = timelineMap.get(key)
      timelineData.push({
        time: key,
        value: vals?.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
        invalidated: false,
      })
    }

    return {
      availability,
      iqar: { value: Math.round(iqarValue), ...iqarInfo },
      windData,
      pollutantData,
      parameters,
      timelineData,
    }
  },
}

function emptyDashboard(): DashboardData {
  return {
    availability: 0,
    iqar: { value: 0, quality: 'N/A', color: 'gray' },
    windData: DIRECTIONS.map((d) => ({ direction: d, velocity: 0 })),
    pollutantData: DIRECTIONS.map((d) => ({ direction: d, concentration: 0 })),
    parameters: [],
    timelineData: Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}h`,
      value: 0,
    })),
  }
}
