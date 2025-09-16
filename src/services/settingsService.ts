import { apiRequest } from '@/config/api';

export interface SystemSettings {
  _id?: string;
  companyName: string;
  timezone: string;
  language: string;
  theme: string;
  autoRefresh: boolean;
  refreshInterval: number;
  alertSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    oeeThreshold: number;
    availabilityThreshold: number;
    performanceThreshold: number;
    qualityThreshold: number;
    maintenanceAlerts: boolean;
    productionAlerts: boolean;
  };
  securitySettings: {
    sessionTimeout: number;
    passwordExpiry: number;
    twoFactorAuth: boolean;
    auditLog: boolean;
    loginAttempts: number;
  };
  integrationSettings: {
    mesIntegration: boolean;
    erpIntegration: boolean;
    iotSensors: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    webhookUrls?: Array<{
      name: string;
      url: string;
      events: string[];
      active: boolean;
    }>;
  };
  isActive: boolean;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SettingsResponse {
  success: boolean;
  message?: string;
  data: SystemSettings;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface SettingsHistoryResponse {
  success: boolean;
  data: {
    settings: SystemSettings[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
  };
}

class SettingsService {
  private baseUrl = '/settings';

  /**
   * Obter configurações ativas do sistema
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      const response = await apiRequest(this.baseUrl, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar configurações');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      throw error;
    }
  }

  /**
   * Atualizar todas as configurações
   */
  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const response = await apiRequest(this.baseUrl, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar configurações');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  /**
   * Atualizar apenas configurações do sistema
   */
  async updateSystemSettings(settings: {
    companyName?: string;
    timezone?: string;
    language?: string;
    theme?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }): Promise<SystemSettings> {
    try {
      const response = await apiRequest(`${this.baseUrl}/system`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar configurações do sistema');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações do sistema:', error);
      throw error;
    }
  }

  /**
   * Atualizar apenas configurações de alertas
   */
  async updateAlertSettings(settings: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    oeeThreshold?: number;
    availabilityThreshold?: number;
    performanceThreshold?: number;
    qualityThreshold?: number;
    maintenanceAlerts?: boolean;
    productionAlerts?: boolean;
  }): Promise<SystemSettings> {
    try {
      const response = await apiRequest(`${this.baseUrl}/alerts`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar configurações de alertas');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações de alertas:', error);
      throw error;
    }
  }

  /**
   * Atualizar apenas configurações de segurança
   */
  async updateSecuritySettings(settings: {
    sessionTimeout?: number;
    passwordExpiry?: number;
    twoFactorAuth?: boolean;
    auditLog?: boolean;
    loginAttempts?: number;
  }): Promise<SystemSettings> {
    try {
      const response = await apiRequest(`${this.baseUrl}/security`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar configurações de segurança');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações de segurança:', error);
      throw error;
    }
  }

  /**
   * Atualizar apenas configurações de integração
   */
  async updateIntegrationSettings(settings: {
    mesIntegration?: boolean;
    erpIntegration?: boolean;
    iotSensors?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    webhookUrls?: Array<{
      name: string;
      url: string;
      events: string[];
      active: boolean;
    }>;
  }): Promise<SystemSettings> {
    try {
      const response = await apiRequest(`${this.baseUrl}/integration`, {
        method: 'PUT',
        body: JSON.stringify(settings)
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar configurações de integração');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar configurações de integração:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de configurações
   */
  async getSettingsHistory(page: number = 1, limit: number = 10): Promise<SettingsHistoryResponse['data']> {
    try {
      const response = await apiRequest(`${this.baseUrl}/history?page=${page}&limit=${limit}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar histórico de configurações');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar histórico de configurações:', error);
      throw error;
    }
  }

  /**
   * Resetar configurações para o padrão
   */
  async resetSettings(): Promise<SystemSettings> {
    try {
      const response = await apiRequest(`${this.baseUrl}/reset`, {
        method: 'POST'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao resetar configurações');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
      throw error;
    }
  }

  /**
   * Validar configurações antes de salvar
   */
  validateSettings(settings: Partial<SystemSettings>): string[] {
    const errors: string[] = [];

    // Validar configurações do sistema
    if (settings.companyName !== undefined) {
      if (!settings.companyName.trim()) {
        errors.push('Nome da empresa é obrigatório');
      } else if (settings.companyName.length > 100) {
        errors.push('Nome da empresa deve ter no máximo 100 caracteres');
      }
    }

    if (settings.refreshInterval !== undefined) {
      if (settings.refreshInterval < 10 || settings.refreshInterval > 300) {
        errors.push('Intervalo de atualização deve ser entre 10 e 300 segundos');
      }
    }

    // Validar configurações de alertas
    if (settings.alertSettings) {
      const { alertSettings } = settings;
      
      if (alertSettings.oeeThreshold !== undefined) {
        if (alertSettings.oeeThreshold < 0 || alertSettings.oeeThreshold > 100) {
          errors.push('Limite OEE deve ser entre 0 e 100');
        }
      }

      if (alertSettings.availabilityThreshold !== undefined) {
        if (alertSettings.availabilityThreshold < 0 || alertSettings.availabilityThreshold > 100) {
          errors.push('Limite de disponibilidade deve ser entre 0 e 100');
        }
      }

      if (alertSettings.performanceThreshold !== undefined) {
        if (alertSettings.performanceThreshold < 0 || alertSettings.performanceThreshold > 100) {
          errors.push('Limite de performance deve ser entre 0 e 100');
        }
      }

      if (alertSettings.qualityThreshold !== undefined) {
        if (alertSettings.qualityThreshold < 0 || alertSettings.qualityThreshold > 100) {
          errors.push('Limite de qualidade deve ser entre 0 e 100');
        }
      }

      // Validar lógica dos limites
      if (alertSettings.oeeThreshold !== undefined && alertSettings.availabilityThreshold !== undefined) {
        if (alertSettings.oeeThreshold >= alertSettings.availabilityThreshold) {
          errors.push('Limite OEE deve ser menor que limite de disponibilidade');
        }
      }
    }

    // Validar configurações de segurança
    if (settings.securitySettings) {
      const { securitySettings } = settings;
      
      if (securitySettings.sessionTimeout !== undefined) {
        if (securitySettings.sessionTimeout < 30 || securitySettings.sessionTimeout > 1440) {
          errors.push('Timeout de sessão deve ser entre 30 e 1440 minutos');
        }
      }

      if (securitySettings.passwordExpiry !== undefined) {
        if (securitySettings.passwordExpiry < 30 || securitySettings.passwordExpiry > 365) {
          errors.push('Expiração de senha deve ser entre 30 e 365 dias');
        }
      }

      if (securitySettings.loginAttempts !== undefined) {
        if (securitySettings.loginAttempts < 3 || securitySettings.loginAttempts > 10) {
          errors.push('Tentativas de login devem ser entre 3 e 10');
        }
      }
    }

    // Validar URLs de webhooks
    if (settings.integrationSettings?.webhookUrls) {
      settings.integrationSettings.webhookUrls.forEach((webhook, index) => {
        if (!webhook.name.trim()) {
          errors.push(`Nome do webhook ${index + 1} é obrigatório`);
        }
        
        if (!webhook.url.trim()) {
          errors.push(`URL do webhook ${index + 1} é obrigatória`);
        } else if (!/^https?:\/\/.+/.test(webhook.url)) {
          errors.push(`URL do webhook ${index + 1} é inválida`);
        }
        
        if (!webhook.events || webhook.events.length === 0) {
          errors.push(`Webhook ${index + 1} deve ter pelo menos um evento`);
        }
      });
    }

    return errors;
  }
}

export const settingsService = new SettingsService();
export default settingsService;