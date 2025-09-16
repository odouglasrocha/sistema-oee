import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Factory,
  Settings,
  Activity,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wrench,
  BarChart3,
  RefreshCw,
  X
} from 'lucide-react';
import DashboardService, { MachineDetails } from '@/services/dashboardService';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface MachineDetailsModalProps {
  machineId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const MachineDetailsModal: React.FC<MachineDetailsModalProps> = ({
  machineId,
  isOpen,
  onClose
}) => {
  const [machineDetails, setMachineDetails] = useState<MachineDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const { toast } = useToast();

  const loadMachineDetails = async (period: 'today' | 'week' | 'month' = selectedPeriod) => {
    if (!machineId) return;
    
    try {
      setIsLoading(true);
      const details = await DashboardService.getMachineDetails(machineId, period);
      setMachineDetails(details);
    } catch (error) {
      console.error('Erro ao carregar detalhes da máquina:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes da máquina.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && machineId) {
      loadMachineDetails();
    }
  }, [isOpen, machineId, selectedPeriod]);

  const handleRefresh = () => {
    loadMachineDetails();
  };

  const formatDowntimeReason = (reason: string) => {
    const reasons: Record<string, string> = {
      'quebra-equipamento': 'Quebra de Equipamento',
      'falta-material': 'Falta de Material',
      'falta-operador': 'Falta de Operador',
      'problema-qualidade': 'Problema de Qualidade',
      'limpeza': 'Limpeza',
      'setup': 'Setup',
      'troca-molde': 'Troca de Molde',
      'ajuste-processo': 'Ajuste de Processo',
      'manutencao-preventiva': 'Manutenção Preventiva',
      'manutencao-corretiva': 'Manutenção Corretiva',
      'outros': 'Outros'
    };
    return reasons[reason] || reason;
  };

  const getOEEStatusColor = (oee: number) => {
    if (oee >= 85) return '#22c55e';
    if (oee >= 65) return '#3b82f6';
    if (oee >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                {machineDetails?.machine.name || 'Carregando...'}
              </DialogTitle>
              <DialogDescription>
                {machineDetails?.machine.code} - {machineDetails?.machine.description}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : machineDetails ? (
          <div className="space-y-6">
            {/* Período de Análise */}
            <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as 'today' | 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="today">Hoje</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">OEE</p>
                      <p className="text-2xl font-bold" style={{ color: getOEEStatusColor(machineDetails.stats.avgOEE) }}>
                        {machineDetails.stats.avgOEE.toFixed(1)}%
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Progress value={machineDetails.stats.avgOEE} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Disponibilidade</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {machineDetails.stats.avgAvailability.toFixed(1)}%
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Progress value={machineDetails.stats.avgAvailability} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Performance</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {machineDetails.stats.avgPerformance.toFixed(1)}%
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Progress value={machineDetails.stats.avgPerformance} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Qualidade</p>
                      <p className="text-2xl font-bold text-green-600">
                        {machineDetails.stats.avgQuality.toFixed(1)}%
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Progress value={machineDetails.stats.avgQuality} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informações da Máquina */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Informações da Máquina
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Código</p>
                      <p className="font-medium">{machineDetails.machine.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={machineDetails.machine.status === 'Ativa' ? 'default' : 'secondary'}>
                        {machineDetails.machine.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categoria</p>
                      <p className="font-medium">{machineDetails.machine.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="font-medium">{machineDetails.machine.type}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localização
                    </p>
                    <p className="font-medium">
                      {machineDetails.machine.location.plant} - {machineDetails.machine.location.area}
                      {machineDetails.machine.location.line && ` - ${machineDetails.machine.location.line}`}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Capacidade</p>
                    <p className="font-medium">
                      {machineDetails.machine.capacity.value} {machineDetails.machine.capacity.unit}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas de Produção */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Estatísticas de Produção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Produzido</p>
                      <p className="text-xl font-bold text-green-600">
                        {machineDetails.stats.totalProduction.toLocaleString()} un
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Refugo</p>
                      <p className="text-xl font-bold text-red-600">
                        {machineDetails.stats.totalWaste.toLocaleString()} un
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo de Parada</p>
                      <p className="text-xl font-bold text-orange-600">
                        {Math.round(machineDetails.stats.totalDowntime)} min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registros</p>
                      <p className="text-xl font-bold">
                        {machineDetails.stats.totalRecords}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análise de Paradas */}
            {Object.keys(machineDetails.downtimeAnalysis).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Análise de Paradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(machineDetails.downtimeAnalysis)
                      .sort(([,a], [,b]) => b.totalDuration - a.totalDuration)
                      .map(([reason, data]) => (
                        <div key={reason} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{formatDowntimeReason(reason)}</span>
                              <span className="text-sm text-muted-foreground">
                                {data.count}x - {Math.round(data.totalDuration)}min ({data.percentage}%)
                              </span>
                            </div>
                            <Progress value={data.percentage} className="h-2" />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Responsáveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Operador</p>
                    <p className="font-medium">
                      {machineDetails.machine.responsible.operator?.name || 'Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Técnico</p>
                    <p className="font-medium">
                      {machineDetails.machine.responsible.technician?.name || 'Não definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Supervisor</p>
                    <p className="font-medium">
                      {machineDetails.machine.responsible.supervisor?.name || 'Não definido'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manutenção */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Informações de Manutenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Última Manutenção</p>
                    <p className="font-medium">
                      {machineDetails.machine.maintenance.lastMaintenance 
                        ? new Date(machineDetails.machine.maintenance.lastMaintenance).toLocaleDateString('pt-BR')
                        : 'Não registrada'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Manutenção</p>
                    <p className="font-medium">
                      {machineDetails.machine.maintenance.nextMaintenance 
                        ? new Date(machineDetails.machine.maintenance.nextMaintenance).toLocaleDateString('pt-BR')
                        : 'Não programada'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Manutenção</p>
                    <p className="font-medium">{machineDetails.machine.maintenance.maintenanceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Intervalo</p>
                    <p className="font-medium">
                      {machineDetails.machine.maintenance.maintenanceInterval 
                        ? `${machineDetails.machine.maintenance.maintenanceInterval} dias`
                        : 'Não definido'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Dados não encontrados</h3>
              <p className="text-muted-foreground">Não foi possível carregar os detalhes da máquina.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MachineDetailsModal;