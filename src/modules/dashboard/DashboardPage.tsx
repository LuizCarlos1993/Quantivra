import { useEffect, useState } from 'react'
import { AirQualityCard } from '@/components/AirQualityCard'
import { WindRoseChart } from '@/components/WindRoseChart'
import { PollutantRoseChart } from '@/components/PollutantRoseChart'
import { TimelineChart } from '@/components/TimelineChart'
import { AvailabilityIndicator } from '@/components/AvailabilityIndicator'
import { SupervisoryTable } from '@/components/SupervisoryTable'
import { FilterSection } from '@/components/FilterSection'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { dashboardService } from '@/services/dashboardService'

interface DashboardPageProps {
  selectedStation: string
  onStationChange: (station: string) => void
  selectedDate: string
  onDateChange: (date: string) => void
}

export function DashboardPage({
  selectedStation,
  onStationChange,
  selectedDate,
  onDateChange,
}: DashboardPageProps) {
  const { getAccessibleStations, canAccessStation, getDefaultStation } = useDataSegregation()
  const accessibleStations = getAccessibleStations()
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboardService.getDashboardData>> | null>(null)
  const [loading, setLoading] = useState(true)

  const effectiveStation = selectedStation || getDefaultStation() || accessibleStations[0] || ''

  useEffect(() => {
    if (!canAccessStation(effectiveStation)) {
      const defaultStation = getDefaultStation()
      if (defaultStation) {
        onStationChange(defaultStation)
      }
    }
  }, [effectiveStation, canAccessStation, getDefaultStation, onStationChange])

  useEffect(() => {
    if (!effectiveStation) {
      setLoading(false)
      return
    }
    setLoading(true)
    dashboardService
      .getDashboardData(effectiveStation, selectedDate)
      .then(setData)
      .finally(() => setLoading(false))
  }, [effectiveStation, selectedDate])

  if (loading || !data) {
    return (
      <main className="flex-1 p-4 overflow-auto">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#1a3d47] border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-4 overflow-auto">
      <FilterSection
        selectedStation={effectiveStation}
        onStationChange={onStationChange}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-3">
          <AvailabilityIndicator percentage={data.availability} />
        </div>

        <div className="col-span-3">
          <AirQualityCard
            value={data.iqar.value}
            quality={data.iqar.quality}
            color={data.iqar.color}
          />
        </div>

        <div className="col-span-6 grid grid-cols-2 gap-4">
          <WindRoseChart data={data.windData} />
          <PollutantRoseChart data={data.pollutantData} />
        </div>
      </div>

      <div className="mb-4">
        <SupervisoryTable parameters={data.parameters} />
      </div>

      <div>
        <TimelineChart data={data.timelineData} />
      </div>
    </main>
  )
}
