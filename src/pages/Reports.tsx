import React, { useState } from 'react';
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
  AlertTriangle
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

// Mock data para relatórios
const mockOEEHistory = [
  { date: '01/01', oee: 78.5, availability: 85.2, performance: 92.1, quality: 100.0 },
  { date: '02/01', oee: 82.1, availability: 88.5, performance: 94.8, quality: 97.9 },
  { date: '03/01', oee: 75.3, availability: 82.1, performance: 89.2, quality: 102.8 },
  { date: '04/01', oee: 88.7, availability: 92.4, performance: 96.1, quality: 99.8 },
  { date: '05/01', oee: 91.2, availability: 94.8, performance: 97.5, quality: 98.6 },
  { date: '06/01', oee: 86.4, availability: 90.2, performance: 95.8, quality: 100.0 },
  { date: '07/01', oee: 79.8, availability: 84.7, performance: 93.2, quality: 101.0 }
];

const mockDowntimeData = [
  { name: 'Manutenção Planejada', value: 35, color: '#3b82f6' },
  { name: 'Quebras', value: 28, color: '#ef4444' },
  { name: 'Setup/Ajustes', value: 20, color: '#f59e0b' },
  { name: 'Falta Material', value: 12, color: '#f97316' },
  { name: 'Falta Operador', value: 5, color: '#8b5cf6' }
];

const mockProductionData = [
  { machine: 'Linha 01', target: 10000, produced: 9200, efficiency: 92.0 },
  { machine: 'Linha 02', target: 8000, produced: 8400, efficiency: 105.0 },
  { machine: 'Linha 03', target: 6000, produced: 4800, efficiency: 80.0 },
  { machine: 'Linha 04', target: 12000, produced: 11400, efficiency: 95.0 },
  { machine: 'Linha 05', target: 9000, produced: 7650, efficiency: 85.0 }
];

const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-31');
  const [selectedMachine, setSelectedMachine] = useState('all');
  const [reportType, setReportType] = useState('oee');
  const { toast } = useToast();

  const handleExportReport = (format: 'excel' | 'pdf') => {
    toast({
      title: "Relatório exportado",
      description: `Relatório exportado em formato ${format.toUpperCase()}`
    });
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
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExportReport('pdf')}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
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
        
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Todos
        </Button>
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
                  <SelectItem value="1">Linha 01 - Extrusão</SelectItem>
                  <SelectItem value="2">Linha 02 - Injeção</SelectItem>
                  <SelectItem value="3">Linha 03 - Sopro</SelectItem>
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">82.4%</p>
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
                    <p className="text-2xl font-bold">94,250</p>
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
                    <p className="text-2xl font-bold">127h</p>
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
                    <p className="text-2xl font-bold">97.2%</p>
                    <p className="text-xs text-muted-foreground">Qualidade Média</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico OEE Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência OEE - Últimos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockOEEHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" domain={[70, 105]} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="oee" stroke="hsl(var(--primary))" strokeWidth={3} />
                  <Line type="monotone" dataKey="availability" stroke="hsl(var(--availability))" strokeWidth={2} />
                  <Line type="monotone" dataKey="performance" stroke="hsl(var(--performance))" strokeWidth={2} />
                  <Line type="monotone" dataKey="quality" stroke="hsl(var(--quality))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Análise de Paradas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Paradas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <RechartsPieChart data={mockDowntimeData} cx="50%" cy="50%" outerRadius={80}>
                      {mockDowntimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                
                <div className="mt-4 space-y-2">
                  {mockDowntimeData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eficiência por Máquina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockProductionData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="machine" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Máquina</th>
                      <th className="text-left p-3">Turno</th>
                      <th className="text-right p-3">Disponibilidade</th>
                      <th className="text-right p-3">Performance</th>
                      <th className="text-right p-3">Qualidade</th>
                      <th className="text-right p-3">OEE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '15/01/2024', machine: 'Linha 01', shift: 'Manhã', availability: 85.2, performance: 92.1, quality: 100.0, oee: 78.5 },
                      { date: '15/01/2024', machine: 'Linha 01', shift: 'Tarde', availability: 88.5, performance: 94.8, quality: 97.9, oee: 82.1 },
                      { date: '15/01/2024', machine: 'Linha 02', shift: 'Manhã', availability: 92.4, performance: 96.1, quality: 99.8, oee: 88.7 },
                      { date: '15/01/2024', machine: 'Linha 02', shift: 'Tarde', availability: 94.8, performance: 97.5, quality: 98.6, oee: 91.2 }
                    ].map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">{row.date}</td>
                        <td className="p-3">{row.machine}</td>
                        <td className="p-3">{row.shift}</td>
                        <td className="text-right p-3">{row.availability}%</td>
                        <td className="text-right p-3">{row.performance}%</td>
                        <td className="text-right p-3">{row.quality}%</td>
                        <td className="text-right p-3 font-bold">
                          <span className={
                            row.oee >= 85 ? 'text-success' :
                            row.oee >= 65 ? 'text-warning' : 'text-destructive'
                          }>
                            {row.oee}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={mockOEEHistory}>
                  <defs>
                    <linearGradient id="productionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="oee" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#productionGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <ReportCard
              title="Relatório OEE Completo"
              icon={Target}
              description="Análise detalhada de OEE por máquina, turno e período"
              onExport={() => handleExportReport('excel')}
            />
            
            <ReportCard
              title="Relatório de Produção"
              icon={Factory}
              description="Dados de produção, metas e eficiência por linha"
              onExport={() => handleExportReport('excel')}
            />
            
            <ReportCard
              title="Análise de Paradas"
              icon={AlertTriangle}
              description="Classificação e tempo de paradas por categoria"
              onExport={() => handleExportReport('excel')}
            />
            
            <ReportCard
              title="Controle de Qualidade"
              icon={Activity}
              description="Índices de qualidade, refugos e conformidade"
              onExport={() => handleExportReport('excel')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;