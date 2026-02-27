import { useState, useEffect, useMemo } from "react";
import { Search, Download, Filter, ChevronDown, AlertTriangle, CheckCircle, XCircle, AlertCircle, Eye, Upload, FileSpreadsheet } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Dot } from "recharts";
import { usePermissions } from "../hooks/usePermissions";
import { useDataSegregation } from "../hooks/useDataSegregation";
import { toast } from "sonner";

interface ConsistencyPageProps {
  initialStation?: string;
  initialParameter?: string;
  resolvedState?: boolean; // Para mostrar o estado após invalidação
  resolvedAlertIds?: number[]; // IDs de alertas resolvidos
  showResolvedState?: boolean; // Mostrar estado após resolução
  onResolveAlert?: (alertId: number) => void; // Callback quando resolver um alerta
  onUnresolveAlert?: (alertId: number) => void; // Callback quando reverter um alerta
  initialTab?: "explorer" | "pending"; // Aba inicial a ser aberta
  triggerTimestamp?: number; // Timestamp para forçar atualização
}

interface DataRow {
  id: number;
  dateTime: string;
  rawValue: string;
  finalValue: string;
  unit: string;
  status: "valid" | "invalid" | "pending";
  justification: string;
  operator: string;
  alertId?: number; // ID do alerta associado
  parameter?: string; // Parâmetro (usado quando mostra múltiplos parâmetros)
}

// Função para gerar dados mockados baseado na estação e parâmetro
function generateConsistencyData(station: string, parameter: string, period: string, resolvedAlertIds: number[] = []): DataRow[] {
  const stationKey = station.split(" ")[1]; // "REPLAN", "UTGCA", "REDUC", "TECAB", "Boaventura", "REGAP"
  const paramKey = parameter.split(" ")[0]; // "MP₁₀", "SO₂", "O₃", "NOx", "CO", "HCT", "BTEX", "MP₂.₅"

  // Determina quantos dados gerar baseado no período
  const getDataPointsCount = () => {
    switch(period) {
      case "Últimas 24 horas": return 120; // 120 minutos = 2 horas de dados de alta frequência
      case "Últimos 7 dias": return 168; // 1 por hora (7 dias × 24h)
      case "Últimos 30 dias": return 120; // 4 por dia (6h intervalo)
      case "Últimos 90 dias": return 90; // 1 por dia
      default: return 120;
    }
  };

  // Gera array de datas baseado no período
  const generateDateTimes = () => {
    const count = getDataPointsCount();
    const dates: string[] = [];
    const now = new Date("2026-02-09T14:00:00"); // Horário base: 09/02/2026 14:00
    
    let intervalMinutes: number;
    switch(period) {
      case "Últimas 24 horas": intervalMinutes = 1; break; // 1 minuto (alta frequência)
      case "Últimos 7 dias": intervalMinutes = 60; break; // 1 hora
      case "Últimos 30 dias": intervalMinutes = 360; break; // 6 horas
      case "Últimos 90 dias": intervalMinutes = 1440; break; // 24 horas (1 dia)
      default: intervalMinutes = 1;
    }

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      dates.push(`${day}/${month}/${year} ${hours}:${minutes}`);
    }
    
    return dates;
  };

  const dateTimes = generateDateTimes();

  // Função auxiliar para gerar valores aleatórios
  const generateValue = (base: number, variance: number, index: number, total: number) => {
    const randomFactor = Math.sin(index * 0.5) * variance + (Math.random() - 0.5) * (variance * 0.3);
    return (base + randomFactor).toFixed(1);
  };

  // REPLAN + SO₂ - 3 Valores críticos em horários diferentes (Alertas ID 1, 8, 9)
  if (stationKey === "REPLAN" && paramKey === "SO₂") {
    const alert1Resolved = resolvedAlertIds.includes(1);
    const alert8Resolved = resolvedAlertIds.includes(8);
    const alert9Resolved = resolvedAlertIds.includes(9);
    
    const data: DataRow[] = dateTimes.map((dateTime, index) => {
      // 3 alertas em horários diferentes (últimas 2 horas com dados de 1 minuto)
      const alert1Index = dateTimes.length - 15; // 15 minutos atrás (13:45)
      const alert8Index = dateTimes.length - 10; // 10 minutos atrás (13:50)
      const alert9Index = dateTimes.length - 5; // 5 minutos atrás (13:55)
      
      // Alerta 1: SO₂ 250.0 µg/m³ às 13:45
      if (index === alert1Index && period === "Últimas 24 horas") {
        return {
          id: index + 1,
          dateTime,
          rawValue: "250.0",
          finalValue: alert1Resolved ? "-" : "250.0",
          unit: "µg/m³",
          status: alert1Resolved ? "invalid" : "pending",
          justification: alert1Resolved ? "Valor crítico - pico anômalo" : "-",
          operator: alert1Resolved ? "Carlos Silva (Admin)" : "-",
          alertId: 1
        };
      }
      
      // Alerta 8: SO₂ 180.0 µg/m³ às 13:50
      if (index === alert8Index && period === "Últimas 24 horas") {
        return {
          id: index + 1,
          dateTime,
          rawValue: "180.0",
          finalValue: alert8Resolved ? "-" : "180.0",
          unit: "µg/m³",
          status: alert8Resolved ? "invalid" : "pending",
          justification: alert8Resolved ? "Valor elevado - possível interferência" : "-",
          operator: alert8Resolved ? "Carlos Silva (Admin)" : "-",
          alertId: 8
        };
      }
      
      // Alerta 9: SO₂ 125.0 µg/m³ às 13:55
      if (index === alert9Index && period === "Últimas 24 horas") {
        return {
          id: index + 1,
          dateTime,
          rawValue: "125.0",
          finalValue: alert9Resolved ? "-" : "125.0",
          unit: "µg/m³",
          status: alert9Resolved ? "invalid" : "pending",
          justification: alert9Resolved ? "Valor suspeito - verificação necessária" : "-",
          operator: alert9Resolved ? "Carlos Silva (Admin)" : "-",
          alertId: 9
        };
      }
      
      const value = generateValue(55, 20, index, dateTimes.length);
      return {
        id: index + 1,
        dateTime,
        rawValue: value,
        finalValue: value,
        unit: "µg/m³",
        status: "valid",
        justification: "-",
        operator: "Sistema"
      };
    });
    return data;
  }

  // REDUC + MP₁₀ - Duas anomalias independentes (Alertas ID 2 e 5)
  if (stationKey === "REDUC" && paramKey === "MP₁₀") {
    const alert5Resolved = resolvedAlertIds.includes(5);
    const alert2Resolved = resolvedAlertIds.includes(2);
    
    const data: DataRow[] = dateTimes.map((dateTime, index) => {
      const anomaly1Index = dateTimes.length - 8; // 8 minutos atrás (13:52 - 850.0)
      const anomaly2Index = dateTimes.length - 7; // 7 minutos atrás (13:53 - 999.9)
      
      // Primeira anomalia (850.0) - apenas em 24h
      if (index === anomaly1Index) {
        // Se não for período de 24h, sempre mostra como válido
        if (period !== "Últimas 24 horas") {
          const value = generateValue(46, 8, index, dateTimes.length);
          return {
            id: index + 1,
            dateTime,
            rawValue: value,
            finalValue: value,
            unit: "µg/m³",
            status: "valid",
            justification: "-",
            operator: "Sistema"
          };
        }
        
        return {
          id: index + 1,
          dateTime,
          rawValue: "850.0",
          finalValue: alert5Resolved ? "-" : "850.0",
          unit: "µg/m³",
          status: alert5Resolved ? "invalid" : "pending",
          justification: alert5Resolved ? "Valor suspeito detectado" : "-",
          operator: alert5Resolved ? "Carlos Silva (Admin)" : "-",
          alertId: 5
        };
      }
      
      // Segunda anomalia (999.9) - apenas em 24h
      if (index === anomaly2Index) {
        // Se não for período de 24h, sempre mostra como válido
        if (period !== "Últimas 24 horas") {
          const value = generateValue(46, 8, index, dateTimes.length);
          return {
            id: index + 1,
            dateTime,
            rawValue: value,
            finalValue: value,
            unit: "µg/m³",
            status: "valid",
            justification: "-",
            operator: "Sistema"
          };
        }
        
        return {
          id: index + 1,
          dateTime,
          rawValue: "999.9",
          finalValue: alert2Resolved ? "-" : "999.9",
          unit: "µg/m³",
          status: alert2Resolved ? "invalid" : "pending",
          justification: alert2Resolved ? "Anomalia crítica - Pico não representativo" : "-",
          operator: alert2Resolved ? "Carlos Silva (Admin)" : "-",
          alertId: 2
        };
      }
      
      const value = generateValue(46, 8, index, dateTimes.length);
      return {
        id: index + 1,
        dateTime,
        rawValue: value,
        finalValue: value,
        unit: "µg/m³",
        status: "valid",
        justification: "-",
        operator: "Sistema"
      };
    });
    return data;
  }

  // UTGCA + O₃ - Flatline (Alerta ID 3)
  if (stationKey === "UTGCA" && paramKey === "O₃") {
    const isResolved = resolvedAlertIds.includes(3);
    
    const data: DataRow[] = dateTimes.map((dateTime, index) => {
      const flatlineIndex = dateTimes.length - 12; // 12 minutos atrás (13:48)
      
      // Apenas mostra como pendente se for período de 24h e não foi resolvido
      if (index === flatlineIndex && period === "Últimas 24 horas" && !isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "42.5",
          finalValue: "42.5",
          unit: "µg/m³",
          status: "pending",
          justification: "-",
          operator: "-",
          alertId: 3
        };
      }
      
      // Se foi resolvido, mostra como inválido
      if (index === flatlineIndex && isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "42.5",
          finalValue: "-",
          unit: "µg/m³",
          status: "invalid",
          justification: "Flatline detectado - sensor travado",
          operator: "Carlos Silva (Admin)",
          alertId: 3
        };
      }
      
      const value = generateValue(39, 8, index, dateTimes.length);
      return {
        id: index + 1,
        dateTime,
        rawValue: value,
        finalValue: value,
        unit: "µg/m³",
        status: "valid",
        justification: "-",
        operator: "Sistema"
      };
    });
    return data;
  }

  // TECAB + NOx - Período de calibração (Alerta ID 4)
  if (stationKey === "TECAB" && paramKey === "NOx") {
    const isResolved = resolvedAlertIds.includes(4);
    
    const data: DataRow[] = dateTimes.map((dateTime, index) => {
      const calibrationIndex = dateTimes.length - 20; // 20 minutos atrás (13:40)
      
      // Apenas mostra como pendente se for período de 24h e não foi resolvido
      if (index === calibrationIndex && period === "Últimas 24 horas" && !isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "0.0",
          finalValue: "0.0",
          unit: "µg/m³",
          status: "pending",
          justification: "-",
          operator: "-",
          alertId: 4
        };
      }
      
      // Se foi resolvido, mostra como inválido
      if (index === calibrationIndex && isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "0.0",
          finalValue: "-",
          unit: "µg/m³",
          status: "invalid",
          justification: "Período de calibração",
          operator: "Carlos Silva (Admin)",
          alertId: 4
        };
      }
      
      const value = generateValue(31, 7, index, dateTimes.length);
      return {
        id: index + 1,
        dateTime,
        rawValue: value,
        finalValue: value,
        unit: "µg/m³",
        status: "valid",
        justification: "-",
        operator: "Sistema"
      };
    });
    return data;
  }



  // UTGCA + CO - Valor elevado (Alerta ID 10)
  if (stationKey === "UTGCA" && paramKey === "CO") {
    const isResolved = resolvedAlertIds.includes(10);
    const data: DataRow[] = dateTimes.map((dateTime, index) => {
      const warningIndex = dateTimes.length - 6; // 6 minutos atrás (13:54)
      
      if (index === warningIndex && period === "Últimas 24 horas" && !isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "8.5",
          finalValue: "8.5",
          unit: "ppm",
          status: "pending",
          justification: "-",
          operator: "-",
          alertId: 10
        };
      }
      
      if (index === warningIndex && isResolved) {
        return {
          id: index + 1,
          dateTime,
          rawValue: "8.5",
          finalValue: "-",
          unit: "ppm",
          status: "invalid",
          justification: "Valor elevado - evento pontual",
          operator: "Carlos Silva (Admin)",
          alertId: 10
        };
      }
      
      const value = generateValue(2.5, 1.2, index, dateTimes.length);
      return {
        id: index + 1,
        dateTime,
        rawValue: value,
        finalValue: value,
        unit: "ppm",
        status: "valid",
        justification: "-",
        operator: "Sistema"
      };
    });
    return data;
  }

  // UTGCA + MP₂.₅ - SEM ALERTAS (Removido para manter apenas 5 alertas em SP)
  // if (stationKey === "UTGCA" && paramKey === "MP₂.₅") {
  //   const isResolved = resolvedAlertIds.includes(11);
  //   const data: DataRow[] = dateTimes.map((dateTime, index) => {
  //     const warningIndex = dateTimes.length - 3; // 3 períodos atrás
  //     
  //     if (index === warningIndex && period === "Últimas 24 horas" && !isResolved) {
  //       return {
  //         id: index + 1,
  //         dateTime,
  //         rawValue: "55.0",
  //         finalValue: "55.0",
  //         unit: "µg/m³",
  //         status: "pending",
  //         justification: "-",
  //         operator: "-",
  //         alertId: 11
  //       };
  //     }
  //     
  //     if (index === warningIndex && isResolved) {
  //       return {
  //         id: index + 1,
  //         dateTime,
  //         rawValue: "55.0",
  //         finalValue: "-",
  //         unit: "µg/m³",
  //         status: "invalid",
  //         justification: "Valor suspeito - acima do padrão",
  //         operator: "Carlos Silva (Admin)",
  //         alertId: 11
  //       };
  //     }
  //     
  //     const value = generateValue(18, 8, index, dateTimes.length);
  //     return {
  //       id: index + 1,
  //       dateTime,
  //       rawValue: value,
  //       finalValue: value,
  //       unit: "µg/m³",
  //       status: "valid",
  //       justification: "-",
  //       operator: "Sistema"
  //     };
  //   });
  //   return data;
  // }

  // UTGCA + SO₂ - SEM ALERTAS (Removido para manter apenas 5 alertas em SP)
  // if (stationKey === "UTGCA" && paramKey === "SO₂") {
  //   const isResolved = resolvedAlertIds.includes(12);
  //   const data: DataRow[] = dateTimes.map((dateTime, index) => {
  //     const warningIndex = dateTimes.length - 2; // 2 períodos atrás
  //     
  //     if (index === warningIndex && period === "Últimas 24 horas" && !isResolved) {
  //       return {
  //         id: index + 1,
  //         dateTime,
  //         rawValue: "95.0",
  //         finalValue: "95.0",
  //         unit: "µg/m³",
  //         status: "pending",
  //         justification: "-",
  //         operator: "-",
  //         alertId: 12
  //       };
  //     }
  //     
  //     if (index === warningIndex && isResolved) {
  //       return {
  //         id: index + 1,
  //         dateTime,
  //         rawValue: "95.0",
  //         finalValue: "-",
  //         unit: "µg/m³",
  //         status: "invalid",
  //         justification: "Valor elevado - pico anômalo",
  //         operator: "Carlos Silva (Admin)",
  //         alertId: 12
  //       };
  //     }
  //     
  //     const value = generateValue(35, 15, index, dateTimes.length);
  //     return {
  //       id: index + 1,
  //       dateTime,
  //       rawValue: value,
  //       finalValue: value,
  //       unit: "µg/m³",
  //       status: "valid",
  //       justification: "-",
  //       operator: "Sistema"
  //     };
  //   });
  //   return data;
  // }

  // Dados padrão para outras combinações (sem pendentes)
  const data: DataRow[] = dateTimes.map((dateTime, index) => {
    const value = generateValue(27, 10, index, dateTimes.length);
    return {
      id: index + 1,
      dateTime,
      rawValue: value,
      finalValue: value,
      unit: "µg/m³",
      status: "valid",
      justification: "-",
      operator: "Sistema"
    };
  });
  
  return data;
}

export function ConsistencyPage({ initialStation, initialParameter, resolvedState = false, resolvedAlertIds, showResolvedState, onResolveAlert, onUnresolveAlert, initialTab = "explorer", triggerTimestamp }: ConsistencyPageProps = {}) {
  // Hooks de permissões e segregação
  const { canEdit, isReadOnly } = usePermissions();
  const { getAccessibleStations } = useDataSegregation();
  const accessibleStations = getAccessibleStations();
  
  // Estados temporários (valores dos selects, não aplicados ainda)
  const [tempStation, setTempStation] = useState(initialStation || accessibleStations[0] || "Estação REPLAN (Paulínia - SP)");
  const [tempPeriod, setTempPeriod] = useState("Últimas 24 horas");
  const [tempParameter, setTempParameter] = useState(initialParameter || "MP₁₀");
  const [tempInterval, setTempInterval] = useState<"1min" | "15min" | "1h" | "24h">("1min");

  // Estados aplicados (valores após clicar em "Filtrar")
  const [selectedStation, setSelectedStation] = useState(initialStation || accessibleStations[0] || "Estação REPLAN (Paulínia - SP)");
  const [selectedPeriod, setSelectedPeriod] = useState("Últimas 24 horas");
  const [selectedParameter, setSelectedParameter] = useState(initialParameter || "MP₁₀");
  
  // Estado para granularidade temporal (CONTROLE MESTRE) - aplicado após filtrar
  const [timeGranularity, setTimeGranularity] = useState<"1min" | "15min" | "1h" | "24h">("1min");
  
  const [isInvalidateModalOpen, setIsInvalidateModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [selectedJustification, setSelectedJustification] = useState("");
  const [selectedObservations, setSelectedObservations] = useState("");
  const [activeTab, setActiveTab] = useState<"explorer" | "pending">(initialTab);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<number[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchJustification, setBatchJustification] = useState("");
  const [batchObservations, setBatchObservations] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStation, setImportStation] = useState("");
  const [importParameter, setImportParameter] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isFromBellClick, setIsFromBellClick] = useState(false); // Flag para identificar se veio do sino
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Atualiza os filtros quando recebe novos valores via props (do clique no sino)
  useEffect(() => {
    if (initialStation || initialParameter || triggerTimestamp) {
      // Atualiza os valores temporários dos selects
      if (initialStation) {
        setTempStation(initialStation);
      }
      
      // Se não veio com parâmetro (clique no sino), detecta o primeiro parâmetro com alerta
      let parameterToUse = initialParameter;
      if (!initialParameter && initialStation && initialTab === "pending") {
        // Testa cada parâmetro para encontrar o primeiro com alerta pendente
        const allParameters = ["SO₂", "NOx", "MP₁₀", "O₃", "CO", "MP₂.₅", "HCT", "BTEX"];
        for (const param of allParameters) {
          const testData = generateConsistencyData(initialStation, param, "Últimas 24 horas", resolvedAlertIds || []);
          const hasPending = testData.some(row => row.status === "pending");
          if (hasPending) {
            parameterToUse = param;
            break;
          }
        }
      }
      
      if (parameterToUse) {
        setTempParameter(parameterToUse);
      }
      setTempPeriod("Últimas 24 horas"); // ✅ Sincroniza o período temporário também
      
      // Aplica os filtros automaticamente (simula clique em "Filtrar")
      setSelectedStation(initialStation || accessibleStations[0] || "Estação REPLAN (Paulínia - SP)");
      setSelectedParameter(parameterToUse || "MP₁₀");
      setSelectedPeriod("Últimas 24 horas");
      
      // Marca que veio do sino se não há initialParameter
      setIsFromBellClick(!initialParameter && initialTab === "pending");
      
      // Muda para a aba especificada (geralmente "pending" quando vem do sino)
      setActiveTab(initialTab);
    }
  }, [initialStation, initialParameter, initialTab, triggerTimestamp]);

  // Atualiza a aba quando initialTab mudar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Função para aplicar filtros (incluindo intervalo de agregação como controle mestre)
  const handleApplyFilters = () => {
    setSelectedStation(tempStation);
    setSelectedPeriod(tempPeriod);
    setSelectedParameter(tempParameter);
    setTimeGranularity(tempInterval); // Aplica o intervalo selecionado
    setIsFromBellClick(false); // Reset da flag ao usar filtros manuais
  };

  // Gera dados baseado nos filtros selecionados e estado de resolução
  const dataRows = useMemo(() => {
    // Se veio do sino (múltiplos parâmetros), carrega TODOS os parâmetros com alertas
    if (isFromBellClick) {
      const allParameters = ["O₃", "NOx", "SO₂", "CO", "HCT", "BTEX", "MP₁₀", "MP₂.₅"];
      const allPendingData: DataRow[] = [];
      
      // Para cada parâmetro, gera os dados e pega apenas os pendentes
      allParameters.forEach(param => {
        const paramData = generateConsistencyData(selectedStation, param, selectedPeriod, resolvedAlertIds || []);
        const pendingData = paramData.filter(row => row.status === "pending");
        
        // Adiciona informação do parâmetro em cada linha
        pendingData.forEach(row => {
          allPendingData.push({
            ...row,
            parameter: param // Adiciona campo de parâmetro
          });
        });
      });
      
      return allPendingData;
    }
    
    // Comportamento padrão: um parâmetro por vez (filtro manual ou aba "Todos")
    return generateConsistencyData(selectedStation, selectedParameter, selectedPeriod, resolvedAlertIds || []);
  }, [selectedStation, selectedParameter, selectedPeriod, resolvedAlertIds, triggerTimestamp, isFromBellClick]);

  const [validatedRows, setValidatedRows] = useState<DataRow[]>(dataRows);

  // Atualiza validatedRows quando dataRows mudam (aplicando agregação se necessário)
  useEffect(() => {
    // Aplica agregação aos dados da tabela baseado no controle mestre
    const aggregatedData = aggregateDataByGranularity(dataRows, timeGranularity);
    setValidatedRows(aggregatedData);
  }, [dataRows, timeGranularity]);

  const handleOpenModal = (rowId: number) => {
    setSelectedRowId(rowId);
    setSelectedJustification("");
    setSelectedObservations("");
    setIsInvalidateModalOpen(true);
  };

  const handleInvalidateClick = (rowId: number) => {
    setSelectedRowId(rowId);
    setSelectedJustification("");
    setSelectedObservations("");
    setIsInvalidateModalOpen(true);
  };

  const handleConfirmInvalidation = () => {
    if (selectedRowId && selectedJustification) {
      // Encontra a linha que será invalidada para pegar o alertId
      const rowToInvalidate = validatedRows.find(row => row.id === selectedRowId);
      
      setValidatedRows(prevRows =>
        prevRows.map(row =>
          row.id === selectedRowId
            ? { 
                ...row, 
                status: "invalid", 
                justification: selectedJustification, 
                operator: "Carlos Silva (Admin)", 
                finalValue: "-" 
              }
            : row
        )
      );
      
      // Resolve apenas o alerta específico vinculado à linha
      if (onResolveAlert && rowToInvalidate?.alertId) {
        onResolveAlert(rowToInvalidate.alertId);
      }
      
      setIsInvalidateModalOpen(false);
      setSelectedRowId(null);
      setSelectedJustification("");
      setSelectedObservations("");
    }
  };

  const handleRevertInvalidation = (rowId: number) => {
    // Encontra a linha original nos dados gerados
    const originalRow = dataRows.find(row => row.id === rowId);
    
    if (originalRow) {
      setValidatedRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? {
                ...row,
                status: originalRow.status === "pending" ? "pending" : "valid",
                justification: originalRow.justification,
                operator: originalRow.operator,
                finalValue: originalRow.finalValue
              }
            : row
        )
      );
      
      // Reverte apenas o alerta específico vinculado à linha
      if (onUnresolveAlert && originalRow?.alertId) {
        onUnresolveAlert(originalRow.alertId);
      }
    }
  };

  const handleBatchInvalidation = () => {
    if (selectedCheckboxes.length > 0 && batchJustification) {
      // Coleta os alertIds das linhas que serão invalidadas
      const alertIdsToResolve: number[] = [];
      validatedRows.forEach(row => {
        if (selectedCheckboxes.includes(row.id) && row.alertId) {
          alertIdsToResolve.push(row.alertId);
        }
      });
      
      setValidatedRows(prevRows =>
        prevRows.map(row =>
          selectedCheckboxes.includes(row.id)
            ? { 
                ...row, 
                status: "invalid", 
                justification: batchJustification, 
                operator: "Carlos Silva (Admin)", 
                finalValue: "-" 
              }
            : row
        )
      );
      
      // Resolve cada alerta específico vinculado às linhas invalidadas
      if (onResolveAlert && alertIdsToResolve.length > 0) {
        alertIdsToResolve.forEach(alertId => onResolveAlert(alertId));
      }
      
      setIsBatchModalOpen(false);
      setSelectedCheckboxes([]);
      setBatchJustification("");
      setBatchObservations("");
    }
  };

  const handleCheckboxChange = (id: number) => {
    if (selectedCheckboxes.includes(id)) {
      setSelectedCheckboxes(selectedCheckboxes.filter(checkboxId => checkboxId !== id));
    } else {
      setSelectedCheckboxes([...selectedCheckboxes, id]);
    }
  };

  // Handlers para importação de arquivo
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcessFile = () => {
    setIsProcessing(true);
    setUploadProgress(0);
    
    // Simula o processamento do arquivo com barra de progresso
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setShowPreview(true);
          return 100;
        }
        return prev + 5; // Incrementa 5% a cada vez (20 vezes = 2 segundos a 100ms)
      });
    }, 100);
  };

  const handleImportConfirm = () => {
    // Simula a integração final
    const stationName = importStation.split(" - ")[0]; // Extrai só "Estação Refinaria"
    const recordCount = 144; // Número fixo de registros para demo
    
    // Fechar modal e resetar estados
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setImportStation("");
    setImportParameter("");
    setShowPreview(false);
    setUploadProgress(0);
    
    // Mostra toast de sucesso
    toast.success(`Importação Concluída: ${recordCount} registros inseridos com sucesso na ${stationName}.`, {
      duration: 5000,
    });
  };

  // Dados para o gráfico - sempre mostra o período completo de um parâmetro
  const chartDataSource = useMemo(() => {
    // Se veio do sino, gera dados completos do parâmetro selecionado para o gráfico
    if (isFromBellClick) {
      return generateConsistencyData(selectedStation, selectedParameter, selectedPeriod, resolvedAlertIds || []);
    }
    // Caso contrário, usa os dados já carregados
    return dataRows;
  }, [isFromBellClick, selectedStation, selectedParameter, selectedPeriod, resolvedAlertIds, dataRows]);

  const validCount = validatedRows.filter(row => row.status === "valid").length;
  const invalidCount = validatedRows.filter(row => row.status === "invalid").length;
  const pendingCount = validatedRows.filter(row => row.status === "pending").length;
  const totalCount = validatedRows.length;

  // Filtra dados baseado na aba ativa
  const filteredRows = activeTab === "pending" 
    ? validatedRows.filter(row => row.status === "pending")
    : validatedRows;
  
  // Calcula paginação
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedRows = filteredRows.slice(startIndex, endIndex);
  
  // Reseta para primeira página quando mudam os filtros ou aba
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedStation, selectedParameter, selectedPeriod, timeGranularity]);

  // Função para agregar dados por granularidade temporal
  const aggregateDataByGranularity = (data: DataRow[], granularity: "1min" | "15min" | "1h" | "24h") => {
    // Se granularidade for 1min, retorna dados brutos
    if (granularity === "1min") {
      return data;
    }

    const minutesMap: { [key: string]: number } = {
      "15min": 15,
      "1h": 60,
      "24h": 1440
    };

    const intervalMinutes = minutesMap[granularity];
    const groups: { [key: string]: DataRow[] } = {};

    // Agrupa dados por intervalo
    data.forEach(row => {
      const [datePart, timePart] = row.dateTime.split(" ");
      const [day, month, year] = datePart.split("/");
      const [hours, minutes] = timePart.split(":");
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const groupIndex = Math.floor(totalMinutes / intervalMinutes);
      
      const groupKey = `${datePart}_${groupIndex}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    // Calcula média para cada grupo
    const aggregated: DataRow[] = [];
    let id = 1;

    Object.keys(groups).sort().forEach(groupKey => {
      const groupRows = groups[groupKey];
      const validRows = groupRows.filter(r => r.status !== "invalid");
      
      if (validRows.length === 0) return;

      const avgValue = validRows.reduce((sum, r) => sum + parseFloat(r.rawValue), 0) / validRows.length;
      const firstRow = validRows[0];
      
      // Calcula o timestamp correto do início do intervalo agregado
      const [datePart, timePart] = firstRow.dateTime.split(" ");
      const [day, month, year] = datePart.split("/");
      const [hours, minutes] = timePart.split(":");
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      const totalMinutes = date.getHours() * 60 + date.getMinutes();
      const groupIndex = Math.floor(totalMinutes / intervalMinutes);
      const groupStartMinutes = groupIndex * intervalMinutes;
      const groupHour = Math.floor(groupStartMinutes / 60);
      const groupMinute = groupStartMinutes % 60;
      
      // Formata o timestamp agregado
      const aggregatedDateTime = `${datePart} ${String(groupHour).padStart(2, '0')}:${String(groupMinute).padStart(2, '0')}`;
      
      // Determina se há algum pendente no grupo
      const hasPending = groupRows.some(r => r.status === "pending");
      
      aggregated.push({
        ...firstRow,
        id: id++,
        dateTime: aggregatedDateTime,
        rawValue: avgValue.toFixed(1),
        finalValue: avgValue.toFixed(1),
        status: hasPending ? "pending" : "valid"
      });
    });

    return aggregated;
  };

  // Dados para o gráfico de linha - aplica agregação baseada na granularidade
  const chartData = useMemo(() => {
    const aggregatedData = aggregateDataByGranularity(chartDataSource, timeGranularity);
    
    return aggregatedData.map(row => {
      // Extrai hora da data (formato: DD/MM/YYYY HH:MM)
      const timePart = row.dateTime.split(" ")[1] || "00:00";
      const datePart = row.dateTime.split(" ")[0] || "";
      
      return {
        time: timePart,
        fullDateTime: row.dateTime,
        value: row.status === "invalid" ? null : parseFloat(row.rawValue),
        status: row.status
      };
    });
  }, [chartDataSource, timeGranularity]);

  // Componente de ponto customizado para mostrar status
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    
    // Não renderiza pontos invalidados
    if (payload.status === "invalid") {
      return null;
    }
    
    let fill = "#2C5F6F"; // Válido
    if (payload.status === "pending") fill = "#dc2626"; // Pendente
    
    return (
      <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={1} />
    );
  };

  const maxValue = Math.max(...chartData.map(d => d.value || 0));
  const normalMax = 100; // Valor máximo esperado para visualização

  return (
    <div className="p-4 space-y-4">
      {/* Filtros Superiores */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#2C5F6F]">Filtros de Pesquisa</h3>
          {!isReadOnly && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar Dados (Manual)
            </button>
          )}
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-600 font-medium">Estação de Monitoramento</label>
            <div className="relative">
              <select
                value={tempStation}
                onChange={(e) => setTempStation(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
              >
                {accessibleStations.map(station => (
                  <option key={station}>{station}</option>
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
            <label className="text-xs text-gray-600 font-medium">
              Intervalo de Agregação
            </label>
            <div className="relative">
              <select
                value={tempInterval}
                onChange={(e) => setTempInterval(e.target.value as "1min" | "15min" | "1h" | "24h")}
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
                <option>O₃</option>
                <option>NOx</option>
                <option>SO₂</option>
                <option>CO</option>
                <option>HCT</option>
                <option>BTEX</option>
                <option>MP₁₀</option>
                <option>MP₂.₅</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleApplyFilters}
            className="px-6 py-2 bg-[#1a3d47] text-white rounded-lg text-sm hover:bg-[#2a4d57] transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Área Principal */}
        <div className="col-span-9 space-y-4">
          {/* Gráfico Auxiliar */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#2C5F6F]">Visualização Temporal - {selectedParameter}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Intervalo Aplicado:</span>
                <span className="px-3 py-1 bg-[#1a3d47] text-white text-xs font-semibold rounded-md border-2 border-[#1a3d47]">
                  {timeGranularity === "1min" && "⚡ 1 minuto"}
                  {timeGranularity === "15min" && "📊 15 minutos"}
                  {timeGranularity === "1h" && "⏱️ 1 hora"}
                  {timeGranularity === "24h" && "📅 24 horas"}
                </span>
                <span className="text-xs text-gray-500">
                  {timeGranularity === "1min" && "(alta resolução)"}
                  {timeGranularity === "15min" && "(média por intervalo)"}
                  {timeGranularity === "1h" && "(média horária oficial)"}
                  {timeGranularity === "24h" && "(média diária)"}
                </span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1a3d47' }}
                    formatter={(value: any, name: string, props: any) => {
                      const status = props.payload.status;
                      const statusLabel = status === 'valid' ? 'Válido' : status === 'pending' ? 'Pendente' : 'Inválido';
                      const statusColor = status === 'valid' ? '#22c55e' : status === 'pending' ? '#dc2626' : '#9ca3af';
                      
                      return [
                        <span>
                          {value.toFixed(1)} µg/m³ 
                          <span style={{ marginLeft: '8px', color: statusColor, fontWeight: 'bold' }}>
                            ({statusLabel})
                          </span>
                        </span>,
                        ''
                      ];
                    }}
                    labelFormatter={(label: string, payload: any) => {
                      if (payload && payload.length > 0) {
                        return payload[0].payload.fullDateTime;
                      }
                      return label;
                    }}
                  />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    stroke="#2C5F6F" 
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
          </div>

          {/* Tabela de Consistência */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Cabeçalho da Tabela Supervisória */}
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
                    Exibindo {filteredRows.length} registros agregados em {timeGranularity === "1min" ? "1 minuto" : timeGranularity === "15min" ? "15 minutos" : timeGranularity === "1h" ? "1 hora" : "1 dia"}
                  </span>
                </div>
              </div>
            </div>
            {/* Abas */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex">
                <button
                  onClick={() => {
                    setActiveTab("explorer");
                    setSelectedCheckboxes([]);
                    setIsFromBellClick(false); // Reset ao mudar para aba "Todos"
                  }}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === "explorer"
                      ? "text-[#1a3d47] bg-white border-b-2 border-[#1a3d47]"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setActiveTab("pending");
                    setSelectedCheckboxes([]);
                  }}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                    activeTab === "pending"
                      ? "text-[#1a3d47] bg-white border-b-2 border-[#1a3d47]"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
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
                  ★ Intervalo Aplicado:
                  {timeGranularity === "1min" && " 1 minuto"}
                  {timeGranularity === "15min" && " 15 minutos"}
                  {timeGranularity === "1h" && " 1 hora"}
                  {timeGranularity === "24h" && " 24 horas"}
                </span>
                {selectedPeriod === "Últimas 24 horas" && (
                  <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-md border border-green-200 inline-flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dados brutos: 120 registros (1 minuto)
                  </span>
                )}
              </div>
              </div>
            </div>

            {/* Barra Flutuante de Ações em Lote */}
            {activeTab === "pending" && selectedCheckboxes.length > 0 && !isReadOnly && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-blue-900 font-medium">
                    {selectedCheckboxes.length} {selectedCheckboxes.length === 1 ? "item selecionado" : "itens selecionados"}
                  </span>
                  <button
                    onClick={() => setSelectedCheckboxes([])}
                    className="text-sm text-blue-700 hover:text-blue-900 underline"
                  >
                    Limpar seleção
                  </button>
                </div>
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
                >
                  Invalidar em Lote
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              {activeTab === "pending" && displayedRows.length === 0 ? (
                <div className="p-12 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dado pendente de invalidação</h3>
                    <p className="text-sm text-gray-500">Todos os dados foram validados ou invalidados.</p>
                </div>
              ) : (
              <table className="w-full">
                <thead className="bg-[#1a3d47] text-white">
                  <tr>
                    {activeTab === "pending" && !isReadOnly && (
                      <th className="px-4 py-3 text-center text-sm w-12">
                        <input
                          type="checkbox"
                          checked={selectedCheckboxes.length === displayedRows.length && displayedRows.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCheckboxes(displayedRows.map(row => row.id));
                            } else {
                              setSelectedCheckboxes([]);
                            }
                          }}
                          className="w-4 h-4 text-[#1a3d47] rounded border-gray-300 focus:ring-2 focus:ring-[#1a3d47] cursor-pointer"
                        />
                      </th>
                    )}
                    {isFromBellClick && (
                      <th className="px-4 py-3 text-left text-sm">Parâmetro</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm">
                      Data/Hora
                      <span className="ml-1.5 text-xs text-gray-300">({timeGranularity === "1min" ? "minuto" : timeGranularity === "15min" ? "15min" : timeGranularity === "1h" ? "hora" : "dia"})</span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm">
                      Valor {timeGranularity === "1min" ? "Bruto" : "Médio"}
                      <span className="ml-1 text-xs text-gray-300">📊</span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm">Valor Final</th>
                    <th className="px-4 py-3 text-left text-sm">Unidade</th>
                    <th className="px-4 py-3 text-left text-sm">Status</th>
                    <th className="px-4 py-3 text-left text-sm">Justificativa</th>
                    <th className="px-4 py-3 text-left text-sm">Operador</th>
                    {!isReadOnly && (
                      <th className="px-4 py-3 text-center text-sm">Ação</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        row.status === "pending" 
                          ? "bg-red-50 border-l-4 border-red-500" 
                          : row.status === "invalid" 
                          ? "bg-gray-100" 
                          : ""
                      }`}
                    >
                      {activeTab === "pending" && !isReadOnly && (
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCheckboxes.includes(row.id)}
                            onChange={() => handleCheckboxChange(row.id)}
                            className="w-4 h-4 text-[#1a3d47] border-gray-300 rounded focus:ring-[#1a3d47] cursor-pointer"
                          />
                        </td>
                      )}
                      {isFromBellClick && row.parameter && (
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {row.parameter}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        <span className="text-gray-700">{row.dateTime}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={row.rawValue === "999.9" && row.status === "pending" ? "text-red-600 font-semibold" : "text-gray-900"}>
                            {row.rawValue}
                          </span>
                          <span className="text-xs text-blue-500" title="Valor sincronizado com o gráfico">🔗</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.status === "invalid" ? (
                          <span className="text-gray-400 line-through">{row.finalValue}</span>
                        ) : (
                          <span className={row.status === "pending" ? "font-semibold text-red-700" : "text-gray-900"}>
                            {row.finalValue}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.unit}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.status === "valid"
                              ? "bg-green-100 text-green-800"
                              : row.status === "pending"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {row.status === "valid" ? "Válido" : row.status === "pending" ? "Pendente" : "Inválido"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{row.justification}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.operator}</td>
                      {!isReadOnly && (
                        <td className="px-4 py-3 text-center">
                          {row.status === "pending" && (
                            <button
                              onClick={() => handleInvalidateClick(row.id)}
                              className="px-3 py-1 text-xs font-medium rounded transition-colors bg-red-500 text-white hover:bg-red-600"
                            >
                              Invalidar
                            </button>
                          )}
                          {row.status === "valid" && (
                            <button
                              onClick={() => handleInvalidateClick(row.id)}
                              className="px-3 py-1 text-xs font-medium rounded transition-colors bg-amber-500 text-white hover:bg-amber-600"
                            >
                              Invalidar
                            </button>
                          )}
                          {row.status === "invalid" && (
                            <button
                              onClick={() => handleRevertInvalidation(row.id)}
                              className="px-3 py-1 text-xs font-medium rounded transition-colors bg-blue-500 text-white hover:bg-blue-600"
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
              )}
            </div>
            
            {/* Rodapé informativo da tabela com Paginação */}
            <div className="bg-gray-50 border-t border-gray-200">
              {/* Informações e sincronização */}
              <div className="px-4 py-2.5 flex items-center justify-between text-xs border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    Exibindo <strong className="font-semibold text-gray-800">{startIndex + 1}-{Math.min(endIndex, filteredRows.length)}</strong> de <strong className="font-semibold text-gray-800">{filteredRows.length}</strong> registros
                  </span>
                  {timeGranularity !== "1min" && (
                    <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                      📊 Dados agregados a cada <strong>{timeGranularity === "15min" ? "15 minutos" : timeGranularity === "1h" ? "1 hora" : "1 dia"}</strong>
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
              
              {/* Controles de Paginação */}
              {filteredRows.length > itemsPerPage && (
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Itens por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
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
                    {/* Botão Anterior */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    
                    {/* Números de Página */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                              currentPage === pageNum
                                ? 'bg-[#1a3d47] text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Botão Próximo */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

        {/* Card Lateral - Resumo de Flags */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-5 sticky top-4">
            <h3 className="text-sm text-gray-700 mb-4 pb-2 border-b border-gray-200">Resumo de Validação</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Total de Dados</span>
                  <span className="text-lg text-gray-900">{totalCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#1a3d47] h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-green-500" />
                    <span className="text-xs text-gray-600">Válidos</span>
                  </div>
                  <span className="text-lg text-green-600">{validCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(validCount / totalCount) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <XCircle className="size-3.5 text-red-500" />
                    <span className="text-xs text-gray-600">Inválidos</span>
                  </div>
                  <span className="text-lg text-red-600">{invalidCount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(invalidCount / totalCount) * 100}%` }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Taxa de Aprovação</div>
                <div className="text-2xl text-[#1a3d47]">
                  {((validCount / totalCount) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs text-gray-500 mb-1">Período Analisado</div>
                <div className="text-xs text-gray-700">
                  {selectedPeriod}
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs text-gray-500 mb-1">Parâmetro</div>
                <div className="text-xs text-gray-900 font-medium">{selectedParameter}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Invalidação */}
      {isInvalidateModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw]">
            {/* Header do Modal */}
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Invalidar Dado de Medição</h3>
              <p className="text-sm text-gray-200 mt-1">Selecione o motivo da invalidação</p>
            </div>

            {/* Corpo do Modal */}
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
                  <option value="Falha de Sensor">Falha de Sensor</option>
                  <option value="Calibração">Calibração</option>
                  <option value="Pico não representativo">Pico não representativo</option>
                  <option value="Manutenção programada">Manutenção programada</option>
                  <option value="Interferência externa">Interferência externa</option>
                  <option value="Erro de leitura">Erro de leitura</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={selectedObservations}
                  onChange={(e) => setSelectedObservations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  rows={3}
                ></textarea>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Atenção</p>
                    <p className="text-xs">
                      Esta ação marcará o dado como inválido e o operador será registrado como "Carlos Silva (Admin)".
                      Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsInvalidateModalOpen(false);
                  setSelectedRowId(null);
                  setSelectedJustification("");
                  setSelectedObservations("");
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmInvalidation}
                disabled={!selectedJustification}
                className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${
                  selectedJustification
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Confirmar Invalidação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invalidação em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw]">
            {/* Header do Modal */}
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Invalidar Dados em Lote</h3>
              <p className="text-sm text-gray-200 mt-1">Selecione o motivo da invalidação</p>
            </div>

            {/* Corpo do Modal */}
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
                  <option value="Falha de Sensor">Falha de Sensor</option>
                  <option value="Calibração">Calibração</option>
                  <option value="Pico não representativo">Pico não representativo</option>
                  <option value="Manutenção programada">Manutenção programada</option>
                  <option value="Interferência externa">Interferência externa</option>
                  <option value="Erro de leitura">Erro de leitura</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={batchObservations}
                  onChange={(e) => setBatchObservations(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  rows={3}
                ></textarea>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Atenção</p>
                    <p className="text-xs">
                      Esta ação marcará os dados selecionados como inválidos e o operador será registrado como "Carlos Silva (Admin)".
                      Esta operação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsBatchModalOpen(false);
                  setSelectedCheckboxes([]);
                  setBatchJustification("");
                  setBatchObservations("");
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchInvalidation}
                disabled={!batchJustification || selectedCheckboxes.length === 0}
                className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${
                  batchJustification && selectedCheckboxes.length > 0
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Confirmar Invalidação em Lote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[580px] max-w-[90vw]">
            {/* Header do Modal */}
            <div className="bg-[#1a3d47] text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-lg font-semibold">Importação Manual de Dados (CSV)</h3>
              <p className="text-sm text-gray-200 mt-1">Upload de arquivo para preenchimento de lacunas (gaps)</p>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 space-y-4">
              {/* Área de Drag & Drop */}
              <div className="mb-6">
                <label className="block text-sm text-gray-700 mb-3 font-medium">
                  Arquivo CSV/Excel <span className="text-red-500">*</span>
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? "border-[#1a3d47] bg-blue-50"
                      : "border-gray-300 hover:border-gray-400 bg-gray-50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("fileInput")?.click()}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-12 h-12 text-green-600 mx-auto" />
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
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
                        <p className="text-sm text-gray-700 font-medium">
                          Arraste seu arquivo aqui ou clique para procurar
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos aceitos: CSV, XLS, XLSX
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Campos de Contexto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-medium">
                    Estação <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={importStation}
                    onChange={(e) => setImportStation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  >
                    <option value="">Selecione</option>
                    {accessibleStations.map(station => (
                      <option key={station} value={station}>{station}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2 font-medium">
                    Parâmetro <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={importParameter}
                    onChange={(e) => setImportParameter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a3d47]"
                  >
                    <option value="">Selecione</option>
                    <option value="SO₂">SO₂ - Dióxido de Enxofre</option>
                    <option value="NOx">NOx - Óxidos de Nitrogênio</option>
                    <option value="MP₁₀">MP₁₀ - Material Particulado</option>
                    <option value="MP₂.₅">MP₂.₅ - Material Particulado Fino</option>
                    <option value="O₃">O₃ - Ozônio</option>
                    <option value="CO">CO - Monóxido de Carbono</option>
                    <option value="HCT">HCT - Hidrocarbonetos Totais</option>
                    <option value="BTEX">BTEX - Benzeno, Tolueno, Etilbenzeno e Xilenos</option>
                  </select>
                </div>
              </div>
              
              {/* Informação sobre detecção automática de frequência */}
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

              {/* Barra de Progresso */}
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
                    ></div>
                  </div>
                </div>
              )}

              {/* Preview da Tabela */}
              {showPreview && !isProcessing && (
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
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">06/02/2026</td>
                          <td className="px-4 py-2 text-gray-700">08:00</td>
                          <td className="px-4 py-2 text-gray-900 font-medium">42.5</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">06/02/2026</td>
                          <td className="px-4 py-2 text-gray-700">09:00</td>
                          <td className="px-4 py-2 text-gray-900 font-medium">38.2</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-700">06/02/2026</td>
                          <td className="px-4 py-2 text-gray-700">10:00</td>
                          <td className="px-4 py-2 text-gray-900 font-medium">45.8</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-300">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Total:</span> 144 registros identificados no arquivo
                    </p>
                  </div>
                </div>
              )}

              {/* Nota Técnica */}
              {!showPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">Nota Técnica</p>
                      <p className="text-xs leading-relaxed">
                        Esta ferramenta deve ser utilizada <span className="font-semibold">exclusivamente</span> para preenchimento de lacunas (gaps) 
                        decorrentes de falhas na telemetria automática. Os dados importados serão integrados ao sistema 
                        após validação técnica.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                  setImportStation("");
                  setImportParameter("");
                  setShowPreview(false);
                  setUploadProgress(0);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              {!showPreview ? (
                <button
                  onClick={handleProcessFile}
                  disabled={!selectedFile || !importStation || !importParameter || isProcessing}
                  className={`px-4 py-2 text-sm text-white rounded-md transition-colors ${
                    selectedFile && importStation && importParameter && !isProcessing
                      ? "bg-[#1a3d47] hover:bg-[#2a4d57]"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isProcessing ? "Processando..." : "Processar Arquivo"}
                </button>
              ) : (
                <button
                  onClick={handleImportConfirm}
                  className="px-4 py-2 text-sm text-white rounded-md transition-colors bg-green-600 hover:bg-green-700"
                >
                  Confirmar Integração
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}