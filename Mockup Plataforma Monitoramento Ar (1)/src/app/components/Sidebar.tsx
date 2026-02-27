import { BarChart3, FileText, Settings, CheckCircle2, MapIcon, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import quantivraLogo from "figma:asset/729eb694bc5441612c33e1f4a42cbe6f28a010d1.png";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const allMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, profiles: ["Administrador", "Analista", "Consulta"] },
  { id: "consistency", label: "Consistência", icon: CheckCircle2, profiles: ["Administrador", "Analista", "Consulta"] },
  { id: "map", label: "Mapa", icon: MapIcon, profiles: ["Administrador", "Analista", "Consulta"] },
  { id: "reports", label: "Relatórios", icon: FileText, profiles: ["Administrador", "Analista", "Consulta"] },
  { id: "users", label: "Gestão de Usuários", icon: Users, profiles: ["Administrador"] },
  { id: "settings", label: "Configurações", icon: Settings, profiles: ["Administrador"] },
];

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const { user } = useAuth();

  // Filtra itens do menu com base no perfil do usuário
  const menuItems = allMenuItems.filter(item => 
    user && item.profiles.includes(user.profile)
  );

  return (
    <aside className="w-64 bg-[#1a3d47] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src={quantivraLogo} 
            alt="Quantivra Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-bold text-white text-lg">Quantivra</h1>
            <p className="text-xs text-white/60">Qualidade do Ar</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#2C5F6F] text-white shadow-lg"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`size-5 ${isActive ? "text-white" : "text-white/60"}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Informações do Usuário Logado */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3">
          <p className="text-[10px] text-white/50 mb-1">Acesso restrito a:</p>
          <p className="text-xs font-semibold text-green-400">{user?.unit}</p>
        </div>
      </div>
    </aside>
  );
}