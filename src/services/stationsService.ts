import { supabase } from '@/lib/supabase'

export interface MapStation {
  id: string
  code: string
  name: string
  lat: number
  lng: number
  status: 'good' | 'moderate' | 'critical'
  pm10: number
  wind: string
  windSpeed: number
  windDirection: number
  lastUpdate: string
  iqar: number
  iqarLabel: string
  unit: string
  parameters: { name: string; value: number; unit: string; status: string }[]
  trend: number[]
}

const DIRECTION_LABELS: Record<string, string> = {
  N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO',
}

function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const idx = Math.round(deg / 45) % 8
  return DIRECTION_LABELS[dirs[idx]] ?? 'N'
}

function classifyIQAr(value: number): { label: string; status: 'good' | 'moderate' | 'critical' } {
  if (value <= 50) return { label: 'BOA', status: 'good' }
  if (value <= 100) return { label: 'MODERADA', status: 'moderate' }
  return { label: 'RUIM', status: 'critical' }
}

const PARAM_DISPLAY: Record<string, { label: string; unit: string }> = {
  O3: { label: 'O₃', unit: 'µg/m³' },
  NOx: { label: 'NOx', unit: 'ppb' },
  SO2: { label: 'SO₂', unit: 'µg/m³' },
  CO: { label: 'CO', unit: 'mg/m³' },
  HCT: { label: 'HCT', unit: 'µg/m³' },
  BTEX: { label: 'BTEX', unit: 'µg/m³' },
  MP10: { label: 'MP₁₀', unit: 'µg/m³' },
  'MP2.5': { label: 'MP₂.₅', unit: 'µg/m³' },
}

function paramStatus(param: string, value: number): string {
  const thresholds: Record<string, number> = { O3: 100, MP10: 100, 'MP2.5': 50, NOx: 150, SO2: 100, CO: 3 }
  const t = thresholds[param]
  if (!t) return 'good'
  return value > t ? 'moderate' : 'good'
}

export const stationsService = {
  async getStationIdByName(name: string): Promise<string | null> {
    const { data } = await supabase.from('stations').select('id').eq('name', name).single()
    return data?.id ?? null
  },

  async getAllStationNames(): Promise<string[]> {
    const { data } = await supabase
      .from('stations')
      .select('name')
      .eq('status', 'active')
      .order('name')
    return data?.map((s) => s.name) ?? []
  },

  async getStationsByUnit(unit: string): Promise<string[]> {
    const { data } = await supabase
      .from('stations')
      .select('name')
      .eq('unit', unit)
      .order('name')
    return data?.map((s) => s.name) ?? []
  },

  async getStationsByUnits(units: string[]): Promise<Record<string, string[]>> {
    const { data } = await supabase
      .from('stations')
      .select('name, unit')
      .in('unit', units)
      .order('name')

    const result: Record<string, string[]> = {}
    for (const row of data ?? []) {
      if (!result[row.unit]) result[row.unit] = []
      result[row.unit].push(row.name)
    }
    return result
  },

  async getAllStationUnits(): Promise<Record<string, string[]>> {
    const { data } = await supabase
      .from('stations')
      .select('name, unit')
      .order('unit')

    const result: Record<string, string[]> = {}
    for (const row of data ?? []) {
      if (!result[row.unit]) result[row.unit] = []
      result[row.unit].push(row.name)
    }
    return result
  },

  async getStationsFilteredByUnit(unitFilter: (name: string) => boolean): Promise<MapStation[]> {
    const { data: stations } = await supabase
      .from('stations')
      .select('*')
      .eq('status', 'active')

    if (!stations?.length) return []

    const filtered = stations.filter((s) => unitFilter(s.name))
    const result: MapStation[] = []

    for (const station of filtered) {
      const { data: latestIqar } = await supabase
        .from('iqair_results')
        .select('value, timestamp')
        .eq('station_id', station.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle()

      const iqarValue = latestIqar?.value ?? 0
      const iqarInfo = classifyIQAr(iqarValue)

      const { data: sensors } = await supabase
        .from('sensors')
        .select('id, parameter')
        .eq('station_id', station.id)
        .in('parameter', Object.keys(PARAM_DISPLAY))

      const parameters: MapStation['parameters'] = []
      let pm10 = 0
      let windSpeed = 0
      let windDirection = 0

      if (sensors?.length) {
        for (const sensor of sensors) {
          const { data: latest } = await supabase
            .from('raw_data')
            .select('value, timestamp')
            .eq('sensor_id', sensor.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (latest && PARAM_DISPLAY[sensor.parameter]) {
            const display = PARAM_DISPLAY[sensor.parameter]
            parameters.push({
              name: display.label,
              value: Math.round(latest.value * 100) / 100,
              unit: display.unit,
              status: paramStatus(sensor.parameter, latest.value),
            })
            if (sensor.parameter === 'MP10') pm10 = Math.round(latest.value)
          }
        }
      }

      const { data: windSensors } = await supabase
        .from('sensors')
        .select('id, parameter')
        .eq('station_id', station.id)
        .in('parameter', ['wind_speed', 'wind_direction'])

      for (const ws of windSensors ?? []) {
        const { data: latest } = await supabase
          .from('raw_data')
          .select('value')
          .eq('sensor_id', ws.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latest) {
          if (ws.parameter === 'wind_speed') windSpeed = Math.round(latest.value)
          if (ws.parameter === 'wind_direction') windDirection = Math.round(latest.value)
        }
      }

      const { data: trendData } = await supabase
        .from('iqair_results')
        .select('value')
        .eq('station_id', station.id)
        .order('timestamp', { ascending: false })
        .limit(6)

      const trend = (trendData ?? []).map((t) => Math.round(t.value)).reverse()

      const lastUpdate = latestIqar?.timestamp
        ? new Date(latestIqar.timestamp).toLocaleString('pt-BR')
        : new Date().toLocaleString('pt-BR')

      result.push({
        id: station.id,
        code: station.code,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        status: iqarInfo.status,
        pm10,
        wind: degreesToCardinal(windDirection),
        windSpeed,
        windDirection,
        lastUpdate,
        iqar: Math.round(iqarValue),
        iqarLabel: iqarInfo.label,
        unit: station.unit,
        parameters,
        trend,
      })
    }

    return result
  },

  async createStation(data: {
    name: string
    code?: string
    lat: number
    lng: number
    unit: string
    status?: string
  }): Promise<{ id: string; code: string }> {
    let code = data.code
    if (!code) {
      const { data: codes } = await supabase.from('stations').select('code').order('code')
      const nums = (codes ?? [])
        .map((r) => parseInt(String(r.code).replace(/^#/, ''), 10))
        .filter((n) => !isNaN(n))
      const max = nums.length ? Math.max(...nums) : 0
      code = `#${max + 1}`
    }
    const statusDb = mapStatusUiToDb(data.status ?? 'Ativa')
    const { data: network } = await supabase.from('networks').select('id').limit(1).maybeSingle()
    const { data: row, error } = await supabase
      .from('stations')
      .insert({
        name: data.name,
        code,
        lat: data.lat,
        lng: data.lng,
        unit: data.unit,
        status: statusDb,
        network_id: network?.id ?? null,
      })
      .select('id, code')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create station')
    return { id: row.id, code }
  },

  async updateStation(
    id: string,
    data: { name?: string; lat?: number; lng?: number; status?: string }
  ): Promise<void> {
    const updates: Record<string, unknown> = {}
    if (data.name != null) updates.name = data.name
    if (data.lat != null) updates.lat = data.lat
    if (data.lng != null) updates.lng = data.lng
    if (data.status != null) updates.status = mapStatusUiToDb(data.status)
    if (Object.keys(updates).length === 0) return
    const { error } = await supabase.from('stations').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deleteStation(id: string): Promise<void> {
    const { error } = await supabase.from('stations').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async getSensorsByStationId(stationId: string): Promise<Array<{
    id: string
    parameter: string
    brand: string
    model: string
    serial: string
    status: string
  }>> {
    const { data } = await supabase
      .from('sensors')
      .select('id, parameter, brand, model, serial, status')
      .eq('station_id', stationId)
      .order('parameter')
    return (data ?? []).map((r) => ({
      id: r.id,
      parameter: r.parameter ?? '',
      brand: r.brand ?? '',
      model: r.model ?? '',
      serial: r.serial ?? '',
      status: r.status ?? 'active',
    }))
  },

  async createSensor(
    stationId: string,
    data: { parameter: string; brand?: string; model?: string; serial?: string }
  ): Promise<{ id: string }> {
    const paramDb = mapParameterUiToDb(data.parameter)
    const { data: row, error } = await supabase
      .from('sensors')
      .insert({
        station_id: stationId,
        parameter: paramDb,
        name: data.parameter,
        brand: data.brand ?? 'N/A',
        model: data.model ?? 'N/A',
        serial: data.serial ?? '',
        status: 'active',
      })
      .select('id')
      .single()
    if (error || !row) throw new Error(error?.message ?? 'Failed to create sensor')
    return { id: row.id }
  },

  async updateSensor(
    id: string,
    data: { parameter?: string; brand?: string; model?: string; serial?: string }
  ): Promise<void> {
    const updates: Record<string, unknown> = {}
    if (data.parameter != null) updates.parameter = mapParameterUiToDb(data.parameter)
    if (data.parameter != null) updates.name = data.parameter
    if (data.brand != null) updates.brand = data.brand
    if (data.model != null) updates.model = data.model
    if (data.serial != null) updates.serial = data.serial
    if (Object.keys(updates).length === 0) return
    const { error } = await supabase.from('sensors').update(updates).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async deleteSensor(id: string): Promise<void> {
    const { error } = await supabase.from('sensors').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

function mapStatusUiToDb(ui: string): string {
  const m: Record<string, string> = { Ativa: 'active', Manutenção: 'maintenance', Inativa: 'inactive' }
  return m[ui] ?? 'active'
}

function mapParameterUiToDb(ui: string): string {
  const m: Record<string, string> = {
    'O₃': 'O3',
    'MP₁₀': 'MP10',
    'MP₂.₅': 'MP2.5',
    'SO₂': 'SO2',
    O3: 'O3',
    MP10: 'MP10',
    'MP2.5': 'MP2.5',
    SO2: 'SO2',
    NOx: 'NOx',
    CO: 'CO',
    HCT: 'HCT',
    BTEX: 'BTEX',
  }
  if (m[ui]) return m[ui]
  return ui.replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3').replace(/₅/g, '5')
}
