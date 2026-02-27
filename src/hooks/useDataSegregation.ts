import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/modules/auth/context/AuthContext'
import { stationsService } from '@/services/stationsService'

export function useDataSegregation() {
  const { user } = useAuth()
  const userUnit = user?.unit ?? ''
  const [stationsByUnit, setStationsByUnit] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!user) return
    if (userUnit) {
      stationsService.getStationsByUnit(userUnit).then((stations) => {
        setStationsByUnit((prev) => ({ ...prev, [userUnit]: stations }))
      })
    } else {
      stationsService.getAllStationNames().then((names) => {
        setStationsByUnit((prev) => ({ ...prev, __all__: names }))
      })
    }
  }, [user, userUnit])

  const getAccessibleStations = useCallback((): string[] => {
    const byUnit = stationsByUnit[userUnit]
    if (byUnit?.length) return byUnit
    return stationsByUnit.__all__ ?? []
  }, [userUnit, stationsByUnit])

  const canAccessStation = useCallback(
    (stationName: string): boolean => {
      const stations = stationsByUnit[userUnit] ?? stationsByUnit.__all__ ?? []
      return stations.includes(stationName)
    },
    [userUnit, stationsByUnit]
  )

  const getDefaultStation = useCallback((): string => {
    const stations = stationsByUnit[userUnit] ?? stationsByUnit.__all__ ?? []
    return stations[0] ?? ''
  }, [userUnit, stationsByUnit])

  const filterStations = useCallback(
    (stations: string[]): string[] => {
      const accessible = stationsByUnit[userUnit] ?? stationsByUnit.__all__ ?? []
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
    isLoading: Boolean(
      (userUnit ? !stationsByUnit[userUnit] : !stationsByUnit.__all__) && user
    ),
  }
}
