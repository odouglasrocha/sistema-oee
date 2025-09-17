import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Target,
  Activity,
  Factory,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2
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
  Area,
  AreaChart
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { reportsService, ReportData, ReportFilters } from '@/services/reportsService';

// Função para formatar números
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

// Função para formatar percentual
const formatPercent = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

// Função para obter data padrão (últimos 30 dias)
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

const Reports: React.FC = () => {
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [reportType, setReportType] = useState('oee');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [machines, setMachines] = useState<Array<{ id: string; name: string; department: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Carregar dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      // Aguardar token estar disponível
      let attempts = 0;
      const maxAttempts = 15; // 15 segundos máximo
      
      while (attempts < maxAttempts) {
        const token = localStorage.getItem('oee-token');
        
        if (token) {
          try {
            // Verificar se token é válido
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp > now + 60) {
              console.log('✅ Token válido encontrado, carregando dados...');
              await loadMachines();
              await loadReportData();
              return;
            }
          } catch (error) {
            console.log('Token inválido, aguardando novo token...');
          }
        }
        
        attempts++;
        console.log(`Aguardando autenticação... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('⚠️ Timeout aguardando autenticação');
    };
    
    initializeData();
  }, []);

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    if (startDate && endDate) {
      loadReportData();
    }
  }, [startDate, endDate, selectedMachine, reportType]);

  const loadMachines = async () => {
    try {
      const machinesList = await reportsService.getMachines();
      setMachines(machinesList);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de máquinas",
        variant: "destructive"
      });
    }
  };

  const loadReportData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const filters: ReportFilters = {
        startDate,
        endDate,
        machineId: selectedMachine !== 'all' ? selectedMachine : undefined,
        reportType
      };

      const data = await reportsService.getReportData(filters);
      setReportData(data);
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'excel' | 'pdf', reportType: 'oee' | 'production' | 'downtime' | 'quality' | 'complete' = 'complete') => {
    if (!reportData) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportação",
        variant: "destructive"
      });
      return;
    }

    setExporting(true);
    try {
      const filters: ReportFilters = {
        startDate,
        endDate,
        machineId: selectedMachine !== 'all' ? selectedMachine : undefined,
        reportType
      };

      const blob = await reportsService.exportReport({
        format,
        reportType,
        filters,
        includeCharts: true
      });

      // Criar URL para download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${reportType}_${startDate}_${endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: `Relatório exportado em formato ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRefreshData = () => {
    loadReportData();
  };

  const handleExportAll = () => {
    handleExportReport('excel', 'complete');
  };

  const ReportCard = ({ 
    title, 
    icon: Icon, 
    description, 
    onExport 
  }: { 
    title: string; 
    icon: any; 
    description: string; 
    onExport: () => void; 
  }) => (
    <Card className="hover-lift">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportReport('excel')}
              disabled={exporting || !reportData}
              className="gap-2"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportReport('pdf')}
              disabled={exporting || !reportData}
              className="gap-2"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Análises detalhadas e exportação de dados de produção
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshData}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
          <Button 
            onClick={handleExportAll}
            disabled={exporting || !reportData}
            className="gap-2"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar Todos
          </Button>
        </div>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine">Máquina</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Máquinas</SelectItem>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} - {machine.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reportType">Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oee">OEE Detalhado</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="downtime">Paradas</SelectItem>
                  <SelectItem value="quality">Qualidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="oee">Relatório OEE</TabsTrigger>
          <TabsTrigger value="production">Produção</TabsTrigger>
          <TabsTrigger value="export">Exportação</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas Resumo */}
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{formatPercent(reportData?.summary?.averageOEE || 0)}</p>
                      <p className="text-xs text-muted-foreground">OEE Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Factory className="h-8 w-8 text-success" />
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(reportData?.summary?.totalProduced || 0)}</p>
                      <p className="text-xs text-muted-foreground">Unidades Produzidas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-warning" />
                    <div>
                      <p className="text-2xl font-bold">{Math.round((reportData?.summary?.totalDowntime || 0) / 60)}h</p>
                      <p className="text-xs text-muted-foreground">Tempo de Parada</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-accent" />
                    <div>
                      <p className="text-2xl font-bold">{formatPercent(reportData?.summary?.averageQuality || 0)}</p>
                      <p className="text-xs text-muted-foreground">Qualidade Média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Gráfico OEE Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência OEE - Período Selecionado</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.oeeHistory && reportData.oeeHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportsService.formatChartData(reportData.oeeHistory)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)}%`,
                        name === 'oee' ? 'OEE' :
                        name === 'availability' ? 'Disponibilidade' :
                        name === 'performance' ? 'Performance' : 'Qualidade'
                      ]}
                    />
                    <Line type="monotone" dataKey="oee" stroke="hsl(var(--primary))" strokeWidth={3} name="OEE" />
                    <Line type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={2} name="Disponibilidade" />
                    <Line type="monotone" dataKey="performance" stroke="#10b981" strokeWidth={2} name="Performance" />
                    <Line type="monotone" dataKey="quality" stroke="#f59e0b" strokeWidth={2} name="Qualidade" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado disponível para o período selecionado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Análise de Paradas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Paradas</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData?.downtimeAnalysis && reportData.downtimeAnalysis.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <RechartsPieChart 
                          data={reportData.downtimeAnalysis.map(item => ({
                            name: item.category,
                            value: item.percentage,
                            color: item.color
                          }))}
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80}
                        >
                          {reportData.downtimeAnalysis.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </RechartsPieChart>
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Percentual']}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    
                    <div className="mt-4 space-y-2">
                      {reportData.downtimeAnalysis.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.category}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                            <div className="text-xs text-muted-foreground">
                              {Math.round(item.totalTime / 60)}h ({item.occurrences} ocorrências)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma parada registrada no período</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eficiência por Máquina</CardTitle>
              </CardHeader>
              <CardContent>
                {reportData?.machineEfficiency && reportData.machineEfficiency.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={reportData.machineEfficiency.map(item => ({
                        machine: item.machineName,
                        efficiency: item.efficiency,
                        oee: item.oee,
                        produced: item.produced,
                        target: item.target
                      }))}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" domain={[0, 120]} />
                      <YAxis dataKey="machine" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'efficiency' ? `${value.toFixed(1)}%` : value,
                          name === 'efficiency' ? 'Eficiência' : 
                          name === 'oee' ? 'OEE' :
                          name === 'produced' ? 'Produzido' : 'Meta'
                        ]}
                      />
                      <Bar dataKey="efficiency" fill="hsl(var(--primary))" name="Eficiência" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum dado de eficiência disponível</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="oee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Detalhado de OEE</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : reportData?.oeeHistory && reportData.oeeHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Data</th>
                        <th className="text-left p-3">Máquina</th>
                        <th className="text-left p-3">Turno</th>
                        <th className="text-right p-3">Produzido</th>
                        <th className="text-right p-3">Meta</th>
                        <th className="text-right p-3">Disponibilidade</th>
                        <th className="text-right p-3">Performance</th>
                        <th className="text-right p-3">Qualidade</th>
                        <th className="text-right p-3">OEE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.oeeHistory.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            {new Date(row.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3">{row.machineName}</td>
                          <td className="p-3">
                            <Badge variant="outline">
                              {row.shift === 'morning' ? 'Manhã' :
                               row.shift === 'afternoon' ? 'Tarde' :
                               row.shift === 'night' ? 'Noite' : row.shift}
                            </Badge>
                          </td>
                          <td className="text-right p-3">{formatNumber(row.quantityProduced)}</td>
                          <td className="text-right p-3">{formatNumber(row.targetQuantity)}</td>
                          <td className="text-right p-3">
                            <span className={
                              row.availability >= 90 ? 'text-green-600' :
                              row.availability >= 80 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {formatPercent(row.availability)}
                            </span>
                          </td>
                          <td className="text-right p-3">
                            <span className={
                              row.performance >= 95 ? 'text-green-600' :
                              row.performance >= 85 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {formatPercent(row.performance)}
                            </span>
                          </td>
                          <td className="text-right p-3">
                            <span className={
                              row.quality >= 99 ? 'text-green-600' :
                              row.quality >= 95 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {formatPercent(row.quality)}
                            </span>
                          </td>
                          <td className="text-right p-3 font-bold">
                            <span className={
                              row.oee >= 85 ? 'text-green-600' :
                              row.oee >= 65 ? 'text-yellow-600' : 'text-red-600'
                            }>
                              {formatPercent(row.oee)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Resumo estatístico */}
                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatPercent(reportData.summary?.averageOEE || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">OEE Médio</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPercent(reportData.summary?.averageAvailability || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Disponibilidade Média</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {formatPercent(reportData.summary?.averagePerformance || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Performance Média</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {formatPercent(reportData.summary?.averageQuality || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Qualidade Média</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado de OEE disponível para o período selecionado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando dados...</span>
                </div>
              ) : reportData?.oeeHistory && reportData.oeeHistory.length > 0 ? (
                <>
                  {/* Gráfico de Produção */}
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={reportsService.formatChartData(reportData.oeeHistory)}>
                      <defs>
                        <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'OEE']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="oee" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#productionGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Tabela de Produção Detalhada */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Detalhes de Produção por Máquina</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Máquina</th>
                            <th className="text-right p-3">Meta</th>
                            <th className="text-right p-3">Produzido</th>
                            <th className="text-right p-3">Eficiência</th>
                            <th className="text-right p-3">Defeitos</th>
                            <th className="text-right p-3">Taxa de Qualidade</th>
                            <th className="text-right p-3">Tempo de Parada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.machineEfficiency?.map((machine, index) => {
                            const qualityRate = machine.produced > 0 ? 
                              ((machine.produced - (reportData.oeeHistory.find(h => h.machineId === machine.machineId)?.defectCount || 0)) / machine.produced) * 100 : 100;
                            const downtime = reportData.oeeHistory.find(h => h.machineId === machine.machineId)?.downtime || 0;
                            
                            return (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-3 font-medium">{machine.machineName}</td>
                                <td className="text-right p-3">{formatNumber(machine.target)}</td>
                                <td className="text-right p-3">{formatNumber(machine.produced)}</td>
                                <td className="text-right p-3">
                                  <span className={
                                    machine.efficiency >= 100 ? 'text-green-600' :
                                    machine.efficiency >= 90 ? 'text-yellow-600' : 'text-red-600'
                                  }>
                                    {formatPercent(machine.efficiency)}
                                  </span>
                                </td>
                                <td className="text-right p-3">
                                  {formatNumber(reportData.oeeHistory.find(h => h.machineId === machine.machineId)?.defectCount || 0)}
                                </td>
                                <td className="text-right p-3">
                                  <span className={
                                    qualityRate >= 99 ? 'text-green-600' :
                                    qualityRate >= 95 ? 'text-yellow-600' : 'text-red-600'
                                  }>
                                    {formatPercent(qualityRate)}
                                  </span>
                                </td>
                                <td className="text-right p-3">
                                  {Math.round(downtime / 60)}h {downtime % 60}min
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Resumo de Produção */}
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {formatNumber(reportData.summary?.totalProduced || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Produzido</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNumber(reportData.summary?.totalTarget || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Meta Total</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {formatPercent(reportData.summary?.efficiency || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Eficiência Geral</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center items-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Factory className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum dado de produção disponível para o período selecionado</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          {/* Resumo dos Dados Disponíveis */}
          {reportData && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Dados Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {reportData.oeeHistory?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Registros de OEE</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {reportData.machineEfficiency?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Máquinas Analisadas</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.downtimeAnalysis?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Categorias de Parada</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.round((reportData.summary?.totalDowntime || 0) / 60)}
                    </p>
                    <p className="text-sm text-muted-foreground">Horas de Parada</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Opções de Exportação */}
          <div className="grid gap-4 md:grid-cols-2">
            <ReportCard
              title="Relatório OEE Completo"
              icon={Target}
              description="Análise detalhada de OEE por máquina, turno e período com gráficos e tabelas"
              onExport={() => handleExportReport('excel', 'oee')}
            />
            
            <ReportCard
              title="Relatório de Produção"
              icon={Factory}
              description="Dados de produção, metas, eficiência e qualidade por linha de produção"
              onExport={() => handleExportReport('excel', 'production')}
            />
            
            <ReportCard
              title="Análise de Paradas"
              icon={AlertTriangle}
              description="Classificação detalhada de paradas por categoria, duração e frequência"
              onExport={() => handleExportReport('excel', 'downtime')}
            />
            
            <ReportCard
              title="Controle de Qualidade"
              icon={Activity}
              description="Índices de qualidade, refugos, retrabalho e conformidade por período"
              onExport={() => handleExportReport('excel', 'quality')}
            />
          </div>
          
          {/* Exportação Personalizada */}
          <Card>
            <CardHeader>
              <CardTitle>Exportação Personalizada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Formato de Exportação</Label>
                  <Select defaultValue="excel">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Incluir Gráficos</Label>
                  <Select defaultValue="true">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim, incluir gráficos</SelectItem>
                      <SelectItem value="false">Apenas dados tabulares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => handleExportReport('excel', 'complete')}
                  disabled={exporting || !reportData}
                  className="gap-2"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportar Relatório Completo
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => handleExportReport('pdf', 'complete')}
                  disabled={exporting || !reportData}
                  className="gap-2"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Gerar PDF Executivo
                </Button>
              </div>
              
              {!reportData && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Selecione um período e aplique os filtros para habilitar a exportação</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;