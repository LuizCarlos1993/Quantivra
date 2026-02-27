// Dados compartilhados entre páginas de Consistência e Relatórios
// Garante integridade dos dados em todo o sistema

export interface DataRow {
  id: number;
  dateTime: string;
  rawValue: string;
  finalValue: string;
  unit: string;
  status: "valid" | "invalid" | "pending";
  justification: string;
  operator: string;
  alertId?: number;
  parameter?: string;
}

// Lista de estações reais da Petrobras
export const STATIONS = [
  "Estação REPLAN (Paulínia - SP)",
  "Estação UTGCA - Fazenda (Caraguatatuba - SP)",
  "Estação REDUC - Canal do Meio (Duque de Caxias - RJ)",
  "Estação TECAB (Macaé - RJ)",
  "Estação Boaventura - Estreito (Itaboraí - RJ)",
  "Estação REGAP - São Gabriel (MG)",
  "Estação RNEST (Ipojuca - PE)",
  "Estação REFAP (Canoas - RS)"
];

// Parâmetros medidos
export const PARAMETERS = ['O₃', 'NOx', 'SO₂', 'CO', 'HCT', 'BTEX', 'MP₁₀', 'MP₂.₅'];

// Períodos disponíveis
export const PERIODS = [
  "Últimas 24 horas",
  "Últimos 7 dias",
  "Últimos 30 dias",
  "Últimos 90 dias"
];

// Função para gerar dados mockados baseado na estação e parâmetro
export function generateConsistencyData(
  station: string,
  parameter: string,
  period: string,
  resolvedAlertIds: number[] = []
): DataRow[] {
  const stationKey = station.split(" ")[1]; // "REPLAN", "UTGCA", "REDUC", "TECAB", "Boaventura", "REGAP"
  const paramKey = parameter.split(" ")[0]; // "MP₁₀", "SO₂", "O₃", "NOx", "CO", "HCT", "BTEX", "MP₂.₅"

  // Determina quantos dados gerar baseado no período
  const getDataPointsCount = () => {
    switch (period) {
      case "Últimas 24 horas":
        return 120; // 120 minutos = 2 horas de dados de alta frequência
      case "Últimos 7 dias":
        return 168; // 1 por hora (7 dias × 24h)
      case "Últimos 30 dias":
        return 120; // 4 por dia (6h intervalo)
      case "Últimos 90 dias":
        return 90; // 1 por dia
      default:
        return 120;
    }
  };

  // Gera array de datas baseado no período
  const generateDateTimes = () => {
    const count = getDataPointsCount();
    const dates: string[] = [];
    const now = new Date("2026-02-09T14:00:00"); // Horário base: 09/02/2026 14:00

    let intervalMinutes: number;
    switch (period) {
      case "Últimas 24 horas":
        intervalMinutes = 1;
        break; // 1 minuto (alta frequência)
      case "Últimos 7 dias":
        intervalMinutes = 60;
        break; // 1 hora
      case "Últimos 30 dias":
        intervalMinutes = 360;
        break; // 6 horas
      case "Últimos 90 dias":
        intervalMinutes = 1440;
        break; // 24 horas (1 dia)
      default:
        intervalMinutes = 1;
    }

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      dates.push(`${day}/${month}/${year} ${hours}:${minutes}`);
    }

    return dates;
  };

  const dateTimes = generateDateTimes();

  // Função auxiliar para gerar valores aleatórios
  const generateValue = (
    base: number,
    variance: number,
    index: number,
    total: number
  ) => {
    const randomFactor =
      Math.sin(index * 0.5) * variance +
      (Math.random() - 0.5) * (variance * 0.3);
    return (base + randomFactor).toFixed(1);
  };

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

  // Pegar valores base para a combinação estação+parâmetro
  const stationValues = baseValues[stationKey] || baseValues.REPLAN;
  const paramValues = stationValues[paramKey] || stationValues["MP₁₀"];

  // Gerar dados
  const data: DataRow[] = dateTimes.map((dateTime, index) => {
    const value = generateValue(
      paramValues.base,
      paramValues.variance,
      index,
      dateTimes.length
    );
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

// Função para agregar dados por período (média) - usado nos gráficos de Relatórios
export function aggregateData(
  data: DataRow[],
  aggregationType: "hourly" | "daily" | "weekly"
): Array<{ date: string; value: number }> {
  if (data.length === 0) return [];

  const grouped: Record<string, number[]> = {};

  data.forEach((row) => {
    const [datePart, timePart] = row.dateTime.split(" ");
    const [day, month, year] = datePart.split("/");
    const [hours] = timePart.split(":");

    let key = "";
    if (aggregationType === "hourly") {
      key = `${day}/${month} ${hours}:00`;
    } else if (aggregationType === "daily") {
      key = `${day}/${month}`;
    } else if (aggregationType === "weekly") {
      // Agrupar por semana (simplificado)
      const weekNum = Math.floor(parseInt(day) / 7) + 1;
      key = `Sem ${weekNum} ${month}`;
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(parseFloat(row.finalValue) || 0);
  });

  return Object.entries(grouped).map(([date, values]) => ({
    date,
    value: parseFloat(
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    )
  }));
}
