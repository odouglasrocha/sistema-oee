import { apiRequest } from '@/config/api';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  machineId?: string;
  shift?: string;
  department?: string;
  reportType?: string;
}

export interface OEEData {
  date: string;
  machineId: string;
  machineName: string;
  shift: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  plannedTime: number;
  actualTime: number;
  downtime: number;
  quantityProduced: number;
  targetQuantity: number;
  defectCount: number;
}

export interface ProductionSummary {
  totalProduced: number;
  totalTarget: number;
  averageOEE: number;
  averageAvailability: number;
  averagePerformance: number;
  averageQuality: number;
  totalDowntime: number;
  totalDefects: number;
  efficiency: number;
}

export interface DowntimeAnalysis {
  category: string;
  totalTime: number;
  percentage: number;
  occurrences: number;
  averageDuration: number;
  color: string;
}

export interface MachineEfficiency {
  machineId: string;
  machineName: string;
  target: number;
  produced: number;
  efficiency: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface ReportData {
  summary: ProductionSummary;
  oeeHistory: OEEData[];
  downtimeAnalysis: DowntimeAnalysis[];
  machineEfficiency: MachineEfficiency[];
  qualityMetrics: {
    totalProduced: number;
    totalDefects: number;
    qualityRate: number;
    reworkRate: number;
    scrapRate: number;
  };
}

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv';
  reportType: 'oee' | 'production' | 'downtime' | 'quality' | 'complete';
  filters: ReportFilters;
  includeCharts?: boolean;
}

class ReportsService {
  private baseUrl = '/reports';

  /**
   * Obter dados consolidados de relatórios
   */
  async getReportData(filters: ReportFilters): Promise<ReportData> {
    try {
      // Aguardar autenticação antes de fazer a requisição
      const isAuthenticated = await this.waitForAuthentication();
      
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado');
      }
      
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/data?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar dados do relatório');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      throw error;
    }
  }

  /**
   * Obter dados históricos de OEE
   */
  async getOEEHistory(filters: ReportFilters): Promise<OEEData[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/oee-history?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar histórico de OEE');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar histórico de OEE:', error);
      throw error;
    }
  }

  /**
   * Obter análise de paradas (downtime)
   */
  async getDowntimeAnalysis(filters: ReportFilters): Promise<DowntimeAnalysis[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/downtime-analysis?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar análise de paradas');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar análise de paradas:', error);
      throw error;
    }
  }

  /**
   * Obter eficiência por máquina
   */
  async getMachineEfficiency(filters: ReportFilters): Promise<MachineEfficiency[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/machine-efficiency?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar eficiência das máquinas');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar eficiência das máquinas:', error);
      throw error;
    }
  }

  /**
   * Obter resumo de produção
   */
  async getProductionSummary(filters: ReportFilters): Promise<ProductionSummary> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/production-summary?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar resumo de produção');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar resumo de produção:', error);
      throw error;
    }
  }

  /**
   * Obter métricas de qualidade
   */
  async getQualityMetrics(filters: ReportFilters) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiRequest(`${this.baseUrl}/quality-metrics?${params}`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar métricas de qualidade');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar métricas de qualidade:', error);
      throw error;
    }
  }

  /**
   * Exportar relatório
   */
  async exportReport(options: ExportOptions): Promise<Blob> {
    try {
      const response = await apiRequest(`${this.baseUrl}/export`, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao exportar relatório');
      }

      // Para download de arquivo, precisamos fazer uma requisição diferente
      const downloadResponse = await fetch(response.data.downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!downloadResponse.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      return await downloadResponse.blob();
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  /**
   * Verificar se o usuário está autenticado
   */
  private async waitForAuthentication(maxWait = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const token = localStorage.getItem('oee-token');
      
      if (token) {
        try {
          // Verificar se o token não está expirado
          const payload = JSON.parse(atob(token.split('.')[1]));
          const now = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp > now + 60) {
            return true;
          }
        } catch {
          // Token inválido, continuar aguardando
        }
      }
      
      // Aguardar 200ms antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return false;
  }

  /**
   * Obter lista de máquinas para filtros
   */
  async getMachines(): Promise<Array<{ id: string; name: string; department: string }>> {
    try {
      // Aguardar um pouco para garantir que a autenticação foi processada
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const response = await apiRequest('/machines', {
            method: 'GET'
          });

          // Verificar se a resposta tem o formato esperado
          let machines = [];
          if (response.success && response.data?.machines) {
            machines = response.data.machines;
          } else if (Array.isArray(response.data)) {
            machines = response.data;
          } else if (Array.isArray(response)) {
            machines = response;
          } else {
            console.log('Formato de resposta inesperado:', response);
            return [];
          }

          return machines.map((machine: any) => ({
            id: machine._id || machine.id,
            name: machine.name || 'Máquina sem nome',
            department: machine.location?.area || machine.department || 'Não especificado'
          }));
        } catch (error: any) {
          if (error.message?.includes('não autenticado') && retries < maxRetries - 1) {
            retries++;
            console.log(`Tentativa ${retries}/${maxRetries} - Aguardando autenticação...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          throw error;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao carregar lista de máquinas:', error);
      // Retornar array vazio em caso de erro de autenticação
      return [];
    }
  }

  /**
   * Comparar períodos
   */
  async comparePeriods(
    currentPeriod: ReportFilters,
    previousPeriod: ReportFilters
  ): Promise<{
    current: ProductionSummary;
    previous: ProductionSummary;
    comparison: {
      oeeChange: number;
      productionChange: number;
      qualityChange: number;
      downtimeChange: number;
    };
  }> {
    try {
      const response = await apiRequest(`${this.baseUrl}/compare-periods`, {
        method: 'POST',
        body: JSON.stringify({
          currentPeriod,
          previousPeriod
        })
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao comparar períodos');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao comparar períodos:', error);
      throw error;
    }
  }

  /**
   * Obter dados para dashboard em tempo real
   */
  async getRealTimeData(): Promise<{
    currentOEE: number;
    activeMachines: number;
    totalProduction: number;
    qualityRate: number;
    alerts: Array<{
      id: string;
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      timestamp: string;
    }>;
  }> {
    try {
      const response = await apiRequest(`${this.baseUrl}/real-time`, {
        method: 'GET'
      });

      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar dados em tempo real');
      }

      return response.data;
    } catch (error) {
      console.error('Erro ao carregar dados em tempo real:', error);
      throw error;
    }
  }

  /**
   * Validar filtros de data
   */
  validateDateFilters(filters: ReportFilters): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!filters.startDate) {
      errors.push('Data inicial é obrigatória');
    }
    
    if (!filters.endDate) {
      errors.push('Data final é obrigatória');
    }
    
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      if (startDate > endDate) {
        errors.push('Data inicial deve ser anterior à data final');
      }
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        errors.push('Período máximo permitido é de 365 dias');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formatar dados para gráficos
   */
  formatChartData(data: OEEData[], type: 'line' | 'bar' | 'area' = 'line') {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      }),
      oee: Number(item.oee.toFixed(1)),
      availability: Number(item.availability.toFixed(1)),
      performance: Number(item.performance.toFixed(1)),
      quality: Number(item.quality.toFixed(1)),
      machine: item.machineName,
      shift: item.shift
    }));
  }

  /**
   * Calcular tendências
   */
  calculateTrends(data: OEEData[]): {
    oee: 'up' | 'down' | 'stable';
    production: 'up' | 'down' | 'stable';
    quality: 'up' | 'down' | 'stable';
  } {
    if (data.length < 2) {
      return { oee: 'stable', production: 'stable', quality: 'stable' };
    }

    const recent = data.slice(-3);
    const older = data.slice(0, 3);

    const recentAvgOEE = recent.reduce((sum, item) => sum + item.oee, 0) / recent.length;
    const olderAvgOEE = older.reduce((sum, item) => sum + item.oee, 0) / older.length;

    const recentAvgProduction = recent.reduce((sum, item) => sum + item.quantityProduced, 0) / recent.length;
    const olderAvgProduction = older.reduce((sum, item) => sum + item.quantityProduced, 0) / older.length;

    const recentAvgQuality = recent.reduce((sum, item) => sum + item.quality, 0) / recent.length;
    const olderAvgQuality = older.reduce((sum, item) => sum + item.quality, 0) / older.length;

    const threshold = 2; // 2% de diferença para considerar mudança significativa

    return {
      oee: Math.abs(recentAvgOEE - olderAvgOEE) < threshold ? 'stable' : 
           recentAvgOEE > olderAvgOEE ? 'up' : 'down',
      production: Math.abs(recentAvgProduction - olderAvgProduction) < threshold ? 'stable' : 
                  recentAvgProduction > olderAvgProduction ? 'up' : 'down',
      quality: Math.abs(recentAvgQuality - olderAvgQuality) < threshold ? 'stable' : 
               recentAvgQuality > olderAvgQuality ? 'up' : 'down'
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;