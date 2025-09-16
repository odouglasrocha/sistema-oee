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
  RefreshCw
} from 'lucide-react';
import { Production as ProductionType, Machine } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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

  const { toast } = useToast();
  const { user } = useAuth();

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
  const loadProductionRecords = async (loadAll = false) => {
    try {
      console.log('🔄 Carregando registros de produção...');
      console.log('📅 Data selecionada:', selectedDate);
      console.log('🕐 Turno selecionado:', selectedShift);
      console.log('📋 Carregar todos:', loadAll);
      
      setIsLoading(true);
      
      let params;
      if (loadAll) {
        // Carregar todos os registros sem filtro de data
        params = new URLSearchParams({
          limit: '1000'
        });
        console.log('🌍 Carregando TODOS os registros da base');
      } else {
        // Carregar apenas da data selecionada
        const startDate = new Date(selectedDate + 'T00:00:00.000Z');
        const endDate = new Date(selectedDate + 'T23:59:59.999Z');
        
        console.log('🕐 Data de início (UTC):', startDate.toISOString());
        console.log('🕐 Data de fim (UTC):', endDate.toISOString());

        params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: '1000'
        });
      }

      if (selectedShift !== 'all') {
        params.append('shift', selectedShift);
      }

      console.log('🔗 URL da requisição:', `/production?${params.toString()}`);
      
      const data = await apiRequest(`/production?${params.toString()}`);

      console.log('📊 Resposta da API:', data);
      console.log('📈 Número de registros:', data.data?.records?.length || 0);

      if (data.success) {
        setProductionRecords(data.data.records || []);
        setTotalRecords(data.data.pagination?.total || data.data.records?.length || 0);
        console.log('✅ Registros carregados com sucesso:', data.data.records?.length || 0);
        console.log('📊 Total de registros na base:', data.data.pagination?.total || data.data.records?.length || 0);
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





  // Atualizar dados
  const refreshData = async () => {
    setIsRefreshing(true);
    await loadProductionRecords();
    setIsRefreshing(false);
  };

  useEffect(() => {
    console.log('🔐 Verificando autenticação...');
    console.log('👤 Usuário:', user);
    console.log('🔑 Token:', localStorage.getItem('oee-token') ? 'Presente' : 'Ausente');
    
    if (user) {
      console.log('✅ Usuário autenticado, carregando registros...');
      loadProductionRecords();
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Controle de Produção
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro e acompanhamento da produção por turno
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Registro de Produção</DialogTitle>
              <DialogDescription>
                Registre os dados de produção do turno
              </DialogDescription>
            </DialogHeader>
            <ProductionFormSimple 
                  onSuccess={handleAddRecord}
                  showValidationErrors={showValidationErrors}
                />
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                setShowValidationErrors(false);
              }}>
                Cancelar
              </Button>
              <Button type="submit" form="production-form">
                Registrar Produção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
    </div>
  );
};

export default Production;