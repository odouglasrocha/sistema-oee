import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/config/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
    displayName: string;
    permissions: string[];
    level: number;
  };
  status: string;
  department?: string;
  location?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Função para atualizar o estado de autenticação
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  }, []);

  // Função para verificar se o usuário está autenticado
  const checkAuthStatus = useCallback(async () => {
    try {
      updateAuthState({ isLoading: true, error: null });
      
      const token = localStorage.getItem('oee-token');
      if (!token) {
        updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return false;
      }

      // Verificar token JWT
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp <= now + 60) {
          // Token expirado
          localStorage.removeItem('oee-token');
          localStorage.removeItem('oee-refresh-token');
          updateAuthState({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          return false;
        }
      } catch {
        // Token inválido
        localStorage.removeItem('oee-token');
        localStorage.removeItem('oee-refresh-token');
        updateAuthState({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return false;
      }

      // Verificar com o servidor
      const data = await apiRequest('/auth/verify');
      updateAuthState({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Erro na verificação de autenticação:', error);
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erro de autenticação'
      });
      return false;
    }
  }, [updateAuthState]);

  // Função para fazer logout
  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      localStorage.removeItem('oee-token');
      localStorage.removeItem('oee-refresh-token');
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, [updateAuthState]);

  // Escutar eventos de autenticação
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      updateAuthState({
        user: event.detail.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    };

    const handleAuthError = (event: CustomEvent) => {
      updateAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: event.detail.error
      });
    };

    window.addEventListener('auth-success', handleAuthSuccess as EventListener);
    window.addEventListener('auth-error', handleAuthError as EventListener);

    // Verificação inicial
    checkAuthStatus();

    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess as EventListener);
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, [checkAuthStatus, updateAuthState]);

  return {
    ...authState,
    checkAuthStatus,
    logout,
    updateAuthState
  };
};