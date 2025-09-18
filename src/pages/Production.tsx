import React, { useState, useEffect } from 'react';
import ProductionFormSimple, { ProductionFormData } from './ProductionFormSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Activity, 
  Plus, 
  Edit, 
  Clock, 
  Target,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Factory,
  Users,
  Calendar,
  BarChart3,
  RefreshCw,
  Trash2,
  MoreVertical,
  Settings,
  Pause,
  Play,
  Wifi
} from 'lucide-react';
import { Production as ProductionType, Machine } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Pagination from '@/components/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ProductionRecord {
  _id: string;
  machine: {
    _id: string;
    name: string;
    code: string;
    capacity: {
      value: number;
      unit: string;
    };
  };
  operator: {
    _id: string;
    name: string;
    email: string;
  };
  shift: 'morning' | 'afternoon' | 'night';
  date: string;
  startTime: string;
  endTime: string;
  material: {
    code: string;
    name: string;
    description?: string;
  };
  production: {
    target: number;
    good: number;
    waste: {
      film: number;
      organic: number;
    };
    total: number;
  };
  time: {
    planned: number;
    actual: number;
    downtime: number;
  };
  oee: {
    availability: number;
    performance: number;
    quality: number;
    overall: number;
  };
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const Production: React.FC = () => {
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Data inicial definida:', today);
    return today;
  });
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados para configurações do sistema
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [autoRefreshTimer, setAutoRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Estados do dialog de confirmação
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    recordId: ''
  });

  const { toast } = useToast();
  const { user } = useAuth();

  // Funções para configurações do sistema
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const updateRefreshInterval = (interval: number) => {
    setRefreshInterval(interval);
  };

  const handleSaveSettings = () => {
    // Salvar configurações no localStorage
    const settings = {
      autoRefresh,
      refreshInterval
    };
    localStorage.setItem('production-settings', JSON.stringify(settings));
    
    setIsConfigDialogOpen(false);
    
    toast({
      title: "Configurações salvas",
      description: "As configurações foram salvas com sucesso"
    });
  };

  // Carregar configurações salvas
  useEffect(() => {
    const savedSettings = localStorage.getItem('production-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoRefresh(settings.autoRefresh || false);
        setRefreshInterval(settings.refreshInterval || 30);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, []);

  // Efeito para carregamento automático
  useEffect(() => {
    if (autoRefresh && user) {
      const timer = setInterval(() => {
        refreshData();
        setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      }, refreshInterval * 1000);
      
      setAutoRefreshTimer(timer);
      
      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        setAutoRefreshTimer(null);
      }
    }
  }, [autoRefresh, refreshInterval, user]);

  // Efeito para detectar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getShiftInfo = (shift: ProductionType['shift']) => {
    switch (shift) {
      case 'morning':
        return { label: 'Manhã', time: '06:00 - 14:00', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'afternoon':
        return { label: 'Tarde', time: '14:00 - 22:00', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'night':
        return { label: 'Noite', time: '22:00 - 06:00', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    }
  };

  // Carregar dados de produção
  const loadProductionRecords = async (loadAll = false, page = currentPage) => {
    try {
      console.log('🔄 Carregando registros de produção...');
      console.log('📅 Data selecionada:', selectedDate);
      console.log('🕐 Turno selecionado:', selectedShift);
      console.log('📋 Carregar todos:', loadAll);
      console.log('📄 Página:', page);
      
      setIsLoading(true);
      
      let endpoint;
      let params;
      
      if (loadAll) {
        // Usar rota /recent para carregar registros mais recentes sem filtro de data
        endpoint = '/production/recent';
        params = new URLSearchParams({
          limit: '100'
        });
        console.log('🌍 Carregando registros mais recentes da base');
      } else {
        // Verificar se é a data de hoje - se for, usar /recent, senão usar filtro de data
        const today = new Date().toISOString().split('T')[0];
        
        if (selectedDate === today) {
          // Data de hoje - usar rota /recent para mostrar os mais recentes
          endpoint = '/production/recent';
          params = new URLSearchParams({
            limit: itemsPerPage.toString()
          });
          console.log('📅 Data de hoje - carregando registros mais recentes');
        } else {
          // Data específica - usar filtro de data com paginação
          endpoint = '/production';
          const startDate = new Date(selectedDate + 'T00:00:00.000Z');
          const endDate = new Date(selectedDate + 'T23:59:59.999Z');
          
          console.log('🕐 Data de início (UTC):', startDate.toISOString());
          console.log('🕐 Data de fim (UTC):', endDate.toISOString());

          params = new URLSearchParams({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            page: page.toString(),
            limit: itemsPerPage.toString()
          });
        }
      }

      if (selectedShift !== 'all') {
        params.append('shift', selectedShift);
      }

      const url = `${endpoint}?${params.toString()}`;
      console.log('🔗 URL da requisição:', url);
      
      const data = await apiRequest(url);

      console.log('📊 Resposta da API:', data);
      console.log('📈 Número de registros:', data.data?.records?.length || 0);

      if (data.success) {
        setProductionRecords(data.data.records || []);
        const total = data.data.total || data.data.pagination?.total || data.data.records?.length || 0;
        setTotalRecords(total);
        
        // Calcular total de páginas
        const pages = Math.ceil(total / itemsPerPage);
        setTotalPages(pages);
        
        console.log('✅ Registros carregados com sucesso:', data.data.records?.length || 0);
        console.log('📊 Total de registros na base:', total);
        console.log('📄 Total de páginas:', pages);
        
        // Mostrar mensagem se estiver usando registros recentes
        if (endpoint === '/production/recent' && data.data.message) {
          console.log('ℹ️', data.data.message);
        }
      } else {
        console.error('❌ Erro na resposta da API:', data.message);
        throw new Error(data.message || 'Erro ao carregar registros');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar registros de produção:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar registros de produção",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };





  // Função para lidar com mudança de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProductionRecords(false, page);
  };

  // Função para editar registro
  const handleEditRecord = (record: ProductionRecord) => {
    setEditingRecord(record);
    setIsAddDialogOpen(true);
  };

  // Função para excluir registro
  const handleDeleteRecord = (recordId: string, machineName?: string) => {
    setConfirmDialog({
      open: true,
      title: 'Excluir Registro de Produção',
      description: `Tem certeza que deseja excluir este registro de produção${machineName ? ` da ${machineName}` : ''}? Esta ação não pode ser desfeita.`,
      onConfirm: () => confirmDeleteRecord(recordId),
      recordId
    });
  };

  // Função que executa a exclusão após confirmação
  const confirmDeleteRecord = async (recordId: string) => {
    try {
      await apiRequest(`/production/${recordId}`, {
        method: 'DELETE'
      });

      toast({
        title: "Sucesso",
        description: "Registro de produção excluído com sucesso",
      });

      // Recarregar dados
      await loadProductionRecords(false, currentPage);
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir registro de produção",
        variant: "destructive"
      });
    }
  };

  // Atualizar dados
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadProductionRecords(false, currentPage);
      setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('🔐 Verificando autenticação...');
    console.log('👤 Usuário:', user);
    console.log('🔑 Token:', localStorage.getItem('oee-token') ? 'Presente' : 'Ausente');
    
    if (user) {
      console.log('✅ Usuário autenticado, carregando registros...');
      // Resetar para página 1 quando filtros mudarem
      setCurrentPage(1);
      loadProductionRecords(false, 1);
    } else {
      console.log('❌ Usuário não autenticado');
    }
  }, [selectedDate, selectedShift, user]);

  const filteredRecords = productionRecords;

  const handleAddRecord = async () => {
    setIsAddDialogOpen(false);
    await loadProductionRecords();
    toast({
      title: "Sucesso",
      description: "Registro de produção adicionado com sucesso"
    });
  };



  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Controle de Produção</h1>
            <div className="flex items-center gap-2">
              <Wifi className={`h-4 w-4 ${isOnline ? 'text-green-500' : 'text-red-500'}`} />
              <Badge variant={isOnline ? 'default' : 'destructive'} className="text-xs">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Registro e acompanhamento da produção por turno com carregamento automático
          </p>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {lastUpdate}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botão Atualizar */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadProductionRecords()} 
            disabled={isLoading || isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {/* Botão de Configurações */}
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurações do Sistema</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros de carregamento automático
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Carregamento Automático */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Carregamento Automático</Label>
                    <p className="text-xs text-muted-foreground">
                      {autoRefresh ? 'Ativo' : 'Pausado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {autoRefresh ? (
                      <Pause className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Play className="h-4 w-4 text-green-500" />
                    )}
                    <Switch
                       checked={autoRefresh}
                       onCheckedChange={toggleAutoRefresh}
                     />
                  </div>
                </div>

                {/* Intervalo de Atualização */}
                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">Intervalo de Atualização (segundos)</Label>
                  <Select 
                    value={refreshInterval.toString()} 
                    onValueChange={(value) => updateRefreshInterval(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 segundos</SelectItem>
                      <SelectItem value="15">15 segundos</SelectItem>
                      <SelectItem value="30">30 segundos</SelectItem>
                      <SelectItem value="60">1 minuto</SelectItem>
                      <SelectItem value="120">2 minutos</SelectItem>
                      <SelectItem value="300">5 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleSaveSettings}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Botão Novo Registro */}
          <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4 flex-wrap">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shift">Turno</Label>
                <Select value={selectedShift} onValueChange={setSelectedShift}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="morning">Manhã</SelectItem>
                    <SelectItem value="afternoon">Tarde</SelectItem>
                    <SelectItem value="night">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              

            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => loadProductionRecords(true)}
                disabled={isLoading || isRefreshing}
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Carregar Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações dos Registros */}
      {!isLoading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                 Exibindo <strong>{filteredRecords.length}</strong> de <strong>{totalRecords}</strong> registros
                 {totalRecords > filteredRecords.length && (
                   <span className="text-orange-600 ml-2">
                     • Alguns registros podem não estar visíveis devido aos filtros aplicados
                   </span>
                 )}
                 {filteredRecords.length === totalRecords && totalRecords > 0 && (
                   <span className="text-green-600 ml-2">
                     • Todos os registros estão sendo exibidos
                   </span>
                 )}
               </span>
              <span>
                Data: <strong>{new Date(selectedDate).toLocaleDateString('pt-BR')}</strong>
                {selectedShift !== 'all' && (
                  <span className="ml-2">
                    • Turno: <strong>
                      {selectedShift === 'morning' ? 'Manhã' : 
                       selectedShift === 'afternoon' ? 'Tarde' : 'Noite'}
                    </strong>
                  </span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production Records */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner />
              <p className="text-muted-foreground mt-4">Carregando registros de produção...</p>
            </CardContent>
          </Card>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground text-center">
                Não há registros de produção para a data e turno selecionados
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const shiftInfo = getShiftInfo(record.shift);
            const recordDate = new Date(record.date);
            
            return (
              <Card key={record._id} className="hover-lift">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Factory className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{record.machine?.name || 'Máquina não identificada'}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {record.operator?.name || 'Operador não identificado'} • {recordDate.toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.material?.code || 'N/A'} - {record.material?.name || 'Material não identificado'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${shiftInfo.color} border`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {shiftInfo.label}
                        </Badge>
                        <Badge variant={record.status === 'approved' ? 'default' : 'secondary'}>
                          {record.status === 'approved' ? 'Aprovado' : 
                           record.status === 'completed' ? 'Concluído' : 
                           record.status === 'draft' ? 'Rascunho' : 'Rejeitado'}
                        </Badge>
                      </div>
                      
                      {/* Botões de Ação */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          title="Editar registro"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDeleteRecord(record._id, record.machine?.name)}
                           className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                           title="Excluir registro"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Dados de Produção */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Dados de Produção</h4>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Meta:</span>
                          <span className="font-medium">{(record.production?.target || 0).toLocaleString()} un</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Produção Boa:</span>
                          <span className="font-medium text-green-600">{(record.production?.good || 0).toLocaleString()} un</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refugo Filme:</span>
                          <span className="font-medium text-orange-600">{(record.production?.waste?.film || 0).toLocaleString()} un</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Refugo Orgânico:</span>
                          <span className="font-medium text-red-600">{record.production?.waste?.organic || 0} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Produção Total:</span>
                          <span className="font-medium">{(record.production?.total || 0).toLocaleString()} un</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Eficiência:</span>
                          <span className="font-medium">
                            {(record.production?.target || 0) > 0 ? 
                              Math.round(((record.production?.good || 0) / (record.production?.target || 1)) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tempo Planejado:</span>
                          <span className="font-medium">{record.time?.planned || 0} min</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tempo Real:</span>
                          <span className="font-medium">{record.time?.actual || 0} min</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tempo Parada:</span>
                          <span className="font-medium text-red-600">{record.time?.downtime || 0} min</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Métricas OEE */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Métricas OEE</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Disponibilidade</span>
                          <span className={`font-bold ${
                            (record.oee?.availability || 0) >= 90 ? 'text-green-600' :
                            (record.oee?.availability || 0) >= 80 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{record.oee?.availability || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Performance</span>
                          <span className={`font-bold ${
                            (record.oee?.performance || 0) >= 95 ? 'text-green-600' :
                            (record.oee?.performance || 0) >= 85 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{record.oee?.performance || 0}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Qualidade</span>
                          <span className={`font-bold ${
                            (record.oee?.quality || 0) >= 99 ? 'text-green-600' :
                            (record.oee?.quality || 0) >= 95 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{record.oee?.quality || 0}%</span>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">OEE Total</span>
                            <span className={`text-xl font-bold ${
                              (record.oee?.overall || 0) >= 85 ? 'text-green-600' :
                              (record.oee?.overall || 0) >= 65 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {record.oee?.overall || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {record.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Observações:</strong> {record.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Componente de Paginação */}
      {totalPages > 1 && (
        <div className="mt-6 border-t pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalRecords}
            itemsPerPage={itemsPerPage}
            showInfo={true}
          />
        </div>
      )}
      
      {/* Dialog de Adicionar Registro */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro de Produção</DialogTitle>
            <DialogDescription>
              Adicione um novo registro de produção ao sistema
            </DialogDescription>
          </DialogHeader>
          <ProductionFormSimple 
            onSuccess={() => {
              setIsAddDialogOpen(false);
              loadProductionRecords();
              toast({
                title: "Sucesso",
                description: "Registro de produção criado com sucesso!",
              });
            }}
          />
          <DialogFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
};

export default Production;