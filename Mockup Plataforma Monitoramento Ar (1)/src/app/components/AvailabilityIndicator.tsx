interface AvailabilityIndicatorProps {
  percentage: number;
}

export function AvailabilityIndicator({ percentage }: AvailabilityIndicatorProps) {
  // Arredonda para 1 casa decimal para evitar problemas de precisão de ponto flutuante
  const roundedPercentage = Math.round(percentage * 10) / 10;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Disponibilidade da Rede</h3>
      <div className="flex items-center justify-center h-32">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#10b981"
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{roundedPercentage}%</span>
            <span className="text-xs text-gray-500">Disponível</span>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Status</span>
          <span className="font-semibold text-green-600">Operacional</span>
        </div>
      </div>
    </div>
  );
}