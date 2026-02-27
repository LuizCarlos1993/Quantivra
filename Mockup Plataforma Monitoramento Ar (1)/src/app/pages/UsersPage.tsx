import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Mail, MapPin, ChevronDown, ChevronLeft, ChevronRight, Power } from 'lucide-react';
import { toast } from 'sonner';
import { UserModal } from '../components/UserModal';
import { DeleteUserModal } from '../components/DeleteUserModal';
import { useDataSegregation } from '../hooks/useDataSegregation';

interface User {
  id: number;
  name: string;
  email: string;
  profile: 'Administrador' | 'Analista' | 'Consulta';
  unit: string;
  status: 'Ativo' | 'Inativo';
  createdAt: Date;
}

export function UsersPage() {
  const { userUnit } = useDataSegregation();
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: number; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Inicializar selectedUnit quando userUnit estiver disponível
  useEffect(() => {
    if (userUnit && !selectedUnit) {
      setSelectedUnit(userUnit);
    }
  }, [userUnit, selectedUnit]);

  // Dados mock de usuários - agora como estado gerenciável
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'Carlos Silva',
      email: 'carlos.silva@petrobras.com.br',
      profile: 'Administrador',
      unit: 'Unidade SP',
      status: 'Ativo',
      createdAt: new Date('2023-01-15')
    },
    {
      id: 2,
      name: 'Ana Paula Santos',
      email: 'ana.santos@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade SP',
      status: 'Ativo',
      createdAt: new Date('2023-02-20')
    },
    {
      id: 3,
      name: 'Ricardo Souza',
      email: 'ricardo.souza@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade SP',
      status: 'Ativo',
      createdAt: new Date('2023-03-10')
    },
    {
      id: 4,
      name: 'Mariana Costa',
      email: 'mariana.costa@petrobras.com.br',
      profile: 'Consulta',
      unit: 'Unidade SP',
      status: 'Ativo',
      createdAt: new Date('2023-04-05')
    },
    {
      id: 5,
      name: 'João Oliveira',
      email: 'joao.oliveira@petrobras.com.br',
      profile: 'Administrador',
      unit: 'Unidade RJ',
      status: 'Ativo',
      createdAt: new Date('2023-05-25')
    },
    {
      id: 6,
      name: 'Fernanda Lima',
      email: 'fernanda.lima@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade RJ',
      status: 'Ativo',
      createdAt: new Date('2023-06-15')
    },
    {
      id: 7,
      name: 'Pedro Almeida',
      email: 'pedro.almeida@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade RJ',
      status: 'Ativo',
      createdAt: new Date('2023-07-20')
    },
    {
      id: 8,
      name: 'Juliana Pereira',
      email: 'juliana.pereira@petrobras.com.br',
      profile: 'Consulta',
      unit: 'Unidade RJ',
      status: 'Ativo',
      createdAt: new Date('2023-08-10')
    },
    {
      id: 9,
      name: 'Roberto Mendes',
      email: 'roberto.mendes@petrobras.com.br',
      profile: 'Administrador',
      unit: 'Unidade BA',
      status: 'Ativo',
      createdAt: new Date('2023-09-05')
    },
    {
      id: 10,
      name: 'Camila Rodrigues',
      email: 'camila.rodrigues@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade BA',
      status: 'Ativo',
      createdAt: new Date('2023-10-25')
    },
    {
      id: 11,
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade BA',
      status: 'Ativo',
      createdAt: new Date('2023-11-15')
    },
    {
      id: 12,
      name: 'Patricia Souza',
      email: 'patricia.souza@petrobras.com.br',
      profile: 'Consulta',
      unit: 'Unidade BA',
      status: 'Inativo',
      createdAt: new Date('2023-12-20')
    },
    {
      id: 13,
      name: 'Marcos Ribeiro',
      email: 'marcos.ribeiro@petrobras.com.br',
      profile: 'Consulta',
      unit: 'Unidade SP',
      status: 'Ativo',
      createdAt: new Date('2024-01-10')
    },
    {
      id: 14,
      name: 'Beatriz Campos',
      email: 'beatriz.campos@petrobras.com.br',
      profile: 'Analista',
      unit: 'Unidade SP',
      status: 'Inativo',
      createdAt: new Date('2024-02-05')
    },
  ]);

  // Filtrar usuários por unidade e ordenar por data de criação (mais recentes primeiro)
  const filteredUsers = users
    .filter(user => user.unit === userUnit)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Configuração de cores dos perfis
  const profileColors = {
    'Administrador': 'bg-blue-100 text-blue-700 border-blue-300',
    'Analista': 'bg-green-100 text-green-700 border-green-300',
    'Consulta': 'bg-gray-100 text-gray-700 border-gray-300'
  };

  const profileIcons = {
    'Administrador': '👑',
    'Analista': '🔬',
    'Consulta': '👁️'
  };

  // Apenas a unidade do usuário logado é acessível
  const units = [userUnit];

  const handleNewUser = () => {
    setIsModalOpen(true);
  };

  const handleSubmitNewUser = (userData: {
    name: string;
    email: string;
    unit: string;
    profile: 'Administrador' | 'Analista' | 'Consulta';
  }) => {
    // Gerar novo ID (maior ID + 1)
    const newId = Math.max(...users.map(u => u.id)) + 1;
    
    // Criar novo usuário (sempre com status Ativo inicialmente)
    const newUser: User = {
      id: newId,
      name: userData.name,
      email: userData.email,
      profile: userData.profile,
      unit: userData.unit,
      status: 'Ativo',
      createdAt: new Date()
    };
    
    // Adicionar à lista de usuários
    setUsers([...users, newUser]);
    
    // Voltar para a primeira página para ver o novo usuário no topo
    setCurrentPage(1);
    
    // Mostrar notificação de sucesso
    toast.success(`✅ Usuário ${userData.name} cadastrado com sucesso!`, {
      description: `Perfil: ${userData.profile} | Status: Ativo`
    });
    
    setIsModalOpen(false);
  };

  const handleEditUser = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      setIsModalOpen(true);
    }
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    setDeletingUser({ id: userId, name: userName });
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
      
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, status: newStatus }
          : u
      ));
      
      toast.success(`✅ Status do usuário ${user.name} alterado para ${newStatus}!`);
    }
  };

  // Lógica de paginação
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Resetar para primeira página quando mudar o filtro
  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    setCurrentPage(1);
    setIsDropdownOpen(false);
  };

  return (
    <main className="flex-1 p-4 overflow-auto">
      {/* Card de Filtro de Unidade */}
      <div className="bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] rounded-lg shadow-lg border-2 border-[#2C5F6F] p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Visualizar Usuários por Unidade/Equipe</h3>
              <p className="text-xs text-white/70 mt-0.5">Segregação de acessos por localidade</p>
            </div>
          </div>

          {/* Selector de Unidade */}
          <div className="relative" onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white hover:bg-gray-50 border-2 border-white/30 rounded-lg px-6 py-3 text-sm font-semibold text-[#1a3d47] transition-all cursor-pointer flex items-center gap-3 min-w-[240px] shadow-lg"
            >
              <MapPin className="w-4 h-4 text-[#2C5F6F]" />
              <span className="flex-1 text-left">{selectedUnit}</span>
              <ChevronDown className={`w-4 h-4 text-[#2C5F6F] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[240px] bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden">
                {units.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => handleUnitChange(unit)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedUnit === unit
                        ? 'bg-[#2C5F6F] text-white font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {unit === 'Todas' && '🌎 '}
                    {unit}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Total de Usuários */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredUsers.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Usuários Ativos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {filteredUsers.filter(u => u.status === 'Ativo').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Perfis Distribuídos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-3">Distribuição por Perfil</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">👑 Administrador</span>
              <span className="font-semibold text-blue-600">
                {filteredUsers.filter(u => u.profile === 'Administrador').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">🔬 Analista</span>
              <span className="font-semibold text-green-600">
                {filteredUsers.filter(u => u.profile === 'Analista').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">👁️ Consulta</span>
              <span className="font-semibold text-gray-600">
                {filteredUsers.filter(u => u.profile === 'Consulta').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Header com botão de novo usuário */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lista de Usuários</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
            {selectedUnit !== 'Todas' && ` em ${selectedUnit}`}
          </p>
        </div>

        <button
          onClick={handleNewUser}
          className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Cadastrar Novo Usuário
        </button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1a3d47] text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nome e E-mail</th>
                <th className="px-6 py-4 text-center font-semibold">Perfil de Acesso</th>
                <th className="px-6 py-4 text-left font-semibold">Unidade/Equipe</th>
                <th className="px-6 py-4 text-center font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user, index) => (
                <tr 
                  key={user.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition-colors border-b border-gray-200`}
                >
                  {/* Nome e E-mail */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2C5F6F] to-[#4a9baf] flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Perfil de Acesso */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${profileColors[user.profile]}`}>
                      <span>{profileIcons[user.profile]}</span>
                      {user.profile}
                    </span>
                  </td>

                  {/* Unidade/Site Vinculado */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2C5F6F]" />
                      <span className="text-gray-700 font-medium">{user.unit}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      user.status === 'Ativo' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        user.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      {user.status}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEditUser(user.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar usuário"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-2 ${
                          user.status === 'Ativo' ? 'text-red-600' : 'text-green-600'
                        } hover:bg-gray-50 rounded-lg transition-colors`}
                        title={user.status === 'Ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between">
            {/* Informação de Exibição */}
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">{indexOfFirstUser + 1}</span> a{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(indexOfLastUser, filteredUsers.length)}
              </span>{' '}
              de <span className="font-semibold text-gray-900">{filteredUsers.length}</span> usuários
            </div>

            {/* Controles de Paginação */}
            <div className="flex items-center gap-2">
              {/* Botão Anterior */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#2C5F6F] hover:text-[#2C5F6F]'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>

              {/* Números de Página */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                  // Mostrar sempre primeira, última, atual e adjacentes
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                          currentPage === pageNumber
                            ? 'bg-[#2C5F6F] text-white shadow-md'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#2C5F6F] hover:text-[#2C5F6F]'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return (
                      <span key={pageNumber} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Botão Próximo */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#2C5F6F] hover:text-[#2C5F6F]'
                }`}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Usuário */}
      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }} 
        onSubmit={(userData) => {
          if (editingUser) {
            // Atualizar usuário existente (mantém o status atual)
            setUsers(users.map(u => 
              u.id === editingUser.id 
                ? { ...u, name: userData.name, email: userData.email, profile: userData.profile, unit: userData.unit }
                : u
            ));
            
            toast.success(`✅ Usuário ${userData.name} atualizado com sucesso!`, {
              description: `Perfil: ${userData.profile}`
            });
            setIsModalOpen(false);
          } else {
            handleSubmitNewUser(userData);
          }
          setEditingUser(null);
        }} 
        editUser={editingUser} 
      />

      {/* Modal de Exclusão de Usuário */}
      <DeleteUserModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingUser(null);
        }} 
        onConfirm={() => {
          if (deletingUser) {
            // Remover usuário da lista
            setUsers(users.filter(u => u.id !== deletingUser.id));
            
            toast.success(`✅ Usuário ${deletingUser.name} excluído com sucesso!`, {
              description: 'O acesso foi revogado e os registros foram mantidos para auditoria'
            });
            
            // Ajustar página se necessário
            const newFilteredUsers = users
              .filter(u => u.id !== deletingUser.id && u.unit === userUnit);
            
            const newTotalPages = Math.ceil(newFilteredUsers.length / usersPerPage);
            if (currentPage > newTotalPages && newTotalPages > 0) {
              setCurrentPage(newTotalPages);
            }
          }
          setIsDeleteModalOpen(false);
          setDeletingUser(null);
        }} 
        userName={deletingUser?.name || ''} 
      />
    </main>
  );
}