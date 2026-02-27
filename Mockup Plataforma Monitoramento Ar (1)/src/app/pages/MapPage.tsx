import { useState, useRef, useEffect } from "react";
import { MapPin as MapPinIcon, Layers } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useDataSegregation } from "../hooks/useDataSegregation";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface Station {
  id: number;
  code: string;
  name: string;
  lat: number;
  lng: number;
  status: "good" | "moderate" | "critical";
  pm10: number;
  wind: string;
  windSpeed: number;
  windDirection: number; // Em graus
  lastUpdate: string;
  iqar: number;
  iqarLabel: string;
  unit: string; // Unidade da estação
  parameters: {
    name: string;
    value: number;
    unit: string;
    status: "good" | "moderate" | "critical";
  }[];
  trend: number[]; // Dados históricos para sparkline (últimas 4-6 horas)
}

// Função auxiliar para obter data/hora atual formatada
const getCurrentDateTime = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

interface Sensor {
  id: number;
  parameter: string;
  brand: string;
  model: string;
  serial: string;
  status: "active" | "maintenance" | "inactive";
}

// Dados de sensores por estação
const stationSensors: Record<number, Sensor[]> = {
  1: [ // Estação REPLAN (Paulínia - SP)
    {
      id: 1,
      parameter: "O₃",
      brand: "Thermo",
      model: "49i",
      serial: "S/N: T2941",
      status: "active"
    },
    {
      id: 2,
      parameter: "NOx",
      brand: "Horiba",
      model: "APNA-370",
      serial: "S/N: H2942",
      status: "active"
    },
    {
      id: 3,
      parameter: "MP₁₀",
      brand: "Met One",
      model: "BAM-1020",
      serial: "S/N: M2943",
      status: "active"
    },
    {
      id: 4,
      parameter: "BTEX",
      brand: "Syntech",
      model: "Spectras GC955",
      serial: "S/N: S2944",
      status: "active"
    }
  ],
  2: [ // Estação UTGCA - Fazenda (Caraguatatuba - SP)
    {
      id: 1,
      parameter: "MP₁₀",
      brand: "Met One",
      model: "BAM-1020",
      serial: "S/N: A4522",
      status: "active"
    },
    {
      id: 2,
      parameter: "NOx",
      brand: "Horiba",
      model: "APNA-370",
      serial: "S/N: H3178",
      status: "active"
    },
    {
      id: 3,
      parameter: "O₃",
      brand: "Thermo",
      model: "49i",
      serial: "S/N: T3179",
      status: "active"
    },
    {
      id: 4,
      parameter: "HCT",
      brand: "Teledyne",
      model: "T300",
      serial: "S/N: TD3180",
      status: "active"
    }
  ],
  3: [ // Estação REDUC - Canal do Meio (Duque de Caxias - RJ)
    {
      id: 1,
      parameter: "SO₂",
      brand: "Thermo",
      model: "43i",
      serial: "S/N: T9981",
      status: "active"
    },
    {
      id: 2,
      parameter: "CO",
      brand: "Thermo",
      model: "48i",
      serial: "S/N: T9982",
      status: "active"
    },
    {
      id: 3,
      parameter: "MP₁₀",
      brand: "Met One",
      model: "BAM-1020",
      serial: "S/N: A4522",
      status: "active"
    },
    {
      id: 4,
      parameter: "MP₂.₅",
      brand: "Met One",
      model: "BAM-1022",
      serial: "S/N: A4523",
      status: "active"
    },
    {
      id: 5,
      parameter: "NOx",
      brand: "Horiba",
      model: "APNA-370",
      serial: "S/N: H3180",
      status: "active"
    },
    {
      id: 6,
      parameter: "O₃",
      brand: "Thermo",
      model: "49i",
      serial: "S/N: T3181",
      status: "active"
    }
  ],
  4: [ // Estação TECAB (Macaé - RJ)
    {
      id: 1,
      parameter: "MP₁₀",
      brand: "Thermo Fisher",
      model: "TEOM 1405",
      serial: "S/N: TF4851",
      status: "active"
    },
    {
      id: 2,
      parameter: "NOx",
      brand: "Horiba",
      model: "APNA-370",
      serial: "S/N: H4853",
      status: "active"
    },
    {
      id: 3,
      parameter: "O₃",
      brand: "Thermo",
      model: "49i",
      serial: "S/N: T4855",
      status: "active"
    },
    {
      id: 4,
      parameter: "SO₂",
      brand: "Thermo",
      model: "43i",
      serial: "S/N: T4856",
      status: "active"
    },
    {
      id: 5,
      parameter: "BTEX",
      brand: "Syntech",
      model: "Spectras GC955",
      serial: "S/N: S4857",
      status: "active"
    }
  ],
  5: [ // Estação Boaventura - Estreito (Itaboraí - RJ)
    {
      id: 1,
      parameter: "MP₁₀",
      brand: "Met One",
      model: "BAM-1020",
      serial: "S/N: M5681",
      status: "active"
    },
    {
      id: 2,
      parameter: "NOx",
      brand: "Teledyne",
      model: "T200",
      serial: "S/N: TD5683",
      status: "active"
    },
    {
      id: 3,
      parameter: "O₃",
      brand: "Horiba",
      model: "APOA-370",
      serial: "S/N: H5685",
      status: "active"
    },
    {
      id: 4,
      parameter: "SO₂",
      brand: "Thermo",
      model: "43i",
      serial: "S/N: T5687",
      status: "active"
    },
    {
      id: 5,
      parameter: "MP₂.₅",
      brand: "Met One",
      model: "BAM-1022",
      serial: "S/N: M5686",
      status: "active"
    },
    {
      id: 6,
      parameter: "HCT",
      brand: "Teledyne",
      model: "T300",
      serial: "S/N: TD5688",
      status: "active"
    }
  ],
  6: [ // Estação REGAP - São Gabriel (MG)
    {
      id: 1,
      parameter: "O₃",
      brand: "Thermo",
      model: "49i",
      serial: "S/N: T7001",
      status: "active"
    },
    {
      id: 2,
      parameter: "NOx",
      brand: "Horiba",
      model: "APNA-370",
      serial: "S/N: H7002",
      status: "active"
    },
    {
      id: 3,
      parameter: "SO₂",
      brand: "Thermo",
      model: "43i",
      serial: "S/N: T7003",
      status: "active"
    },
    {
      id: 4,
      parameter: "CO",
      brand: "Thermo",
      model: "48i",
      serial: "S/N: T7004",
      status: "active"
    },
    {
      id: 5,
      parameter: "MP₁₀",
      brand: "Met One",
      model: "BAM-1020",
      serial: "S/N: M7005",
      status: "active"
    },
    {
      id: 6,
      parameter: "MP₂.₅",
      brand: "Met One",
      model: "BAM-1022",
      serial: "S/N: M7006",
      status: "active"
    },
    {
      id: 7,
      parameter: "HCT",
      brand: "Teledyne",
      model: "T300",
      serial: "S/N: TD7007",
      status: "active"
    },
    {
      id: 8,
      parameter: "BTEX",
      brand: "Syntech",
      model: "Spectras GC955",
      serial: "S/N: S7008",
      status: "active"
    }
  ]
};

const stationsData: Station[] = [
  {
    id: 1,
    code: "#294",
    name: "Estação REPLAN (Paulínia - SP)",
    lat: -22.7545,
    lng: -47.1475,
    status: "good",
    pm10: 42,
    wind: "SE",
    windSpeed: 12,
    windDirection: 135,
    lastUpdate: getCurrentDateTime(),
    iqar: 42,
    iqarLabel: "BOA",
    unit: "Unidade SP",
    parameters: [
      { name: "MP₁₀", value: 42, unit: "µg/m³", status: "good" },
      { name: "NOx", value: 15, unit: "ppb", status: "good" },
      { name: "O₃", value: 80, unit: "µg/m³", status: "moderate" },
      { name: "BTEX", value: 3.2, unit: "µg/m³", status: "good" }
    ],
    trend: [38, 40, 41, 42, 43, 42]
  },
  {
    id: 2,
    code: "#317",
    name: "Estação UTGCA - Fazenda (Caraguatatuba - SP)",
    lat: -23.6200,
    lng: -45.4200,
    status: "good",
    pm10: 15,
    wind: "E",
    windSpeed: 18,
    windDirection: 90,
    lastUpdate: getCurrentDateTime(),
    iqar: 15,
    iqarLabel: "BOA",
    unit: "Unidade SP",
    parameters: [
      { name: "MP₁₀", value: 15, unit: "µg/m³", status: "good" },
      { name: "NOx", value: 8, unit: "ppb", status: "good" },
      { name: "O₃", value: 45, unit: "µg/m³", status: "good" },
      { name: "HCT", value: 2.1, unit: "µg/m³", status: "good" }
    ],
    trend: [14, 15, 16, 15, 14, 15]
  },
  {
    id: 3,
    code: "#102",
    name: "Estação REDUC - Canal do Meio (Duque de Caxias - RJ)",
    lat: -22.7200,
    lng: -43.2900,
    status: "good",
    pm10: 42,
    wind: "SE",
    windSpeed: 12,
    windDirection: 135,
    lastUpdate: getCurrentDateTime(),
    iqar: 42,
    iqarLabel: "BOA",
    unit: "Unidade RJ",
    parameters: [
      { name: "MP₁₀", value: 42, unit: "µg/m³", status: "good" },
      { name: "MP₂.₅", value: 28, unit: "µg/m³", status: "good" },
      { name: "SO₂", value: 18, unit: "µg/m³", status: "good" },
      { name: "CO", value: 1.2, unit: "mg/m³", status: "good" }
    ],
    trend: [38, 40, 41, 42, 43, 42]
  },
  {
    id: 4,
    code: "#485",
    name: "Estação TECAB (Macaé - RJ)",
    lat: -22.3770,
    lng: -41.7870,
    status: "moderate",
    pm10: 58,
    wind: "NE",
    windSpeed: 14,
    windDirection: 45,
    lastUpdate: getCurrentDateTime(),
    iqar: 58,
    iqarLabel: "MODERADA",
    unit: "Unidade RJ",
    parameters: [
      { name: "MP₁₀", value: 58, unit: "µg/m³", status: "moderate" },
      { name: "NOx", value: 42, unit: "ppb", status: "moderate" },
      { name: "O₃", value: 88, unit: "µg/m³", status: "moderate" },
      { name: "SO₂", value: 22, unit: "µg/m³", status: "good" },
      { name: "BTEX", value: 4.5, unit: "µg/m³", status: "good" }
    ],
    trend: [52, 55, 57, 58, 58, 58]
  },
  {
    id: 5,
    code: "#568",
    name: "Estação Boaventura - Estreito (Itaboraí - RJ)",
    lat: -22.7445,
    lng: -42.8597,
    status: "moderate",
    pm10: 75,
    wind: "NW",
    windSpeed: 14,
    windDirection: 315,
    lastUpdate: getCurrentDateTime(),
    iqar: 68,
    iqarLabel: "MODERADA",
    unit: "Unidade RJ",
    parameters: [
      { name: "MP₁₀", value: 75, unit: "µg/m³", status: "moderate" },
      { name: "MP₂.₅", value: 38, unit: "µg/m³", status: "moderate" },
      { name: "NOx", value: 48, unit: "ppb", status: "moderate" },
      { name: "O₃", value: 98, unit: "µg/m³", status: "moderate" },
      { name: "SO₂", value: 25, unit: "µg/m³", status: "good" },
      { name: "HCT", value: 3.8, unit: "µg/m³", status: "good" }
    ],
    trend: [62, 64, 68, 70, 68, 68]
  },
  {
    id: 6,
    code: "#721",
    name: "Estação REGAP - São Gabriel (MG)",
    lat: -19.8543,
    lng: -43.9378,
    status: "good",
    pm10: 35,
    wind: "NE",
    windSpeed: 9,
    windDirection: 45,
    lastUpdate: getCurrentDateTime(),
    iqar: 38,
    iqarLabel: "BOA",
    unit: "REGAP - MG",
    parameters: [
      { name: "MP₁₀", value: 35, unit: "µg/m³", status: "good" },
      { name: "O₃", value: 72, unit: "µg/m³", status: "good" },
      { name: "NOx", value: 18, unit: "ppb", status: "good" },
      { name: "SO₂", value: 12, unit: "µg/m³", status: "good" },
      { name: "CO", value: 0.8, unit: "mg/m³", status: "good" }
    ],
    trend: [32, 34, 36, 35, 35, 35]
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "good": return "#22c55e";
    case "moderate": return "#eab308";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "good": return "Boa";
    case "moderate": return "Moderada";
    case "critical": return "Crítica";
    default: return "N/A";
  }
};

// Função para criar ícone customizado com halo, etiqueta de dados e vetor de vento
const createCustomIcon = (station: Station, isPulsing: boolean = false) => {
  const color = getStatusColor(station.status);
  
  // Extrair valores dos parâmetros
  const pm10Value = station.parameters.find(p => p.name === "MP₁₀" || p.name === "PM₁₀")?.value || 0;
  const no2Value = station.parameters.find(p => p.name === "NOx" || p.name === "NO₂")?.value || 0;
  const o3Value = station.parameters.find(p => p.name === "O₃")?.value || 0;
  
  const htmlIcon = `
    <div style="position: relative; width: 300px; height: 120px;">
      <!-- Halo de Impacto com Animação de Pulso -->
      <div class="impact-halo ${isPulsing ? 'pulse-halo' : ''}" style="
        position: absolute;
        left: 50px;
        top: 30px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: radial-gradient(circle, ${color}66 0%, ${color}00 70%);
        pointer-events: none;
        z-index: 1;
      "></div>
      
      <!-- Pin da Estação -->
      <div style="
        position: absolute;
        left: 60px;
        top: 25px;
        z-index: 3;
      ">
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C11.716 0 5 6.716 5 15c0 10 15 30 15 30s15-20 15-30c0-8.284-6.716-15-15-15z" 
                fill="${color}" 
                stroke="white" 
                stroke-width="2"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
          <circle cx="20" cy="15" r="6" fill="white"/>
        </svg>
      </div>
      
      <!-- Etiqueta de Dados Rápidos (Glassmorphism) -->
      <div style="
        position: absolute;
        left: 110px;
        top: 20px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 6px 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        pointer-events: none;
        z-index: 2;
        min-width: 140px;
      ">
        <div style="font-size: 10px; font-weight: 600; color: #1a3d47; line-height: 1.4; font-family: system-ui, -apple-system, sans-serif;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>PM₁₀:</span>
            <span style="color: #374151;">${pm10Value} µg/m³</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>NO₂:</span>
            <span style="color: #374151;">${no2Value} ppb</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>O₃:</span>
            <span style="color: #374151;">${o3Value} µg/m³</span>
          </div>
        </div>
      </div>
      
      <!-- Vetor de Vento (Seta + Velocidade) -->
      <div style="
        position: absolute;
        left: 65px;
        top: 75px;
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 2;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" 
             style="transform: rotate(${station.windDirection}deg); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));"
             xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L6 12h4v10h4V12h4z" 
                fill="white" 
                stroke="#1a3d47" 
                stroke-width="1.5"/>
        </svg>
        <span style="
          font-size: 10px;
          font-weight: 700;
          color: white;
          text-shadow: 0 1px 3px rgba(0,0,0,0.6);
          font-family: system-ui, -apple-system, sans-serif;
        ">${station.windSpeed} km/h</span>
      </div>
    </div>
  `;
  
  return L.divIcon({
    html: htmlIcon,
    className: 'custom-marker-icon-enhanced',
    iconSize: [300, 120],
    iconAnchor: [80, 75],
    popupAnchor: [0, -75]
  });
};

// Função para criar conteúdo do popup
const createPopupContent = (station: Station, isReadOnly: boolean = false) => {
  const iqarColor = getStatusColor(station.status);
  
  // Criar sparkline (mini gráfico)
  const trendPoints = station.trend.map((value, index) => {
    const x = (index / (station.trend.length - 1)) * 100;
    const maxValue = Math.max(...station.trend);
    const minValue = Math.min(...station.trend);
    const y = 30 - ((value - minValue) / (maxValue - minValue)) * 25;
    return `${x},${y}`;
  }).join(' ');
  
  // Grid de parâmetros
  const parametersGrid = station.parameters.map(param => {
    const paramColor = getStatusColor(param.status);
    return `
      <div style="background-color: #f9fafb; padding: 8px; border-radius: 6px; border-left: 3px solid ${paramColor};">
        <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">${param.name}</div>
        <div style="font-size: 14px; font-weight: 600; color: #111827;">${param.value} ${param.unit}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); min-width: 340px; max-width: 340px; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Cabeçalho com IQAr -->
      <div style="background-color: ${iqarColor}; padding: 16px; border-radius: 12px 12px 0 0;">
        <div style="color: white; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          Índice de Qualidade do Ar
        </div>
        <div style="color: white; font-size: 32px; font-weight: 700; line-height: 1;">
          ${station.iqar}
        </div>
        <div style="color: white; font-size: 14px; font-weight: 600; margin-top: 4px;">
          ${station.iqarLabel}
        </div>
        <div style="color: rgba(255,255,255,0.85); font-size: 11px; margin-top: 8px; display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>${station.name} ${station.code}</span>
        </div>
      </div>
      
      <!-- Corpo -->
      <div style="padding: 16px;">
        <!-- Grid de Parâmetros -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Principais Poluentes
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            ${parametersGrid}
          </div>
        </div>
        
        <!-- Dados de Vento -->
        <div style="background-color: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #0ea5e9;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" fill="none" stroke="#0369a1" viewBox="0 0 24 24" style="transform: rotate(${station.windDirection}deg);">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <div style="flex: 1;">
              <div style="font-size: 11px; color: #0369a1; font-weight: 500;">Vento</div>
              <div style="font-size: 13px; color: #0c4a6e; font-weight: 600;">
                ${station.windSpeed} km/h - Direção: ${station.wind} (${station.windDirection}°)
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tendência (Sparkline) -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Tendência (Últimas 6 horas)
          </div>
          <svg width="100%" height="35" style="background: #f9fafb; border-radius: 6px; padding: 2px;">
            <polyline 
              points="${trendPoints}" 
              fill="none" 
              stroke="${iqarColor}" 
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline 
              points="${trendPoints}" 
              fill="none" 
              stroke="${iqarColor}" 
              stroke-width="1" 
              opacity="0.2"
              transform="translate(0, 5)"
            />
          </svg>
        </div>
        
        <!-- Botões de Ação -->
        <button class="analyze-consistency-btn w-full" style="width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #1a3d47 0%, #2a4d57 100%); color: white; font-size: 13px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; ${isReadOnly ? '' : 'margin-bottom: 8px;'}" data-station-id="${station.id}" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(26, 61, 71, 0.3)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Analisar Consistência
        </button>
        
        ${!isReadOnly ? `<button class="edit-station-btn w-full" style="width: 100%; padding: 10px 16px; background: white; color: #1a3d47; font-size: 13px; font-weight: 600; border: 2px solid #1a3d47; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;" data-station-id="${station.id}" onmouseover="this.style.background='#f0f9ff'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(26, 61, 71, 0.15)';" onmouseout="this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Editar Estação
        </button>` : ''}
      </div>
    </div>
  `;
};

interface MapPageProps {
  onNavigateToConsistency: (stationName: string) => void;
}

export function MapPage({ onNavigateToConsistency }: MapPageProps) {
  // Hook de segregação de dados
  const { filterStations } = useDataSegregation();
  
  // Hook de permissões
  const { canEdit, isReadOnly } = usePermissions();
  
  // Hook de autenticação
  const { user } = useAuth();
  
  // Estado para gerenciar as estações
  const [stations, setStations] = useState<Station[]>(stationsData);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [mapTileLayer, setMapTileLayer] = useState<"satellite" | "street">("satellite");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [activeTab, setActiveTab] = useState<"location" | "sensors">("location");
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [currentSensors, setCurrentSensors] = useState<Sensor[]>([]);
  const [editingSensorId, setEditingSensorId] = useState<number | null>(null);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [wmsLayers, setWmsLayers] = useState({
    topography: false,
    wildfires: false
  });
  const [formData, setFormData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    status: "Ativa"
  });
  const [sensorFormData, setSensorFormData] = useState({
    parameter: "",
    manufacturer: "",
    serial: "",
    installDate: ""
  });
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersMenuRef = useRef<HTMLDivElement>(null);
  const wmsLayersRef = useRef<{
    topography: L.TileLayer.WMS | null;
    wildfires: L.TileLayer.WMS | null;
  }>({
    topography: null,
    wildfires: null
  });

  // Inicializar o mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Criar o mapa
    const map = L.map(mapContainerRef.current, {
      center: [-23.5505, -46.6333],
      zoom: 11,
      zoomControl: true,
    });

    mapRef.current = map;

    // Adicionar camada de tiles
    const tileUrl = mapTileLayer === "satellite"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Filtrar estações baseado nas permissões do usuário
    const accessibleStationNames = filterStations(stations.map(s => s.name));
    const filtered = stations.filter(station => accessibleStationNames.includes(station.name));
    
    // Atualizar estado com estações filtradas
    setFilteredStations(filtered);
    
    // Selecionar automaticamente a primeira estação da lista
    if (filtered.length > 0) {
      setSelectedStation(filtered[0]);
    }

    // Adicionar marcadores
    filtered.forEach((station) => {
      const marker = L.marker([station.lat, station.lng], {
        icon: createCustomIcon(station, false) // Inicialmente sem animação
      }) as L.Marker & { stationId?: number; stationData?: Station };

      // Armazenar ID e dados da estação no marcador para referência futura
      marker.stationId = station.id;
      marker.stationData = station;

      marker.addTo(map);
      
      // Criar popup
      const popup = L.popup({
        closeButton: false,
        className: 'custom-popup',
        maxWidth: 360,
      }).setContent(createPopupContent(station, isReadOnly));

      marker.bindPopup(popup);
      
      // Event listener para clique
      marker.on('click', () => {
        setSelectedStation(station);
      });

      // Event listener para abertura do popup (para configurar botões)
      marker.on('popupopen', (e) => {
        // Garantir que a estação seja marcada como selecionada ao abrir o popup
        setSelectedStation(station);
        
        // Usar setTimeout para garantir que o DOM do popup foi renderizado
        setTimeout(() => {
          const popupElement = (e.popup as any).getElement();
          
          // Botão "Analisar Consistência" - buscar dentro do popup específico
          const analyzeBtn = popupElement?.querySelector('.analyze-consistency-btn') as HTMLButtonElement;
          
          if (analyzeBtn && !analyzeBtn.dataset.listenerAttached) {
            // Marcar que o listener já foi anexado para evitar duplicação
            analyzeBtn.dataset.listenerAttached = 'true';
            
            const handleAnalyzeClick = () => {
              const stationId = analyzeBtn.getAttribute('data-station-id');
              const targetStation = stations.find(s => s.id === parseInt(stationId || '0'));
              if (targetStation) {
                // Feedback visual: desabilitar botão e mostrar loading
                analyzeBtn.disabled = true;
                analyzeBtn.style.opacity = '0.7';
                analyzeBtn.style.cursor = 'wait';
                analyzeBtn.innerHTML = `
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
                    <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
                    <circle cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray="31.4 31.4" opacity="0.25"/>
                    <path stroke-linecap="round" stroke-width="4" d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
                  </svg>
                  Processando...
                `;
                
                // Simular processamento e navegar
                setTimeout(() => {
                  onNavigateToConsistency(targetStation.name);
                }, 400); // 400ms para dar feedback visual suave
              }
            };
            
            analyzeBtn.addEventListener('click', handleAnalyzeClick);
            
            // Remover listener quando o popup fechar
            marker.once('popupclose', () => {
              analyzeBtn.removeEventListener('click', handleAnalyzeClick);
              delete analyzeBtn.dataset.listenerAttached;
            });
          }
          
          // Botão "Editar Estação"
          const editBtn = popupElement?.querySelector('.edit-station-btn') as HTMLButtonElement;
          
          if (editBtn && !editBtn.dataset.listenerAttached) {
            // Marcar que o listener já foi anexado para evitar duplicação
            editBtn.dataset.listenerAttached = 'true';
            
            const handleEditClick = () => {
              const stationId = editBtn.getAttribute('data-station-id');
              const targetStation = stations.find(s => s.id === parseInt(stationId || '0'));
              if (targetStation) {
                // Fechar o popup
                marker.closePopup();
                
                // Abrir o modal de edição
                setIsModalOpen(true);
                setIsEditMode(true);
                setEditingStation(targetStation);
                setFormData({
                  name: targetStation.name,
                  latitude: targetStation.lat.toString(),
                  longitude: targetStation.lng.toString(),
                  description: targetStation.type || ''
                });
                
                // Carregar sensores reais da estação usando o ID
                setCurrentSensors(stationSensors[targetStation.id] || []);
              }
            };
            
            editBtn.addEventListener('click', handleEditClick);
            
            // Remover listener quando o popup fechar
            marker.once('popupclose', () => {
              editBtn.removeEventListener('click', handleEditClick);
              delete editBtn.dataset.listenerAttached;
            });
          }
        }, 50); // Pequeno delay para garantir renderização do DOM
      });

      // Event listener para fechar popup (desmarcar seleção)
      marker.on('popupclose', () => {
        setSelectedStation(null);
      });

      markersRef.current.push(marker);
    });

    // Abrir popup da primeira estação automaticamente
    if (filtered.length > 0 && markersRef.current.length > 0) {
      const firstMarker = markersRef.current[0];
      const firstStation = filtered[0];
      
      setTimeout(() => {
        // Centralizar na estação com zoom e compensação do painel
        const offsetX = -192; // Deslocamento para compensar o painel (384px / 2)
        const targetPoint = map.project([firstStation.lat, firstStation.lng], 13);
        const targetLatLng = map.unproject(targetPoint.subtract([offsetX, 0]), 13);
        
        map.setView(targetLatLng, 13, {
          animate: true,
          duration: 1
        });
        
        // Abrir popup após centralizar
        setTimeout(() => {
          firstMarker.openPopup();
        }, 1000);
      }, 500); // Delay para garantir que o mapa esteja pronto
    }

    // Adicionar controle customizado de tipo de mapa ao lado do zoom
    const MapTypeControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.marginTop = '10px';
        container.innerHTML = `
          <a href="#" class="map-type-toggle" title="Alternar tipo de mapa" style="
            width: 30px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            text-decoration: none;
            color: #1a3d47;
            font-size: 16px;
            display: block;
            background: white;
          ">🗺️</a>
        `;
        
        L.DomEvent.disableClickPropagation(container);
        
        return container;
      }
    });

    const mapTypeControl = new MapTypeControl();
    mapTypeControl.addTo(map);

    // Adicionar controle de camadas WMS
    const LayersControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.marginTop = '10px';
        container.innerHTML = `
          <a href="#" class="layers-toggle" title="Camadas Geoserver (WMS)" style="
            width: 30px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            text-decoration: none;
            color: #1a3d47;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </a>
        `;
        
        L.DomEvent.disableClickPropagation(container);
        
        return container;
      }
    });

    const layersControl = new LayersControl();
    layersControl.addTo(map);

    // Event listener para o botão de tipo de mapa
    setTimeout(() => {
      const toggleBtn = document.querySelector('.map-type-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          setMapTileLayer(prev => prev === 'satellite' ? 'street' : 'satellite');
          toggleBtn.innerHTML = mapTileLayer === 'satellite' ? '🛰️' : '🗺️';
        });
      }

      const layersBtn = document.querySelector('.layers-toggle');
      if (layersBtn) {
        layersBtn.addEventListener('click', (e) => {
          e.preventDefault();
          setIsLayersMenuOpen(prev => !prev);
        });
      }
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar tile layer quando mudar o tipo
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    // Remover tile layer antigo
    tileLayerRef.current.remove();

    // Adicionar novo tile layer
    const tileUrl = mapTileLayer === "satellite"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    newTileLayer.addTo(mapRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapTileLayer]);

  // Atualizar ícones dos marcadores quando a estação selecionada mudar
  useEffect(() => {
    if (markersRef.current.length === 0) return;

    // Atualizar todos os marcadores
    markersRef.current.forEach((marker) => {
      const customMarker = marker as L.Marker & { stationId?: number; stationData?: Station };
      const isSelected = selectedStation?.id === customMarker.stationId;
      
      // Atualizar o ícone com animação apenas se estiver selecionado
      if (customMarker.stationData) {
        marker.setIcon(createCustomIcon(customMarker.stationData, isSelected));
      }
    });
  }, [selectedStation]);

  // Efeito para gerenciar clique no mapa quando está selecionando localização
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isSelectingLocation) {
        const { lat, lng } = e.latlng;
        
        // Preencher formulário com coordenadas
        setFormData({
          name: "",
          latitude: lat.toFixed(4),
          longitude: lng.toFixed(4),
          status: "Ativa"
        });
        
        // Desativar modo de seleção
        setIsSelectingLocation(false);
        
        // Abrir modal
        setIsModalOpen(true);
        // Carregar sensores para nova estação (vazia)
        setCurrentSensors([]);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isSelectingLocation]);

  // Efeito para mudar cursor do mapa quando estiver selecionando
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

    if (isSelectingLocation) {
      mapContainer.style.cursor = 'crosshair';
    } else {
      mapContainer.style.cursor = '';
    }
  }, [isSelectingLocation]);

  // Efeito para fechar menu de camadas ao clicar fora
  useEffect(() => {
    if (!isLayersMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Verificar se o clique foi no menu de camadas ou no botão de toggle
      const layersMenu = layersMenuRef.current;
      const layersToggleBtn = document.querySelector('.layers-toggle');
      
      if (layersMenu && !layersMenu.contains(target) && 
          layersToggleBtn && !layersToggleBtn.contains(target)) {
        setIsLayersMenuOpen(false);
      }
    };

    // Adicionar listener após um pequeno delay para evitar fechar imediatamente
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayersMenuOpen]);

  // Função para centralizar no marcador quando clicar no painel
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    
    if (mapRef.current) {
      const map = mapRef.current;
      
      // Centralizar na estação com zoom e compensação do painel em uma única chamada
      const offsetX = -192; // Deslocamento para compensar o painel (384px / 2)
      const targetPoint = map.project([station.lat, station.lng], 13);
      const targetLatLng = map.unproject(targetPoint.subtract([offsetX, 0]), 13);
      
      map.setView(targetLatLng, 13, {
        animate: true,
        duration: 1
      });

      // Abrir popup do marcador correspondente após a animação
      const targetMarker = markersRef.current.find(marker => {
        const customMarker = marker as L.Marker & { stationId?: number };
        return customMarker.stationId === station.id;
      });
      
      if (targetMarker) {
        setTimeout(() => {
          if (mapRef.current && targetMarker) {
            targetMarker.openPopup();
          }
        }, 1000);
      }
    }
  };

  // Funções do modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsEditMode(false);
    setFormData({
      name: "",
      latitude: "",
      longitude: "",
      status: "Ativa"
    });
    // Carregar sensores para nova estação (vazia)
    setCurrentSensors([]);
  };

  const handleEditStation = (station: Station, e: React.MouseEvent) => {
    e.stopPropagation(); // Impedir que o clique do card seja acionado
    setIsModalOpen(true);
    setIsEditMode(true);
    setEditingStation(station);
    setFormData({
      name: station.name,
      latitude: station.lat.toString(),
      longitude: station.lng.toString(),
      status: "Ativa" // Mapear do status interno
    });
    // Carregar sensores reais da estação usando o ID
    setCurrentSensors(stationSensors[station.id] || []);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingStation(null);
    setActiveTab("location"); // Resetar para a aba de localização
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveStation = () => {
    // Modo de edição
    if (isEditMode && editingStation) {
      // Atualizar estação existente
      const updatedStation: Station = {
        ...editingStation,
        name: formData.name,
        lat: parseFloat(formData.latitude),
        lng: parseFloat(formData.longitude),
        lastUpdate: getCurrentDateTime(),
      };
      
      // Atualizar nos arrays de estações
      setStations(prevStations => 
        prevStations.map(s => s.id === editingStation.id ? updatedStation : s)
      );
      
      setFilteredStations(prevFiltered => 
        prevFiltered.map(s => s.id === editingStation.id ? updatedStation : s)
      );
      
      // Atualizar marcador no mapa
      if (mapRef.current) {
        const marker = markersRef.current.find(m => m.stationId === editingStation.id);
        if (marker) {
          // Atualizar posição se mudou
          if (marker.getLatLng().lat !== updatedStation.lat || marker.getLatLng().lng !== updatedStation.lng) {
            marker.setLatLng([updatedStation.lat, updatedStation.lng]);
          }
          
          // Atualizar dados e popup
          marker.stationData = updatedStation;
          marker.setPopupContent(createPopupContent(updatedStation, isReadOnly));
        }
      }
      
      // Notificação de sucesso
      toast.success(`Estação "${formData.name}" atualizada com sucesso!`, {
        description: `Lat: ${formData.latitude}° • Long: ${formData.longitude}°`,
        duration: 5000,
      });
      
      handleCloseModal();
      
      // Limpar formulário
      setFormData({
        name: "",
        latitude: "",
        longitude: "",
        status: "Ativa"
      });
      setCurrentSensors([]);
      return;
    }
    
    // Modo de criação - Gerar código automaticamente em ordem crescente
    const maxCode = Math.max(...stations.map(s => parseInt(s.code.replace('#', ''))));
    const newCode = `#${maxCode + 1}`;
    const newId = Math.max(...stations.map(s => s.id)) + 1;
    
    // Criar nova estação
    const newStation: Station = {
      id: newId,
      code: newCode,
      name: formData.name,
      lat: parseFloat(formData.latitude),
      lng: parseFloat(formData.longitude),
      status: "good",
      pm10: 0,
      wind: "N",
      windSpeed: 0,
      windDirection: 0,
      lastUpdate: getCurrentDateTime(),
      iqar: 0,
      iqarLabel: "BOA",
      unit: user?.unit || "Unidade SP",
      parameters: [],
      trend: [0, 0, 0, 0, 0, 0]
    };
    
    // Adicionar ao estado de estações
    setStations(prevStations => [...prevStations, newStation]);
    
    // Adicionar ao estado de estações filtradas
    setFilteredStations(prevFiltered => [...prevFiltered, newStation]);
    
    // Criar marcador no mapa
    if (mapRef.current) {
      const map = mapRef.current;
      
      const marker = L.marker([newStation.lat, newStation.lng], {
        icon: createCustomIcon(newStation, false)
      }) as L.Marker & { stationId?: number; stationData?: Station };

      marker.stationId = newStation.id;
      marker.stationData = newStation;
      marker.addTo(map);
      
      // Criar popup
      const popup = L.popup({
        closeButton: false,
        className: 'custom-popup',
        maxWidth: 360,
      }).setContent(createPopupContent(newStation, isReadOnly));

      marker.bindPopup(popup);
      
      // Event listener para clique
      marker.on('click', () => {
        setSelectedStation(newStation);
      });

      // Event listener para abertura do popup
      marker.on('popupopen', (e) => {
        setSelectedStation(newStation);
        
        setTimeout(() => {
          const popupElement = (e.popup as any).getElement();
          
          // Botão "Analisar Consistência"
          const analyzeBtn = popupElement?.querySelector('.analyze-consistency-btn') as HTMLButtonElement;
          
          if (analyzeBtn && !analyzeBtn.dataset.listenerAttached) {
            analyzeBtn.dataset.listenerAttached = 'true';
            
            const handleAnalyzeClick = () => {
              analyzeBtn.disabled = true;
              analyzeBtn.style.opacity = '0.7';
              analyzeBtn.style.cursor = 'wait';
              analyzeBtn.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
                  <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
                  <circle cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray="31.4 31.4" opacity="0.25"/>
                  <path stroke-linecap="round" stroke-width="4" d="M12 2a10 10 0 0 1 10 10" opacity="0.75"/>
                </svg>
                Processando...
              `;
              
              setTimeout(() => {
                onNavigateToConsistency(newStation.name);
              }, 400);
            };
            
            analyzeBtn.addEventListener('click', handleAnalyzeClick);
            
            marker.once('popupclose', () => {
              analyzeBtn.removeEventListener('click', handleAnalyzeClick);
              delete analyzeBtn.dataset.listenerAttached;
            });
          }
          
          // Botão "Editar Estação"
          const editBtn = popupElement?.querySelector('.edit-station-btn') as HTMLButtonElement;
          
          if (editBtn && !editBtn.dataset.listenerAttached) {
            editBtn.dataset.listenerAttached = 'true';
            
            const handleEditClick = () => {
              marker.closePopup();
              setIsModalOpen(true);
              setIsEditMode(true);
              setEditingStation(newStation);
              setFormData({
                name: newStation.name,
                latitude: newStation.lat.toString(),
                longitude: newStation.lng.toString(),
                description: newStation.type || ''
              });
              // Carregar sensores reais da estação
              setCurrentSensors(stationSensors[newStation.id] || []);
            };
            
            editBtn.addEventListener('click', handleEditClick);
            
            marker.once('popupclose', () => {
              editBtn.removeEventListener('click', handleEditClick);
              delete editBtn.dataset.listenerAttached;
            });
          }
        }, 50);
      });

      // Event listener para fechar popup
      marker.on('popupclose', () => {
        setSelectedStation(null);
      });

      markersRef.current.push(marker);
      
      // Centralizar no novo marcador
      const offsetX = -192;
      const targetPoint = map.project([newStation.lat, newStation.lng], 13);
      const targetLatLng = map.unproject(targetPoint.subtract([offsetX, 0]), 13);
      
      map.setView(targetLatLng, 13, {
        animate: true,
        duration: 1
      });
      
      // Abrir popup
      setTimeout(() => {
        marker.openPopup();
      }, 1000);
    }
    
    // Notificação de sucesso
    toast.success(`Estação "${formData.name}" cadastrada com sucesso!`, {
      description: `Código: ${newCode} • Lat: ${formData.latitude}° • Long: ${formData.longitude}°`,
      duration: 5000,
    });
    
    handleCloseModal();
    
    // Limpar formulário
    setFormData({
      name: "",
      latitude: "",
      longitude: "",
      status: "Ativa"
    });
    setCurrentSensors([]);
  };

  // Funções para gerenciar modal de sensor
  const handleOpenSensorModal = () => {
    setIsSensorModalOpen(true);
    setEditingSensorId(null);
    setSensorFormData({
      parameter: "",
      manufacturer: "",
      serial: "",
      installDate: ""
    });
  };

  const handleEditSensor = (sensor: Sensor) => {
    setIsSensorModalOpen(true);
    setEditingSensorId(sensor.id);
    setSensorFormData({
      parameter: sensor.parameter,
      manufacturer: `${sensor.brand} ${sensor.model}`,
      serial: sensor.serial,
      installDate: "" // Data não está armazenada no sensor
    });
  };

  const handleCloseSensorModal = () => {
    setIsSensorModalOpen(false);
    setEditingSensorId(null);
  };

  const handleSensorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSensorFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSensor = () => {
    if (editingSensorId !== null) {
      // Modo de edição - atualizar sensor existente
      setCurrentSensors(prev => prev.map(sensor => {
        if (sensor.id === editingSensorId) {
          return {
            ...sensor,
            parameter: sensorFormData.parameter,
            brand: sensorFormData.manufacturer.split(' ')[0],
            model: sensorFormData.manufacturer.split(' ').slice(1).join(' '),
            serial: sensorFormData.serial
          };
        }
        return sensor;
      }));
    } else {
      // Modo de criação - criar novo sensor
      const newSensor: Sensor = {
        id: currentSensors.length + 1,
        parameter: sensorFormData.parameter,
        brand: sensorFormData.manufacturer.split(' ')[0],
        model: sensorFormData.manufacturer.split(' ').slice(1).join(' '),
        serial: sensorFormData.serial || "S/N: BR-8821",
        status: "maintenance" // Status padrão: Calibração
      };

      setCurrentSensors(prev => [...prev, newSensor]);
    }
    
    // Fechar modal
    handleCloseSensorModal();
  };

  const handleDeleteSensor = () => {
    if (editingSensorId === null) return;

    // Confirmar exclusão
    const confirmDelete = window.confirm("Tem certeza que deseja excluir este sensor? Esta ação não pode ser desfeita.");
    
    if (confirmDelete) {
      // Remover sensor da lista
      setCurrentSensors(prev => prev.filter(sensor => sensor.id !== editingSensorId));
      
      // Fechar modal
      handleCloseSensorModal();
    }
  };

  // Funções para gerenciar camadas WMS
  const handleToggleLayersMenu = () => {
    setIsLayersMenuOpen(prev => !prev);
  };

  const handleToggleWmsLayer = (layer: "topography" | "wildfires") => {
    const map = mapRef.current;
    if (!map) return;

    const currentLayer = wmsLayersRef.current[layer];
    if (currentLayer) {
      // Remover camada se já estiver ativa
      map.removeLayer(currentLayer);
      wmsLayersRef.current[layer] = null;
      setWmsLayers(prev => ({
        ...prev,
        [layer]: false
      }));
    } else {
      // Adicionar nova camada WMS
      if (layer === "topography") {
        // Camada de Topografia da Terrestris
        const topographyLayer = L.tileLayer.wms("https://ows.terrestris.de/osm/service", {
          layers: "TOPO-WMS",
          format: 'image/png',
          transparent: true,
          attribution: '© <a href="https://www.terrestris.de">Terrestris</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        topographyLayer.addTo(map);
        wmsLayersRef.current[layer] = topographyLayer;
      } else if (layer === "wildfires") {
        // Camada de Queimadas do INPE
        try {
          const wildfiresLayer = L.tileLayer.wms("http://queimadas.dgi.inpe.br/queimadas/geoserver/wms", {
            layers: "bdqueimadas:focos_24h",
            format: 'image/png',
            transparent: true,
            attribution: '© <a href="https://queimadas.dgi.inpe.br">INPE - Programa Queimadas</a>'
          });
          wildfiresLayer.addTo(map);
          wmsLayersRef.current[layer] = wildfiresLayer;
          
          // Fallback para servidor alternativo se INPE falhar
          wildfiresLayer.on('tileerror', () => {
            console.warn("Servidor INPE indisponível, tentando fallback...");
            map.removeLayer(wildfiresLayer);
            
            // Fallback: Radar de Precipitação
            const fallbackLayer = L.tileLayer.wms("https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
              layers: "nexrad-n0r-900913",
              format: 'image/png',
              transparent: true,
              attribution: '© <a href="https://mesonet.agron.iastate.edu">Iowa Environmental Mesonet</a>'
            });
            fallbackLayer.addTo(map);
            wmsLayersRef.current[layer] = fallbackLayer;
          });
        } catch (error) {
          console.error("Erro ao carregar camada de queimadas:", error);
        }
      }
      
      setWmsLayers(prev => ({
        ...prev,
        [layer]: true
      }));
    }
  };

  return (
    <>
      {/* Estilos CSS para animação de pulso do halo */}
      <style>{`
        @keyframes pulse-halo {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.3;
          }
        }
        
        .pulse-halo {
          animation: pulse-halo 2.5s ease-in-out infinite;
        }
        
        .custom-marker-icon-enhanced {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      
      <div className="relative w-full h-full bg-gray-900 overflow-hidden flex">
        {/* Container do Mapa Leaflet */}
        <div 
          ref={mapContainerRef} 
          className="flex-1 z-[1]"
          style={{ width: '100%', height: '100%' }}
        />

      {/* Painel Lateral - Gestão de Pontos */}
      <div className="w-96 bg-white shadow-2xl overflow-hidden z-[1000] flex flex-col h-full">
        {/* Header */}
        <div className="bg-[#1a3d47] text-white px-5 py-4 flex-shrink-0">
          <h2 className="text-lg font-bold">Gestão de Pontos de Monitoramento</h2>
          <p className="text-sm text-gray-200 mt-1">Estações Georreferenciadas</p>
        </div>

        {/* Lista de Estações */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredStations.map((station, index) => (
            <div
              key={station.id}
              onClick={() => handleStationClick(station)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedStation?.id === station.id 
                  ? "border-[#1a3d47] ring-4 ring-[#1a3d47]/30 shadow-lg bg-blue-50" 
                  : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPinIcon
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
                  <p className="font-semibold text-gray-900">{station.windSpeed} m/s ({station.wind})</p>
                </div>
              </div>

              {/* Timestamp de atualização */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-400 italic">
                  Atualizado em: {station.lastUpdate}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer com botões */}
        {!isReadOnly && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <button 
              className="w-full px-4 py-2 bg-[#1a3d47] text-white text-sm font-medium rounded-md hover:bg-[#2a4d57] transition-colors" 
              onClick={() => setIsSelectingLocation(true)}
            >
              📍 Selecionar Localização no Mapa
            </button>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 z-[1000] w-64">
        {/* Título */}
        <h3 className="text-xs font-semibold text-[#1a3d47] mb-2 border-b border-gray-200 pb-1.5">
          Legenda: IQAr
        </h3>
        
        {/* Escala de Cores e Classificação */}
        <div className="space-y-1.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#22c55e] flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-gray-900">Boa (0 - 40)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#eab308] flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-gray-900">Moderada (41 - 80)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#f97316] flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-gray-900">Ruim (81 - 120)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#ef4444] flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-gray-900">Muito Ruim (121 - 200)</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#9333ea] flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-gray-900">Péssima (&gt; 200)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Instrução para Seleção de Localização */}
      {isSelectingLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#1a3d47] text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-white z-[1500] flex items-center gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <MapPinIcon className="w-6 h-6 animate-bounce" />
            <div>
              <p className="text-sm font-bold">Modo de Seleção Ativo</p>
              <p className="text-xs text-gray-200">Clique no mapa para selecionar a localização da nova estação</p>
            </div>
          </div>
          <button
            onClick={() => setIsSelectingLocation(false)}
            className="ml-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md transition-colors"
          >
            ✕ Cancelar
          </button>
        </div>
      )}

      {/* Estilos customizados */}
      <style>{`
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
        }

        .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }

        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }

        .leaflet-popup-tip {
          display: none !important;
        }

        .leaflet-control-zoom {
          border: 2px solid #e5e7eb !important;
          border-radius: 0.5rem !important;
          overflow: hidden;
        }

        .leaflet-control-zoom a {
          color: #1a3d47 !important;
          font-weight: bold !important;
          background-color: white !important;
        }

        .leaflet-control-zoom a:hover {
          background-color: #f3f4f6 !important;
        }

        .leaflet-container {
          font-family: inherit;
        }
      `}</style>

      {/* Modal para adicionar/editar estação */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl shadow-2xl w-[720px] max-w-[90vw] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do Modal */}
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">{isEditMode ? "Editar Estação de Monitoramento" : "Cadastro de Estação de Monitoramento"}</h2>
              <p className="text-sm text-gray-200 mt-1">Georreferenciamento e Gestão de Ativos</p>
            </div>

            {/* Abas de Navegação */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setActiveTab("location")}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "location"
                    ? "text-[#1a3d47] border-b-2 border-[#1a3d47] bg-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                📍 Localização e Detalhes
              </button>
              <button
                onClick={() => setActiveTab("sensors")}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === "sensors"
                    ? "text-[#1a3d47] border-b-2 border-[#1a3d47] bg-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                🔬 Sensores e Analisadores
              </button>
            </div>

            {/* Corpo do Modal - Scrollável */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "location" ? (
                <div className="p-6 space-y-4">
                  {/* Nome da Estação */}
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

                  {/* Latitude e Longitude em Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Latitude */}
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

                    {/* Longitude */}
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

                  {/* Status Operacional */}
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
                  {/* Header da Aba de Sensores */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Equipamentos Instalados</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Sensores e analisadores configurados nesta estação de monitoramento
                    </p>
                  </div>

                  {/* Tabela de Sensores */}
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
                        {(() => {
                          // Usar sensores do estado atual
                          const sensors = currentSensors;
                          
                          if (sensors.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center">
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold text-gray-700">Nenhum sensor cadastrado</p>
                                      <p className="text-xs text-gray-500 mt-1">Clique em "+ Adicionar Sensor" para começar</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          
                          return sensors.map((sensor) => (
                            <tr key={sensor.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {sensor.parameter}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex flex-col">
                                  <span className="font-medium">{sensor.brand}</span>
                                  <span className="text-xs text-gray-500">{sensor.model}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                {sensor.serial}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    sensor.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : sensor.status === "maintenance"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {sensor.status === "active" ? "✓ Ativo" : sensor.status === "maintenance" ? "⚠ Calibração" : "✗ Inativo"}
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
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Botão Adicionar Sensor */}
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

            {/* Footer do Modal */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3 border-t border-gray-200">
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
                {isEditMode ? "✓ Editar Estação" : "✓ Salvar Estação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para adicionar/editar sensor */}
      {isSensorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000]" onClick={handleCloseSensorModal}>
          <div className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do Modal */}
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold">
                {editingSensorId !== null ? "Editar Sensor" : "Adicionar Sensor"}
              </h2>
              <p className="text-sm text-gray-200 mt-1">Configuração de Equipamentos</p>
            </div>

            {/* Corpo do Modal - Scrollável */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Parâmetro */}
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

              {/* Fabricante/Modelo */}
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

              {/* Número de Série */}
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

              {/* Data de Instalação */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data de Instalação <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="installDate"
                  value={sensorFormData.installDate}
                  onChange={handleSensorInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3d47] focus:border-transparent text-gray-900"
                />
              </div>

              {/* Nota informativa */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  <strong>✓ Vinculação:</strong> O sensor será cadastrado com status "Calibração" (amarelo). Após a instalação e calibração, o status poderá ser alterado para "Ativo".
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
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
                  <div></div>
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

      {/* Menu de Camadas WMS */}
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
            {/* Camada 1: Topografia */}
            <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wmsLayers.topography}
                  onChange={() => handleToggleWmsLayer("topography")}
                  className="mt-0.5 w-4 h-4 text-[#1a3d47] bg-gray-100 border-gray-300 rounded focus:ring-[#1a3d47] focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">🗺️ Topografia (Terrestris)</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Camada topográfica do OpenStreetMap
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    WMS: ows.terrestris.de
                  </div>
                </div>
              </label>
            </div>

            {/* Camada 2: Queimadas/Focos de Calor */}
            <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wmsLayers.wildfires}
                  onChange={() => handleToggleWmsLayer("wildfires")}
                  className="mt-0.5 w-4 h-4 text-[#1a3d47] bg-gray-100 border-gray-300 rounded focus:ring-[#1a3d47] focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">🔥 Queimadas (INPE)</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Focos de calor detectados nas últimas 24h
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">
                    WMS: queimadas.dgi.inpe.br
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 italic">
              💡 Camadas WMS reais em tempo real
            </p>
          </div>
        </div>
      )}
      </div>
    </>
  );
}