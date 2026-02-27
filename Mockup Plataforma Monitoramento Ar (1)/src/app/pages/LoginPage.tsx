import { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Wind } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import quantivraLogo from 'figma:asset/729eb694bc5441612c33e1f4a42cbe6f28a010d1.png';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('⚠️ Preencha todos os campos', {
        description: 'E-mail e senha são obrigatórios'
      });
      return;
    }

    setIsLoading(true);

    // Simular delay de autenticação
    setTimeout(() => {
      const success = login(email, password);
      
      if (success) {
        toast.success('✅ Login realizado com sucesso!', {
          description: 'Bem-vindo ao Quantivra'
        });
      } else {
        toast.error('❌ Credenciais inválidas', {
          description: 'Verifique seu e-mail e senha'
        });
      }
      
      setIsLoading(false);
    }, 800);
  };

  const mockUsers = [
    {
      profile: 'Administrador',
      email: 'carlos.silva@petrobras.com.br',
      password: 'admin123',
      icon: '👑',
      color: 'from-blue-600 to-blue-700',
      unit: 'Unidade SP'
    },
    {
      profile: 'Analista',
      email: 'ana.santos@petrobras.com.br',
      password: 'analista123',
      icon: '🔬',
      color: 'from-green-600 to-green-700',
      unit: 'Unidade SP'
    },
    {
      profile: 'Consulta',
      email: 'mariana.costa@petrobras.com.br',
      password: 'consulta123',
      icon: '👁️',
      color: 'from-gray-600 to-gray-700',
      unit: 'Unidade SP'
    }
  ];

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1f2a] via-[#1a3d47] to-[#2C5F6F] flex items-center justify-center p-4">
      {/* Padrão de fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-xl flex justify-center relative z-10">
        {/* Painel de Login */}
        <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden">{/* Header do Form */}
          <div className="bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] p-8 text-center">
            <img 
              src={quantivraLogo} 
              alt="Quantivra Logo" 
              className="w-40 h-40 mx-auto mb-4 object-contain"
            />
            <h2 className="text-2xl font-bold text-white mb-2">Acesso ao Quantivra</h2>
            <p className="text-sm text-white/80">Entre com suas credenciais</p>
          </div>

          {/* Formulário */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo E-mail */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#2C5F6F] focus:ring-2 focus:ring-[#2C5F6F]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:border-[#2C5F6F] focus:ring-2 focus:ring-[#2C5F6F]/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Botão de Login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#1a3d47] to-[#2C5F6F] text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Autenticando...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Acessar Quantivra
                  </>
                )}
              </button>
            </form>

            {/* Divisor */}
            {/* <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="bg-white px-4 py-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  (Entrar em contato)
                </button>
              </div>
            </div> */}

            {/* Credenciais de Teste */}
            {/* {showCredentials && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Clique em um card abaixo para preencher as credenciais automaticamente</span>
                </div>

                {mockUsers.map((user, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleQuickLogin(user.email, user.password)}
                    className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-4 hover:border-[#2C5F6F] hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-lg shadow-md`}>
                        {user.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{user.profile}</p>
                        <p className="text-xs text-gray-500">{user.unit}</p>
                      </div>
                      <div className="text-xs text-gray-400 group-hover:text-[#2C5F6F] transition-colors">
                        Clique para usar →
                      </div>
                    </div>
                    <div className="space-y-1 text-xs font-mono bg-white rounded p-2 border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">{user.password}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
}