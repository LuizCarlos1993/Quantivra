import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, Upload, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePermissions } from '@/hooks/usePermissions'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { toast } from 'sonner'
import {
  generateConsistencyData,
  aggregateDataByGranularity,
  type DataRow,
} from '@/services/consistencyService'
import { PARAMETERS } from '@/config/stations'

interface ConsistencyPageProps {
  initialStation?: string
  initialParameter?: string
  initialTab?: 'explorer' | 'pending'
  triggerTimestamp?: number
}

export function ConsistencyPage({
  initialStation,
  initialParameter,
  initialTab = 'explorer',
  triggerTimestamp,
}: ConsistencyPageProps) {
  const { isReadOnly } = usePermissions()
  const { getAccessibleStations } = useDataSegregation()
  const accessibleStations = getAccessibleStations()

  const [tempStation, setTempStation] = useState(initialStation || accessibleStations[0] || '')
  const [tempPeriod, setTempPeriod] = useState('Últimas 24 horas')
  const [tempParameter, setTempParameter] = useState(initialParameter || 'MP₁₀')
  const [tempInterval, setTempInterval] = useState<'1min' | '15min' | '1h' | '24h'>('1min')

  const [selectedStation, setSelectedStation] = useState(initialStation || accessibleStations[0] || '')
  const [selectedPeriod, setSelectedPeriod] = useState('Últimas 24 horas')
  const [selectedParameter, setSelectedParameter] = useState(initialParameter || 'MP₁₀')
  const [timeGranularity, setTimeGranularity] = useState<'1min' | '15min' | '1h' | '24h'>('1min')

  const [isInvalidateModalOpen, setIsInvalidateModalOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null)
  const [selectedJustification, setSelectedJustification] = useState('')
  const [activeTab, setActiveTab] = useState<'explorer' | 'pending'>(initialTab)
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<number[]>([])
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchJustification, setBatchJustification] = useState('')
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importStation, setImportStation] = useState('')
  const [importParameter, setImportParameter] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [selectedObservations, setSelectedObservations] = useState('')
  const [batchObservations, setBatchObservations] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (initialStation) setTempStation(initialStation)
    if (initialParameter) setTempParameter(initialParameter)
    if (initialStation) setSelectedStation(initialStation)
    if (initialParameter) setSelectedParameter(initialParameter)
    setActiveTab(initialTab)
  }, [initialStation, initialParameter, initialTab, triggerTimestamp])

  const handleApplyFilters = () => {
    setSelectedStation(tempStation)
    setSelectedPeriod(tempPeriod)
    setSelectedParameter(tempParameter)
    setTimeGranularity(tempInterval)
  }

  const [dataRows, setDataRows] = useState<DataRow[]>([])
  const [validatedRows, setValidatedRows] = useState<DataRow[]>([])
  useEffect(() => {
    if (!selectedStation) return
    generateConsistencyData(selectedStation, selectedParameter, selectedPeriod)
      .then((rows) => {
        setDataRows(rows)
        setValidatedRows(aggregateDataByGranularity(rows, timeGranularity))
      })
  }, [selectedStation, selectedParameter, selectedPeriod])

  useEffect(() => {
    setValidatedRows(aggregateDataByGranularity(dataRows, timeGranularity))
  }, [dataRows, timeGranularity])

  const handleConfirmInvalidation = () => {
    if (selectedRowId && selectedJustification) {
      setValidatedRows((prev) =>
        prev.map((row) =>
          row.id === selectedRowId
            ? {
                ...row,
                status: 'invalid' as const,
                justification: selectedJustification,
                operator: 'Carlos Silva (Admin)',
                finalValue: '-',
              }
            : row
        )
      )
      setIsInvalidateModalOpen(false)
      setSelectedRowId(null)
      setSelectedJustification('')
      setSelectedObservations('')
      toast.success('Dado invalidado com sucesso')
    }
  }

  const handleBatchInvalidation = () => {
    if (selectedCheckboxes.length > 0 && batchJustification) {
      setValidatedRows((prev) =>
        prev.map((row) =>
          selectedCheckboxes.includes(row.id)
            ? {
                ...row,
                status: 'invalid' as const,
                justification: batchJustification,
                operator: 'Carlos Silva (Admin)',
                finalValue: '-',
              }
            : row
        )
      )
      setIsBatchModalOpen(false)
      setSelectedCheckboxes([])
      setBatchJustification('')
      setBatchObservations('')
      toast.success('Dados invalidados em lote')
    }
  }

  const handleRevertInvalidation = (rowId: number) => {
    const original = dataRows.find((r) => r.id === rowId)
    if (original) {
      setValidatedRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...original, id: row.id } : row))
      )
      toast.success('Invalidação revertida')
    }
  }

  const validCount = validatedRows.filter((r) => r.status === 'valid').length
  const invalidCount = validatedRows.filter((r) => r.status === 'invalid').length
  const pendingCount = validatedRows.filter((r) => r.status === 'pending').length
  const totalCount = validatedRows.length

  const filteredRows = activeTab === 'pending' ? validatedRows.filter((r) => r.status === 'pending') : validatedRows
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const displayedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage)

  const chartData = useMemo(
    () =>
      aggregateDataByGranularity(dataRows, timeGranularity).map((row) => ({
        time: row.dateTime.split(' ')[1] || '00:00',
        fullDateTime: row.dateTime,
        value: row.status === 'invalid' ? null : parseFloat(row.rawValue),
        status: row.status,
      })),
    [dataRows, timeGranularity]
  )

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { status: string }; index?: number }) => {
    const { cx, cy, payload, index } = props
    if (payload?.status === 'invalid') return null
    const fill = payload?.status === 'pending' ? '#dc2626' : '#2C5F6F'
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={1} />
  }

  const JUSTIFICATION_OPTIONS = [
    'Falha de Sensor',
    'Calibração',
    'Pico não representativo',
    'Manutenção programada',
    'Interferência externa',
    'Erro de leitura',
  ]

  const intervalLabel =
    timeGranularity === '1min' ? '1 minuto' : timeGranularity === '15min' ? '15 minutos' : timeGranularity === '1h' ? '1 hora' : '24 horas'
  const intervalBadge =
    timeGranularity === '1min' ? '⚡ 1 minuto' : timeGranularity === '15min' ? '📊 15 minutos' : timeGranularity === '1h' ? '⏱️ 1 hora' : '📅 24 horas'
  const intervalHint =
    timeGranularity === '1min' ? '(alta resolução)' : timeGranularity === '15min' ? '(média por intervalo)' : timeGranularity === '1h' ? '(média horária oficial)' : '(média diária)'

  return (
    <main className="flex-1 p-4 overflow-auto">
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#2C5F6F]">Filtros de Pesquisa</h3>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar Dados (Manual)
              </button>
            )}
          </div>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs text-gray-600 font-medium">Estação de Monitoramento</label>
              <div className="relative">
                <select
                  value={tempStation}
                  onChange={(e) => setTempStation(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  {accessibleStations.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600 font-medium">Período de Análise</label>
              <div className="relative">
                <select
                  value={tempPeriod}
                  onChange={(e) => setTempPeriod(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  <option>Últimas 24 horas</option>
                  <option>Últimos 7 dias</option>
                  <option>Últimos 30 dias</option>
                  <option>Últimos 90 dias</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600 font-medium">Intervalo de Agregação</label>
              <div className="relative">
                <select
                  value={tempInterval}
                  onChange={(e) => setTempInterval(e.target.value as '1min' | '15min' | '1h' | '24h')}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="1min">1 minuto</option>
                  <option value="15min">15 minutos</option>
                  <option value="1h">1 hora</option>
                  <option value="24h">1 dia</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600 font-medium">Parâmetro</label>
              <div className="relative">
                <select
                  value={tempParameter}
                  onChange={(e) => setTempParameter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  {PARAMETERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-[#1a3d47] text-white rounded-lg text-sm hover:bg-[#2a4d57] transition-colors"
            >
              Filtrar
            </button>
          </div>
        </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-9 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2C5F6F]">
                Visualização Temporal - {selectedParameter}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Intervalo Aplicado:</span>
                <span className="px-3 py-1 bg-[#1a3d47] text-white text-xs font-semibold rounded-md border-2 border-[#1a3d47]">
                  {intervalBadge}
                </span>
                <span className="text-xs text-gray-500">{intervalHint}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 11 }} label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1a3d47' }}
                  formatter={(value: number, _n: string, props: { payload?: { status?: string } }) => {
                    const status = props?.payload?.status ?? 'valid'
                    const label = status === 'valid' ? 'Válido' : status === 'pending' ? 'Pendente' : 'Inválido'
                    return value != null ? [`${value.toFixed(1)} µg/m³ (${label})`, ''] : ['-', '']
                  }}
                  labelFormatter={(_, p: unknown[]) => (p?.[0] as { payload?: { fullDateTime?: string } })?.payload?.fullDateTime ?? ''}
                />
                <Line type="linear" dataKey="value" stroke="#2C5F6F" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] border-b-2 border-[#1a3d47]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Tabela Supervisória de Dados</h3>
                  <p className="text-xs text-gray-200 mt-0.5">Valores sincronizados com o gráfico de evolução temporal</p>
                </div>
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-md">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">
                    Exibindo {filteredRows.length} registros agregados em {intervalLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('explorer'); setSelectedCheckboxes([]) }}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'explorer' ? 'text-[#1a3d47] bg-white border-b-2 border-[#1a3d47]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'text-[#1a3d47] bg-white border-b-2 border-[#1a3d47]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}
                  >
                    Pendentes
                    {pendingCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </div>
                <div className="px-4 py-2 flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-[#1a3d47] text-white text-xs font-semibold rounded-md border-2 border-[#1a3d47] inline-flex items-center gap-1.5">
                    ★ Intervalo Aplicado: {intervalLabel}
                  </span>
                  {selectedPeriod === 'Últimas 24 horas' && timeGranularity === '1min' && (
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-md border border-green-200 inline-flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Dados brutos: {filteredRows.length} registros (1 minuto)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeTab === 'pending' && selectedCheckboxes.length > 0 && !isReadOnly && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-900 font-medium">
                    {selectedCheckboxes.length} {selectedCheckboxes.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCheckboxes([])}
                    className="text-sm text-blue-700 hover:text-blue-900 underline"
                  >
                    Limpar seleção
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
                >
                  Invalidar em Lote
                </button>
              </div>
            )}

            {activeTab === 'pending' && displayedRows.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dado pendente de invalidação</h3>
                <p className="text-sm text-gray-500">Todos os dados foram validados ou invalidados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a3d47] text-white">
                    <tr>
                      {activeTab === 'pending' && !isReadOnly && (
                        <th className="px-4 py-3 text-center text-sm w-12">
                          <input
                            type="checkbox"
                            checked={selectedCheckboxes.length === displayedRows.length && displayedRows.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCheckboxes(displayedRows.map((r) => r.id))
                              else setSelectedCheckboxes([])
                            }}
                            className="w-4 h-4 rounded"
                          />
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-sm">
                        Data/Hora
                        <span className="ml-1.5 text-xs text-gray-300">
                          ({timeGranularity === '1min' ? 'minuto' : timeGranularity === '15min' ? '15min' : timeGranularity === '1h' ? 'hora' : 'dia'})
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left text-sm">
                        Valor {timeGranularity === '1min' ? 'Bruto' : 'Médio'}
                        <span className="ml-1 text-xs text-gray-300">📊</span>
                      </th>
                      <th className="px-4 py-3 text-left text-sm">Valor Final</th>
                      <th className="px-4 py-3 text-left text-sm">Unidade</th>
                      <th className="px-4 py-3 text-left text-sm">Status</th>
                      <th className="px-4 py-3 text-left text-sm">Justificativa</th>
                      <th className="px-4 py-3 text-left text-sm">Operador</th>
                      {!isReadOnly && <th className="px-4 py-3 text-center text-sm">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-gray-50 ${row.status === 'pending' ? 'bg-red-50 border-l-4 border-red-500' : row.status === 'invalid' ? 'bg-gray-100' : ''}`}
                      >
                        {activeTab === 'pending' && !isReadOnly && (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCheckboxes.includes(row.id)}
                              onChange={() => {
                                if (selectedCheckboxes.includes(row.id)) setSelectedCheckboxes((p) => p.filter((id) => id !== row.id))
                                else setSelectedCheckboxes((p) => [...p, row.id])
                              }}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm">
                          <span className="text-gray-700">{row.dateTime}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={row.rawValue === '999.9' && row.status === 'pending' ? 'text-red-600 font-semibold' : 'text-gray-900 font-medium'}>
                              {row.rawValue}
                            </span>
                            <span className="text-xs text-blue-500" title="Valor sincronizado com o gráfico">🔗</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.status === 'invalid' ? (
                            <span className="text-gray-400 line-through">{row.finalValue}</span>
                          ) : (
                            <span className={row.status === 'pending' ? 'font-semibold text-red-700' : 'text-gray-900'}>
                              {row.finalValue}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.unit}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              row.status === 'valid' ? 'bg-green-100 text-green-800' : row.status === 'pending' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {row.status === 'valid' ? 'Válido' : row.status === 'pending' ? 'Pendente' : 'Inválido'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{row.justification}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{row.operator}</td>
                        {!isReadOnly && (
                          <td className="px-4 py-3 text-center">
                            {row.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedRowId(row.id); setSelectedJustification(''); setSelectedObservations(''); setIsInvalidateModalOpen(true) }}
                                className="px-3 py-1 text-xs font-medium rounded transition-colors bg-red-500 text-white hover:bg-red-600"
                              >
                                Invalidar
                              </button>
                            )}
                            {row.status === 'valid' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedRowId(row.id); setSelectedJustification(''); setSelectedObservations(''); setIsInvalidateModalOpen(true) }}
                                className="px-3 py-1 text-xs font-medium rounded transition-colors bg-amber-500 text-white hover:bg-amber-600"
                              >
                                Invalidar
                              </button>
                            )}
                            {row.status === 'invalid' && (
                              <button
                                type="button"
                                onClick={() => handleRevertInvalidation(row.id)}
                                className="px-3 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600"
                              >
                                Reverter
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-gray-50 border-t border-gray-200">
              <div className="px-4 py-2.5 flex items-center justify-between text-xs border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Exibindo <strong className="font-semibold text-gray-800">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRows.length)}</strong> de <strong className="font-semibold text-gray-800">{filteredRows.length}</strong> registros
                  </span>
                  {timeGranularity !== '1min' && (
                    <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      📊 Dados agregados a cada <strong>{timeGranularity === '15min' ? '15 minutos' : timeGranularity === '1h' ? '1 hora' : '1 dia'}</strong>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Valores sincronizados com gráfico de evolução temporal</span>
                </div>
              </div>
              {filteredRows.length > itemsPerPage && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Itens por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) pageNum = i + 1
                        else if (currentPage <= 3) pageNum = i + 1
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                        else pageNum = currentPage - 2 + i
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 text-xs font-medium rounded transition-colors ${currentPage === pageNum ? 'bg-[#1a3d47] text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'}`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
            <h3 className="text-sm text-gray-700 mb-4 pb-2 border-b border-gray-200">Resumo de Validação</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-600">Total de Dados</span>
                  <span className="text-lg text-gray-900">{totalCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#1a3d47] h-1.5 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-green-500" />
                    <span className="text-xs text-gray-600">Válidos</span>
                  </div>
                  <span className="text-lg text-green-600">{validCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${totalCount ? (validCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="size-3.5 text-red-500" />
                    <span className="text-xs text-gray-600">Inválidos</span>
                  </div>
                  <span className="text-lg text-red-600">{invalidCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${totalCount ? (invalidCount / totalCount) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Taxa de Aprovação</div>
                <div className="text-2xl text-[#1a3d47]">
                  {totalCount ? ((validCount / totalCount) * 100).toFixed(1) : '0'}%
                </div>
              </div>
              <div className="pt-2">
                <div className="text-xs text-gray-500 mb-1">Período Analisado</div>
                <div className="text-xs text-gray-700">{selectedPeriod}</div>
              </div>
              <div className="pt-2">
                <div className="text-xs text-gray-500 mb-1">Parâmetro</div>
                <div className="text-xs text-gray-900 font-medium">{selectedParameter}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isInvalidateModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw]">
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Invalidar Dado de Medição</h3>
              <p className="text-sm text-gray-200 mt-1">Selecione o motivo da invalidação</p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  Justificativa <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedJustification}
                  onChange={(e) => setSelectedJustification(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                >
                  <option value="">Selecione uma justificativa</option>
                  {JUSTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">Observações</label>
                <textarea
                  value={selectedObservations}
                  onChange={(e) => setSelectedObservations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  rows={3}
                  placeholder="Opcional: adicione observações adicionais sobre a invalidação"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Atenção</p>
                    <p className="text-xs">
                      Esta ação marcará o dado como inválido e o operador será registrado como &quot;Carlos Silva (Admin)&quot;.
                      Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsInvalidateModalOpen(false); setSelectedRowId(null); setSelectedJustification(''); setSelectedObservations('') }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInvalidation}
                disabled={!selectedJustification}
                className={`px-4 py-2 text-sm text-white rounded-md ${selectedJustification ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Confirmar Invalidação
              </button>
            </div>
          </div>
        </div>
      )}

      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw]">
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Invalidar Dados em Lote</h3>
              <p className="text-sm text-gray-200 mt-1">Selecione o motivo da invalidação</p>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  Justificativa <span className="text-red-500">*</span>
                </label>
                <select
                  value={batchJustification}
                  onChange={(e) => setBatchJustification(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                >
                  <option value="">Selecione uma justificativa</option>
                  {JUSTIFICATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">Observações</label>
                <textarea
                  value={batchObservations}
                  onChange={(e) => setBatchObservations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  rows={3}
                  placeholder="Opcional: adicione observações sobre a invalidação em lote"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Atenção</p>
                    <p className="text-xs">
                      Esta ação marcará os dados selecionados como inválidos e o operador será registrado como &quot;Carlos Silva (Admin)&quot;.
                      Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsBatchModalOpen(false); setSelectedCheckboxes([]); setBatchJustification(''); setBatchObservations('') }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBatchInvalidation}
                disabled={!batchJustification || selectedCheckboxes.length === 0}
                className={`px-4 py-2 text-sm text-white rounded-md ${batchJustification && selectedCheckboxes.length > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Confirmar Invalidação em Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[580px] max-w-[90vw]">
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Importação Manual de Dados (CSV)</h3>
              <p className="text-sm text-gray-200 mt-1">Upload de arquivo para preenchimento de lacunas (gaps)</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-3 font-medium">
                  Arquivo CSV/Excel <span className="text-red-500">*</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-[#1a3d47] bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const file = e.dataTransfer.files?.[0]
                    const ext = file?.name?.toLowerCase().slice(-4)
                    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv') || ext === '.xlsx' || ext === '.xls')) setSelectedFile(file)
                  }}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Remover arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="w-10 h-10 text-gray-400" />
                        <Upload className="w-10 h-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-medium">Arraste seu arquivo aqui ou clique para procurar</p>
                        <p className="text-xs text-gray-500 mt-1">Formatos aceitos: CSV, XLS, XLSX</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-blue-900">Detecção Automática de Frequência</p>
                  <p className="text-xs text-blue-700 mt-1">
                    O sistema identificará automaticamente a frequência temporal dos dados (1 min, 15 min, 1h, etc.) através da análise dos timestamps no arquivo CSV.
                  </p>
                </div>
              </div>
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">Processando arquivo...</span>
                    <span className="text-[#1a3d47] font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#1a3d47] h-2.5 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {showPreview && !isProcessing && selectedFile && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-700">Preview dos Dados (3 primeiras linhas)</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[#1a3d47] text-white">
                        <tr>
                          <th className="px-4 py-2 text-left">Data</th>
                          <th className="px-4 py-2 text-left">Hora</th>
                          <th className="px-4 py-2 text-left">Valor (µg/m³)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700">06/02/2026</td>
                            <td className="px-4 py-2 text-gray-700">{String(7 + i).padStart(2, '0')}:00</td>
                            <td className="px-4 py-2 text-gray-900 font-medium">{(42 + i * 2.5).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estação <span className="text-red-500">*</span></label>
                  <select
                    value={importStation}
                    onChange={(e) => setImportStation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  >
                    <option value="">Selecione</option>
                    {accessibleStations.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parâmetro <span className="text-red-500">*</span></label>
                  <select
                    value={importParameter}
                    onChange={(e) => setImportParameter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  >
                    <option value="">Selecione</option>
                    {PARAMETERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsImportModalOpen(false); setSelectedFile(null); setImportStation(''); setImportParameter(''); setShowPreview(false); setUploadProgress(0); setIsProcessing(false) }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedFile && importStation && importParameter) {
                    setIsProcessing(true)
                    setUploadProgress(0)
                    const interval = setInterval(() => {
                      setUploadProgress((p) => {
                        if (p >= 100) {
                          clearInterval(interval)
                          setIsProcessing(false)
                          setShowPreview(true)
                          toast.success('Importação concluída com sucesso')
                          return 100
                        }
                        return p + 10
                      })
                    }, 150)
                  } else {
                    toast.error('Preencha todos os campos')
                  }
                }}
                disabled={!selectedFile || !importStation || !importParameter || isProcessing}
                className={`px-4 py-2 text-sm text-white rounded-md ${selectedFile && importStation && importParameter && !isProcessing ? 'bg-[#1a3d47] hover:bg-[#2a4d57]' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Processar Arquivo
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}
