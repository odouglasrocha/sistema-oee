import React, { useState, useEffect } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { OEEChart } from '@/components/OEEChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Target, 
  Zap,
  Settings,
  RefreshCw,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react';
import { calculateOEE, getOEEStatus } from '@/types';
import DashboardService, { DashboardOEEData, MachineOEEData, TrendDataPoint } from '@/services/dashboardService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import MachineDetailsModal from '@/components/MachineDetailsModal';

// Dados em tempo real do MongoDB

const Dashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardOEEData | null>(null);
  const [chartData, setChartData] = useState<TrendDataPoint[]>([]);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const { toast } = useToast();

  // Carregar dados do dashboard
  const loadDashboardData = async (period: 'today' | 'week' | 'month' = selectedPeriod, showLoading = true) => {
    try {
      if (showLoading) setIsRefreshing(true);
      
      const [oeeData, trendData] = await Promise.all([
        DashboardService.getOEEData(period),
        DashboardService.getTrendData('all', period === 'today' ? 24 : period === 'week' ? 168 : 720)
      ]);
      
      setDashboardData(oeeData);
      setChartData(trendData);
      
      if (showLoading) {
        toast({
          title: "Dados atualizados",
          description: `Dashboard atualizado com dados de ${period === 'today' ? 'hoje' : period === 'week' ? 'esta semana' : 'este mês'}.`,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard. Usando dados de exemplo.",
        variant: "destructive",
      });
      
      // Fallback para dados mock em caso de erro
      setDashboardData(DashboardService.generateMockData());
      setChartData(DashboardService.generateMockTrendData());
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  // Inicializar dados e configurar auto-refresh
  useEffect(() => {
    loadDashboardData(selectedPeriod);
    
    // Configurar atualização automática a cada 30 segundos
    const interval = setInterval(() => {
      loadDashboardData(selectedPeriod, false);
    }, 30000);
    
    setAutoRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedPeriod]);

  // Limpar intervalo ao desmontar componente
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  const handleRefresh = async () => {
    await loadDashboardData(selectedPeriod, true);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period as 'today' | 'week' | 'month');
  };

  const handleViewDetails = (machineId: string) => {
    setSelectedMachineId(machineId);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedMachineId(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Verificar se há dados
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dados não disponíveis</h3>
          <p className="text-muted-foreground mb-4">Não foi possível carregar os dados do dashboard.</p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { machines, summary } = dashboardData;
  const activeMachines = summary.activeMachines;
  const criticalMachines = summary.criticalMachines;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard OEE</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da eficiência dos equipamentos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Tabs value={selectedPeriod} onValueChange={handlePeriodChange}>
            <TabsList>
              <TabsTrigger value="today">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Alertas Críticos */}
      {criticalMachines > 0 && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">
                {criticalMachines} máquina(s) com OEE crítico (&lt; 65%)
              </p>
              <p className="text-sm text-muted-foreground">
                Intervenção necessária para otimizar a produção
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => {
                const criticalMachine = machines.find(m => m.oee < 65 && m.recordsCount > 0);
                if (criticalMachine) {
                  handleViewDetails(criticalMachine.id);
                } else {
                  toast({
                    title: "Nenhuma máquina crítica encontrada",
                    description: "Não há máquinas com OEE crítico no momento.",
                  });
                }
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Detalhes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="OEE Geral"
          value={summary.overallOEE.toFixed(1)}
          unit="%"
          icon={Target}
          status={summary.overallOEE >= 85 ? 'excellent' : summary.overallOEE >= 65 ? 'good' : summary.overallOEE >= 50 ? 'fair' : 'poor'}
          trend={{ value: 2.3, isPositive: true }}
        />
        
        <MetricCard
          title="Disponibilidade"
          value={summary.overallAvailability.toFixed(1)}
          unit="%"
          icon={Clock}
          trend={{ value: 1.2, isPositive: true }}
        />
        
        <MetricCard
          title="Performance"
          value={summary.overallPerformance.toFixed(1)}
          unit="%"
          icon={Zap}
          trend={{ value: -0.8, isPositive: false }}
        />
        
        <MetricCard
          title="Qualidade"
          value={summary.overallQuality.toFixed(1)}
          unit="%"
          icon={Activity}
          trend={{ value: 0.5, isPositive: true }}
        />
      </div>

      {/* Gráficos e Máquinas */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Gráfico Principal */}
        <div className="lg:col-span-4">
          <OEEChart 
            data={DashboardService.formatChartData(chartData)}
            type="line"
            title={`Tendência OEE - ${selectedPeriod === 'today' ? 'Últimas 24h' : selectedPeriod === 'week' ? 'Última Semana' : 'Último Mês'}`}
            height={400}
          />
        </div>

        {/* Status das Máquinas */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Status das Máquinas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {machines.map((machine) => {
                const status = DashboardService.getOEEStatus(machine.oee);
                
                return (
                  <div
                    key={machine.id}
                    className="p-3 rounded-lg border transition-colors hover:shadow-sm cursor-pointer bg-white"
                    onClick={() => handleViewDetails(machine.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{machine.name}</h4>
                        <p className="text-xs text-gray-500">{machine.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: status.color, color: status.color }}
                        >
                          {machine.oee.toFixed(1)}%
                        </Badge>
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: machine.status === 'inactive' ? '#6b7280' : status.color }} 
                        />
                      </div>
                    </div>
                    
                    <Progress value={machine.oee} className="h-1.5 mb-2" />
                    
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>D: {machine.availability.toFixed(0)}%</span>
                      <span>P: {machine.performance.toFixed(0)}%</span>
                      <span>Q: {machine.quality.toFixed(0)}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{machine.location.plant}</span>
                      <span>{machine.lastUpdate ? new Date(machine.lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Máquinas Ativas</span>
                  <span className="font-medium">{activeMachines}/{summary.totalMachines}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Críticas (OEE &lt; 65%)</span>
                  <span className="font-medium text-destructive">{criticalMachines}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Última Atualização</span>
                  <span className="font-medium text-xs">{new Date(summary.lastUpdate).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Análise Detalhada */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Perdas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Paradas Planejadas', value: 45, color: 'bg-blue-500' },
                { name: 'Quebras', value: 30, color: 'bg-red-500' },
                { name: 'Setup/Ajustes', value: 15, color: 'bg-yellow-500' },
                { name: 'Falta de Material', value: 10, color: 'bg-orange-500' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${item.color}`} />
                  <span className="flex-1 text-sm">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Diário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Produção Total</span>
              <span className="font-medium">2,847 unidades</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Meta Diária</span>
              <span className="font-medium">3,200 unidades</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Refugo Total</span>
              <span className="font-medium text-destructive">153 unidades</span>
            </div>
            <Progress value={89} className="h-2" />
            <p className="text-xs text-muted-foreground">89% da meta atingida</p>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes da Máquina */}
      <MachineDetailsModal
        machineId={selectedMachineId}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
      />
    </div>
  );
};

export default Dashboard;