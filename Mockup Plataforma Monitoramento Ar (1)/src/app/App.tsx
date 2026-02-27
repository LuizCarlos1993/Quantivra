import { useState } from "react";
import { Toaster } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardPage } from "./pages/DashboardPage";
import { ConsistencyPage } from "./pages/ConsistencyPage";
import { MapPage } from "./pages/MapPage";
import { ReportsPage } from "./pages/ReportsPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";

function MainApp() {
  const { isAuthenticated, user } = useAuth();
  const [selectedStation, setSelectedStation] = useState("Estação REPLAN (Paulínia - SP)");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Sempre carrega com a data atual
    return new Date().toISOString().split('T')[0];
  });
  const [activeMenuItem, setActiveMenuItem] = useState("dashboard");
  const [alertCount, setAlertCount] = useState(0);
  const [consistencyFilters, setConsistencyFilters] = useState<{ station?: string; parameter?: string; initialTab?: "explorer" | "pending"; triggerTimestamp?: number }>({});
  const [resolvedAlertIds, setResolvedAlertIds] = useState<number[]>([]); // IDs dos alertas resolvidos

  // Se não estiver autenticado, mostrar página de login
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LoginPage />
      </>
    );
  }

  // Proteção contra undefined durante hot reload
  if (!user) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <LoginPage />
      </>
    );
  }

  // Verificação de permissões - redireciona para dashboard se tentar acessar página restrita
  const hasAccess = (menuItem: string) => {
    if (menuItem === "users" || menuItem === "settings") {
      return user?.profile === "Administrador";
    }
    return true;
  };

  // Se o item ativo não é acessível, redireciona para dashboard
  if (!hasAccess(activeMenuItem)) {
    setActiveMenuItem("dashboard");
  }

  // Define títulos dinâmicos baseados na página ativa
  const pageHeaders = {
    dashboard: {
      title: "Painel de Monitoramento em Tempo Real",
      subtitle: "Gestão de Qualidade do Ar"
    },
    consistency: {
      title: "Consistência e Validação de Dados",
      subtitle: "Análise e Validação de Medições"
    },
    map: {
      title: "Mapa de Monitoramento Georreferenciado",
      subtitle: "Visualização Espacial das Estações"
    },
    reports: {
      title: "Relatórios",
      subtitle: "Geração e Exportação de Relatórios"
    },
    users: {
      title: "Gestão de Usuários e Acessos",
      subtitle: "Controle de Permissões e Segregação por Unidade"
    },
    settings: {
      title: "Configurações",
      subtitle: "Configurações do Sistema"
    }
  };

  const currentHeader = pageHeaders[activeMenuItem as keyof typeof pageHeaders];

  const handleAlertClick = (station: string, parameter: string) => {
    setActiveMenuItem("consistency");
    // Passa o parâmetro para filtrar o alerta específico
    setConsistencyFilters({ station, parameter, initialTab: "pending", triggerTimestamp: Date.now() });
  };

  // Função para marcar um alerta como resolvido
  const handleResolveAlert = (alertId: number) => {
    setResolvedAlertIds(prev => [...prev, alertId]);
  };

  // Função para remover um alerta da lista de resolvidos (reverter)
  const handleUnresolveAlert = (alertId: number) => {
    setResolvedAlertIds(prev => prev.filter(id => id !== alertId));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Toaster position="top-center" richColors />
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col relative z-0 h-screen overflow-hidden">
        <div className="page-transition">
          <Header 
            title={currentHeader.title} 
            subtitle={currentHeader.subtitle}
            onAlertClick={handleAlertClick}
            resolvedAlertIds={resolvedAlertIds}
          />
        </div>

        {activeMenuItem === "dashboard" && (
          <div className="page-transition relative z-0 overflow-auto">
            <DashboardPage
              selectedStation={selectedStation}
              onStationChange={setSelectedStation}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onAlertCountChange={setAlertCount}
            />
          </div>
        )}

        {activeMenuItem === "consistency" && (
          <div className="page-transition overflow-auto">
            <ConsistencyPage
              initialStation={consistencyFilters.station}
              initialParameter={consistencyFilters.parameter}
              initialTab={consistencyFilters.initialTab}
              triggerTimestamp={consistencyFilters.triggerTimestamp}
              resolvedAlertIds={resolvedAlertIds}
              resolvedState={
                (consistencyFilters.station?.includes("Refinaria") && consistencyFilters.parameter?.includes("SO₂") && resolvedAlertIds.includes(1)) ||
                (consistencyFilters.station?.includes("Centro") && consistencyFilters.parameter?.includes("PM₁₀") && resolvedAlertIds.includes(2)) ||
                (consistencyFilters.station?.includes("Orla") && consistencyFilters.parameter?.includes("O₃") && resolvedAlertIds.includes(3)) ||
                (consistencyFilters.station?.includes("Zona Norte") && consistencyFilters.parameter?.includes("NO₂") && resolvedAlertIds.includes(4))
              }
              onResolveAlert={handleResolveAlert}
              onUnresolveAlert={handleUnresolveAlert}
            />
          </div>
        )}

        {activeMenuItem === "map" && (
          <div className="page-transition flex-1 flex flex-col overflow-hidden">
            <MapPage 
              onNavigateToConsistency={(stationName: string) => {
                setActiveMenuItem("consistency");
                setConsistencyFilters({ 
                  station: stationName, 
                  initialTab: "pending", 
                  triggerTimestamp: Date.now() 
                });
              }}
            />
          </div>
        )}

        {activeMenuItem === "reports" && (
          <div className="page-transition overflow-auto">
            <ReportsPage />
          </div>
        )}

        {activeMenuItem === "settings" && (
          <main className="flex-1 p-4 overflow-auto">
            <SettingsPage />
          </main>
        )}

        {activeMenuItem === "users" && (
          <div className="page-transition overflow-auto">
            <UsersPage />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}