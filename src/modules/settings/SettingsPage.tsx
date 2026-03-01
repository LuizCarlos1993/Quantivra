import { useState } from 'react'
import { Settings, Save, Database, Clock, Wifi, ChevronDown } from 'lucide-react'
import { TimePickerInput } from '@/components/TimePickerInput'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { toast } from 'sonner'

export function SettingsPage() {
  const { getAccessibleStations } = useDataSegregation()
  const accessibleStations = getAccessibleStations()
  const [selectedStation, setSelectedStation] = useState(accessibleStations[0] ?? '')
  const [scanFrequency, setScanFrequency] = useState('1 minuto')
  const [inputProtocol, setInputProtocol] = useState('FTPS')
  const [autoValidation, setAutoValidation] = useState(true)
  const [dataRetention, setDataRetention] = useState('1825')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [anomalyLimit, setAnomalyLimit] = useState(5)
  const [syncTime, setSyncTime] = useState('03:00')

  const handleSaveSettings = () => {
    toast.success('Configurações salvas com sucesso!', { duration: 3000 })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a3d47] rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#1a3d47]">Configurações da Estação</h1>
            <p className="text-sm text-gray-600">Gerencie parâmetros de aquisição e processamento de dados</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Estação Selecionada</h3>
        <div className="relative max-w-md">
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
          >
            {accessibleStations.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-[#2C5F6F]">Parâmetros de Aquisição</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Frequência de Varredura</label>
              <div className="relative">
                <select
                  value={scanFrequency}
                  onChange={(e) => setScanFrequency(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="30 segundos">30 segundos</option>
                  <option value="1 minuto">1 minuto</option>
                  <option value="5 minutos">5 minutos</option>
                  <option value="10 minutos">10 minutos</option>
                  <option value="15 minutos">15 minutos</option>
                  <option value="30 minutos">30 minutos</option>
                  <option value="1 hora">1 hora</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                <Clock className="w-3 h-3 inline mr-1" />
                Intervalo de tempo entre cada coleta de dados dos sensores
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Protocolo de Entrada</label>
              <div className="relative">
                <select
                  value={inputProtocol}
                  onChange={(e) => setInputProtocol(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="FTP">FTP (File Transfer Protocol)</option>
                  <option value="FTPS">FTPS (FTP Secure - SSL/TLS)</option>
                  <option value="Azure">Azure Blob Storage</option>
                  <option value="SFTP">SFTP (SSH File Transfer Protocol)</option>
                  <option value="S3">Amazon S3</option>
                  <option value="WebService">Web Service REST API</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                <Wifi className="w-3 h-3 inline mr-1" />
                Método de recepção dos dados brutos das estações remotas
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Horário de Sincronização</label>
              <TimePickerInput
                value={syncTime}
                onChange={setSyncTime}
                buttonClassName="py-2.5"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Horário diário para sincronização e processamento em lote
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold text-[#2C5F6F]">Processamento de Dados</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-xs font-medium text-gray-700">Validação Automática</p>
                  <p className="text-xs text-gray-500 mt-0.5">Aplicar regras de validação automaticamente</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoValidation}
                    onChange={(e) => setAutoValidation(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#2C5F6F] transition-colors peer-focus:ring-2 peer-focus:ring-[#2C5F6F] peer-focus:ring-offset-2" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Período de Retenção de Dados Brutos
              </label>
              <div className="relative">
                <select
                  value={dataRetention}
                  onChange={(e) => setDataRetention(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="90">90 dias</option>
                  <option value="180">180 dias</option>
                  <option value="365">365 dias (1 ano)</option>
                  <option value="730">730 dias (2 anos)</option>
                  <option value="1825">1825 dias (5 anos)</option>
                  <option value="-1">Indefinido</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Tempo de armazenamento dos dados antes do arquivamento</p>
            </div>
            <div>
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-xs font-medium text-gray-700">Notificações de Alerta</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enviar alertas sobre anomalias detectadas</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-[#2C5F6F] transition-colors peer-focus:ring-2 peer-focus:ring-[#2C5F6F] peer-focus:ring-offset-2" />
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Limite para Alerta de Anomalia</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={anomalyLimit}
                  onChange={(e) => setAnomalyLimit(Math.min(100, Math.max(1, Number(e.target.value))))}
                  min={1}
                  max={100}
                  className="w-20 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all"
                />
                <span className="text-xs text-gray-600">anomalias consecutivas</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">Número de leituras suspeitas antes de gerar alerta</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-[#2C5F6F] mb-4">Informações do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Versão do Sistema</p>
            <p className="text-sm font-semibold text-[#1a3d47]">Quantivra v2.4.1</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Última Sincronização</p>
            <p className="text-sm font-semibold text-[#1a3d47]">
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} 03:00
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Status da Conexão</p>
            <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Conectado
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSaveSettings}
          className="px-6 py-2.5 bg-[#1a3d47] text-white rounded-lg text-sm font-medium hover:bg-[#2a4d57] transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
