import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Edit, Trash2, Shield, Mail, MapPin, ChevronDown, ChevronLeft, ChevronRight, Power } from 'lucide-react'
import { useDataSegregation } from '@/hooks/useDataSegregation'
import { usePermissions } from '@/hooks/usePermissions'
import { usersService, type UserRecord } from '@/services/usersService'
import { UserModal, type UserFormData } from './components/UserModal'
import { DeleteUserModal } from './components/DeleteUserModal'
import { toast } from 'sonner'

const usersPerPage = 10

const profileColors = {
  Administrador: 'bg-blue-100 text-blue-700 border-blue-300',
  Analista: 'bg-green-100 text-green-700 border-green-300',
  Consulta: 'bg-gray-100 text-gray-700 border-gray-300',
}

const profileIcons = {
  Administrador: '👑',
  Analista: '🔬',
  Consulta: '👁️',
}

export function UsersPage() {
  const { canManageUsers } = usePermissions()
  const { userUnit } = useDataSegregation()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState('')
  const [allUnits, setAllUnits] = useState<string[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRecord | null>(null)
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const ALL_UNITS_LABEL = 'Todas as unidades'
  const effectiveUnit = selectedUnit || userUnit || allUnits[0] || ''

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      if (effectiveUnit === ALL_UNITS_LABEL) {
        const list = await usersService.getAll()
        setUsers(list)
      } else {
        const list = effectiveUnit ? await usersService.getByUnit(effectiveUnit) : []
        setUsers(list)
      }
    } finally {
      setLoading(false)
    }
  }, [effectiveUnit])

  useEffect(() => {
    if (canManageUsers) {
      usersService.getAllUnits().then((units) => setAllUnits(units))
    }
  }, [canManageUsers])

  useEffect(() => {
    if (selectedUnit) return
    if (canManageUsers && allUnits.length > 0) setSelectedUnit(ALL_UNITS_LABEL)
    else if (userUnit) setSelectedUnit(userUnit)
  }, [userUnit, selectedUnit, allUnits, canManageUsers])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleCreateUser = () => {
    setEditUser(null)
    setUserModalOpen(true)
  }

  const handleEditUser = (user: UserRecord) => {
    setEditUser(user)
    setUserModalOpen(true)
  }

  const handleDeleteUser = (user: UserRecord) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  const handleToggleStatus = async (user: UserRecord) => {
    const updated = await usersService.toggleStatus(user.id)
    if (updated) {
      await loadUsers()
      toast.success(`✅ Status do usuário ${user.name} alterado para ${updated.status}!`)
    }
  }

  const handleUserSubmit = async (data: UserFormData) => {
    try {
      if (editUser) {
        await usersService.update(editUser.id, { name: data.name, email: data.email, unit: data.unit, profile: data.profile })
        toast.success(`✅ Usuário ${data.name} atualizado com sucesso!`, { description: `Perfil: ${data.profile}` })
      } else {
        await usersService.create({ name: data.name, email: data.email, unit: data.unit, profile: data.profile, status: 'Ativo' })
        toast.success(`✅ Usuário ${data.name} cadastrado com sucesso!`, { description: `Perfil: ${data.profile} | Status: Ativo` })
      }
      setUserModalOpen(false)
      setCurrentPage(1)
      await loadUsers()
    } catch {
      toast.error('Erro ao salvar usuário')
    }
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    const ok = await usersService.delete(userToDelete.id)
    const name = userToDelete.name
    setDeleteModalOpen(false)
    setUserToDelete(null)
    if (ok) {
      toast.success(`✅ Usuário ${name} excluído com sucesso!`, {
        description: 'O acesso foi revogado e os registros foram mantidos para auditoria',
      })
      const newTotalPages = Math.ceil((users.length - 1) / usersPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) setCurrentPage(newTotalPages)
      await loadUsers()
    } else {
      toast.error('Erro ao excluir usuário')
    }
  }

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit)
    setCurrentPage(1)
    setIsDropdownOpen(false)
  }

  if (!canManageUsers) {
    return (
      <main className="flex-1 p-4 overflow-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
          Você não tem permissão para acessar a gestão de usuários.
        </div>
      </main>
    )
  }

  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(users.length / usersPerPage)

  const filteredTotal = users.length
  const ativos = users.filter((u) => u.status === 'Ativo').length
  const byProfile = users.reduce((acc, u) => {
    acc[u.profile] = (acc[u.profile] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

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

          <div className="relative" onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white hover:bg-gray-50 border-2 border-white/30 rounded-lg px-6 py-3 text-sm font-semibold text-[#1a3d47] transition-all cursor-pointer flex items-center gap-3 min-w-[240px] shadow-lg"
            >
              <MapPin className="w-4 h-4 text-[#2C5F6F]" />
              <span className="flex-1 text-left">{effectiveUnit || 'Selecione'}</span>
              <ChevronDown className={`w-4 h-4 text-[#2C5F6F] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[240px] bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleUnitChange(ALL_UNITS_LABEL)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-100 ${
                    effectiveUnit === ALL_UNITS_LABEL ? 'bg-[#2C5F6F] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {ALL_UNITS_LABEL}
                </button>
                {allUnits.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => handleUnitChange(unit)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      effectiveUnit === unit ? 'bg-[#2C5F6F] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredTotal}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{ativos}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium mb-3">Distribuição por Perfil</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">👑 Administrador</span>
              <span className="font-semibold text-blue-600">{byProfile['Administrador'] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">🔬 Analista</span>
              <span className="font-semibold text-green-600">{byProfile['Analista'] ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">👁️ Consulta</span>
              <span className="font-semibold text-gray-600">{byProfile['Consulta'] ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header com botão de novo usuário */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lista de Usuários</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredTotal} {filteredTotal === 1 ? 'usuário encontrado' : 'usuários encontrados'}
            {effectiveUnit && ` em ${effectiveUnit}`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateUser}
          className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Cadastrar Novo Usuário
        </button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando usuários...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado nesta unidade.</div>
        ) : (
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
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors border-b border-gray-200`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2C5F6F] to-[#4a9baf] flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)}
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

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${profileColors[user.profile]}`}>
                        <span>{profileIcons[user.profile]}</span>
                        {user.profile}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#2C5F6F]" />
                        <span className="text-gray-700 font-medium">{user.unit}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          user.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {user.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 ${user.status === 'Ativo' ? 'text-red-600' : 'text-green-600'} hover:bg-gray-50 rounded-lg transition-colors`}
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
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold text-gray-900">{indexOfFirstUser + 1}</span> a{' '}
              <span className="font-semibold text-gray-900">{Math.min(indexOfLastUser, users.length)}</span> de{' '}
              <span className="font-semibold text-gray-900">{users.length}</span> usuários
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                          currentPage === pageNumber
                            ? 'bg-[#2C5F6F] text-white shadow-md'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#2C5F6F] hover:text-[#2C5F6F]'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  }
                  if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                    return (
                      <span key={pageNumber} className="px-2 text-gray-400">
                        ...
                      </span>
                    )
                  }
                  return null
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      <UserModal isOpen={userModalOpen} onClose={() => { setUserModalOpen(false); setEditUser(null) }} onSubmit={handleUserSubmit} editUser={editUser} />
      <DeleteUserModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setUserToDelete(null) }} onConfirm={handleConfirmDelete} userName={userToDelete?.name ?? ''} />
    </main>
  )
}
