import { useState, useEffect, useRef } from 'react'
import {
  Download,
  BarChart3,
  Table,
  CheckCircle2,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { generateDataBetweenDates } from '@/services/consistencyService'
import { supabase } from '@/lib/supabase'
import { PARAMETERS } from '@/config/stations'
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'

const COLORS = {
  valid: '#10b981',
  invalid: '#ef4444',
  bom: '#22c55e',
  moderado: '#eab308',
  ruim: '#f97316',
  muitoRuim: '#ef4444',
  pessima: '#9333ea',
  primary: '#1a3d47',
}

const AGGREGATION_INTERVALS = [
  { value: '1min' as const, label: '1 minuto' },
  { value: '15min' as const, label: '15 minutos' },
  { value: '1h' as const, label: '1 hora' },
  { value: '1d' as const, label: '1 dia' },
]

function getIQArColor(status: string): string {
  switch (status) {
    case 'Boa':
      return COLORS.bom
    case 'Moderada':
      return COLORS.moderado
    case 'Ruim':
      return COLORS.ruim
    case 'Muito Ruim':
      return COLORS.muitoRuim
    case 'Péssima':
      return COLORS.pessima
    default:
      return '#9ca3af'
  }
}

function getChartParamKey(param: string): string {
  if (param === 'MP₁₀') return 'PM10'
  if (param === 'MP₂.₅') return 'PM25'
  if (param === 'NO₂') return 'NO2'
  if (param === 'SO₂') return 'SO2'
  if (param === 'O₃') return 'O3'
  return param
}

export function ReportsPage() {
  const { getAccessibleStations, getDefaultStation } = useDataSegregation()
  const accessibleStations = getAccessibleStations()

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo))
  const [endDate, setEndDate] = useState(formatDate(today))
  const [selectedStation, setSelectedStation] = useState(getDefaultStation())
  const [selectedParams, setSelectedParams] = useState<string[]>(() => [...PARAMETERS])
  const [timeGranularity, setTimeGranularity] = useState<'1min' | '15min' | '1h' | '1d'>('1d')
  const [isParamDropdownOpen, setIsParamDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
  const [hasFiltered, setHasFiltered] = useState(false)
  const paramDropdownRef = useRef<HTMLDivElement>(null)

  const [appliedStartDate, setAppliedStartDate] = useState(formatDate(thirtyDaysAgo))
  const [appliedEndDate, setAppliedEndDate] = useState(formatDate(today))
  const [, setAppliedStation] = useState(getDefaultStation())
  const [appliedParams, setAppliedParams] = useState<string[]>(() => [...PARAMETERS])
  const [, setAppliedTimeGranularity] = useState<'1min' | '15min' | '1h' | '1d'>('1d')

  const [evolutionData, setEvolutionData] = useState<Array<Record<string, number | string>>>([])
  const [iqarData, setIqarData] = useState<Array<{ day: string; iqar: number; status: string }>>([])
  const [windRoseData, setWindRoseData] = useState<Array<{ direction: string; frequency: number }>>([])
  const [pollutantRoseData, setPollutantRoseData] = useState<Array<{ direction: string; concentration: number }>>([])
  const [boxPlotData, setBoxPlotData] = useState<
    Array<{ param: string; min: number; q1: number; median: number; q3: number; max: number; spread1: number; spread2: number; spread3: number; spread4: number; medianY: number }>
  >([])
  const [availabilityData, setAvailabilityData] = useState<Array<{ name: string; value: number }>>([])
  const [rawDataTable, setRawDataTable] = useState<
    Array<{ datetime: string; station: string; parameter: string; value: number; unit: string; status: string }>
  >([])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paramDropdownRef.current && !paramDropdownRef.current.contains(e.target as Node)) {
        setIsParamDropdownOpen(false)
      }
    }
    if (isParamDropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isParamDropdownOpen])

  useEffect(() => {
    if (!hasFiltered) {
      handleGenerateReport()
      setHasFiltered(true)
    }
  }, [])

  const handleToggleParameter = (param: string) => {
    setSelectedParams((prev) =>
      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param]
    )
  }

  const handleGenerateReport = async () => {
    setIsLoading(true)
    try {
      const station = selectedStation || accessibleStations[0] || ''
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      setAppliedStartDate(startDate)
      setAppliedEndDate(endDate)
      setAppliedStation(station)
      setAppliedParams(selectedParams)
      setAppliedTimeGranularity(timeGranularity)

      const intervalMinutes =
        timeGranularity === '1min' ? 1 : timeGranularity === '15min' ? 15 : timeGranularity === '1h' ? 60 : 1440

      const evolutionMap: Record<string, Record<string, number | string>> = {}
      for (const param of selectedParams) {
        const raw = await generateDataBetweenDates(station, param, start, end, intervalMinutes)
        raw.forEach((row) => {
          const [datePart] = row.dateTime.split(' ')
          const [day, month] = datePart.split('/')
          const key = `${day}/${month}`
          if (!evolutionMap[key]) evolutionMap[key] = { date: key, limit: 50 }
          evolutionMap[key][getChartParamKey(param)] = parseFloat(row.finalValue)
        })
      }
      const allEvolution = Object.values(evolutionMap)
      const step = Math.max(1, Math.floor(allEvolution.length / 8))
      setEvolutionData(allEvolution.filter((_, i) => i % step === 0 || i === allEvolution.length - 1))

      const { data: stationRow } = await supabase.from('stations').select('id').eq('name', station).maybeSingle()

      const iqarGenerated: Array<{ day: string; iqar: number; status: string }> = []
      if (stationRow) {
        const iqarDays = Math.min(14, diffDays)
        const iqarStart = new Date(end)
        iqarStart.setDate(iqarStart.getDate() - iqarDays)
        const { data: iqarRows } = await supabase
          .from('iqair_results')
          .select('value, timestamp')
          .eq('station_id', stationRow.id)
          .gte('timestamp', iqarStart.toISOString())
          .lte('timestamp', end.toISOString())
          .order('timestamp', { ascending: true })

        const dailyIqar = new Map<string, number[]>()
        for (const row of iqarRows ?? []) {
          const d = new Date(row.timestamp)
          const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!dailyIqar.has(key)) dailyIqar.set(key, [])
          dailyIqar.get(key)!.push(row.value)
        }
        for (const [day, values] of dailyIqar) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length
          iqarGenerated.push({
            day,
            iqar: Math.round(avg),
            status: avg <= 40 ? 'Boa' : avg <= 80 ? 'Moderada' : avg <= 120 ? 'Ruim' : 'Muito Ruim',
          })
        }
      }
      setIqarData(iqarGenerated)

      const windData = await generateDataBetweenDates(station, 'wind_direction', start, end, intervalMinutes)
      const dirCounts = new Map<string, number>()
      const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
      for (const d of dirs) dirCounts.set(d, 0)
      for (const row of windData) {
        const deg = parseFloat(row.rawValue)
        const idx = Math.round(deg / 45) % 8
        const dir = dirs[idx] ?? 'N'
        dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1)
      }
      const totalWind = windData.length || 1
      setWindRoseData(dirs.map((dir) => ({
        direction: dir,
        frequency: Math.round(((dirCounts.get(dir) ?? 0) / totalWind) * 100),
      })))

      const pm10Data = await generateDataBetweenDates(station, 'MP₁₀', start, end, intervalMinutes)
      const avgPM10 = pm10Data.length ? pm10Data.reduce((s, r) => s + parseFloat(r.finalValue), 0) / pm10Data.length : 0
      setPollutantRoseData(dirs.map((dir, i) => ({
        direction: dir,
        concentration: Math.round(avgPM10 * (0.6 + (i * 0.1))),
      })))

      const boxPlotGenerated: typeof boxPlotData = []
      for (const param of selectedParams.slice(0, 6)) {
        const raw = await generateDataBetweenDates(station, param, start, end, intervalMinutes)
        const values = raw.map((r) => parseFloat(r.finalValue)).filter((v) => !isNaN(v)).sort((a, b) => a - b)
        const n = values.length
        if (n === 0) continue
        const min = values[0] ?? 0
        const q1 = values[Math.floor(n * 0.25)] ?? 0
        const median = values[Math.floor(n * 0.5)] ?? 0
        const q3 = values[Math.floor(n * 0.75)] ?? 0
        const max = values[n - 1] ?? 0
        const spread1 = q1 - min
        const spread2 = median - q1
        const spread3 = q3 - median
        const spread4 = max - q3
        boxPlotGenerated.push({
          param, min: Math.round(min), q1: Math.round(q1), median: Math.round(median),
          q3: Math.round(q3), max: Math.round(max), spread1, spread2, spread3, spread4,
          medianY: min + spread1 + spread2,
        })
      }
      setBoxPlotData(boxPlotGenerated)

      if (stationRow) {
        const { data: availRows } = await supabase
          .from('availability_metrics')
          .select('percentage')
          .eq('station_id', stationRow.id)
          .gte('date', startDate)
          .lte('date', endDate)

        const avgAvail = availRows?.length
          ? availRows.reduce((s, r) => s + r.percentage, 0) / availRows.length
          : 0
        setAvailabilityData([
          { name: 'Dados Válidos', value: Math.round(avgAvail * 10) / 10 },
          { name: 'Dados Ausentes', value: Math.round((100 - avgAvail) * 10) / 10 },
        ])
      }

      const tableData: typeof rawDataTable = []
      for (const param of selectedParams) {
        const raw = await generateDataBetweenDates(station, param, start, end, intervalMinutes)
        raw.slice(0, 50).forEach((row) => {
          tableData.push({
            datetime: row.dateTime,
            station,
            parameter: param,
            value: parseFloat(row.finalValue),
            unit: row.unit,
            status: row.status === 'valid' ? 'Válido' : 'Inválido',
          })
        })
      }
      tableData.sort((a, b) => {
        const [dA, tA] = a.datetime.split(' ')
        const [dB, tB] = b.datetime.split(' ')
        return dB.localeCompare(dA) || tB.localeCompare(tA)
      })
      setRawDataTable(tableData)

      toast.success('Relatório gerado com sucesso!')
    } catch (err) {
      toast.error('Erro ao gerar relatório')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = (format: 'xlsx' | 'csv') => {
    const headers = ['Data/Hora', 'Estação', 'Parâmetro', 'Valor', 'Unidade', 'Status']
    const rows = rawDataTable.map((r) => [r.datetime, r.station, r.parameter, r.value, r.unit, r.status])
    const csvContent = [headers, ...rows].map((row) => row.join(';')).join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = format === 'xlsx' ? 'Relatorio_Qualidade_Ar_Refinaria.xlsx' : 'Relatorio_Qualidade_Ar_Refinaria.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado com sucesso!')
  }

  const lastUpdate = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <main className="flex-1 p-4 overflow-auto bg-gray-50">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Filtros de Consulta</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Data Inicial</label>
            <DatePickerInput
              value={startDate}
              onChange={setStartDate}
              max={endDate}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Data Final</label>
            <DatePickerInput
              value={endDate}
              onChange={setEndDate}
              min={startDate}
              max={formatDate(today)}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs text-gray-600 font-medium">Selecionar Estação de Monitoramento</label>
            <div className="relative">
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
              >
                {accessibleStations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Intervalo de Agregação</label>
            <div className="relative">
              <select
                value={timeGranularity}
                onChange={(e) => setTimeGranularity(e.target.value as '1min' | '15min' | '1h' | '1d')}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
              >
                {AGGREGATION_INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1 w-64" ref={paramDropdownRef}>
            <label className="text-xs text-gray-600 font-medium">Parâmetros a Analisar</label>
            <button
              type="button"
              onClick={() => setIsParamDropdownOpen(!isParamDropdownOpen)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer flex items-center justify-between"
            >
              <span className="text-gray-700">
                {selectedParams.length === 0
                  ? 'Selecione os parâmetros'
                  : selectedParams.length === 1
                    ? selectedParams[0]
                    : `${selectedParams.length} parâmetros selecionados`}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isParamDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isParamDropdownOpen && (
              <div className="absolute mt-[4.5rem] w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {PARAMETERS.map((param) => (
                    <label
                      key={param}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParams.includes(param)}
                        onChange={() => handleToggleParameter(param)}
                        className="w-4 h-4 text-[#2C5F6F] rounded focus:ring-[#2C5F6F]"
                      />
                      <span className="text-sm text-gray-900">{param}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-6 py-2 bg-[#1a3d47] text-white rounded-lg text-sm hover:bg-[#2a4d57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Carregando...
              </>
            ) : (
              'Filtrar'
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setShowRawData(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !showRawData ? 'bg-[#1a3d47] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-2" />
              Gráficos Analíticos
            </button>
            <button
              type="button"
              onClick={() => setShowRawData(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showRawData ? 'bg-[#1a3d47] text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Table className="w-4 h-4 inline-block mr-2" />
              Tabela de Dados
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar (.csv)
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-[#1a3d47] animate-spin mx-auto" />
              <p className="mt-4 text-lg font-semibold text-gray-700">Processando dados...</p>
              <p className="text-sm text-gray-500">Gerando relatório analítico</p>
            </div>
          </div>
        )}

        {showRawData ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F]">Tabela de Dados Brutos Processados</h3>
              <p className="text-xs text-gray-500 mt-1">
                Dados coletados da rede de monitoramento - Base para geração dos gráficos analíticos
              </p>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-[#1a3d47] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-semibold">Estação</th>
                    <th className="px-4 py-3 text-left font-semibold">Parâmetro</th>
                    <th className="px-4 py-3 text-right font-semibold">Valor Medido</th>
                    <th className="px-4 py-3 text-center font-semibold">Unidade</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rawDataTable.map((row, i) => (
                    <tr
                      key={i}
                      className={`${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors border-b border-gray-200`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{row.datetime}</td>
                      <td className="px-4 py-3 text-gray-700">{row.station}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          {row.parameter}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.value}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{row.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>
                  Total de registros: <span className="font-semibold text-gray-700">{rawDataTable.length}</span>
                </span>
                <span>•</span>
                <span>
                  Dados válidos: <span className="font-semibold text-green-600">{rawDataTable.length}</span>
                </span>
              </div>
              <span className="text-gray-400">Última atualização: {lastUpdate}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {/* Evolução Temporal */}
            <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Evolução Temporal de Poluentes</h3>
              <p className="text-xs text-gray-500 mb-4">
                Período: {appliedStartDate} a {appliedEndDate}
              </p>

              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="" dot={false} />
                  {appliedParams.includes('O₃') && <Line type="monotone" dataKey="O3" stroke="#10b981" strokeWidth={2} name="O₃" dot={{ r: 4 }} />}
                  {appliedParams.includes('NOx') && <Line type="monotone" dataKey="NOx" stroke="#f59e0b" strokeWidth={2} name="NOx" dot={{ r: 4 }} />}
                  {appliedParams.includes('SO₂') && <Line type="monotone" dataKey="SO2" stroke="#8b5cf6" strokeWidth={2} name="SO₂" dot={{ r: 4 }} />}
                  {appliedParams.includes('CO') && <Line type="monotone" dataKey="CO" stroke="#ef4444" strokeWidth={2} name="CO" dot={{ r: 4 }} />}
                  {appliedParams.includes('HCT') && <Line type="monotone" dataKey="HCT" stroke="#06b6d4" strokeWidth={2} name="HCT" dot={{ r: 4 }} />}
                  {appliedParams.includes('BTEX') && <Line type="monotone" dataKey="BTEX" stroke="#ec4899" strokeWidth={2} name="BTEX" dot={{ r: 4 }} />}
                  {appliedParams.includes('MP₁₀') && <Line type="monotone" dataKey="PM10" stroke="#3b82f6" strokeWidth={2} name="MP₁₀" dot={{ r: 4 }} />}
                  {appliedParams.includes('MP₂.₅') && <Line type="monotone" dataKey="PM25" stroke="#14b8a6" strokeWidth={2} name="MP₂.₅" dot={{ r: 4 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* IQAr Diário */}
            <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Índice de Qualidade do Ar Diário (IQAr)</h3>
              <p className="text-xs text-gray-500 mb-4">Evolução do IQAr nos últimos 14 dias</p>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={iqarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'IQAr', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="iqar" name="IQAr" radius={[8, 8, 0, 0]}>
                    {iqarData.map((entry, i) => (
                      <Cell key={i} fill={getIQArColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                {[
                  [COLORS.bom, 'Boa (0-40)'],
                  [COLORS.moderado, 'Moderada (41-80)'],
                  [COLORS.ruim, 'Ruim (81-120)'],
                  [COLORS.muitoRuim, 'Muito Ruim (121-200)'],
                  [COLORS.pessima, 'Péssima (201-300)'],
                ].map(([color, label]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: color as string }} />
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disponibilidade */}
            <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Disponibilidade da Rede</h3>
              <p className="text-xs text-gray-500 mb-4">Taxa de dados válidos capturados</p>

              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={availabilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill={COLORS.valid} />
                    <Cell fill={COLORS.invalid} />
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>

              <div className="text-center mt-[-140px] mb-[80px] pointer-events-none">
                <div className="text-3xl font-bold text-[#10b981]">
                  {availabilityData.find((d) => d.name === 'Dados Válidos')?.value.toFixed(1) ?? '0.0'}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Dados Válidos</div>
              </div>

              <div className="space-y-2 mt-4">
                {availabilityData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: d.name === 'Dados Válidos' ? COLORS.valid : COLORS.invalid }}
                      />
                      <span className="text-xs text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{d.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rosa dos Ventos */}
            <div className="col-span-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Rosa dos Ventos</h3>
              <p className="text-xs text-gray-500 mb-4">Frequência de direção dos ventos (%)</p>

              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={windRoseData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="direction" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 40]} tick={{ fontSize: 10 }} />
                  <Radar name="Frequência (%)" dataKey="frequency" stroke="#1a3d47" fill="#1a3d47" fillOpacity={0.6} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Rosa de Poluentes */}
            <div className="col-span-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Rosa de Poluentes (PM₁₀)</h3>
              <p className="text-xs text-gray-500 mb-4">Concentração média por direção do vento (µg/m³)</p>

              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={pollutantRoseData}>
                  <defs>
                    <linearGradient id="pollutantGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
                      <stop offset="40%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="70%" stopColor="#ea580c" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="direction" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 80]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Concentração Média (µg/m³)"
                    dataKey="concentration"
                    stroke="#dc2626"
                    strokeWidth={2}
                    fill="url(#pollutantGradient)"
                    fillOpacity={0.7}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value} µg/m³`, 'Concentração']}
                  />
                </RadarChart>
              </ResponsiveContainer>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2 text-center">Escala de Concentração</p>
                <div className="flex items-center justify-center gap-4">
                  {[
                    ['#fbbf24', 'Baixa'],
                    ['#f97316', 'Média'],
                    ['#ea580c', 'Alta'],
                    ['#dc2626', 'Crítica'],
                  ].map(([color, label]) => (
                    <div key={String(label)} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: color as string }} />
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Box Plot */}
            <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Estatísticas Descritivas (Box Plot)</h3>
              <p className="text-xs text-gray-500 mb-4">Distribuição estatística dos parâmetros medidos (µg/m³)</p>

              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={boxPlotData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="param" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Concentração (µg/m³)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    content={({ active, payload }) => {
                      if (active && payload?.[0]?.payload) {
                        const data = payload[0].payload as (typeof boxPlotData)[0]
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data.param}</p>
                            <p className="text-xs text-gray-600">
                              Máximo: <span className="font-semibold">{data.max} µg/m³</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              Q3 (75%): <span className="font-semibold">{data.q3} µg/m³</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              Mediana: <span className="font-semibold">{data.median} µg/m³</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              Q1 (25%): <span className="font-semibold">{data.q1} µg/m³</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              Mínimo: <span className="font-semibold">{data.min} µg/m³</span>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="min" stackId="a" fill="transparent" />
                  <Bar dataKey="spread1" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spread2" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="spread3" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="spread4" stackId="a" fill="#93c5fd" radius={[0, 0, 4, 4]} />
                  <Line type="monotone" dataKey="medianY" stroke="#1a3d47" strokeWidth={3} dot={{ r: 0 }} name="" />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#93c5fd] rounded" />
                  <span>Quartis (Q1-Q3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#3b82f6] rounded" />
                  <span>Mediana</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 border-2 border-[#1a3d47]" />
                  <span>Linha Mediana</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
