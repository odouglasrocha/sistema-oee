import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Role {
  id: string;
  name: 'operador' | 'supervisor' | 'administrador';
  displayName: string;
  permissions: string[];
  level: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  department?: string;
  location?: string;
  avatar?: string;
  preferences?: {
    theme: string;
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      maintenance: boolean;
      production: boolean;
    };
  };
  lastLogin?: string;
  passwordNeedsChange?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

import { API_BASE_URL, apiRequest as centralApiRequest } from '@/config/api';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para fazer requisições autenticadas
  const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('oee-token');
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro de conexão' }));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }

    return response.json();
  };

  // Verificar autenticação ao carregar e escutar eventos
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('oee-token');
        
        if (!token) {
          console.log('⚠️ Nenhum token encontrado, aguardando autenticação...');
          setUser(null);
          setError(null);
          return;
        }

        // Verificar se o token é válido decodificando JWT
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp > now + 60) {
            // Token válido, verificar com o servidor
            try {
              const data = await apiRequest('/auth/verify');
              setUser(data.user);
              setError(null);
              console.log('✅ Usuário autenticado com sucesso:', data.user.email);
            } catch (verifyError) {
              console.log('⚠️ Verificação falhou, removendo tokens...');
              localStorage.removeItem('oee-token');
              localStorage.removeItem('oee-refresh-token');
              setUser(null);
              setError('Sessão expirada');
            }
          } else {
            console.log('⚠️ Token expirado, removendo tokens...');
            localStorage.removeItem('oee-token');
            localStorage.removeItem('oee-refresh-token');
            setUser(null);
            setError('Token expirado');
          }
        } catch (tokenError) {
          console.log('⚠️ Token inválido, removendo tokens...');
          localStorage.removeItem('oee-token');
          localStorage.removeItem('oee-refresh-token');
          setUser(null);
          setError('Token inválido');
        }
      } catch (error) {
        console.error('❌ Erro na verificação de autenticação:', error);
        setUser(null);
        setError(`Erro de autenticação: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Escutar eventos de autenticação
    const handleAuthSuccess = (event: CustomEvent) => {
      console.log('🎉 Evento de sucesso na autenticação recebido');
      setUser(event.detail.user);
      setError(null);
      setIsLoading(false);
    };

    const handleAuthError = (event: CustomEvent) => {
      console.log('❌ Evento de erro na autenticação recebido:', event.detail.error);
      setUser(null);
      setError(event.detail.error);
      setIsLoading(false);
    };

    // Adicionar listeners
    window.addEventListener('auth-success', handleAuthSuccess as EventListener);
    window.addEventListener('auth-error', handleAuthError as EventListener);

    // Iniciar verificação
    checkAuth();

    // Cleanup
    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no login');
      }

      const data = await response.json();
      
      // Armazenar tokens
      localStorage.setItem('oee-token', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('oee-refresh-token', data.tokens.refreshToken);
      }
      
      // Definir usuário
      setUser(data.user);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      const refreshToken = localStorage.getItem('oee-refresh-token');
      const token = localStorage.getItem('oee-token');
      
      // Tentar fazer logout no servidor apenas se houver token válido
      if (token && refreshToken) {
        try {
          await apiRequest('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
        } catch (logoutError) {
          // Ignorar silenciosamente erros de logout no servidor
          // Isso é normal quando o token já expirou ou é inválido
        }
      }
    } catch (error) {
      // Ignorar erros gerais de logout
    } finally {
      // Limpar dados locais independentemente do resultado
      setUser(null);
      setError(null);
      localStorage.removeItem('oee-token');
      localStorage.removeItem('oee-refresh-token');
      setIsLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('oee-refresh-token');
      if (!refreshTokenValue) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error('Erro ao renovar token');
      }

      const data = await response.json();
      
      // Atualizar token
      localStorage.setItem('oee-token', data.accessToken);
      setUser(data.user);
      setError(null);
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      // Token de refresh inválido, fazer logout
      await logout();
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user,
    isLoading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};