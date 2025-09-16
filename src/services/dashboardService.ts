import { apiRequest } from '@/config/api';

export interface MachineOEEData {
  id: string;
  name: string;
  code: string;
  location: {
    plant: string;
    area: string;
    line?: string;
    position?: string;
  };
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  status: 'excellent' | 'good' | 'warning' | 'critical' | 'inactive';
  lastUpdate: string | null;
  recordsCount: number;
  target: number;
}

export interface DashboardSummary {
  overallOEE: number;
  overallAvailability: number;
  overallPerformance: number;
  overallQuality: number;
  activeMachines: number;
  totalMachines: number;
  criticalMachines: number;
  period: string;
  lastUpdate: string;
}

export interface DashboardOEEData {
  machines: MachineOEEData[];
  summary: DashboardSummary;
}

export interface TrendDataPoint {
  time: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface MachineDetails {
  machine: {
    id: string;
    name: string;
    code: string;
    description?: string;
    location: {
      plant: string;
      area: string;
      line?: string;
      position?: string;
    };
    category: string;
    type: string;
    status: string;
    capacity: {
      value: number;
      unit: string;
    };
    oeeConfig: {
      targetOEE: number;
      targetAvailability: number;
      targetPerformance: number;
      targetQuality: number;
    };
    responsible: {
      operator?: { name: string; email: string };
      technician?: { name: string; email: string };
      supervisor?: { name: string; email: string };
    };
    maintenance: {
      lastMaintenance?: string;
      nextMaintenance?: string;
      maintenanceInterval?: number;
      maintenanceType: string;
    };
  };
  stats: {
    totalRecords: number;
    totalProduction: number;
    totalWaste: number;
    totalDowntime: number;
    avgOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
  };
  downtimeAnalysis: Record<string, {
    count: number;
    totalDuration: number;
    percentage: number;
  }>;
  recentRecords: any[];
  period: string;
  lastUpdate: string;
}

export class DashboardService {
  /**
   * Buscar dados OEE do dashboard em tempo real
   */
  static async getOEEData(period: 'today' | 'week' | 'month' = 'today'): Promise<DashboardOEEData> {
    try {
      const response = await apiRequest(`/dashboard/oee?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados OEE do dashboard:', error);
      throw error;
    }
  }

  /**
   * Buscar dados de tendência OEE para gráficos
   */
  static async getTrendData(machineId: string = 'all', hours: number = 24): Promise<TrendDataPoint[]> {
    try {
      const response = await apiRequest(`/dashboard/oee/trend?machineId=${machineId}&hours=${hours}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados de tendência OEE:', error);
      throw error;
    }
  }

  /**
   * Buscar detalhes completos de uma máquina
   */
  static async getMachineDetails(machineId: string, period: 'today' | 'week' | 'month' = 'today'): Promise<MachineDetails> {
    try {
      const response = await apiRequest(`/dashboard/machine/${machineId}/details?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar detalhes da máquina:', error);
      throw error;
    }
  }

  /**
   * Atualizar dados automaticamente (polling)
   */
  static startAutoRefresh(
    callback: (data: DashboardOEEData) => void,
    interval: number = 30000, // 30 segundos
    period: 'today' | 'week' | 'month' = 'today'
  ): NodeJS.Timeout {
    const refreshData = async () => {
      try {
        const data = await this.getOEEData(period);
        callback(data);
      } catch (error) {
        console.error('Erro na atualização automática:', error);
      }
    };

    // Primeira execução imediata
    refreshData();

    // Configurar intervalo
    return setInterval(refreshData, interval);
  }

  /**
   * Parar atualização automática
   */
  static stopAutoRefresh(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }

  /**
   * Calcular status OEE baseado no valor
   */
  static getOEEStatus(oee: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    color: string;
    label: string;
  } {
    if (oee >= 85) {
      return {
        level: 'excellent',
        color: '#22c55e', // green-500
        label: 'Excelente'
      };
    } else if (oee >= 65) {
      return {
        level: 'good',
        color: '#3b82f6', // blue-500
        label: 'Bom'
      };
    } else if (oee >= 50) {
      return {
        level: 'fair',
        color: '#f59e0b', // amber-500
        label: 'Regular'
      };
    } else {
      return {
        level: 'poor',
        color: '#ef4444', // red-500
        label: 'Crítico'
      };
    }
  }

  /**
   * Formatar dados para gráficos
   */
  static formatChartData(trendData: TrendDataPoint[]): any[] {
    return trendData.map(point => ({
      time: point.time,
      OEE: point.oee,
      Disponibilidade: point.availability,
      Performance: point.performance,
      Qualidade: point.quality
    }));
  }

  /**
   * Calcular tendência (crescimento/decrescimento)
   */
  static calculateTrend(data: number[]): { value: number; isPositive: boolean } {
    if (data.length < 2) {
      return { value: 0, isPositive: true };
    }

    const recent = data.slice(-3); // Últimos 3 valores
    const previous = data.slice(-6, -3); // 3 valores anteriores

    if (previous.length === 0) {
      return { value: 0, isPositive: true };
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    const change = recentAvg - previousAvg;
    const percentChange = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

    return {
      value: Math.abs(Math.round(percentChange * 10) / 10),
      isPositive: change >= 0
    };
  }

  /**
   * Gerar dados de exemplo para desenvolvimento/teste
   */
  static generateMockData(): DashboardOEEData {
    const machines: MachineOEEData[] = [
      {
        id: 'mock-1',
        name: 'Linha 01 - Extrusão',
        code: 'EXT-001',
        location: { plant: 'Planta A', area: 'Produção' },
        oee: 78.5,
        availability: 85.2,
        performance: 92.1,
        quality: 100.0,
        status: 'good',
        lastUpdate: new Date().toISOString(),
        recordsCount: 5,
        target: 85
      },
      {
        id: 'mock-2',
        name: 'Linha 02 - Injeção',
        code: 'INJ-002',
        location: { plant: 'Planta A', area: 'Produção' },
        oee: 92.3,
        availability: 98.5,
        performance: 95.8,
        quality: 97.9,
        status: 'excellent',
        lastUpdate: new Date().toISOString(),
        recordsCount: 8,
        target: 85
      },
      {
        id: 'mock-3',
        name: 'Linha 03 - Sopro',
        code: 'SOP-003',
        location: { plant: 'Planta B', area: 'Produção' },
        oee: 45.2,
        availability: 65.8,
        performance: 78.5,
        quality: 87.5,
        status: 'critical',
        lastUpdate: new Date().toISOString(),
        recordsCount: 3,
        target: 85
      }
    ];

    const summary: DashboardSummary = {
      overallOEE: 72.0,
      overallAvailability: 83.2,
      overallPerformance: 88.8,
      overallQuality: 95.1,
      activeMachines: 3,
      totalMachines: 3,
      criticalMachines: 1,
      period: 'today',
      lastUpdate: new Date().toISOString()
    };

    return { machines, summary };
  }

  /**
   * Gerar dados de tendência mock
   */
  static generateMockTrendData(): TrendDataPoint[] {
    return Array.from({ length: 24 }, (_, i) => ({
      time: `${i.toString().padStart(2, '0')}:00`,
      oee: Math.random() * 40 + 50,
      availability: Math.random() * 30 + 70,
      performance: Math.random() * 25 + 75,
      quality: Math.random() * 20 + 80,
    }));
  }
}

export default DashboardService;