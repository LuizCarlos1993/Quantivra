import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'

interface WindData {
  direction: string
  velocity: number
}

interface WindRoseChartProps {
  data: WindData[]
}

export function WindRoseChart({ data }: WindRoseChartProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 h-full">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3 text-center">Rosa dos Ventos</h3>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data}>
          <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
          <PolarAngleAxis
            dataKey="direction"
            tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 15]}
            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
            tickCount={4}
          />
          <Radar
            name="Velocidade (m/s)"
            dataKey="velocity"
            stroke="#2C5F6F"
            fill="#2C5F6F"
            fillOpacity={0.6}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-600">
        <div className="w-3 h-3 rounded-full bg-[#2C5F6F]" />
        <span>Velocidade do vento (m/s)</span>
      </div>
    </div>
  )
}
