import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/context/AuthContext'
import { stationsService } from '@/services/stationsService'

export function useDataSegregation() {
  const { user } = useAuth()
  const userUnit = user?.unit ?? ''
  const [stationsByUnit, setStationsByUnit] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!userUnit) return
    stationsService.getStationsByUnit(userUnit).then((stations) => {
      setStationsByUnit((prev) => ({ ...prev, [userUnit]: stations }))
    })
  }, [userUnit])

  const getAccessibleStations = useCallback((): string[] => {
    return stationsByUnit[userUnit] ?? []
  }, [userUnit, stationsByUnit])

  const canAccessStation = useCallback(
    (stationName: string): boolean => {
      return (stationsByUnit[userUnit] ?? []).includes(stationName)
    },
    [userUnit, stationsByUnit]
  )

  const getDefaultStation = useCallback((): string => {
    const stations = stationsByUnit[userUnit] ?? []
    return stations[0] ?? ''
  }, [userUnit, stationsByUnit])

  const filterStations = useCallback(
    (stations: string[]): string[] => {
      const accessible = stationsByUnit[userUnit] ?? []
      return stations.filter((s) => accessible.includes(s))
    },
    [userUnit, stationsByUnit]
  )

  const getAccessibleUnits = useCallback((): string[] => {
    return userUnit ? [userUnit] : []
  }, [userUnit])

  return {
    userUnit,
    getAccessibleStations,
    canAccessStation,
    getDefaultStation,
    filterStations,
    getAccessibleUnits,
    isLoading: userUnit !== '' && !stationsByUnit[userUnit],
  }
}
