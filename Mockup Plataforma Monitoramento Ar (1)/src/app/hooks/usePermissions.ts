import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { user } = useAuth();

  // Perfis com permissão de edição: Administrador e Analista
  const canEdit = user?.profile === 'Administrador' || user?.profile === 'Analista';
  
  // Apenas Administrador pode gerenciar usuários
  const canManageUsers = user?.profile === 'Administrador';
  
  // Perfil de apenas leitura: Consulta
  const isReadOnly = user?.profile === 'Consulta';

  return {
    canEdit,
    canManageUsers,
    isReadOnly,
    userProfile: user?.profile
  };
}
