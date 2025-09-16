import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap,
  Clock,
  Eye,
  PieChart,
  Activity,
  Lightbulb
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import AnalyticsService from '@/services/analyticsService';
import { 
  AIInsight, 
  OptimizationOpportunity, 
  OptimizationSchedule, 
  AdvancedAlert, 
  PredictionData, 
  FailurePattern, 
  RadarData 
} from '@/types';

// Função para mapear ícones baseado no tipo
const getInsightIcon = (type: string) => {
  switch (type) {
    case 'maintenance': return AlertTriangle;
    case 'optimization': return TrendingUp;
    case 'pattern': return Eye;
    case 'prediction': return Target;
    case 'anomaly': return AlertTriangle;
    default: return Lightbulb;
  }
};

// Função para mapear cores baseado na severidade
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-destructive';
    case 'medium': return 'text-warning';
    case 'low': return 'text-primary';
    default: return 'text-muted-foreground';
  }
};

// Função para traduzir severidade
const translateSeverity = (severity: string) => {
  switch (severity) {
    case 'critical': return 'Crítico';
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    case 'low': return 'Baixo';
    default: return severity;
  }
};

// Função para traduzir dificuldade
const translateDifficulty = (difficulty: string) => {
  switch (difficulty) {
    case 'high': return 'Alta';
    case 'medium': return 'Média';
    case 'low': return 'Baixa';
    default: return difficulty;
  }
};

// Função para traduzir status
const translateStatus = (status: string) => {
  switch (status) {
    case 'planned': return 'Planejado';
    case 'in_progress': return 'Em Andamento';
    case 'completed': return 'Concluído';
    case 'cancelled': return 'Cancelado';
    case 'postponed': return 'Adiado';
    default: return status;
  }
};

const Analytics: React.FC = () => {
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para dados reais
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [opportunities, setOpportunities] = useState<OptimizationOpportunity[]>([]);
  const [schedules, setSchedules] = useState<OptimizationSchedule[]>([]);
  const [alerts, setAlerts] = useState<AdvancedAlert[]>([]);
  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);
  const [failurePatterns, setFailurePatterns] = useState<FailurePattern[]>([]);
  const [machineRadarData, setMachineRadarData] = useState<RadarData[]>([]);
  
  // Carregar dados ao montar o componente
  useEffect(() => {
    loadAnalyticsData();
  }, []);
  
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar todos os dados em paralelo
      const [insightsData, opportunitiesData, schedulesData, alertsData, predictionDataRes, failurePatternsData, radarData] = await Promise.all([
        AnalyticsService.getInsights({ limit: 10 }),
        AnalyticsService.getOpportunities(),
        AnalyticsService.getSchedule(),
        AnalyticsService.getAlerts({ limit: 10 }),
        AnalyticsService.getOEEPrediction({ days: 5 }),
        AnalyticsService.getFailurePatterns({ period: 30 }),
        AnalyticsService.getRadarData('default') // Usar máquina padrão ou primeira disponível
      ]);
      
      setAiInsights(insightsData);
      setOpportunities(opportunitiesData);
      setSchedules(schedulesData);
      setAlerts(alertsData);
      setPredictionData(predictionDataRes);
      setFailurePatterns(failurePatternsData);
      setMachineRadarData(radarData);
      
      // Se não há dados, gerar dados de exemplo
      if (insightsData.length === 0 && opportunitiesData.length === 0) {
        console.log('📊 Gerando dados de exemplo para Analytics...');
        await AnalyticsService.generateSampleData();
        // Recarregar dados após gerar exemplos
        setTimeout(() => loadAnalyticsData(), 1000);
      }
      
    } catch (err) {
      console.error('Erro ao carregar dados de analytics:', err);
      setError('Erro ao carregar dados de analytics. Usando dados de demonstração.');
      
      // Fallback para dados mockados em caso de erro
      setAiInsights([
        {
          id: '1',
          type: 'maintenance',
          severity: 'high',
          title: 'Manutenção Preditiva Necessária',
          description: 'Linha 03 mostra sinais de desgaste no sistema hidráulico. Probabilidade de falha em 72 horas: 78%.',
          recommendation: 'Programar manutenção preventiva para o próximo turno.',
          confidence: 78,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
      
      setPredictionData([
        { date: '2024-01-01', predicted: 75.2, actual: 78.1, confidence: 92 },
        { date: '2024-01-02', predicted: 76.8, actual: 75.5, confidence: 89 },
        { date: '2024-01-03', predicted: 78.1, actual: 79.2, confidence: 94 },
        { date: '2024-01-04', predicted: 74.5, confidence: 87 },
        { date: '2024-01-05', predicted: 76.2, confidence: 91 }
      ]);
      
      setFailurePatterns([
        { category: 'Falhas Hidráulicas', frequency: 35, severity: 'high', color: '#ef4444' },
        { category: 'Desgaste de Ferramenta', frequency: 28, severity: 'medium', color: '#f97316' },
        { category: 'Problemas Elétricos', frequency: 22, severity: 'high', color: '#eab308' },
        { category: 'Obstruções', frequency: 15, severity: 'low', color: '#22c55e' }
      ]);
      
      setMachineRadarData([
        { metric: 'Disponibilidade', value: 85 },
        { metric: 'Performance', value: 92 },
        { metric: 'Qualidade', value: 97 },
        { metric: 'Manutenção', value: 78 },
        { metric: 'Eficiência', value: 89 },
        { metric: 'Confiabilidade', value: 83 }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApplyInsight = async (insightId: string) => {
    try {
      await AnalyticsService.applyInsight(insightId);
      // Recarregar insights após aplicar
      const updatedInsights = await AnalyticsService.getInsights({ limit: 10 });
      setAiInsights(updatedInsights);
    } catch (error) {
      console.error('Erro ao aplicar insight:', error);
    }
  };
  
  const handleDismissInsight = async (insightId: string) => {
    try {
      await AnalyticsService.dismissInsight(insightId);
      // Recarregar insights após descartar
      const updatedInsights = await AnalyticsService.getInsights({ limit: 10 });
      setAiInsights(updatedInsights);
    } catch (error) {
      console.error('Erro ao descartar insight:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Carregando análises avançadas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Análise Avançada
          </h1>
          <p className="text-muted-foreground mt-1">
            Inteligência artificial aplicada à otimização industrial
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            IA Ativa
          </Badge>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">{error}</span>
          </div>
        </div>
      )}

      {/* Insights IA em Destaque */}
      <div className="grid gap-4 md:grid-cols-3">
        {aiInsights.map((insight) => {
          const IconComponent = getInsightIcon(insight.type);
          const colorClass = getSeverityColor(insight.severity);
          
          return (
            <Card 
              key={insight.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedInsight === insight.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-5 w-5 ${colorClass}`} />
                    <Badge 
                      variant="outline"
                      className={`text-xs ${
                        insight.severity === 'critical' || insight.severity === 'high' ? 'border-destructive text-destructive' :
                        insight.severity === 'medium' ? 'border-warning text-warning' :
                        'border-primary text-primary'
                      }`}
                    >
                      {translateSeverity(insight.severity)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {insight.confidence}% confiança
                  </span>
                </div>
                <CardTitle className="text-lg">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {insight.description}
                </p>
                
                {selectedInsight === insight.id && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg animate-slide-up">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Recomendação
                    </h4>
                    <p className="text-sm mb-3">{insight.recommendation}</p>
                    
                    {insight.metrics && (
                      <div className="mb-3 text-xs space-y-1">
                        {insight.metrics.impactOEE && (
                          <div className="flex justify-between">
                            <span>Impacto OEE:</span>
                            <span className={insight.metrics.impactOEE > 0 ? 'text-green-600' : 'text-red-600'}>
                              {insight.metrics.impactOEE > 0 ? '+' : ''}{insight.metrics.impactOEE}%
                            </span>
                          </div>
                        )}
                        {insight.metrics.impactAvailability && (
                          <div className="flex justify-between">
                            <span>Impacto Disponibilidade:</span>
                            <span className={insight.metrics.impactAvailability > 0 ? 'text-green-600' : 'text-red-600'}>
                              {insight.metrics.impactAvailability > 0 ? '+' : ''}{insight.metrics.impactAvailability}%
                            </span>
                          </div>
                        )}
                        {insight.metrics.impactPerformance && (
                          <div className="flex justify-between">
                            <span>Impacto Performance:</span>
                            <span className={insight.metrics.impactPerformance > 0 ? 'text-green-600' : 'text-red-600'}>
                              {insight.metrics.impactPerformance > 0 ? '+' : ''}{insight.metrics.impactPerformance}%
                            </span>
                          </div>
                        )}
                        {insight.metrics.impactQuality && (
                          <div className="flex justify-between">
                            <span>Impacto Qualidade:</span>
                            <span className={insight.metrics.impactQuality > 0 ? 'text-green-600' : 'text-red-600'}>
                              {insight.metrics.impactQuality > 0 ? '+' : ''}{insight.metrics.impactQuality}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyInsight(insight.id);
                        }}
                      >
                        Aplicar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissInsight(insight.id);
                        }}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="prediction" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prediction" className="gap-2">
            <Target className="h-4 w-4" />
            Predição OEE
          </TabsTrigger>
          <TabsTrigger value="patterns" className="gap-2">
            <PieChart className="h-4 w-4" />
            Padrões de Falha
          </TabsTrigger>
          <TabsTrigger value="radar" className="gap-2">
            <Activity className="h-4 w-4" />
            Análise Radar
          </TabsTrigger>
          <TabsTrigger value="optimization" className="gap-2">
            <Zap className="h-4 w-4" />
            Otimização
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prediction">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Predição de OEE - Próximos 5 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[70, 85]} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Real"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predito"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Padrões de Falha Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <RechartsPieChart data={failurePatterns} cx="50%" cy="50%" outerRadius={100}>
                        {failurePatterns.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </RechartsPieChart>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-4">
                  {failurePatterns.map((pattern, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pattern.color }}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{pattern.category}</h4>
                        <p className="text-xs text-muted-foreground">
                          {pattern.frequency}% das ocorrências
                        </p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          pattern.severity === 'high' ? 'border-destructive text-destructive' :
                          pattern.severity === 'medium' ? 'border-warning text-warning' :
                          'border-success text-success'
                        }`}
                      >
                        {pattern.severity === 'high' ? 'Alto' : 
                         pattern.severity === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-success" />
                Análise Multidimensional - Linha 01
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={machineRadarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Radar
                    name="Métricas"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  Oportunidades de Melhoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {opportunities.slice(0, 3).map((opportunity) => (
                  <div key={opportunity.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{opportunity.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {translateDifficulty(opportunity.difficulty)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Atual: </span>
                        <span className="font-medium">
                          {opportunity.currentValue.value}{opportunity.currentValue.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Potencial: </span>
                        <span className="font-medium text-success">
                          {opportunity.potentialValue.value}{opportunity.potentialValue.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      {opportunity.impact.oee && (
                        <div className="text-primary font-medium">
                          +{opportunity.impact.oee}% OEE
                        </div>
                      )}
                      {opportunity.impact.availability && (
                        <div className="text-blue-600 font-medium">
                          +{opportunity.impact.availability}% Disponibilidade
                        </div>
                      )}
                      {opportunity.impact.performance && (
                        <div className="text-green-600 font-medium">
                          +{opportunity.impact.performance}% Performance
                        </div>
                      )}
                      {opportunity.impact.quality && (
                        <div className="text-purple-600 font-medium">
                          +{opportunity.impact.quality}% Qualidade
                        </div>
                      )}
                    </div>
                    {opportunity.estimatedSavings?.monthly && (
                      <div className="text-xs text-muted-foreground">
                        Economia estimada: R$ {opportunity.estimatedSavings.monthly.toLocaleString()}/mês
                      </div>
                    )}
                  </div>
                ))}
                
                {opportunities.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma oportunidade identificada no momento.</p>
                    <p className="text-xs mt-2">A IA está analisando os dados para identificar melhorias.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Cronograma de Otimização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {schedules.slice(0, 4).map((schedule) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'completed': return 'bg-green-500';
                      case 'in_progress': return 'bg-blue-500';
                      case 'planned': return 'bg-primary/20 border-2 border-primary';
                      case 'cancelled': return 'bg-red-500';
                      case 'postponed': return 'bg-yellow-500';
                      default: return 'bg-gray-500';
                    }
                  };
                  
                  const getStatusBadgeVariant = (status: string) => {
                    switch (status) {
                      case 'completed': return 'default';
                      case 'in_progress': return 'secondary';
                      case 'cancelled': return 'destructive';
                      default: return 'outline';
                    }
                  };
                  
                  return (
                    <div key={schedule.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(schedule.status)}`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          Semana {schedule.week}/{schedule.year}
                        </h4>
                        <p className="text-xs text-muted-foreground">{schedule.title}</p>
                        {schedule.progress > 0 && (
                          <div className="mt-1">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                  style={{ width: `${schedule.progress}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground">{schedule.progress}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge variant={getStatusBadgeVariant(schedule.status)} className="text-xs">
                        {translateStatus(schedule.status)}
                      </Badge>
                    </div>
                  );
                })}
                
                {schedules.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum item no cronograma.</p>
                    <p className="text-xs mt-2">Otimizações serão programadas automaticamente.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;