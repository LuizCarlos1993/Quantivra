interface Parameter {
  name: string;
  value: string;
  unit: string;
  status: "normal" | "alert" | "critical";
}

interface SupervisoryTableProps {
  parameters: Parameter[];
}

export function SupervisoryTable({ parameters }: SupervisoryTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-sm font-semibold text-[#2C5F6F] mb-3">Tabela Supervisória</h3>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-semibold text-gray-700">Parâmetro</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Valor</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Unidade</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((row, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3 text-gray-700">{row.name}</td>
                <td className="py-2 px-3 text-center font-semibold text-gray-900">{row.value}</td>
                <td className="py-2 px-3 text-center text-gray-600">{row.unit}</td>
                <td className="py-2 px-3 text-center">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    row.status === "normal" 
                      ? "bg-green-100 text-green-700" 
                      : row.status === "critical"
                      ? "bg-red-600 text-white font-bold animate-pulse"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {row.status === "normal" ? "Normal" : row.status === "critical" ? "ALERTA CRÍTICO" : "Alerta"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
