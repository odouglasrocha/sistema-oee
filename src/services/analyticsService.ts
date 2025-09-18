import { apiRequest } from '@/config/api';
import {
  AIInsight,
  OptimizationOpportunity,
  OptimizationSchedule,
  AdvancedAlert,
  PredictionData,
  FailurePattern,
  RadarData,
  AnalyticsDashboard
} from '@/types';

export class AnalyticsService {
  // ===== AI INSIGHTS =====
  
  static async getInsights(filters?: {
    type?: string;
    severity?: string;
    machineId?: string;
    limit?: number;
  }): Promise<{ data: AIInsight[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const data = await apiRequest(`/analytics/insights?${params.toString()}`);
    return { data: data.data, total: data.total };
  }

  static async getInsight(id: string): Promise<AIInsight> {
    const data = await apiRequest(`/analytics/insights/${id}`);
    return data.data;
  }
  
  static async createInsight(insight: Partial<AIInsight>): Promise<AIInsight> {
    const data = await apiRequest('/analytics/insights', {
      method: 'POST',
      body: JSON.stringify(insight)
    });
    return data.data;
  }

  static async updateInsight(id: string, insight: Partial<AIInsight>): Promise<AIInsight> {
    const data = await apiRequest(`/analytics/insights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(insight)
    });
    return data.data;
  }

  static async deleteInsight(id: string): Promise<void> {
    await apiRequest(`/analytics/insights/${id}`, {
      method: 'DELETE'
    });
  }
  
  static async applyInsight(id: string): Promise<AIInsight> {
    const data = await apiRequest(`/analytics/insights/${id}/apply`, {
      method: 'PATCH'
    });
    return data.data;
  }
  
  static async dismissInsight(id: string): Promise<AIInsight> {
    const data = await apiRequest(`/analytics/insights/${id}/dismiss`, {
      method: 'PATCH'
    });
    return data.data;
  }
  
  // ===== OPTIMIZATION OPPORTUNITIES =====
  
  static async getOpportunities(filters?: {
    category?: string;
    priority?: string;
    status?: string;
    machineId?: string;
  }): Promise<OptimizationOpportunity[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.machineId) params.append('machineId', filters.machineId);
    
    const data = await apiRequest(`/analytics/opportunities?${params.toString()}`);
    return data.data;
  }
  
  static async createOpportunity(opportunity: Partial<OptimizationOpportunity>): Promise<OptimizationOpportunity> {
    const data = await apiRequest('/analytics/opportunities', {
      method: 'POST',
      body: JSON.stringify(opportunity)
    });
    return data.data;
  }
  
  static async updateOpportunityProgress(id: string, progress: number, notes?: string): Promise<OptimizationOpportunity> {
    const data = await apiRequest(`/analytics/opportunities/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress, notes })
    });
    return data.data;
  }
  
  // ===== OPTIMIZATION SCHEDULE =====
  
  static async getSchedule(filters?: {
    week?: number;
    year?: number;
    status?: string;
    machineId?: string;
  }): Promise<OptimizationSchedule[]> {
    const params = new URLSearchParams();
    if (filters?.week) params.append('week', filters.week.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.machineId) params.append('machineId', filters.machineId);
    
    const data = await apiRequest(`/analytics/schedule?${params.toString()}`);
    return data.data;
  }
  
  static async createScheduleItem(schedule: Partial<OptimizationSchedule>): Promise<OptimizationSchedule> {
    const data = await apiRequest('/analytics/schedule', {
      method: 'POST',
      body: JSON.stringify(schedule)
    });
    return data.data;
  }
  
  static async startScheduleItem(id: string): Promise<OptimizationSchedule> {
    const data = await apiRequest(`/analytics/schedule/${id}/start`, {
      method: 'PATCH'
    });
    return data.data;
  }
  
  static async completeScheduleItem(id: string, results?: any): Promise<OptimizationSchedule> {
    const data = await apiRequest(`/analytics/schedule/${id}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ results })
    });
    return data.data;
  }
  
  // ===== ADVANCED ALERTS =====
  
  static async getAlerts(filters?: {
    type?: string;
    severity?: string;
    machineId?: string;
    status?: string;
    limit?: number;
  }): Promise<AdvancedAlert[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const data = await apiRequest(`/analytics/alerts?${params.toString()}`);
    return data.data;
  }
  
  static async createAlert(alert: Partial<AdvancedAlert>): Promise<AdvancedAlert> {
    const data = await apiRequest('/analytics/alerts', {
      method: 'POST',
      body: JSON.stringify(alert)
    });
    return data.data;
  }
  
  static async acknowledgeAlert(id: string, notes?: string): Promise<AdvancedAlert> {
    const data = await apiRequest(`/analytics/alerts/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
    return data.data;
  }
  
  static async resolveAlert(id: string, notes?: string): Promise<AdvancedAlert> {
    const data = await apiRequest(`/analytics/alerts/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
    return data.data;
  }
  
  // ===== ANALYTICAL DATA =====
  
  static async getOEEPrediction(filters?: {
    machineId?: string;
    days?: number;
  }): Promise<PredictionData[]> {
    const params = new URLSearchParams();
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.days) params.append('days', filters.days.toString());
    
    const data = await apiRequest(`/analytics/prediction/oee?${params.toString()}`);
    return data.data;
  }
  
  static async getFailurePatterns(filters?: {
    machineId?: string;
    period?: number;
  }): Promise<FailurePattern[]> {
    const params = new URLSearchParams();
    if (filters?.machineId) params.append('machineId', filters.machineId);
    if (filters?.period) params.append('period', filters.period.toString());
    
    const data = await apiRequest(`/analytics/patterns/failures?${params.toString()}`);
    return data.data;
  }
  
  static async getRadarData(machineId: string): Promise<RadarData[]> {
    const data = await apiRequest(`/analytics/radar/${machineId}`);
    return data.data;
  }
  
  static async getDashboard(): Promise<AnalyticsDashboard> {
    const data = await apiRequest('/analytics/dashboard');
    return data.data;
  }
  
  // ===== UTILITY METHODS =====
  
  static async generateSampleData(): Promise<void> {
    // Gerar dados de exemplo para demonstração
    const sampleInsights: Partial<AIInsight>[] = [
      {
        type: 'maintenance',
        severity: 'high',
        title: 'Manutenção Preditiva Necessária',
        description: 'Linha 03 mostra sinais de desgaste no sistema hidráulico. Probabilidade de falha em 72 horas: 78%.',
        recommendation: 'Programar manutenção preventiva para o próximo turno.',
        confidence: 78,
        metrics: {
          impactOEE: -15,
          impactAvailability: -20
        }
      },
      {
        type: 'optimization',
        severity: 'medium',
        title: 'Oportunidade de Otimização',
        description: 'Ajuste nos parâmetros de velocidade pode aumentar OEE da Linha 01 em até 12%.',
        recommendation: 'Teste gradual com aumento de 5% na velocidade durante próximo turno.',
        confidence: 85,
        metrics: {
          impactOEE: 12,
          impactPerformance: 15
        }
      },
      {
        type: 'pattern',
        severity: 'low',
        title: 'Padrão Identificado',
        description: 'Redução consistente de performance entre 14h-16h em todas as linhas.',
        recommendation: 'Investigar fatores ambientais (temperatura, umidade) no período identificado.',
        confidence: 92,
        metrics: {
          impactPerformance: -8
        }
      }
    ];
    
    // Criar insights de exemplo
    for (const insight of sampleInsights) {
      try {
        await this.createInsight(insight);
      } catch (error) {
        console.warn('Erro ao criar insight de exemplo:', error);
      }
    }
    
    // Gerar oportunidades de exemplo
    const sampleOpportunities: Partial<OptimizationOpportunity>[] = [
      {
        title: 'Velocidade de Produção',
        category: 'speed',
        currentValue: { value: 85, unit: '%' },
        potentialValue: { value: 97, unit: '%' },
        impact: { oee: 12 },
        difficulty: 'low',
        priority: 'high',
        status: 'identified',
        description: 'Otimização da velocidade de produção através de ajustes nos parâmetros da máquina.',
        aiGenerated: true,
        confidence: 85,
        dataSource: 'ai_analysis'
      },
      {
        title: 'Tempo de Setup',
        category: 'setup_time',
        currentValue: { value: 45, unit: 'min' },
        potentialValue: { value: 28, unit: 'min' },
        impact: { availability: 8 },
        difficulty: 'medium',
        priority: 'medium',
        status: 'identified',
        description: 'Redução do tempo de setup através de padronização e treinamento.',
        aiGenerated: true,
        confidence: 72,
        dataSource: 'historical_data'
      },
      {
        title: 'Redução de Refugo',
        category: 'waste_reduction',
        currentValue: { value: 3.2, unit: '%' },
        potentialValue: { value: 1.8, unit: '%' },
        impact: { quality: 1.4 },
        difficulty: 'high',
        priority: 'medium',
        status: 'identified',
        description: 'Implementação de controles de qualidade mais rigorosos.',
        aiGenerated: true,
        confidence: 68,
        dataSource: 'benchmark'
      }
    ];
    
    for (const opportunity of sampleOpportunities) {
      try {
        await this.createOpportunity(opportunity);
      } catch (error) {
        console.warn('Erro ao criar oportunidade de exemplo:', error);
      }
    }
    
    console.log('✅ Dados de exemplo gerados para Analytics');
  }
}

export default AnalyticsService;