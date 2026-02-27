import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TimelineChartProps {
  data: Array<{ time: string; value: number; invalidated?: boolean }>
}

const LEGISLATION_LIMIT = 100

export function TimelineChart({ data }: TimelineChartProps) {
  const processedData = data.map((point) => ({
    ...point,
    value: point.invalidated ? null : point.value,
  }))

  const customDot = (props: { cx?: number; cy?: number; payload?: { invalidated?: boolean }; index?: number }) => {
    const { cx, cy, payload, index } = props

    if (payload?.invalidated) {
      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} fill="transparent" stroke="none" />
    }

    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="#2C5F6F" stroke="none" />
  }

  const customTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { time: string; value: number; invalidated?: boolean } }> }) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const point = payload[0].payload

      return (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '8px 12px',
          }}
        >
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>{point.time}</p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: point.invalidated ? '#dc2626' : '#2C5F6F',
            }}
          >
            {point.invalidated ? 'Dado Invalidado' : `${point.value} µg/m³`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">
        Evolução Temporal - PM10 (μg/m³)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={processedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="time" stroke="#9ca3af" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
          />
          <Tooltip content={customTooltip} />
          <ReferenceLine
            y={LEGISLATION_LIMIT}
            stroke="#dc2626"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Padrão CONAMA 491: ${LEGISLATION_LIMIT} µg/m³`,
              position: 'right',
              fill: '#dc2626',
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2C5F6F"
            strokeWidth={3}
            dot={customDot}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
