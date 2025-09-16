// Configuração centralizada da API

// Detectar ambiente e configurar URL da API
export const getApiBaseUrl = (): string => {
  // Usar variável de ambiente do Vite se disponível
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback: detectar por hostname
  if (window.location.hostname === 'planing-ita.com' || window.location.hostname === 'www.planing-ita.com') {
    return 'https://planing-ita.com/api';
  }
  
  // Desenvolvimento local
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Log da configuração atual (apenas em desenvolvimento)
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGS === 'true') {
  console.log('🔗 API configurada para:', API_BASE_URL);
  console.log('🌍 Ambiente:', import.meta.env.VITE_APP_ENV || (window.location.hostname.includes('planing-ita.com') ? 'Produção' : 'Desenvolvimento'));
  console.log('📦 Versão:', import.meta.env.VITE_APP_VERSION || '1.0.0');
}

// Configurações adicionais
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  retries: 3,
  retryDelay: 1000, // 1 segundo
};

// Headers padrão para requisições
export const getDefaultHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('oee-token');
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Função para obter credenciais baseadas no ambiente
const getEnvironmentCredentials = () => {
  const isProduction = window.location.hostname.includes('planing-ita.com');
  
  if (isProduction) {
    // Credenciais para produção
    return {
      email: 'admin@planing-ita.com',
      password: 'prod2024!'
    };
  } else {
    // Credenciais para desenvolvimento
    return {
      email: 'admin@oee.com',
      password: 'demo123'
    };
  }
};

// Sistema robusto de autenticação automática
let isAuthenticating = false;
let authPromise: Promise<string | null> | null = null;

const getOrCreateToken = async (): Promise<string | null> => {
  // Evitar múltiplas tentativas simultâneas de autenticação
  if (isAuthenticating && authPromise) {
    return authPromise;
  }

  let token = localStorage.getItem('oee-token');
  
  // Verificar se o token existe e não está expirado
  if (token) {
    try {
      // Decodificar JWT para verificar expiração
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp > now + 60) { // Token válido por mais de 1 minuto
        return token;
      } else {
        console.log('🔄 Token expirado, removendo...');
        localStorage.removeItem('oee-token');
        token = null;
      }
    } catch (error) {
      console.log('🔄 Token inválido, removendo...');
      localStorage.removeItem('oee-token');
      token = null;
    }
  }
  
  if (!token) {
    isAuthenticating = true;
    authPromise = performAutoLogin();
    
    try {
      token = await authPromise;
    } finally {
      isAuthenticating = false;
      authPromise = null;
    }
  }
  
  return token;
};

const performAutoLogin = async (): Promise<string | null> => {
  try {
    const credentials = getEnvironmentCredentials();
    const environment = window.location.hostname.includes('planing-ita.com') ? 'Produção' : 'Desenvolvimento';
    
    console.log(`🔄 Realizando login automático (${environment}) para:`, credentials.email);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.tokens && data.tokens.accessToken) {
        const token = data.tokens.accessToken;
        localStorage.setItem('oee-token', token);
        
        if (data.tokens.refreshToken) {
          localStorage.setItem('oee-refresh-token', data.tokens.refreshToken);
        }
        
        console.log(`✅ Login automático bem-sucedido (${environment})`);
        
        // Disparar evento customizado para notificar componentes
        window.dispatchEvent(new CustomEvent('auth-success', { 
          detail: { user: data.user, token } 
        }));
        
        return token;
      } else {
        throw new Error('Tokens não recebidos na resposta');
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ Falha no login automático (${environment}):`, response.status, errorText);
      throw new Error(`Login falhou: ${response.status}`);
    }
  } catch (error) {
    const environment = window.location.hostname.includes('planing-ita.com') ? 'Produção' : 'Desenvolvimento';
    console.error(`❌ Erro no login automático (${environment}):`, error);
    
    // Disparar evento de erro
    window.dispatchEvent(new CustomEvent('auth-error', { 
      detail: { error: error.message } 
    }));
    
    return null;
  }
};

// Função principal para requisições com retry automático e interceptação de erros
export const apiRequest = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
  const maxRetries = 2;
  
  try {
    const token = await getOrCreateToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Interceptar erro 401 (Não Autorizado)
    if (response.status === 401 && retryCount < maxRetries) {
      console.log(`🔄 Token inválido (401), tentativa ${retryCount + 1}/${maxRetries}`);
      
      // Limpar token inválido
      localStorage.removeItem('oee-token');
      localStorage.removeItem('oee-refresh-token');
      
      // Tentar novamente com novo token
      return apiRequest(endpoint, options, retryCount + 1);
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Se não conseguir parsear JSON, usar mensagem padrão
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${endpoint}`, data);
    return data;
    
  } catch (error) {
    if (retryCount < maxRetries && (error.message.includes('fetch') || error.message.includes('network'))) {
      console.log(`🔄 Erro de rede, tentativa ${retryCount + 1}/${maxRetries}`);
      
      // Aguardar um pouco antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return apiRequest(endpoint, options, retryCount + 1);
    }
    
    console.error(`❌ API Error: ${endpoint}`, error);
    throw error;
  }
};

// Configurações específicas por ambiente
export const ENV_CONFIG = {
  development: {
    apiUrl: 'http://localhost:3001/api',
    enableLogs: true,
    enableDebug: true,
  },
  production: {
    apiUrl: 'https://planing-ita.com/api',
    enableLogs: false,
    enableDebug: false,
  }
};

export const getCurrentEnvConfig = () => {
  // Usar configuração do Vite se disponível
  if (import.meta.env.VITE_APP_ENV) {
    return import.meta.env.VITE_APP_ENV === 'production' ? ENV_CONFIG.production : ENV_CONFIG.development;
  }
  
  // Fallback: detectar por hostname
  const isProduction = window.location.hostname.includes('planing-ita.com');
  return isProduction ? ENV_CONFIG.production : ENV_CONFIG.development;
};

// Configurações globais da aplicação
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'OEE Monitor',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? 'development' : 'production'),
  enableLogs: import.meta.env.VITE_ENABLE_LOGS === 'true' || import.meta.env.DEV,
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true' || import.meta.env.DEV,
};

// Função para log condicional
export const conditionalLog = (...args: any[]) => {
  if (APP_CONFIG.enableLogs) {
    console.log(...args);
  }
};

// Função para debug condicional
export const conditionalDebug = (...args: any[]) => {
  if (APP_CONFIG.enableDebug) {
    console.debug(...args);
  }
};