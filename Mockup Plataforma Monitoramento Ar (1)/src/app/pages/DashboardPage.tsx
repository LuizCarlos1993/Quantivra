import { useMemo, useEffect } from "react";
import { AirQualityCard } from "../components/AirQualityCard";
import { WindRoseChart } from "../components/WindRoseChart";
import { PollutantRoseChart } from "../components/PollutantRoseChart";
import { TimelineChart } from "../components/TimelineChart";
import { AvailabilityIndicator } from "../components/AvailabilityIndicator";
import { SupervisoryTable } from "../components/SupervisoryTable";
import { FilterSection } from "../components/FilterSection";
import { useDataSegregation } from "../hooks/useDataSegregation";

// Definição dos cenários de estações
const stationScenarios = {
  "Estação REPLAN (Paulínia - SP)": {
    profile: "Refinaria Industrial",
    coordinates: "-22.7545°S, -47.1475°W",
    baseIQAr: 42,
    quality: "BOA",
    color: "green",
    avgPollution: 35,
    availability: 98.5,
    windData: [
      { direction: "N", velocity: 2.1 },
      { direction: "NE", velocity: 2.5 },
      { direction: "L", velocity: 3.2 },
      { direction: "SE", velocity: 4.8 },
      { direction: "S", velocity: 12.5 },
      { direction: "SO", velocity: 11.8 },
      { direction: "O", velocity: 3.8 },
      { direction: "NO", velocity: 2.8 },
    ],
    pollutantData: [
      { direction: "N", concentration: 25 },
      { direction: "NE", concentration: 32 },
      { direction: "L", concentration: 45 },
      { direction: "SE", concentration: 58 },
      { direction: "S", concentration: 42 },
      { direction: "SO", concentration: 38 },
      { direction: "O", concentration: 35 },
      { direction: "NO", concentration: 30 },
    ],
    parameters: [
      { name: "Ozônio (O₃)", value: "48", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM2.5)", value: "18", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM10)", value: "32", unit: "µg/m³", status: "normal" as const },
      { name: "Dióxido de Nitrogênio (NO₂)", value: "42", unit: "µg/m³", status: "normal" as const },
      { name: "Monóxido de Carbono (CO)", value: "0.8", unit: "mg/m³", status: "normal" as const },
      { name: "Dióxido de Enxofre (SO₂)", value: "35", unit: "µg/m³", status: "normal" as const },
    ],
  },
  "Estação UTGCA - Fazenda (Caraguatatuba - SP)": {
    profile: "Terminal/Costeiro",
    coordinates: "-23.6200°S, -45.4200°W",
    baseIQAr: 15,
    quality: "BOA",
    color: "green",
    avgPollution: 12,
    availability: 99.8,
    windData: [
      { direction: "N", velocity: 4.2 },
      { direction: "NE", velocity: 5.8 },
      { direction: "L", velocity: 11.5 },
      { direction: "SE", velocity: 10.2 },
      { direction: "S", velocity: 4.5 },
      { direction: "SO", velocity: 3.8 },
      { direction: "O", velocity: 3.2 },
      { direction: "NO", velocity: 4.8 },
    ],
    pollutantData: [
      { direction: "N", concentration: 8 },
      { direction: "NE", concentration: 12 },
      { direction: "L", concentration: 18 },
      { direction: "SE", concentration: 15 },
      { direction: "S", concentration: 6 },
      { direction: "SO", concentration: 5 },
      { direction: "O", concentration: 4 },
      { direction: "NO", concentration: 7 },
    ],
    parameters: [
      { name: "Ozônio (O₃)", value: "45", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM2.5)", value: "12", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM10)", value: "18", unit: "µg/m³", status: "normal" as const },
      { name: "Dióxido de Nitrogênio (NO₂)", value: "28", unit: "µg/m³", status: "normal" as const },
      { name: "Monóxido de Carbono (CO)", value: "0.4", unit: "mg/m³", status: "normal" as const },
      { name: "Dióxido de Enxofre (SO₂)", value: "8", unit: "µg/m³", status: "normal" as const },
    ],
  },
  "Estação REDUC - Canal do Meio (Duque de Caxias - RJ)": {
    profile: "Refinaria Industrial",
    coordinates: "-22.7200°S, -43.2900°W",
    baseIQAr: 42,
    quality: "BOA",
    color: "green",
    avgPollution: 35,
    availability: 98.5,
    windData: [
      { direction: "N", velocity: 3.2 },
      { direction: "NE", velocity: 2.8 },
      { direction: "L", velocity: 4.5 },
      { direction: "SE", velocity: 3.8 },
      { direction: "S", velocity: 2.5 },
      { direction: "SO", velocity: 3.1 },
      { direction: "O", velocity: 3.9 },
      { direction: "NO", velocity: 3.3 },
    ],
    pollutantData: [
      { direction: "N", concentration: 35 },
      { direction: "NE", concentration: 28 },
      { direction: "L", concentration: 45 },
      { direction: "SE", concentration: 38 },
      { direction: "S", concentration: 25 },
      { direction: "SO", concentration: 32 },
      { direction: "O", concentration: 40 },
      { direction: "NO", concentration: 30 },
    ],
    parameters: [
      { name: "Ozônio (O₃)", value: "85", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM2.5)", value: "48", unit: "µg/m³", status: "alert" as const },
      { name: "Material Particulado (PM10)", value: "68", unit: "µg/m³", status: "normal" as const },
      { name: "Dióxido de Nitrogênio (NO₂)", value: "95", unit: "µg/m³", status: "alert" as const },
      { name: "Monóxido de Carbono (CO)", value: "1.8", unit: "mg/m³", status: "normal" as const },
      { name: "Dióxido de Enxofre (SO₂)", value: "18", unit: "µg/m³", status: "normal" as const },
    ],
  },
  "Estação TECAB (Macaé - RJ)": {
    profile: "Base Offshore",
    coordinates: "-22.3770°S, -41.7870°W",
    baseIQAr: 58,
    quality: "MODERADA",
    color: "yellow",
    avgPollution: 48,
    availability: 97.2,
    windData: [
      { direction: "N", velocity: 4.5 },
      { direction: "NE", velocity: 3.8 },
      { direction: "L", velocity: 5.2 },
      { direction: "SE", velocity: 4.2 },
      { direction: "S", velocity: 3.5 },
      { direction: "SO", velocity: 4.1 },
      { direction: "O", velocity: 4.8 },
      { direction: "NO", velocity: 4.3 },
    ],
    pollutantData: [
      { direction: "N", concentration: 42 },
      { direction: "NE", concentration: 35 },
      { direction: "L", concentration: 52 },
      { direction: "SE", concentration: 45 },
      { direction: "S", concentration: 32 },
      { direction: "SO", concentration: 38 },
      { direction: "O", concentration: 48 },
      { direction: "NO", concentration: 40 },
    ],
    parameters: [
      { name: "Ozônio (O₃)", value: "95", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM2.5)", value: "38", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM10)", value: "72", unit: "µg/m³", status: "normal" as const },
      { name: "Dióxido de Nitrogênio (NO₂)", value: "88", unit: "µg/m³", status: "alert" as const },
      { name: "Monóxido de Carbono (CO)", value: "1.5", unit: "mg/m³", status: "normal" as const },
      { name: "Dióxido de Enxofre (SO₂)", value: "22", unit: "µg/m³", status: "normal" as const },
    ],
  },
  "Estação Boaventura - Estreito (Itaboraí - RJ)": {
    profile: "Complexo Petroquímico",
    coordinates: "-22.7445°S, -42.8597°W",
    baseIQAr: 68,
    quality: "MODERADA",
    color: "yellow",
    avgPollution: 55,
    availability: 96.5,
    windData: [
      { direction: "N", velocity: 3.8 },
      { direction: "NE", velocity: 3.2 },
      { direction: "L", velocity: 4.8 },
      { direction: "SE", velocity: 5.5 },
      { direction: "S", velocity: 4.2 },
      { direction: "SO", velocity: 3.5 },
      { direction: "O", velocity: 4.2 },
      { direction: "NO", velocity: 3.8 },
    ],
    pollutantData: [
      { direction: "N", concentration: 48 },
      { direction: "NE", concentration: 38 },
      { direction: "L", concentration: 58 },
      { direction: "SE", concentration: 65 },
      { direction: "S", concentration: 52 },
      { direction: "SO", concentration: 42 },
      { direction: "O", concentration: 50 },
      { direction: "NO", concentration: 45 },
    ],
    parameters: [
      { name: "Ozônio (O₃)", value: "105", unit: "µg/m³", status: "alert" as const },
      { name: "Material Particulado (PM2.5)", value: "45", unit: "µg/m³", status: "normal" as const },
      { name: "Material Particulado (PM10)", value: "82", unit: "µg/m³", status: "normal" as const },
      { name: "Dióxido de Nitrogênio (NO₂)", value: "92", unit: "µg/m³", status: "alert" as const },
      { name: "Monóxido de Carbono (CO)", value: "1.9", unit: "mg/m³", status: "normal" as const },
      { name: "Dióxido de Enxofre (SO₂)", value: "25", unit: "µg/m³", status: "normal" as const },
    ],
  },
};

// Função para gerar dados baseado na estação e data
function generateDataForStationAndDate(station: string, date: string) {
  const scenario = stationScenarios[station as keyof typeof stationScenarios];
  const dateObj = new Date(date);
  const dayOfMonth = dateObj.getDate();
  
  // Variação diária do IQAr baseado no dia do mês
  const dailyVariation = (dayOfMonth % 10) * 5;
  const iqarValue = Math.max(10, scenario.baseIQAr + dailyVariation - 25);
  
  // Determina qualidade do ar baseado no valor
  let quality = scenario.quality;
  let color = scenario.color;
  
  if (iqarValue <= 50) {
    quality = "BOA";
    color = "green";
  } else if (iqarValue <= 100) {
    quality = "MODERADA";
    color = "yellow";
  } else if (iqarValue <= 150) {
    quality = "RUIM";
    color = "orange";
  } else if (iqarValue <= 200) {
    quality = "MUITO RUIM";
    color = "red";
  } else {
    quality = "PÉSSIMA";
    color = "purple";
  }
  
  // Fator de variação baseado na data (usa dia + hash da data para consistência)
  const dateFactor = (dayOfMonth % 7) / 10; // -0.3 a +0.3 aproximadamente
  const dateVariation = dateFactor - 0.3;
  
  // Varia os dados de vento baseado na data
  const windData = scenario.windData.map(point => ({
    ...point,
    velocity: Math.max(0.5, point.velocity * (1 + dateVariation))
  }));
  
  // Varia os dados de poluentes baseado na data
  const pollutantData = scenario.pollutantData.map(point => ({
    ...point,
    concentration: Math.max(1, Math.round(point.concentration * (1 + dateVariation * 0.5)))
  }));
  
  // Varia os parâmetros da tabela supervisória baseado na data
  const parameters = scenario.parameters.map(param => {
    const baseValue = parseFloat(param.value);
    const variance = baseValue * dateVariation * 0.3;
    const newValue = Math.max(0, baseValue + variance);
    
    // Determina status baseado no novo valor e tipo de poluente
    let status: "normal" | "alert" | "critical" = "normal";
    
    if (param.name.includes("O₃") && newValue > 100) status = "alert";
    if (param.name.includes("PM2.5") && newValue > 50) status = "alert";
    if (param.name.includes("PM10") && newValue > 100) status = "alert";
    if (param.name.includes("NO₂") && newValue > 150) status = "alert";
    if (param.name.includes("CO") && newValue > 3) status = "alert";
    if (param.name.includes("SO₂")) {
      if (newValue > 200) status = "critical";
      else if (newValue > 100) status = "alert";
    }
    
    return {
      ...param,
      value: param.unit.includes("mg") ? newValue.toFixed(1) : Math.round(newValue).toString(),
      status
    };
  });
  
  // Varia a disponibilidade baseado na data
  const availabilityVariation = (dayOfMonth % 5) * 0.3;
  const availability = Math.min(99.9, Math.max(90, scenario.availability + availabilityVariation - 1));
  
  // Gera dados de timeline baseado no cenário e data
  const timelineData = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    let variation = Math.sin((hour / 24) * Math.PI * 2) * 20;
    
    // Picos nos horários de rush para estações urbanas
    if (scenario.profile === "Urbano" && (hour === 8 || hour === 18)) {
      variation += 30;
    }
    
    // Padrão constante para estação industrial
    if (scenario.profile === "Industrial Crítico") {
      variation = Math.sin((hour / 12) * Math.PI) * 15;
    }
    
    const value = Math.max(5, scenario.avgPollution + variation + (Math.random() - 0.5) * 10);
    
    // Marca o dado das 03:00 como invalidado no cenário Industrial Crítico
    const invalidated = scenario.profile === "Industrial Crítico" && hour === 3;
    
    return {
      time: `${hour.toString().padStart(2, '0')}h`,
      value: Math.round(value),
      invalidated,
    };
  });
  
  return {
    iqar: { value: Math.round(iqarValue), quality, color },
    timelineData,
    windData,
    pollutantData,
    parameters,
    availability,
    coordinates: scenario.coordinates,
  };
}

interface DashboardPageProps {
  selectedStation: string;
  onStationChange: (station: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAlertCountChange?: (count: number) => void;
}

export function DashboardPage({ selectedStation, onStationChange, selectedDate, onDateChange, onAlertCountChange }: DashboardPageProps) {
  // Hook de segregação de dados
  const { getAccessibleStations, canAccessStation, getDefaultStation } = useDataSegregation();
  
  // Verifica se a estação atual é acessível, se não, troca para a padrão
  const accessibleStations = getAccessibleStations();
  
  useEffect(() => {
    if (!canAccessStation(selectedStation)) {
      const defaultStation = getDefaultStation();
      if (defaultStation) {
        onStationChange(defaultStation);
      }
    }
  }, [selectedStation, canAccessStation, getDefaultStation, onStationChange]);
  
  // Gera dados simulados baseado na estação e data selecionadas
  const simulatedData = useMemo(
    () => generateDataForStationAndDate(selectedStation, selectedDate),
    [selectedStation, selectedDate]
  );

  // Calcula a quantidade de alertas baseado nos parâmetros
  const alertCount = useMemo(() => {
    return simulatedData.parameters.filter(
      param => param.status === "alert" || param.status === "critical"
    ).length;
  }, [simulatedData.parameters]);

  // Notifica o App sobre a mudança na contagem de alertas
  useEffect(() => {
    if (onAlertCountChange) {
      onAlertCountChange(alertCount);
    }
  }, [alertCount, onAlertCountChange]);

  return (
    <main className="flex-1 p-4 overflow-auto">
      <FilterSection
        selectedStation={selectedStation}
        onStationChange={onStationChange}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
      />

      {/* Top Section: Availability, IQAr, and Charts */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Availability - Left Side */}
        <div className="col-span-3">
          <AvailabilityIndicator percentage={simulatedData.availability} />
        </div>

        {/* Air Quality Index - Center */}
        <div className="col-span-3">
          <AirQualityCard 
            value={simulatedData.iqar.value} 
            quality={simulatedData.iqar.quality} 
            color={simulatedData.iqar.color} 
          />
        </div>

        {/* Wind and Pollutant Rose Charts - Right Side */}
        <div className="col-span-6 grid grid-cols-2 gap-4">
          <WindRoseChart data={simulatedData.windData} />
          <PollutantRoseChart data={simulatedData.pollutantData} />
        </div>
      </div>

      {/* Supervisory Table */}
      <div className="mb-4">
        <SupervisoryTable parameters={simulatedData.parameters} />
      </div>

      {/* Timeline Chart */}
      <div>
        <TimelineChart data={simulatedData.timelineData} />
      </div>
    </main>
  );
}