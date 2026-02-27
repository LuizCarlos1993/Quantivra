import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  profile: 'Administrador' | 'Analista' | 'Consulta';
  unit: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usuários mockados para login
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 1,
    name: 'Carlos Silva',
    email: 'carlos.silva@petrobras.com.br',
    password: 'admin123',
    profile: 'Administrador',
    unit: 'Unidade SP' // Administrador da Unidade SP (acesso restrito à sua unidade)
  },
  {
    id: 2,
    name: 'Ana Paula Santos',
    email: 'ana.santos@petrobras.com.br',
    password: 'analista123',
    profile: 'Analista',
    unit: 'Unidade SP' // Analista da Unidade SP
  },
  {
    id: 4,
    name: 'Mariana Costa',
    email: 'mariana.costa@petrobras.com.br',
    password: 'consulta123',
    profile: 'Consulta',
    unit: 'Unidade SP' // Consulta da Unidade SP
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('ecomonitor_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    const foundUser = MOCK_USERS.find(
      u => u.email === email && u.password === password
    );

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('ecomonitor_user', JSON.stringify(userWithoutPassword));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ecomonitor_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Durante hot reload, retornar valores padrão ao invés de lançar erro
    if (typeof window !== 'undefined' && import.meta.hot) {
      return {
        user: null,
        login: () => false,
        logout: () => {},
        isAuthenticated: false
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}