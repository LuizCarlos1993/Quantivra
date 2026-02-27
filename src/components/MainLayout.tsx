import { useState, useCallback, useEffect } from 'react'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { PARAM_KEY_TO_DISPLAY } from '@/config/stations'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/modules/auth/context/AuthContext'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { ConsistencyPage } from '@/modules/consistency/ConsistencyPage'
import { MapPage } from '@/modules/map/MapPage'
import { ReportsPage } from '@/modules/reports/ReportsPage'
import { UsersPage } from '@/modules/users/UsersPage'
import { SettingsPage } from '@/modules/settings/SettingsPage'

const PAGE_HEADERS: Record<
  string,
  { title: string; subtitle: string }
> = {
  dashboard: {
    title: 'Painel de Monitoramento em Tempo Real',
    subtitle: 'Gestão de Qualidade do Ar',
  },
  consistency: {
    title: 'Consistência e Validação de Dados',
    subtitle: 'Análise e Validação de Medições',
  },
  map: {
    title: 'Mapa de Monitoramento Georreferenciado',
    subtitle: 'Visualização Espacial das Estações',
  },
  reports: {
    title: 'Relatórios',
    subtitle: 'Geração e Exportação de Relatórios',
  },
  users: {
    title: 'Gestão de Usuários e Acessos',
    subtitle: 'Controle de Permissões e Segregação por Unidade',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Configurações do Sistema',
  },
}

export function MainLayout() {
  const { user } = useAuth()
  const { getDefaultStation } = useDataSegregation()
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard')
  const [selectedStation, setSelectedStation] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [consistencyFilters, setConsistencyFilters] = useState<{
    station?: string
    parameter?: string
    initialTab?: 'explorer' | 'pending'
    triggerTimestamp?: number
  }>({})
  const hasAccess = useCallback(
    (menuItem: string) => {
      if (menuItem === 'users' || menuItem === 'settings') {
        return user?.profile === 'Administrador'
      }
      return true
    },
    [user?.profile]
  )

  useEffect(() => {
    if (!hasAccess(activeMenuItem)) {
      setActiveMenuItem('dashboard')
    }
  }, [activeMenuItem, hasAccess])

  const effectiveMenuItem = !hasAccess(activeMenuItem) ? 'dashboard' : activeMenuItem
  const currentHeader = PAGE_HEADERS[effectiveMenuItem] ?? PAGE_HEADERS.dashboard

  const handleAlertClick = useCallback((station: string, parameter: string) => {
    const displayParam = PARAM_KEY_TO_DISPLAY[parameter] ?? parameter
    setActiveMenuItem('consistency')
    setConsistencyFilters({
      station,
      parameter: displayParam,
      initialTab: 'pending',
      triggerTimestamp: Date.now(),
    })
  }, [])

  const handleNavigateToConsistency = useCallback((stationName: string) => {
    setActiveMenuItem('consistency')
    setConsistencyFilters({
      station: stationName,
      initialTab: 'pending',
      triggerTimestamp: Date.now(),
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Sidebar activeItem={effectiveMenuItem} onItemClick={setActiveMenuItem} />

      <div className="flex-1 flex flex-col relative z-0 h-screen overflow-hidden">
        <div className="page-transition">
          <Header
            title={currentHeader.title}
            subtitle={currentHeader.subtitle}
            onAlertClick={handleAlertClick}
          />
        </div>

        {effectiveMenuItem === 'dashboard' && (
          <div className="page-transition relative z-0 overflow-auto">
            <DashboardPage
              selectedStation={selectedStation || getDefaultStation()}
              onStationChange={setSelectedStation}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>
        )}

        {effectiveMenuItem === 'consistency' && (
          <div className="page-transition overflow-auto">
            <ConsistencyPage
              initialStation={consistencyFilters.station}
              initialParameter={consistencyFilters.parameter}
              initialTab={consistencyFilters.initialTab}
              triggerTimestamp={consistencyFilters.triggerTimestamp}
            />
          </div>
        )}

        {effectiveMenuItem === 'map' && (
          <div className="page-transition flex-1 flex flex-col overflow-hidden">
            <MapPage onNavigateToConsistency={handleNavigateToConsistency} />
          </div>
        )}

        {effectiveMenuItem === 'reports' && (
          <div className="page-transition overflow-auto">
            <ReportsPage />
          </div>
        )}

        {effectiveMenuItem === 'settings' && (
          <main className="flex-1 p-4 overflow-auto">
            <SettingsPage />
          </main>
        )}

        {effectiveMenuItem === 'users' && (
          <div className="page-transition overflow-auto">
            <UsersPage />
          </div>
        )}
      </div>
    </div>
  )
}
