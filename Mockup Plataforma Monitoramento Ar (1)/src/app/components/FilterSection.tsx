import { ChevronDown } from "lucide-react";
import { useDataSegregation } from "../hooks/useDataSegregation";

interface FilterSectionProps {
  selectedStation: string;
  onStationChange: (station: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function FilterSection({ selectedStation, onStationChange, selectedDate, onDateChange }: FilterSectionProps) {
  // Obtém as estações acessíveis com base no perfil do usuário
  const { getAccessibleStations } = useDataSegregation();
  const stations = getAccessibleStations();

  // Obtém a data atual no formato YYYY-MM-DD para a propriedade max
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Filtros de Visualização</h3>
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs text-gray-600 font-medium">Selecionar Estação de Monitoramento</label>
          <div className="relative">
            <select
              value={selectedStation}
              onChange={(e) => onStationChange(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
            >
              {stations.map((station) => (
                <option key={station} value={station}>
                  {station}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600 font-medium">Período de Visualização</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            max={today}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm hover:border-[#2C5F6F] focus:outline-none focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}