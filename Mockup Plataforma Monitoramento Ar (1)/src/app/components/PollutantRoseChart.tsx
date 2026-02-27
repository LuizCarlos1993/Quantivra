import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

interface PollutantData {
  direction: string;
  concentration: number;
}

interface PollutantRoseChartProps {
  data: PollutantData[];
}

export function PollutantRoseChart({ data }: PollutantRoseChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 h-full">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3 text-center">Radar de Poluentes</h3>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data}>
          <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
          <PolarAngleAxis 
            dataKey="direction" 
            tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 600 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 120]} 
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
            tickCount={4}
            ticks={[0, 40, 80, 120]}
          />
          <Radar
            name="Concentração (µg/m³)"
            dataKey="concentration"
            stroke="#dc2626"
            fill="#ef4444"
            fillOpacity={0.6}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span>Concentração de poluentes (µg/m³)</span>
      </div>
    </div>
  );
}
