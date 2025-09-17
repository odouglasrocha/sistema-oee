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



// Função principal para requisições com retry automático e interceptação de erros
export const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    const config: RequestInit = {
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...options.headers,
      },
    };

    console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
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