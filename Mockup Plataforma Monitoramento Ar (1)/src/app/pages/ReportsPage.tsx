import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Calendar, 
  MapPin, 
  Filter,
  TrendingUp,
  Wind,
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Table,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { useDataSegregation } from '../hooks/useDataSegregation';
import { generateConsistencyData, aggregateData, STATIONS, PARAMETERS, DataRow } from '../data/stationsData';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area
} from 'recharts';

// Função auxiliar para gerar dados entre datas específicas
function generateDataBetweenDates(
  station: string,
  parameter: string,
  startDate: Date,
  endDate: Date,
  intervalMinutes: number = 60 // Padrão: 1 hora
): DataRow[] {
  const stationKey = station.split(' ')[1]; // "REPLAN", "UTGCA", "REDUC", etc.
  const paramKey = parameter;

  // Mapeamento de valores base por estação e parâmetro
  const baseValues: Record<string, Record<string, { base: number; variance: number; unit: string }>> = {
    REPLAN: {
      "MP₁₀": { base: 32, variance: 8, unit: "µg/m³" },
      "SO₂": { base: 55, variance: 20, unit: "µg/m³" },
      "O₃": { base: 80, variance: 15, unit: "µg/m³" },
      "NOx": { base: 28, variance: 10, unit: "ppb" },
      "CO": { base: 1.2, variance: 0.4, unit: "mg/m³" },
      "HCT": { base: 45, variance: 15, unit: "µg/m³" },
      "BTEX": { base: 12, variance: 5, unit: "µg/m³" },
      "MP₂.₅": { base: 22, variance: 6, unit: "µg/m³" }
    },
    UTGCA: {
      "MP₁₀": { base: 15, variance: 5, unit: "µg/m³" },
      "SO₂": { base: 8, variance: 3, unit: "µg/m³" },
      "O₃": { base: 45, variance: 12, unit: "µg/m³" },
      "NOx": { base: 12, variance: 5, unit: "ppb" },
      "CO": { base: 0.6, variance: 0.2, unit: "mg/m³" },
      "HCT": { base: 18, variance: 8, unit: "µg/m³" },
      "BTEX": { base: 5, variance: 2, unit: "µg/m³" },
      "MP₂.₅": { base: 10, variance: 3, unit: "µg/m³" }
    },
    REDUC: {
      "MP₁₀": { base: 42, variance: 10, unit: "µg/m³" },
      "SO₂": { base: 18, variance: 8, unit: "µg/m³" },
      "O₃": { base: 62, variance: 18, unit: "µg/m³" },
      "NOx": { base: 35, variance: 12, unit: "ppb" },
      "CO": { base: 1.5, variance: 0.5, unit: "mg/m³" },
      "HCT": { base: 52, variance: 18, unit: "µg/m³" },
      "BTEX": { base: 15, variance: 6, unit: "µg/m³" },
      "MP₂.₅": { base: 28, variance: 8, unit: "µg/m³" }
    },
    TECAB: {
      "MP₁₀": { base: 58, variance: 15, unit: "µg/m³" },
      "SO₂": { base: 25, variance: 10, unit: "µg/m³" },
      "O₃": { base: 88, variance: 20, unit: "µg/m³" },
      "NOx": { base: 42, variance: 15, unit: "ppb" },
      "CO": { base: 1.8, variance: 0.6, unit: "mg/m³" },
      "HCT": { base: 68, variance: 22, unit: "µg/m³" },
      "BTEX": { base: 18, variance: 7, unit: "µg/m³" },
      "MP₂.₅": { base: 35, variance: 10, unit: "µg/m³" }
    },
    Boaventura: {
      "MP₁₀": { base: 75, variance: 18, unit: "µg/m³" },
      "SO₂": { base: 25, variance: 8, unit: "µg/m³" },
      "O₃": { base: 98, variance: 22, unit: "µg/m³" },
      "NOx": { base: 48, variance: 18, unit: "ppb" },
      "CO": { base: 2.1, variance: 0.7, unit: "mg/m³" },
      "HCT": { base: 82, variance: 25, unit: "µg/m³" },
      "BTEX": { base: 22, variance: 8, unit: "µg/m³" },
      "MP₂.₅": { base: 45, variance: 12, unit: "µg/m³" }
    },
    REGAP: {
      "MP₁₀": { base: 35, variance: 10, unit: "µg/m³" },
      "SO₂": { base: 12, variance: 5, unit: "µg/m³" },
      "O₃": { base: 72, variance: 16, unit: "µg/m³" },
      "NOx": { base: 18, variance: 8, unit: "ppb" },
      "CO": { base: 0.8, variance: 0.3, unit: "mg/m³" },
      "HCT": { base: 38, variance: 12, unit: "µg/m³" },
      "BTEX": { base: 8, variance: 3, unit: "µg/m³" },
      "MP₂.₅": { base: 18, variance: 5, unit: "µg/m³" }
    },
    RNEST: {
      "MP₁₀": { base: 48, variance: 12, unit: "µg/m³" },
      "SO₂": { base: 22, variance: 8, unit: "µg/m³" },
      "O₃": { base: 85, variance: 18, unit: "µg/m³" },
      "NOx": { base: 38, variance: 14, unit: "ppb" },
      "CO": { base: 1.6, variance: 0.5, unit: "mg/m³" },
      "HCT": { base: 62, variance: 20, unit: "µg/m³" },
      "BTEX": { base: 16, variance: 6, unit: "µg/m³" },
      "MP₂.₅": { base: 32, variance: 9, unit: "µg/m³" }
    },
    REFAP: {
      "MP₁₀": { base: 38, variance: 10, unit: "µg/m³" },
      "SO₂": { base: 15, variance: 6, unit: "µg/m³" },
      "O₃": { base: 68, variance: 15, unit: "µg/m³" },
      "NOx": { base: 22, variance: 9, unit: "ppb" },
      "CO": { base: 1.0, variance: 0.4, unit: "mg/m³" },
      "HCT": { base: 42, variance: 14, unit: "µg/m³" },
      "BTEX": { base: 10, variance: 4, unit: "µg/m³" },
      "MP₂.₅": { base: 24, variance: 7, unit: "µg/m³" }
    }
  };

  const stationValues = baseValues[stationKey] || baseValues.REPLAN;
  const paramValues = stationValues[paramKey] || stationValues["MP₁₀"];

  // Gerar array de datas entre startDate e endDate
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    dates.push(`${day}/${month}/${year} ${hours}:${minutes}`);
    
    currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
  }

  // Função auxiliar para gerar valores aleatórios
  const generateValue = (base: number, variance: number, index: number, total: number) => {
    const randomFactor = Math.sin(index * 0.5) * variance + (Math.random() - 0.5) * (variance * 0.3);
    return (base + randomFactor).toFixed(1);
  };

  // Gerar dados
  const data: DataRow[] = dates.map((dateTime, index) => {
    const value = generateValue(paramValues.base, paramValues.variance, index, dates.length);
    return {
      id: index + 1,
      dateTime,
      rawValue: value,
      finalValue: value,
      unit: paramValues.unit,
      status: "valid" as const,
      justification: "-",
      operator: "-"
    };
  });

  return data;
}

export function ReportsPage() {
  // Hook de segregação de dados
  const { getAccessibleStations, getDefaultStation } = useDataSegregation();
  const accessibleStations = getAccessibleStations();
  
  // Calcular data inicial (30 dias atrás) e data final (hoje)
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Estados dos filtros (valores temporários - não afetam os gráficos até clicar em Filtrar)
  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [selectedStation, setSelectedStation] = useState(getDefaultStation());
  const [selectedParams, setSelectedParams] = useState<string[]>(PARAMETERS); // Todos os parâmetros selecionados
  const [timeGranularity, setTimeGranularity] = useState<"1min" | "15min" | "1h" | "1d">("1d"); // Intervalo de Agregação
  
  // Estados dos filtros APLICADOS (usados nos gráficos e tabela)
  const [appliedStartDate, setAppliedStartDate] = useState(formatDate(thirtyDaysAgo));
  const [appliedEndDate, setAppliedEndDate] = useState(formatDate(today));
  const [appliedStation, setAppliedStation] = useState(getDefaultStation());
  const [appliedParams, setAppliedParams] = useState<string[]>(PARAMETERS);
  const [appliedTimeGranularity, setAppliedTimeGranularity] = useState<"1min" | "15min" | "1h" | "1d">("1d");
  
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const [isParamDropdownOpen, setIsParamDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [rawConsistencyData, setRawConsistencyData] = useState<DataRow[]>([]);
  const [hasFiltered, setHasFiltered] = useState(false);
  const stationDropdownRef = useRef<HTMLDivElement>(null);
  const paramDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para dados processados dos gráficos
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [iqarData, setIqarData] = useState<any[]>([]);
  const [windRoseData, setWindRoseData] = useState<any[]>([]);
  const [pollutantRoseData, setPollutantRoseData] = useState<any[]>([]);
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [rawDataTable, setRawDataTable] = useState<Array<{ datetime: string; station: string; parameter: string; value: number; unit: string; status: string }>>([]);

  // Opções de intervalo de agregação (granularidade temporal)
  const aggregationIntervals = [
    { value: "1min", label: "1 minuto" },
    { value: "15min", label: "15 minutos" },
    { value: "1h", label: "1 hora" },
    { value: "1d", label: "1 dia" }
  ];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stationDropdownRef.current && !stationDropdownRef.current.contains(event.target as Node)) {
        setIsStationDropdownOpen(false);
      }
      if (paramDropdownRef.current && !paramDropdownRef.current.contains(event.target as Node)) {
        setIsParamDropdownOpen(false);
      }
    };

    if (isStationDropdownOpen || isParamDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStationDropdownOpen, isParamDropdownOpen]);

  // Executar filtro automaticamente ao carregar a página
  useEffect(() => {
    if (!hasFiltered) {
      handleGenerateReport();
      setHasFiltered(true);
    }
  }, []);

  const handleToggleStation = (station: string) => {
    setSelectedStation(station);
    setIsStationDropdownOpen(false);
  };

  const handleToggleParameter = (param: string) => {
    if (selectedParams.includes(param)) {
      setSelectedParams(selectedParams.filter(p => p !== param));
    } else {
      setSelectedParams([...selectedParams, param]);
    }
  };

  // Função para obter cor do gradiente laranja-vermelho baseado na concentração
  const getPollutantColor = (concentration: number) => {
    // Gradiente de laranja (#f97316) para vermelho (#dc2626)
    // Normaliza entre 0-100
    const normalized = Math.min(100, Math.max(0, concentration));
    if (normalized < 30) return '#fbbf24'; // Amarelo-laranja (baixo)
    if (normalized < 50) return '#f97316'; // Laranja (médio-baixo)
    if (normalized < 70) return '#ea580c'; // Laranja escuro (médio-alto)
    return '#dc2626'; // Vermelho (alto)
  };

  const COLORS = {
    valid: '#10b981',
    invalid: '#ef4444',
    bom: '#22c55e',
    moderado: '#eab308',
    ruim: '#f97316',
    muitoRuim: '#ef4444',
    pessima: '#9333ea',
    primary: '#1a3d47'
  };

  const getIQArColor = (status: string) => {
    switch (status) {
      case 'Boa': return COLORS.bom;
      case 'Moderada': return COLORS.moderado;
      case 'Ruim': return COLORS.ruim;
      case 'Muito Ruim': return COLORS.muitoRuim;
      case 'Péssima': return COLORS.pessima;
      default: return '#9ca3af';
    }
  };

  const handleGenerateReport = () => {
    setIsLoading(true);
    console.log('Gerando relatório...', { startDate, endDate, selectedStation, selectedParams, timeGranularity });
    
    setTimeout(() => {
      // Atualizar os filtros aplicados
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
      setAppliedStation(selectedStation);
      setAppliedParams(selectedParams);
      setAppliedTimeGranularity(timeGranularity);
      
      // Converter datas string para Date objects
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Determinar intervalo em minutos baseado no timeGranularity
      const intervalMinutes = timeGranularity === '1min' ? 1 :
                             timeGranularity === '15min' ? 15 :
                             timeGranularity === '1h' ? 60 :
                             1440; // 1 dia
      
      // === 1. EVOLUÇÃO TEMPORAL - Gerar dados para cada parâmetro selecionado ===
      const evolutionDataMap: Record<string, any> = {};
      
      selectedParams.forEach(param => {
        const rawData = generateDataBetweenDates(selectedStation, param, start, end, intervalMinutes);
        
        rawData.forEach((row, index) => {
          // Extrair apenas dia/mês da data
          const [datePart] = row.dateTime.split(' ');
          const [day, month] = datePart.split('/');
          const key = `${day}/${month}`;
          
          if (!evolutionDataMap[key]) {
            evolutionDataMap[key] = { date: key, limit: 50 };
          }
          
          // Mapear parâmetro para chave do gráfico
          const paramKey = param === 'MP₁₀' ? 'PM10' : 
                          param === 'MP₂.₅' ? 'PM25' : 
                          param === 'NO₂' ? 'NO2' :
                          param === 'SO₂' ? 'SO2' :
                          param === 'O₃' ? 'O3' : param;
          
          evolutionDataMap[key][paramKey] = parseFloat(row.finalValue);
        });
      });
      
      // Converter para array e pegar apenas alguns pontos (espaçados)
      const allEvolutionData = Object.values(evolutionDataMap);
      const step = Math.max(1, Math.floor(allEvolutionData.length / 8)); // Máximo 8 pontos
      const sampledEvolutionData = allEvolutionData.filter((_, i) => i % step === 0 || i === allEvolutionData.length - 1);
      setEvolutionData(sampledEvolutionData);
      
      // === 2. IQAr DIÁRIO - Calcular baseado nos valores dos poluentes ===
      const iqarDataGenerated: any[] = [];
      const iqarDays = Math.min(14, diffDays); // Últimos 14 dias ou menos
      
      for (let i = 0; i < iqarDays; i++) {
        const date = new Date(end);
        date.setDate(date.getDate() - (iqarDays - 1 - i));
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        // Simular cálculo de IQAr (na realidade seria baseado nos poluentes)
        const iqarValue = 30 + Math.random() * 90; // 30-120
        const status = iqarValue <= 40 ? 'Boa' : 
                       iqarValue <= 80 ? 'Moderada' : 
                       iqarValue <= 120 ? 'Ruim' : 'Muito Ruim';
        
        iqarDataGenerated.push({
          day: `${day}/${month}`,
          iqar: Math.round(iqarValue),
          status
        });
      }
      setIqarData(iqarDataGenerated);
      
      // === 3. ROSA DOS VENTOS - Dados simulados (variam por estação) ===
      const stationName = selectedStation.split(' ')[1]; // REPLAN, UTGCA, etc
      const windBase = stationName === 'REPLAN' ? 20 : 
                       stationName === 'UTGCA' ? 15 :
                       stationName === 'TECAB' ? 25 : 22;
      
      setWindRoseData([
        { direction: 'N', frequency: Math.round(windBase + Math.random() * 10) },
        { direction: 'NE', frequency: Math.round(windBase + Math.random() * 15) },
        { direction: 'E', frequency: Math.round(windBase + Math.random() * 12) },
        { direction: 'SE', frequency: Math.round(windBase + Math.random() * 18) },
        { direction: 'S', frequency: Math.round(windBase + Math.random() * 8) },
        { direction: 'SO', frequency: Math.round(windBase + Math.random() * 10) },
        { direction: 'O', frequency: Math.round(windBase + Math.random() * 12) },
        { direction: 'NO', frequency: Math.round(windBase + Math.random() * 14) }
      ]);
      
      // === 4. ROSA DE POLUENTES - Baseado em MP₁₀ da estação ===
      const pm10Data = generateDataBetweenDates(selectedStation, 'MP₁₀', start, end, intervalMinutes);
      const avgPM10 = pm10Data.reduce((sum, row) => sum + parseFloat(row.finalValue), 0) / pm10Data.length;
      
      setPollutantRoseData([
        { direction: 'N', concentration: Math.round(avgPM10 * 0.6) },
        { direction: 'NE', concentration: Math.round(avgPM10 * 0.8) },
        { direction: 'E', concentration: Math.round(avgPM10 * 1.2) },
        { direction: 'SE', concentration: Math.round(avgPM10 * 1.5) },
        { direction: 'S', concentration: Math.round(avgPM10 * 0.9) },
        { direction: 'SO', concentration: Math.round(avgPM10 * 0.7) },
        { direction: 'O', concentration: Math.round(avgPM10 * 0.8) },
        { direction: 'NO', concentration: Math.round(avgPM10 * 1.0) }
      ]);
      
      // === 5. BOX PLOT - Calcular estatísticas para parâmetros selecionados ===
      const boxPlotGenerated = selectedParams.slice(0, 6).map(param => { // Máximo 6 parâmetros
        const rawData = generateDataBetweenDates(selectedStation, param, start, end, intervalMinutes);
        const values = rawData.map(row => parseFloat(row.finalValue)).sort((a, b) => a - b);
        
        const min = Math.round(values[0]);
        const max = Math.round(values[values.length - 1]);
        const q1 = Math.round(values[Math.floor(values.length * 0.25)]);
        const median = Math.round(values[Math.floor(values.length * 0.5)]);
        const q3 = Math.round(values[Math.floor(values.length * 0.75)]);
        
        return { param, min, q1, median, q3, max };
      });
      setBoxPlotData(boxPlotGenerated);
      
      // === 6. DISPONIBILIDADE - Calcular baseado em dados válidos ===
      const sampleData = generateDataBetweenDates(selectedStation, selectedParams[0] || 'MP₁₀', start, end, intervalMinutes);
      const validCount = sampleData.filter(row => row.status === 'valid').length;
      const totalCount = sampleData.length;
      const validPercent = (validCount / totalCount * 100).toFixed(1);
      const invalidPercent = (100 - parseFloat(validPercent)).toFixed(1);
      
      setAvailabilityData([
        { name: 'Dados Válidos', value: parseFloat(validPercent) },
        { name: 'Dados Ausentes', value: parseFloat(invalidPercent) }
      ]);
      
      // === 7. TABELA DE DADOS BRUTOS - Gerar usando generateDataBetweenDates ===
      const tableData: Array<{ datetime: string; station: string; parameter: string; value: number; unit: string; status: string }> = [];
      
      // Gerar dados apenas para a estação selecionada e parâmetros selecionados
      selectedParams.forEach(param => {
        const rawData = generateDataBetweenDates(selectedStation, param, start, end, intervalMinutes);
        
        // Pegar apenas uma amostra dos dados (máximo 50 linhas por parâmetro)
        const sample = rawData.slice(0, 50);
        
        sample.forEach(row => {
          tableData.push({
            datetime: row.dateTime,
            station: selectedStation,
            parameter: param,
            value: parseFloat(row.finalValue),
            unit: row.unit,
            status: row.status === 'valid' ? 'Válido' : 'Inválido'
          });
        });
      });
      
      // Ordenar por data/hora (mais recente primeiro)
      tableData.sort((a, b) => {
        const [dateA, timeA] = a.datetime.split(' ');
        const [dateB, timeB] = b.datetime.split(' ');
        return dateB.localeCompare(dateA) || timeB.localeCompare(timeA);
      });
      
      setRawDataTable(tableData);
      
      setIsLoading(false);
      toast.success('Relatório gerado com sucesso!');
    }, 1500);
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    console.log(`Exportando relatório em formato ${format}...`);
    
    // Gerar dados CSV baseados no gráfico de evolução temporal e IQAr
    const csvData = [
      // Cabeçalho
      ['Data/Hora', 'Estação', 'Parâmetro', 'Valor', 'Unidade', 'Status', 'Operador'],
      
      // Dados do período - Evolução temporal (Janeiro)
      ['15/01/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '150', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['15/01/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '85', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['15/01/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '28', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['15/01/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '95', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      ['20/01/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '148', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['20/01/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '82', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['20/01/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '30', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['20/01/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '98', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      ['25/01/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '135', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['25/01/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '78', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['25/01/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '32', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['25/01/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '92', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      ['30/01/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '155', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['30/01/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '88', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['30/01/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '35', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['30/01/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '102', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      // Dados de Fevereiro
      ['04/02/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '162', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['04/02/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '92', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['04/02/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '38', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['04/02/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '108', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      ['09/02/2026 14:00', 'Estação Refinaria - Industrial', 'PM₁₀', '150', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['09/02/2026 14:00', 'Estação Refinaria - Industrial', 'NO₂', '85', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['09/02/2026 14:00', 'Estação Refinaria - Industrial', 'SO₂', '32', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      ['09/02/2026 14:00', 'Estação Refinaria - Industrial', 'O₃', '98', 'µg/m³', 'Válido', 'Carlos Silva (Admin)'],
      
      // Dados do IQAr (últimos 14 dias)
      ['27/01/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '75', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['28/01/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '82', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['29/01/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '95', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['30/01/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '105', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['31/01/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '88', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['01/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '115', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['02/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '135', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['03/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '142', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['04/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '128', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['05/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '110', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['06/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '92', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['07/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '78', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['08/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '98', '-', 'Válido', 'Carlos Silva (Admin)'],
      ['09/02/2026 12:00', 'Estação Refinaria - Industrial', 'IQAr', '85', '-', 'Válido', 'Carlos Silva (Admin)'],
    ];
    
    // Converter para formato CSV (separado por ponto e vírgula)
    const csvContent = csvData.map(row => row.join(';')).join('\n');
    
    // Adicionar BOM para garantir que caracteres especiais sejam exibidos corretamente no Excel
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Criar Blob com o conteúdo CSV
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    
    // Criar URL temporária para o blob
    const url = URL.createObjectURL(blob);
    
    // Criar elemento <a> temporário para disparar o download
    const link = document.createElement('a');
    link.href = url;
    link.download = format === 'xlsx' 
      ? 'Relatorio_Qualidade_Ar_Refinaria.xlsx' 
      : 'Relatorio_Qualidade_Ar_Refinaria.csv';
    
    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar a URL temporária
    URL.revokeObjectURL(url);
    
    // Exibir toast de sucesso
    toast.success('Download iniciado com sucesso!');
  };

  // Usa as estações acessíveis com base no perfil do usuário
  const stations = accessibleStations;
  const parameters = ['O₃', 'NOx', 'SO₂', 'CO', 'HCT', 'BTEX', 'MP₁₀', 'MP₂.₅'];

  return (
    <main className="flex-1 p-4 overflow-auto bg-gray-50">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Filtros de Consulta</h3>
        <div className="flex items-end gap-4">
          {/* Data Inicial */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
            />
          </div>

          {/* Data Final */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
            />
          </div>

          {/* Estação - Select Nativo */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-600 font-medium">Selecionar Estação de Monitoramento</label>
            <div className="relative">
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
              >
                {stations.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Intervalo de Agregação */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600 font-medium">Intervalo de Agregação</label>
            <div className="relative">
              <select
                value={timeGranularity}
                onChange={(e) => setTimeGranularity(e.target.value as "1min" | "15min" | "1h" | "1d")}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
              >
                {aggregationIntervals.map((interval) => (
                  <option key={interval.value} value={interval.value}>
                    {interval.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Parâmetros - Select Múltiplo Nativo */}
          <div className="flex flex-col gap-1 w-64" ref={paramDropdownRef}>
            <label className="text-xs text-gray-600 font-medium">Parâmetros a Analisar</label>
            <button
              onClick={() => setIsParamDropdownOpen(!isParamDropdownOpen)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer flex items-center justify-between"
            >
              <span className="text-gray-700">
                {selectedParams.length === 0
                  ? 'Selecione os parâmetros'
                  : selectedParams.length === 1
                  ? `${selectedParams[0]}`
                  : `${selectedParams.length} parâmetros selecionados`}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isParamDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isParamDropdownOpen && (
              <div className="absolute mt-[4.5rem] w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {parameters.map((param) => (
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

          {/* Botão Filtrar */}
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-6 py-2 bg-[#1a3d47] text-white rounded-lg text-sm hover:bg-[#2a4d57] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Carregando...
              </>
            ) : (
              'Filtrar'
            )}
          </button>
        </div>
      </div>

      {/* Dashboard de Resultados OU Tabela de Dados Brutos */}
      <div className="relative">
        {/* Barra de Ações */}
        <div className="flex items-center justify-between mb-4">
          {/* Toggle Visualização */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <button
              onClick={() => setShowRawData(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !showRawData 
                  ? 'bg-[#1a3d47] text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-2" />
              Gráficos Analíticos
            </button>
            <button
              onClick={() => setShowRawData(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showRawData 
                  ? 'bg-[#1a3d47] text-white' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Table className="w-4 h-4 inline-block mr-2" />
              Tabela de Dados
            </button>
          </div>

          {/* Botões de Exportação */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('xlsx')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar (.xlsx)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exportar (.csv)
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-[#1a3d47] animate-spin mx-auto" />
              <p className="mt-4 text-lg font-semibold text-gray-700">Processando dados...</p>
              <p className="text-sm text-gray-500">Gerando relatório analítico</p>
            </div>
          </div>
        )}

        {/* TABELA DE DADOS BRUTOS */}
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
                  {rawDataTable.map((row, index) => (
                    <tr 
                      key={index} 
                      className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors border-b border-gray-200`}
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

            {/* Informações adicionais */}
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Total de registros: <span className="font-semibold text-gray-700">{rawDataTable.length}</span></span>
                <span>•</span>
                <span>Dados válidos: <span className="font-semibold text-green-600">{rawDataTable.length}</span></span>
              </div>
              <span className="text-gray-400">
                Última atualização: 09/02/2026 14:05
              </span>
            </div>
          </div>
        ) : (
          // GRÁFICOS (conteúdo original)
          <div className="grid grid-cols-12 gap-4">
            {/* Card 1 - Gráfico de Evolução Temporal (Full Width) */}
            <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Evolução Temporal de Poluentes</h3>
              <p className="text-xs text-gray-500 mb-4">Período: {appliedStartDate} a {appliedEndDate}</p>

              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  
                  {/* Linha limite */}
                  <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="" dot={false} />
                  
                  {/* Linhas de todos os poluentes - usa appliedParams */}
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

            {/* Card 2 - IQAr Diário */}
            <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Índice de Qualidade do Ar Diário (IQAr)</h3>
              <p className="text-xs text-gray-500 mb-4">Evolução do IQAr nos últimos 14 dias</p>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={iqarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'IQAr', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="iqar" name="IQAr" radius={[8, 8, 0, 0]}>
                    {iqarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getIQArColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Legenda de Status */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.bom }}></div>
                  <span className="text-xs text-gray-600">Boa (0-40)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.moderado }}></div>
                  <span className="text-xs text-gray-600">Moderada (41-80)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.ruim }}></div>
                  <span className="text-xs text-gray-600">Ruim (81-120)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.muitoRuim }}></div>
                  <span className="text-xs text-gray-600">Muito Ruim (121-200)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.pessima }}></div>
                  <span className="text-xs text-gray-600">Péssima (201-300)</span>
                </div>
              </div>
            </div>

            {/* Card - Disponibilidade da Rede */}
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
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>

              {/* Valor Central */}
              <div className="text-center mt-[-140px] mb-[80px] pointer-events-none">
                <div className="text-3xl font-bold text-[#10b981]">
                  {availabilityData.find(d => d.name === 'Dados Válidos')?.value.toFixed(1) || '0.0'}%
                </div>
                <div className="text-xs text-gray-500 mt-1">Dados Válidos</div>
              </div>

              {/* Legenda */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.valid }}></div>
                    <span className="text-xs text-gray-600">Dados Válidos</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {availabilityData.find(d => d.name === 'Dados Válidos')?.value.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.invalid }}></div>
                    <span className="text-xs text-gray-600">Dados Ausentes</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {availabilityData.find(d => d.name === 'Dados Ausentes')?.value.toFixed(1) || '0.0'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3 - Rosa dos Ventos */}
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
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Card 4 - Rosa de Poluentes */}
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
                    formatter={(value: any) => [`${value} µg/m³`, 'Concentração']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Legenda de Gradiente */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2 text-center">Escala de Concentração</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }}></div>
                    <span className="text-xs text-gray-600">Baixa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                    <span className="text-xs text-gray-600">Média</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ea580c' }}></div>
                    <span className="text-xs text-gray-600">Alta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#dc2626' }}></div>
                    <span className="text-xs text-gray-600">Crítica</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5 - Box Plot (Estatísticas) */}
            <div className="col-span-12 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Estatísticas Descritivas (Box Plot)</h3>
              <p className="text-xs text-gray-500 mb-4">Distribuição estatística dos parâmetros medidos (µg/m³)</p>

              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={boxPlotData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="param" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: 'Concentração (µg/m³)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data.param}</p>
                            <p className="text-xs text-gray-600">Máximo: <span className="font-semibold">{data.max} µg/m³</span></p>
                            <p className="text-xs text-gray-600">Q3 (75%): <span className="font-semibold">{data.q3} µg/m³</span></p>
                            <p className="text-xs text-gray-600">Mediana: <span className="font-semibold">{data.median} µg/m³</span></p>
                            <p className="text-xs text-gray-600">Q1 (25%): <span className="font-semibold">{data.q1} µg/m³</span></p>
                            <p className="text-xs text-gray-600">Mínimo: <span className="font-semibold">{data.min} µg/m³</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Linha do Mínimo ao Máximo */}
                  <Bar dataKey="min" stackId="a" fill="transparent" />
                  <Bar dataKey="q1" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="median" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="q3" stackId="a" fill="#93c5fd" radius={[0, 0, 4, 4]} />
                  
                  {/* Marcadores para Min, Median, Max */}
                  <Line type="monotone" dataKey="median" stroke="#1a3d47" strokeWidth={3} dot={{ r: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legenda explicativa */}
              <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#93c5fd] rounded"></div>
                  <span>Quartis (Q1-Q3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#3b82f6] rounded"></div>
                  <span>Mediana</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 border-2 border-[#1a3d47]"></div>
                  <span>Linha Mediana</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}