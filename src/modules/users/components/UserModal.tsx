import { useState, useEffect } from 'react'
import { X, User, Mail, MapPin, Shield, CheckCircle } from 'lucide-react'
import { stationsService } from '@/services/stationsService'

export interface UserFormData {
  name: string
  email: string
  unit: string
  profile: 'Administrador' | 'Analista' | 'Consulta'
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userData: UserFormData) => void
  editUser?: { id: string; name: string; email: string; unit: string; profile: 'Administrador' | 'Analista' | 'Consulta' } | null
}

const PROFILES = [
  {
    id: 'Administrador' as const,
    title: 'Administrador',
    emoji: '👑',
    description: 'Acesso total. Pode alterar configurações globais, gerenciar usuários e manipular todos os dados.',
    permissions: [
      'Configuração global do sistema',
      'Gestão completa de usuários',
      'Manipulação de todos os dados',
      'Acesso irrestrito a todos módulos',
    ],
  },
  {
    id: 'Analista' as const,
    title: 'Analista',
    emoji: '🔬',
    description: 'Acesso técnico. Pode inserir, editar e excluir medições e realizar a consistência de dados.',
    permissions: [
      'Inserção de medições',
      'Edição de dados coletados',
      'Validação e consistência',
      'Exclusão de registros',
    ],
  },
  {
    id: 'Consulta' as const,
    title: 'Consulta',
    emoji: '👁️',
    description: 'Acesso restrito. Permissão apenas para visualizar dashboards e gerar relatórios, sem poder de edição.',
    permissions: [
      'Visualização de dashboards',
      'Geração de relatórios',
      'Consulta de dados históricos',
      'Sem permissão de edição',
    ],
  },
]

export function UserModal({ isOpen, onClose, onSubmit, editUser = null }: UserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [unit, setUnit] = useState('')
  const [profile, setProfile] = useState<'Administrador' | 'Analista' | 'Consulta' | ''>('')
  const [units, setUnits] = useState<string[]>([])

  useEffect(() => {
    stationsService.getAllStationUnits().then((map) => setUnits(Object.keys(map)))
  }, [])

  useEffect(() => {
    if (editUser) {
      setName(editUser.name)
      setEmail(editUser.email)
      setUnit(editUser.unit)
      setProfile(editUser.profile)
    } else {
      setName('')
      setEmail('')
      setUnit('--- Selecione uma Unidade ---')
      setProfile('')
    }
  }, [editUser, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !unit || !profile || unit === '--- Selecione uma Unidade ---') return
    onSubmit({ name, email, unit, profile })
    setName('')
    setEmail('')
    setUnit('--- Selecione uma Unidade ---')
    setProfile('')
  }

  const handleCancel = () => {
    setName('')
    setEmail('')
    setUnit('--- Selecione uma Unidade ---')
    setProfile('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] px-6 py-4 flex items-center justify-between border-b border-white/20 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h2>
              <p className="text-xs text-white/70">
                {editUser ? 'Atualize os dados do usuário' : 'Preencha os dados para criar um novo acesso ao sistema'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleCancel} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-[#2C5F6F] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Perfil de Acesso e Permissões
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Selecione o nível de acesso que melhor se adequa às responsabilidades do usuário
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PROFILES.map((prof) => {
                const isSelected = profile === prof.id

                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setProfile(prof.id)}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left cursor-pointer group ${
                      isSelected
                        ? 'bg-[#2C5F6F] border-[#2C5F6F] shadow-lg'
                        : 'bg-white border-gray-300 hover:border-[#2C5F6F] hover:shadow-md'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-[#2C5F6F]" />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                          isSelected ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-[#2C5F6F]/10'
                        }`}
                      >
                        {prof.emoji}
                      </div>
                      <h4
                        className={`font-bold text-sm ${
                          isSelected ? 'text-white' : 'text-gray-900 group-hover:text-[#2C5F6F]'
                        }`}
                      >
                        {prof.title}
                      </h4>
                    </div>

                    <p
                      className={`text-[10px] leading-snug ${
                        isSelected ? 'text-white/90' : 'text-gray-600 group-hover:text-gray-700'
                      }`}
                    >
                      {prof.description}
                    </p>

                    {!isSelected && (
                      <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-dashed group-hover:border-[#2C5F6F]/30 pointer-events-none" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-[#2C5F6F] mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados de Identificação
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite o nome completo do usuário"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail Corporativo *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@petrobras.com.br"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent outline-none transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Unidade/Equipe *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent outline-none transition-all text-sm appearance-none bg-white cursor-pointer"
                    required
                  >
                    <option value="--- Selecione uma Unidade ---" disabled>
                      --- Selecione uma Unidade ---
                    </option>
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg text-sm flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {editUser ? 'Salvar Alterações' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
