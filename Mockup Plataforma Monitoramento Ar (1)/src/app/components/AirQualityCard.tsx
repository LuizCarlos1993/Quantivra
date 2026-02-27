interface AirQualityCardProps {
  value: number;
  quality: string;
  color: string;
}

export function AirQualityCard({ value, quality, color }: AirQualityCardProps) {
  const colorClasses = {
    green: "from-green-600 via-green-500 to-green-400",
    yellow: "from-yellow-500 via-yellow-400 to-yellow-300",
    orange: "from-orange-600 via-orange-500 to-orange-400",
    red: "from-red-600 via-red-500 to-red-400",
    purple: "from-purple-600 via-purple-500 to-purple-400",
  };

  const borderColors = {
    green: "border-green-700",
    yellow: "border-yellow-600",
    orange: "border-orange-700",
    red: "border-red-700",
    purple: "border-purple-700",
  };

  const qualityLevels = [
    { label: "Boa", color: "bg-green-500" },
    { label: "Moderada", color: "bg-yellow-500" },
    { label: "Ruim", color: "bg-orange-500" },
    { label: "Muito Ruim", color: "bg-red-500" },
    { label: "Péssima", color: "bg-purple-500" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Índice de Qualidade do Ar</h3>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} shadow-lg flex items-center justify-center mb-3 border-4 ${borderColors[color as keyof typeof borderColors]}`}>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-xs font-bold text-white">IQAr</div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-1">{quality}</p>
          <p className="text-xs text-gray-500">Qualidade {quality.toLowerCase()}</p>
        </div>
      </div>

      {/* Color Legend */}
      <div className="mt-4">
        <div className="flex items-center gap-3 justify-center flex-wrap">
          {qualityLevels.map((level) => (
            <div key={level.label} className="flex items-center gap-1.5 text-xs">
              <div className={`w-1 h-4 ${level.color}`}></div>
              <span className="text-gray-700">{level.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}