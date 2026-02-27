import { useAuth } from '../context/AuthContext';

// Mapeamento de estações por unidade
export const STATIONS_BY_UNIT = {
  'Unidade SP': [
    'Estação REPLAN (Paulínia - SP)',
    'Estação UTGCA - Fazenda (Caraguatatuba - SP)'
  ],
  'Unidade RJ': [
    'Estação REDUC - Canal do Meio (Duque de Caxias - RJ)',
    'Estação TECAB (Macaé - RJ)',
    'Estação Boaventura - Estreito (Itaboraí - RJ)'
  ],
  'Unidade BA': [],
  'REGAP - MG': [
    'Estação REGAP - São Gabriel (MG)'
  ],
  'RNEST - PE': [],
  'REFAP - RS': []
};

export function useDataSegregation() {
  const { user } = useAuth();

  // Retorna a unidade do usuário
  const userUnit = user?.unit || '';

  // Retorna todas as estações que o usuário pode acessar
  const getAccessibleStations = (): string[] => {
    // Todos os usuários (incluindo Administrador) veem apenas estações da sua unidade
    const unitKey = userUnit as keyof typeof STATIONS_BY_UNIT;
    return STATIONS_BY_UNIT[unitKey] || [];
  };

  // Verifica se o usuário pode acessar uma estação específica
  const canAccessStation = (stationName: string): boolean => {
    const accessibleStations = getAccessibleStations();
    return accessibleStations.includes(stationName);
  };

  // Retorna a primeira estação acessível (para definir como padrão)
  const getDefaultStation = (): string => {
    const stations = getAccessibleStations();
    return stations[0] || '';
  };

  // Filtra um array de estações baseado nas permissões
  const filterStations = (stations: string[]): string[] => {
    const accessibleStations = getAccessibleStations();
    return stations.filter(station => accessibleStations.includes(station));
  };

  // Retorna as unidades que o usuário pode visualizar
  const getAccessibleUnits = (): string[] => {
    // Todos os usuários veem apenas sua própria unidade
    return [userUnit];
  };

  return {
    userUnit,
    getAccessibleStations,
    canAccessStation,
    getDefaultStation,
    filterStations,
    getAccessibleUnits
  };
}