import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, User, LogOut, Bell, AlertTriangle, AlertCircle, WifiOff, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useDataSegregation } from "../hooks/useDataSegregation";

interface HeaderProps {
  title: string;
  subtitle: string;
  onAlertClick?: (station: string, parameter: string) => void;
  resolvedAlertIds?: number[]; // IDs dos alertas que foram resolvidos
}

export function Header({ title, subtitle, onAlertClick, resolvedAlertIds = [] }: HeaderProps) {
  const { user, logout } = useAuth();
  const { canAccessStation } = useDataSegregation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationPosition, setNotificationPosition] = useState({ top: 0, left: 0 });
  const [profilePosition, setProfilePosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Alertas fixos em tempo real (independente da data selecionada)
  const allAlerts = [
    {
      id: 1,
      type: "critical",
      icon: AlertTriangle,
      title: "Valor Crítico de SO₂ (250 µg/m³)",
      station: "Estação REPLAN (Paulínia - SP)",
      stationShort: "REPLAN",
      parameter: "SO₂",
      time: "há 5 min",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      borderColor: "border-red-500",
      textColor: "text-red-900"
    },
    {
      id: 8,
      type: "warning",
      icon: AlertCircle,
      title: "Valor Elevado: SO₂ (180.0 µg/m³)",
      station: "Estação REPLAN (Paulínia - SP)",
      stationShort: "REPLAN",
      parameter: "SO₂",
      time: "há 8 min",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-500",
      textColor: "text-orange-900"
    },
    {
      id: 9,
      type: "warning",
      icon: AlertCircle,
      title: "Valor Suspeito: SO₂ (125.0 µg/m³)",
      station: "Estação REPLAN (Paulínia - SP)",
      stationShort: "REPLAN",
      parameter: "SO₂",
      time: "há 10 min",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-500",
      textColor: "text-yellow-900"
    },
    {
      id: 2,
      type: "anomaly",
      icon: AlertTriangle,
      title: "Anomalia Crítica: MP₁₀ (999.9 µg/m³)",
      station: "Estação REDUC - Canal do Meio (Duque de Caxias - RJ)",
      stationShort: "REDUC",
      parameter: "MP₁₀",
      time: "há 8 min",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      borderColor: "border-red-500",
      textColor: "text-red-900"
    },
    {
      id: 5,
      type: "warning",
      icon: AlertCircle,
      title: "Valor Suspeito: MP₁₀ (850.0 µg/m³)",
      station: "Estação REDUC - Canal do Meio (Duque de Caxias - RJ)",
      stationShort: "REDUC",
      parameter: "MP₁₀",
      time: "há 9 min",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
      borderColor: "border-orange-500",
      textColor: "text-orange-900"
    },
    {
      id: 3,
      type: "warning",
      icon: WifiOff,
      title: "Ausência de dados / Flatline em O₃",
      station: "Estação UTGCA - Fazenda (Caraguatatuba - SP)",
      stationShort: "UTGCA",
      parameter: "O₃",
      time: "há 12 min",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-500",
      textColor: "text-amber-900"
    },
    {
      id: 10,
      type: "warning",
      icon: AlertCircle,
      title: "Valor Elevado: CO (8.5 ppm)",
      station: "Estação UTGCA - Fazenda (Caraguatatuba - SP)",
      stationShort: "UTGCA",
      parameter: "CO",
      time: "há 18 min",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
      borderColor: "border-yellow-500",
      textColor: "text-yellow-900"
    },
    {
      id: 4,
      type: "calibration",
      icon: Settings,
      title: "Período de Calibração Detectado em NOx",
      station: "Estação TECAB (Macaé - RJ)",
      stationShort: "TECAB",
      parameter: "NOx",
      time: "há 15 min",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-500",
      textColor: "text-blue-900"
    }
  ];

  // Filtra alertas removendo os que foram resolvidos e os que não são da unidade do usuário
  const realTimeAlerts = allAlerts.filter(alert => 
    !resolvedAlertIds.includes(alert.id) && canAccessStation(alert.station)
  );
  const alertCount = realTimeAlerts.length;

  const handleAlertClick = (alert: typeof realTimeAlerts[0]) => {
    setIsNotificationOpen(false);
    if (onAlertClick) {
      onAlertClick(alert.station, alert.parameter);
    }
  };

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atualiza posição do dropdown quando abre
  useEffect(() => {
    if (isNotificationOpen && notificationButtonRef.current) {
      const rect = notificationButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 384; // w-96 = 384px
      
      // Alinha o lado direito do dropdown com o lado direito do botão
      const rightPosition = rect.right;
      const leftPosition = rightPosition - dropdownWidth;
      
      // Garante margem mínima de 16px da borda esquerda
      const finalLeftPosition = Math.max(16, leftPosition);
      
      setNotificationPosition({ 
        top: rect.bottom + 8, 
        left: finalLeftPosition
      });
    }
  }, [isNotificationOpen]);

  // Atualiza posição do perfil quando abre
  useEffect(() => {
    if (isDropdownOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 208; // w-56 = 208px
      
      // Alinha o lado direito do dropdown com o lado direito do botão
      const rightPosition = rect.right;
      const leftPosition = rightPosition - dropdownWidth;
      
      // Garante margem mínima de 16px da borda esquerda
      const finalLeftPosition = Math.max(16, leftPosition);
      
      setProfilePosition({ 
        top: rect.bottom + 8, 
        left: finalLeftPosition
      });
    }
  }, [isDropdownOpen]);

  // Renderiza o dropdown de notificações via Portal
  const notificationDropdown = isNotificationOpen && createPortal(
    <div 
      ref={notificationRef}
      className="fixed w-96 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto"
      style={{ 
        top: `${notificationPosition.top}px`, 
        left: `${notificationPosition.left}px`,
        zIndex: 999999
      }}
    >
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <h3 className="text-sm font-semibold text-gray-900">Notificações em Tempo Real</h3>
        <p className="text-xs text-gray-500 mt-0.5">{alertCount} {alertCount === 1 ? "alerta ativo" : "alertas ativos"}</p>
      </div>
      {alertCount === 0 ? (
        <div className="p-8 text-center">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Nenhum alerta ativo</p>
          <p className="text-xs text-gray-400 mt-1">Todos os alertas foram resolvidos</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {realTimeAlerts.map((alert) => {
              const IconComponent = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${alert.borderColor}`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${alert.bgColor}`}>
                      <IconComponent className={`w-5 h-5 ${alert.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium leading-snug">
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium">
              Ver todos os alertas
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );

  // Renderiza o dropdown do perfil via Portal
  const profileDropdown = isDropdownOpen && createPortal(
    <div 
      ref={dropdownRef}
      className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
      style={{ 
        top: `${profilePosition.top}px`, 
        left: `${profilePosition.left}px`,
        zIndex: 999999
      }}
    >
      <button
        onClick={() => {
          setIsDropdownOpen(false);
          // Adicionar lógica de editar perfil aqui
        }}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <User className="w-4 h-4" />
        <span>Editar perfil</span>
      </button>
      <button
        onClick={() => {
          setIsDropdownOpen(false);
          logout();
        }}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Desconectar</span>
      </button>
    </div>,
    document.body
  );

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative z-[200]" ref={notificationRef}>
            <button
              ref={notificationButtonRef}
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-gray-600" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationDropdown}
          </div>

          {/* User Profile Section */}
          <div className="relative" ref={dropdownRef}>
            <button
              ref={profileButtonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2C5F6F] to-[#4a9baf] flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user?.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.profile}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {profileDropdown}
          </div>
        </div>
      </div>
    </header>
  );
}