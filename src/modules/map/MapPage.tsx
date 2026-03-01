import { useState, useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import { MapPin, Layers, Trash2 } from 'lucide-react'
import { DatePickerInput } from '@/components/DatePickerInput'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/modules/auth/context/AuthContext'
import { stationsService, type MapStation } from '@/services/stationsService'
import { toast } from 'sonner'
import { DeleteStationModal } from './components/DeleteStationModal'

interface Sensor {
  id: string | number
  parameter: string
  brand: string
  model: string
  serial: string
  status: 'active' | 'maintenance' | 'inactive'
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'good':
      return '#22c55e'
    case 'moderate':
      return '#eab308'
    case 'critical':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'good':
      return 'Boa'
    case 'moderate':
      return 'Moderada'
    case 'critical':
      return 'Crítica'
    default:
      return 'N/A'
  }
}

// Ícone customizado com halo, pin SVG, etiqueta de dados e vetor de vento (igual ao mockup)
function createCustomIcon(station: MapStation, isPulsing: boolean): L.DivIcon {
  const color = getStatusColor(station.status)
  const pm10Val = station.parameters?.find((p) => p.name === 'MP₁₀' || p.name === 'PM₁₀')?.value ?? station.pm10
  const no2Val = station.parameters?.find((p) => p.name === 'NOx' || p.name === 'NO₂')?.value ?? 0
  const o3Val = station.parameters?.find((p) => p.name === 'O₃')?.value ?? 0
  const windKmh = station.windSpeed
  const html = `
    <div style="position:relative;width:300px;height:120px;">
      <div class="impact-halo ${isPulsing ? 'pulse-halo' : ''}" style="position:absolute;left:50px;top:30px;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,${color}66 0%,${color}00 70%);pointer-events:none;z-index:1;"></div>
      <div style="position:absolute;left:60px;top:25px;z-index:3;">
        <svg width="40" height="50" viewBox="0 0 40 50">
          <path d="M20 0C11.716 0 5 6.716 5 15c0 10 15 30 15 30s15-20 15-30c0-8.284-6.716-15-15-15z" fill="${color}" stroke="white" stroke-width="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
          <circle cx="20" cy="15" r="6" fill="white"/>
        </svg>
      </div>
      <div style="position:absolute;left:110px;top:20px;background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:6px 10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);pointer-events:none;z-index:2;min-width:140px;">
        <div style="font-size:10px;font-weight:600;color:#1a3d47;line-height:1.4;">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>PM₁₀:</span><span style="color:#374151">${pm10Val} µg/m³</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>NO₂:</span><span style="color:#374151">${no2Val} ppb</span></div>
          <div style="display:flex;justify-content:space-between;"><span>O₃:</span><span style="color:#374151">${o3Val} µg/m³</span></div>
        </div>
      </div>
      <div style="position:absolute;left:65px;top:75px;display:flex;align-items:center;gap:4px;z-index:2;">
        <svg width="20" height="20" viewBox="0 0 24 24" style="transform:rotate(${station.windDirection}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
          <path d="M12 2L6 12h4v10h4V12h4z" fill="white" stroke="#1a3d47" stroke-width="1.5"/>
        </svg>
        <span style="font-size:10px;font-weight:700;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.6);">${windKmh} km/h</span>
      </div>
    </div>
  `
  return L.divIcon({
    html,
    className: 'custom-marker-icon-enhanced',
    iconSize: [300, 120],
    iconAnchor: [80, 75],
    popupAnchor: [0, -75],
  })
}

function createPopupContent(station: MapStation, canEdit: boolean): string {
  const iqarColor = getStatusColor(station.status)
  const trend = station.trend?.length ? station.trend : [station.pm10]
  const trendPoints = trend
    .map((value, index) => {
      const x = (index / (trend.length - 1 || 1)) * 100
      const maxV = Math.max(...trend)
      const minV = Math.min(...trend)
      const y = 30 - ((value - minV) / (maxV - minV || 1)) * 25
      return `${x},${y}`
    })
    .join(' ')

  const params = station.parameters?.length ? station.parameters : [
    { name: 'MP₁₀', value: station.pm10, unit: 'µg/m³', status: station.status },
  ]
  const paramsGrid = params
    .slice(0, 6)
    .map(
      (p) =>
        `<div style="background:#f9fafb;padding:8px;border-radius:6px;border-left:3px solid ${getStatusColor(p.status)};">
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${p.name}</div>
          <div style="font-size:14px;font-weight:600;color:#111827;">${p.value} ${p.unit}</div>
        </div>`
    )
    .join('')

  return `
    <div style="background:white;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.15);min-width:340px;max-width:340px;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;">
      <div style="background-color:${iqarColor};padding:16px;border-radius:12px 12px 0 0;">
        <div style="color:white;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Índice de Qualidade do Ar</div>
        <div style="color:white;font-size:32px;font-weight:700;line-height:1;">${station.iqar}</div>
        <div style="color:white;font-size:14px;font-weight:600;margin-top:4px;">${station.iqarLabel}</div>
        <div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:8px;display:flex;align-items:center;gap:4px;">
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <span>${station.name} ${station.code}</span>
      </div>
      </div>
      <div style="padding:16px;">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Principais Poluentes</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${paramsGrid}</div>
        </div>
        <div style="background:#f0f9ff;padding:10px;border-radius:8px;margin-bottom:12px;border-left:3px solid #0ea5e9;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg width="16" height="16" fill="none" stroke="#0369a1" viewBox="0 0 24 24" style="transform:rotate(${station.windDirection}deg);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <div style="flex:1;">
              <div style="font-size:11px;color:#0369a1;font-weight:500;">Vento</div>
              <div style="font-size:13px;color:#0c4a6e;font-weight:600;">
                ${station.windSpeed} km/h - Direção: ${station.wind} (${station.windDirection}°)
              </div>
            </div>
          </div>
        </div>
        ${trend.length > 1 ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Tendência (Últimas 6 horas)</div>
          <svg width="100%" height="35" viewBox="0 0 100 35" preserveAspectRatio="none" style="background:#f9fafb;border-radius:6px;padding:2px;">
            <polyline points="${trendPoints}" fill="none" stroke="${iqarColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="${trendPoints}" fill="none" stroke="${iqarColor}" stroke-width="1" opacity="0.2" transform="translate(0, 5)"/>
          </svg>
        </div>
        ` : ''}
        <button class="popup-analyze-btn" data-station="${station.name}" style="width:100%;padding:10px 16px;background:linear-gradient(135deg,#1a3d47 0%,#2a4d57 100%);color:white;font-size:13px;font-weight:600;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;${canEdit ? 'margin-bottom:8px;' : ''}" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(26,61,71,0.3)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Analisar Consistência
        </button>
        ${canEdit ? `<button class="popup-edit-btn" data-station-id="${station.id}" style="width:100%;padding:10px 16px;background:white;color:#1a3d47;font-size:13px;font-weight:600;border:2px solid #1a3d47;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;" onmouseover="this.style.background='#f0f9ff';this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(26,61,71,0.15)';" onmouseout="this.style.background='white';this.style.transform='translateY(0)';this.style.boxShadow='none';">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Editar Estação
        </button>` : ''}
      </div>
    </div>
  `
}

interface MapPageProps {
  onNavigateToConsistency: (stationName: string) => void
}

export function MapPage({ onNavigateToConsistency }: MapPageProps) {
  const { getAccessibleStations } = useDataSegregation()
  const { canConfigureStations } = usePermissions()
  const { user } = useAuth()
  const [stations, setStations] = useState<MapStation[]>([])
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null)
  const [isSelectingLocation, setIsSelectingLocation] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingStation, setEditingStation] = useState<MapStation | null>(null)
  const [activeTab, setActiveTab] = useState<'location' | 'sensors'>('location')
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false)
  const [currentSensors, setCurrentSensors] = useState<Sensor[]>([])
  const [editingSensorId, setEditingSensorId] = useState<string | number | null>(null)
  const [mapTileLayer, setMapTileLayer] = useState<'satellite' | 'street'>('satellite')
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false)
  const [wmsLayers, setWmsLayers] = useState({ topography: false, wildfires: false })
  const [stationsRefreshTrigger, setStationsRefreshTrigger] = useState(0)
  const [deleteStationModalOpen, setDeleteStationModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    status: 'Ativa',
  })
  const [sensorFormData, setSensorFormData] = useState({
    parameter: '',
    manufacturer: '',
    serial: '',
    installDate: '',
  })
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const layersMenuRef = useRef<HTMLDivElement>(null)
  const wmsLayersRef = useRef<{ topography: L.TileLayer.WMS | null; wildfires: L.TileLayer.WMS | null }>({ topography: null, wildfires: null })
  const onNavigateRef = useRef(onNavigateToConsistency)
  const isSelectingRef = useRef(isSelectingLocation)
  onNavigateRef.current = onNavigateToConsistency
  isSelectingRef.current = isSelectingLocation

  const loadStations = useCallback(() => {
    const accessible = getAccessibleStations()
    stationsService.getStationsFilteredByUnit((name) => accessible.includes(name)).then(setStations)
  }, [getAccessibleStations])

  useEffect(() => {
    loadStations()
  }, [loadStations, stationsRefreshTrigger])

  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [-23.5505, -46.6333],
      zoom: 11,
    })

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })
    tileLayer.addTo(map)
    tileLayerRef.current = tileLayer

    mapRef.current = map

    // Garante que o Leaflet recalcule o tamanho após o layout estar pronto
    setTimeout(() => map.invalidateSize(), 100)

    stations.forEach((station) => {
      const marker = L.marker([station.lat, station.lng], {
        icon: createCustomIcon(station, false),
      }).addTo(map)
      const popup = L.popup({
        closeButton: false,
        className: 'custom-popup-map',
        maxWidth: 360,
      }).setContent(createPopupContent(station, canConfigureStations))

      marker.bindPopup(popup)
      ;(marker as L.Marker & { stationId?: string; stationData?: MapStation }).stationId = station.id
      ;(marker as L.Marker & { stationId?: string; stationData?: MapStation }).stationData = station

      marker.on('popupopen', (e) => {
        setSelectedStation(station)
        const container = e.popup.getElement()?.querySelector('.leaflet-popup-content')
        if (!container) return

        const analyzeBtn = container.querySelector('.popup-analyze-btn')
        analyzeBtn?.addEventListener('click', () => onNavigateRef.current(station.name))

        if (canConfigureStations) {
          const editBtn = container.querySelector<HTMLButtonElement>('.popup-edit-btn')
          editBtn?.addEventListener('click', (ev) => {
            ev.preventDefault()
            ev.stopPropagation()
            const stationToEdit = station
            marker.closePopup()
            requestAnimationFrame(() => {
              setEditingStation(stationToEdit)
              setIsEditMode(true)
              setFormData({
                name: stationToEdit.name,
                latitude: stationToEdit.lat.toString(),
                longitude: stationToEdit.lng.toString(),
                status: 'Ativa',
              })
              setActiveTab('location')
              setIsModalOpen(true)
              stationsService.getSensorsByStationId(stationToEdit.id).then((dbSensors) => {
                setCurrentSensors(
                  dbSensors.map((s) => ({
                    id: s.id,
                    parameter: s.parameter,
                    brand: s.brand,
                    model: s.model,
                    serial: s.serial,
                    status: (s.status === 'maintenance' ? 'maintenance' : s.status === 'inactive' ? 'inactive' : 'active') as Sensor['status'],
                  }))
                )
              }).catch(() => setCurrentSensors([]))
            })
          })
        }
      })

      marker.on('popupclose', () => setSelectedStation(null))

      markersRef.current.push(marker)
    })

    // Auto-abrir popup da primeira estação
    if (stations.length > 0 && markersRef.current.length > 0) {
      const firstStation = stations[0]
      const firstMarker = markersRef.current[0]
      setTimeout(() => {
        const offsetX = -192
        const targetPoint = map.project([firstStation.lat, firstStation.lng], 13)
        const targetLatLng = map.unproject(targetPoint.subtract([offsetX, 0]), 13)
        map.setView(targetLatLng, 13, { animate: true, duration: 1 })
        setTimeout(() => firstMarker.openPopup(), 1000)
      }, 500)
    }

    // Controle de tipo de mapa
    const MapTypeControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        container.style.marginTop = '10px'
        container.innerHTML = `<a href="#" class="map-type-toggle" title="Alternar tipo de mapa" style="width:30px;height:30px;line-height:30px;text-align:center;text-decoration:none;color:#1a3d47;font-size:16px;display:block;background:white;">🗺️</a>`
        L.DomEvent.disableClickPropagation(container)
        return container
      },
    })
    new MapTypeControl().addTo(map)

    // Controle de camadas WMS
    const LayersControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
        container.style.marginTop = '10px'
        container.innerHTML = `<a href="#" class="layers-toggle" title="Camadas Geoserver (WMS)" style="width:30px;height:30px;line-height:30px;text-align:center;text-decoration:none;color:#1a3d47;font-size:16px;display:flex;align-items:center;justify-content:center;background:white;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></a>`
        L.DomEvent.disableClickPropagation(container)
        return container
      },
    })
    new LayersControl().addTo(map)

    setTimeout(() => {
      document.querySelector('.map-type-toggle')?.addEventListener('click', (e) => {
        e.preventDefault()
        setMapTileLayer((p) => (p === 'satellite' ? 'street' : 'satellite'))
      })
      document.querySelector('.layers-toggle')?.addEventListener('click', (e) => {
        e.preventDefault()
        setIsLayersMenuOpen((p) => !p)
      })
    }, 100)

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isSelectingRef.current) {
        const { lat, lng } = e.latlng
        setFormData({
          name: '',
          latitude: lat.toFixed(4),
          longitude: lng.toFixed(4),
          status: 'Ativa',
        })
        setCurrentSensors([])
        setActiveTab('location')
        setIsSelectingLocation(false)
        setIsEditMode(false)
        setEditingStation(null)
        setIsModalOpen(true)
      }
    }
    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
    }
  }, [stations, canConfigureStations])

  // Atualizar tile layer quando mapTileLayer mudar
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    tileLayerRef.current.remove()
    const tileUrl = mapTileLayer === 'satellite'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    const newLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    })
    newLayer.addTo(mapRef.current)
    tileLayerRef.current = newLayer
    const btn = document.querySelector('.map-type-toggle') as HTMLAnchorElement
    if (btn) btn.innerHTML = mapTileLayer === 'satellite' ? '🛰️' : '🗺️'
  }, [mapTileLayer])

  // Atualizar ícones dos marcadores com animação de pulse quando selecionado
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const m = marker as L.Marker & { stationId?: string; stationData?: MapStation }
      if (!m.stationData) return
      const isSelected = selectedStation?.id === m.stationId
      marker.setIcon(createCustomIcon(m.stationData, isSelected))
    })
  }, [selectedStation])

  useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return
    el.style.cursor = isSelectingLocation ? 'crosshair' : ''
  }, [isSelectingLocation])

  // Fechar menu de camadas ao clicar fora
  useEffect(() => {
    if (!isLayersMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (layersMenuRef.current?.contains(t) || document.querySelector('.layers-toggle')?.contains(t)) return
      setIsLayersMenuOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isLayersMenuOpen])

  const handleStationClick = (station: MapStation) => {
    setSelectedStation(station)
    const map = mapRef.current
    if (map) {
      const offsetX = -192
      const targetPoint = map.project([station.lat, station.lng], 13)
      const targetLatLng = map.unproject(targetPoint.subtract([offsetX, 0]), 13)
      map.setView(targetLatLng, 13, { animate: true, duration: 1 })
    }
    const marker = markersRef.current.find((m) => {
      const mm = m as L.Marker & { stationId?: string }
      return mm.stationId === station.id
    })
    setTimeout(() => marker?.openPopup(), 1000)
  }

  const handleToggleWmsLayer = (layer: 'topography' | 'wildfires') => {
    const map = mapRef.current
    if (!map) return
    const current = wmsLayersRef.current[layer]
    if (current) {
      map.removeLayer(current)
      wmsLayersRef.current[layer] = null
      setWmsLayers((p) => ({ ...p, [layer]: false }))
    } else {
      if (layer === 'topography') {
        const l = L.tileLayer.wms('https://ows.terrestris.de/osm/service', {
          layers: 'TOPO-WMS',
          format: 'image/png',
          transparent: true,
          attribution: '© Terrestris | © OSM',
        })
        l.addTo(map)
        wmsLayersRef.current.topography = l
      } else if (layer === 'wildfires') {
        try {
          const l = L.tileLayer.wms('http://queimadas.dgi.inpe.br/queimadas/geoserver/wms', {
            layers: 'bdqueimadas:focos_24h',
            format: 'image/png',
            transparent: true,
            attribution: '© INPE',
          })
          l.addTo(map)
          wmsLayersRef.current.wildfires = l
        } catch {
          const l = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
            layers: 'nexrad-n0r-900913',
            format: 'image/png',
            transparent: true,
            attribution: '© IEM',
          })
          l.addTo(map)
          wmsLayersRef.current.wildfires = l
        }
      }
      setWmsLayers((p) => ({ ...p, [layer]: true }))
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIsEditMode(false)
    setEditingStation(null)
    setDeleteStationModalOpen(false)
    setActiveTab('location')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveStation = async () => {
    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    const unit = user?.unit || 'Unidade SP'
    try {
      if (isEditMode && editingStation) {
        await stationsService.updateStation(editingStation.id, {
          name: formData.name,
          lat,
          lng,
          status: formData.status,
        })
        const existingIds = new Set(
          currentSensors.filter((s) => typeof s.id === 'string').map((s) => s.id as string)
        )
        const dbSensors = await stationsService.getSensorsByStationId(editingStation.id)
        const dbIds = new Set(dbSensors.map((s) => s.id))
        for (const s of currentSensors) {
          if (typeof s.id === 'string' && dbIds.has(s.id)) {
            await stationsService.updateSensor(s.id as string, {
              parameter: s.parameter,
              brand: s.brand,
              model: s.model,
              serial: s.serial,
            })
          } else if (typeof s.id === 'number') {
            const [brand, ...modelParts] = (s.brand + ' ' + s.model).split(' ')
            await stationsService.createSensor(editingStation.id, {
              parameter: s.parameter,
              brand: brand || 'N/A',
              model: modelParts.join(' ') || 'N/A',
              serial: s.serial,
            })
          }
        }
        for (const dbId of dbIds) {
          if (!existingIds.has(dbId)) await stationsService.deleteSensor(dbId)
        }
        toast.success(`Estação "${formData.name}" atualizada com sucesso!`, {
          description: `Lat: ${formData.latitude}° • Long: ${formData.longitude}°`,
        })
      } else {
        const { id: newId } = await stationsService.createStation({
          name: formData.name,
          lat,
          lng,
          unit,
          status: formData.status,
        })
        for (const s of currentSensors) {
          const [brand, ...modelParts] = (s.brand + ' ' + s.model).split(' ')
          await stationsService.createSensor(newId, {
            parameter: s.parameter,
            brand: brand || 'N/A',
            model: modelParts.join(' ') || 'N/A',
            serial: s.serial || 'S/N: BR-8821',
          })
        }
        toast.success(`Estação "${formData.name}" cadastrada com sucesso!`)
      }
      handleCloseModal()
      setStationsRefreshTrigger((k) => k + 1)
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Erro ao salvar estação')
    }
  }

  const handleOpenSensorModal = () => {
    setIsSensorModalOpen(true)
    setEditingSensorId(null)
    setSensorFormData({ parameter: '', manufacturer: '', serial: '', installDate: '' })
  }

  const handleEditSensor = (sensor: Sensor) => {
    setIsSensorModalOpen(true)
    setEditingSensorId(sensor.id)
    setSensorFormData({
      parameter: sensor.parameter,
      manufacturer: `${sensor.brand} ${sensor.model}`,
      serial: sensor.serial,
      installDate: '',
    })
  }

  const handleCloseSensorModal = () => {
    setIsSensorModalOpen(false)
    setEditingSensorId(null)
  }

  const handleSensorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSensorFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSensor = async () => {
    const [brand, ...modelParts] = (sensorFormData.manufacturer || '').split(' ')
    const brandVal = brand || 'N/A'
    const modelVal = modelParts.join(' ') || 'N/A'
    const serialVal = sensorFormData.serial || 'S/N: BR-8821'
    if (editingStation && editingSensorId !== null) {
      if (typeof editingSensorId === 'string') {
        try {
          await stationsService.updateSensor(editingSensorId, {
            parameter: sensorFormData.parameter,
            brand: brandVal,
            model: modelVal,
            serial: serialVal,
          })
          setCurrentSensors((prev) =>
            prev.map((s) =>
              s.id === editingSensorId
                ? { ...s, parameter: sensorFormData.parameter, brand: brandVal, model: modelVal, serial: serialVal }
                : s
            )
          )
          toast.success('Sensor atualizado com sucesso!')
        } catch (e) {
          toast.error((e as Error)?.message ?? 'Erro ao atualizar sensor')
        }
      } else {
        setCurrentSensors((prev) =>
          prev.map((s) =>
            s.id === editingSensorId
              ? { ...s, parameter: sensorFormData.parameter, brand: brandVal, model: modelVal, serial: serialVal }
              : s
          )
        )
      }
    } else if (editingStation && editingSensorId === null) {
      try {
        const { id } = await stationsService.createSensor(editingStation.id, {
          parameter: sensorFormData.parameter,
          brand: brandVal,
          model: modelVal,
          serial: serialVal,
        })
        setCurrentSensors((prev) => [
          ...prev,
          { id, parameter: sensorFormData.parameter, brand: brandVal, model: modelVal, serial: serialVal, status: 'active' as const },
        ])
        toast.success('Sensor adicionado com sucesso!')
      } catch (e) {
        toast.error((e as Error)?.message ?? 'Erro ao adicionar sensor')
      }
    } else {
      const newSensor: Sensor = {
        id: currentSensors.length + 1,
        parameter: sensorFormData.parameter,
        brand: brandVal,
        model: modelVal,
        serial: serialVal,
        status: 'maintenance',
      }
      setCurrentSensors((prev) => [...prev, newSensor])
    }
    handleCloseSensorModal()
  }

  const handleConfirmDeleteStation = async () => {
    if (!editingStation) return
    try {
      await stationsService.deleteStation(editingStation.id)
      toast.success(`Estação "${editingStation.name}" excluída com sucesso!`)
      setDeleteStationModalOpen(false)
      handleCloseModal()
      setStationsRefreshTrigger((k) => k + 1)
    } catch (e) {
      toast.error((e as Error)?.message ?? 'Erro ao excluir estação')
    }
  }

  const handleDeleteSensor = async () => {
    if (editingSensorId === null) return
    if (!window.confirm('Tem certeza que deseja excluir este sensor? Esta ação não pode ser desfeita.')) return
    if (typeof editingSensorId === 'string' && editingStation) {
      try {
        await stationsService.deleteSensor(editingSensorId)
        setCurrentSensors((prev) => prev.filter((s) => s.id !== editingSensorId))
        toast.success('Sensor excluído com sucesso!')
      } catch (e) {
        toast.error((e as Error)?.message ?? 'Erro ao excluir sensor')
      }
    } else {
      setCurrentSensors((prev) => prev.filter((s) => s.id !== editingSensorId))
    }
    handleCloseSensorModal()
  }

  return (
    <>
      <style>{`
        @keyframes pulse-halo {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.3; }
        }
        .pulse-halo { animation: pulse-halo 2.5s ease-in-out infinite; }
        .custom-marker, .custom-marker-icon-enhanced { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-control-zoom { border: 2px solid #e5e7eb !important; border-radius: 0.5rem !important; overflow: hidden; }
        .leaflet-control-zoom a { color: #1a3d47 !important; font-weight: bold !important; background: white !important; }
        .leaflet-control-zoom a:hover { background: #f3f4f6 !important; }
        .leaflet-container { font-family: inherit; }
      `}</style>

      <div className="relative w-full h-full min-h-[400px] bg-gray-900 overflow-hidden flex">
        <div ref={mapContainerRef} className="flex-1 z-[1] min-h-[400px]" style={{ width: '100%', height: '100%' }} />

        <div className="w-96 bg-white shadow-2xl flex flex-col h-full overflow-hidden z-[10]">
          <div className="bg-[#1a3d47] text-white px-5 py-4">
            <h2 className="text-lg font-bold">Gestão de Pontos de Monitoramento</h2>
            <p className="text-sm text-gray-200 mt-1">Estações Georreferenciadas</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {stations.map((station) => (
              <div
                key={station.id}
                role="button"
                tabIndex={0}
                onClick={() => handleStationClick(station)}
                onKeyDown={(e) => e.key === 'Enter' && handleStationClick(station)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedStation?.id === station.id
                    ? 'border-[#1a3d47] ring-4 ring-[#1a3d47]/30 shadow-lg bg-blue-50'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="w-5 h-5 flex-shrink-0"
                      fill={getStatusColor(station.status)}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <div className="flex flex-col">
                      <h3 className="text-sm font-semibold text-gray-900">{station.name}</h3>
                      <span className="text-xs text-gray-500 font-mono">(ID: {station.code})</span>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold text-white flex-shrink-0"
                    style={{ backgroundColor: getStatusColor(station.status) }}
                  >
                    {getStatusLabel(station.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-500">Latitude:</span>
                    <p className="font-mono text-gray-900">{station.lat.toFixed(4)}°</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Longitude:</span>
                    <p className="font-mono text-gray-900">{station.lng.toFixed(4)}°</p>
                  </div>
                  <div>
                    <span className="text-gray-500">PM₁₀:</span>
                    <p className="font-semibold text-gray-900">{station.pm10} µg/m³</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Vento:</span>
                    <p className="font-semibold text-gray-900">
                      {station.windSpeed} m/s ({station.wind})
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-400 italic">Atualizado em: {station.lastUpdate}</p>
                </div>
              </div>
            ))}
          </div>

          {canConfigureStations && (
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                className="w-full px-4 py-2 bg-[#1a3d47] text-white text-sm font-medium rounded-md hover:bg-[#2a4d57] transition-colors"
                onClick={() => setIsSelectingLocation(true)}
              >
                📍 Selecionar Localização no Mapa
              </button>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 z-[1000] w-64">
          <h3 className="text-xs font-semibold text-[#1a3d47] mb-2 border-b border-gray-200 pb-1.5">
            Legenda: IQAr
          </h3>
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#22c55e] flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium text-gray-900">Boa (0 - 40)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#eab308] flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium text-gray-900">Moderada (41 - 80)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#f97316] flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium text-gray-900">Ruim (81 - 120)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ef4444] flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium text-gray-900">Muito Ruim (121 - 200)</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#9333ea] flex-shrink-0" />
              <div className="flex-1 text-[11px] font-medium text-gray-900">Péssima (&gt; 200)</div>
            </div>
          </div>
        </div>

        {isSelectingLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1a3d47] text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-white z-[1500] flex items-center gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 animate-bounce flex-shrink-0" />
              <div>
                <p className="text-sm font-bold">Modo de Seleção Ativo</p>
                <p className="text-xs text-gray-200">
                  Clique no mapa para selecionar a localização da nova estação
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSelectingLocation(false)}
              className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors"
            >
              ✕ Cancelar
            </button>
          </div>
        )}

        {isLayersMenuOpen && (
          <div
            ref={layersMenuRef}
            className="absolute top-4 left-[50px] bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-4 z-[1000] min-w-[280px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1a3d47]" />
                Camadas Geoserver (WMS)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wmsLayers.topography}
                    onChange={() => handleToggleWmsLayer('topography')}
                    className="mt-0.5 w-4 h-4 text-[#1a3d47] bg-gray-100 border-gray-300 rounded focus:ring-[#1a3d47] focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">🗺️ Topografia (Terrestris)</div>
                    <div className="text-xs text-gray-500 mt-1">Camada topográfica do OpenStreetMap</div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">WMS: ows.terrestris.de</div>
                  </div>
                </label>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wmsLayers.wildfires}
                    onChange={() => handleToggleWmsLayer('wildfires')}
                    className="mt-0.5 w-4 h-4 text-[#1a3d47] bg-gray-100 border-gray-300 rounded focus:ring-[#1a3d47] focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">🔥 Queimadas (INPE)</div>
                    <div className="text-xs text-gray-500 mt-1">Focos de calor detectados nas últimas 24h</div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">WMS: queimadas.dgi.inpe.br</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">💡 Camadas WMS reais em tempo real</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Editar / Cadastro de Estação (igual ao mockup) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]"
          onClick={handleCloseModal}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[720px] max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">
                {isEditMode ? 'Editar Estação de Monitoramento' : 'Cadastro de Estação de Monitoramento'}
              </h2>
              <p className="text-sm text-gray-200 mt-1">Georreferenciamento e Gestão de Ativos</p>
            </div>

            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setActiveTab('location')}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'location'
                    ? 'text-[#1a3d47] border-b-2 border-[#1a3d47] bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                📍 Localização e Detalhes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sensors')}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === 'sensors'
                    ? 'text-[#1a3d47] border-b-2 border-[#1a3d47] bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                🔬 Sensores e Analisadores
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'location' ? (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nome da Estação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ex: Estação Industrial - Norte"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="-23.5505"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        placeholder="-46.6333"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status Operacional <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="Ativa">✅ Ativa</option>
                      <option value="Manutenção">🔧 Manutenção</option>
                      <option value="Inativa">⛔ Inativa</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Equipamentos Instalados</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Sensores e analisadores configurados nesta estação de monitoramento
                    </p>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Parâmetro
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Marca/Modelo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Serial ID
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentSensors.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-700">Nenhum sensor cadastrado</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Clique em &quot;+ Adicionar Sensor&quot; para começar
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          currentSensors.map((sensor) => (
                            <tr key={sensor.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{sensor.parameter}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex flex-col">
                                  <span className="font-medium">{sensor.brand}</span>
                                  <span className="text-xs text-gray-500">{sensor.model}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-gray-600">{sensor.serial}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    sensor.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : sensor.status === 'maintenance'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {sensor.status === 'active'
                                    ? '✓ Ativo'
                                    : sensor.status === 'maintenance'
                                      ? '⚠ Calibração'
                                      : '✗ Inativo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors"
                                  onClick={() => handleEditSensor(sensor)}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="w-full mt-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#1a3d47] hover:text-[#1a3d47] hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                    onClick={handleOpenSensorModal}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Adicionar Sensor
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between gap-3 border-t border-gray-200">
              <div>
                {isEditMode && editingStation && (
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    onClick={() => setDeleteStationModalOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Estação
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium rounded-lg transition-colors shadow-md"
                  onClick={handleSaveStation}
                >
                  {isEditMode ? '✓ Editar Estação' : '✓ Salvar Estação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Sensor */}
      {isSensorModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]"
          onClick={handleCloseSensorModal}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">
                {editingSensorId !== null ? 'Editar Sensor' : 'Adicionar Sensor'}
              </h2>
              <p className="text-sm text-gray-200 mt-1">Configuração de Equipamentos</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Parâmetro <span className="text-red-500">*</span>
                </label>
                <select
                  name="parameter"
                  value={sensorFormData.parameter}
                  onChange={handleSensorInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Selecione um parâmetro...</option>
                  <option value="O₃">O₃ - Ozônio</option>
                  <option value="NOx">NOx - Óxidos de Nitrogênio</option>
                  <option value="SO₂">SO₂ - Dióxido de Enxofre</option>
                  <option value="CO">CO - Monóxido de Carbono</option>
                  <option value="HCT">HCT - Hidrocarbonetos Totais</option>
                  <option value="BTEX">BTEX - Benzeno, Tolueno, Etilbenzeno e Xilenos</option>
                  <option value="MP₁₀">MP₁₀ - Material Particulado ≤ 10µm</option>
                  <option value="MP₂.₅">MP₂.₅ - Material Particulado ≤ 2.5µm</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fabricante/Modelo <span className="text-red-500">*</span>
                </label>
                <select
                  name="manufacturer"
                  value={sensorFormData.manufacturer}
                  onChange={handleSensorInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="">Selecione um fabricante/modelo...</option>
                  <option value="Teledyne T200">Teledyne T200</option>
                  <option value="Thermo Fisher 49i">Thermo Fisher 49i</option>
                  <option value="Teledyne T400">Teledyne T400</option>
                  <option value="Met One BAM-1020">Met One BAM-1020</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Número de Série <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="serial"
                  value={sensorFormData.serial}
                  onChange={handleSensorInputChange}
                  placeholder="Ex: SN-2023-X99 ou S/N: BR-8821"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data de Instalação <span className="text-red-500">*</span>
                </label>
                <DatePickerInput
                  value={sensorFormData.installDate}
                  onChange={(date) => setSensorFormData((prev) => ({ ...prev, installDate: date }))}
                  max={new Date().toISOString().split('T')[0]}
                  buttonClassName="py-2.5"
                  portal
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <strong>✓ Vinculação:</strong> O sensor será cadastrado com status &quot;Calibração&quot;
                  (amarelo). Após a instalação e calibração, o status poderá ser alterado para
                  &quot;Ativo&quot;.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between gap-3 border-t border-gray-200">
              {editingSensorId !== null ? (
                <>
                  <button
                    type="button"
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                    onClick={handleDeleteSensor}
                  >
                    Excluir
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                      onClick={handleCloseSensorModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium rounded-lg transition-colors shadow-md"
                      onClick={handleSaveSensor}
                    >
                      ✓ Salvar Alterações
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                      onClick={handleCloseSensorModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium rounded-lg transition-colors shadow-md"
                      onClick={handleSaveSensor}
                    >
                      ✓ Salvar Sensor
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteStationModal
        isOpen={deleteStationModalOpen}
        onClose={() => setDeleteStationModalOpen(false)}
        onConfirm={handleConfirmDeleteStation}
        stationName={editingStation?.name ?? ''}
      />
    </>
  )
}
