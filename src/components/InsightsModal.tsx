import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import AnalyticsService from '@/services/analyticsService';
import { AIInsight, AI_INSIGHT_TYPES, AI_INSIGHT_SEVERITY, AIInsightType, AIInsightSeverity } from '@/types';

interface InsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsightCreated?: () => void;
}

interface InsightFormData {
  insightType: AIInsightType;
  title: string;
  description: string;
  severity: AIInsightSeverity;
  recommendation?: string;
  confidence?: number;
}

const InsightsModal: React.FC<InsightsModalProps> = ({ 
  open, 
  onOpenChange, 
  onInsightCreated 
}) => {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<AIInsight[]>([]);
  const [editingInsight, setEditingInsight] = useState<AIInsight | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [formData, setFormData] = useState<InsightFormData>({
    insightType: AI_INSIGHT_TYPES.OPTIMIZATION,
    title: '',
    description: '',
    severity: AI_INSIGHT_SEVERITY.MEDIUM,
    recommendation: '',
    confidence: 75
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar insights quando o modal abrir
  useEffect(() => {
    if (open) {
      loadInsights();
    }
  }, [open]);

  // Filtrar e ordenar insights
  useEffect(() => {
    let filtered = insights.filter(insight => {
      const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           insight.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || insight.type === filterType;
      const matchesSeverity = filterSeverity === 'all' || insight.severity === filterSeverity;
      
      return matchesSearch && matchesType && matchesSeverity;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'severity':
          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          aValue = severityOrder[a.severity as keyof typeof severityOrder] || 0;
          bValue = severityOrder[b.severity as keyof typeof severityOrder] || 0;
          break;
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInsights(filtered);
  }, [insights, searchTerm, filterType, filterSeverity, sortBy, sortOrder]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const response = await AnalyticsService.getInsights({ limit: 100 });
      setInsights(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    if (formData.confidence && (formData.confidence < 0 || formData.confidence > 100)) {
      newErrors.confidence = 'Confiança deve estar entre 0 e 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      if (editingInsight) {
        await AnalyticsService.updateInsight(editingInsight.id, formData);
      } else {
        await AnalyticsService.createInsight(formData);
      }
      
      // Recarregar insights
      await loadInsights();
      
      // Reset form
      resetForm();
      
      // Callback para atualizar a página principal
      if (onInsightCreated) {
        onInsightCreated();
      }
      
      // Voltar para a aba de listagem
      setActiveTab('list');
      
    } catch (error: any) {
      console.error('Erro ao salvar insight:', error);
      if (error.response?.data?.details) {
        const apiErrors: Record<string, string> = {};
        error.response.data.details.forEach((detail: any) => {
          apiErrors[detail.field] = detail.message;
        });
        setErrors(apiErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (insight: AIInsight) => {
    setEditingInsight(insight);
    setFormData({
      insightType: insight.type,
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
      recommendation: insight.recommendation || '',
      confidence: insight.confidence || 75
    });
    setActiveTab('create');
  };

  const handleDelete = async (insightId: string) => {
    if (!confirm('Tem certeza que deseja excluir este insight?')) return;
    
    try {
      setLoading(true);
      await AnalyticsService.deleteInsight(insightId);
      await loadInsights();
      
      if (onInsightCreated) {
        onInsightCreated();
      }
    } catch (error) {
      console.error('Erro ao excluir insight:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      insightType: AI_INSIGHT_TYPES.OPTIMIZATION,
      title: '',
      description: '',
      severity: AI_INSIGHT_SEVERITY.MEDIUM,
      recommendation: '',
      confidence: 75
    });
    setEditingInsight(null);
    setErrors({});
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Insights de IA</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              {editingInsight ? 'Editar Insight' : 'Criar Insight'}
            </TabsTrigger>
            <TabsTrigger value="list">Lista de Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insightType">Tipo de Insight</Label>
                  <Select value={formData.insightType} onValueChange={(value: AIInsightType) => setFormData({ ...formData, insightType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AI_INSIGHT_TYPES.OPTIMIZATION}>Otimização</SelectItem>
                      <SelectItem value={AI_INSIGHT_TYPES.PATTERN}>Padrão</SelectItem>
                      <SelectItem value={AI_INSIGHT_TYPES.ANOMALY}>Anomalia</SelectItem>
                      <SelectItem value={AI_INSIGHT_TYPES.MAINTENANCE}>Manutenção</SelectItem>
                      <SelectItem value={AI_INSIGHT_TYPES.PREDICTION}>Predição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título do insight"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do insight"
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <Label htmlFor="recommendation">Recomendação</Label>
                <Textarea
                  id="recommendation"
                  value={formData.recommendation}
                  onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  placeholder="Recomendação de ação"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Severidade</Label>
                  <Select value={formData.severity} onValueChange={(value: AIInsightSeverity) => setFormData({ ...formData, severity: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AI_INSIGHT_SEVERITY.LOW}>Baixa</SelectItem>
                      <SelectItem value={AI_INSIGHT_SEVERITY.MEDIUM}>Média</SelectItem>
                      <SelectItem value={AI_INSIGHT_SEVERITY.HIGH}>Alta</SelectItem>
                      <SelectItem value={AI_INSIGHT_SEVERITY.CRITICAL}>Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="confidence">Confiança (%)</Label>
                  <Input
                    id="confidence"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) || 0 })}
                    className={errors.confidence ? 'border-red-500' : ''}
                  />
                  {errors.confidence && (
                    <p className="text-sm text-red-500 mt-1">{errors.confidence}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingInsight ? 'Atualizar' : 'Criar'} Insight
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Filtros e busca */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar insights..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value={AI_INSIGHT_TYPES.OPTIMIZATION}>Otimização</SelectItem>
                  <SelectItem value={AI_INSIGHT_TYPES.PATTERN}>Padrão</SelectItem>
                  <SelectItem value={AI_INSIGHT_TYPES.ANOMALY}>Anomalia</SelectItem>
                  <SelectItem value={AI_INSIGHT_TYPES.MAINTENANCE}>Manutenção</SelectItem>
                  <SelectItem value={AI_INSIGHT_TYPES.PREDICTION}>Predição</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value={AI_INSIGHT_SEVERITY.LOW}>Baixa</SelectItem>
                  <SelectItem value={AI_INSIGHT_SEVERITY.MEDIUM}>Média</SelectItem>
                  <SelectItem value={AI_INSIGHT_SEVERITY.HIGH}>Alta</SelectItem>
                  <SelectItem value={AI_INSIGHT_SEVERITY.CRITICAL}>Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Data</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="severity">Severidade</SelectItem>
                  <SelectItem value="confidence">Confiança</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>

            {/* Lista de insights */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Carregando insights...
                </div>
              ) : filteredInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {insights.length === 0 ? 'Nenhum insight encontrado' : 'Nenhum insight corresponde aos filtros'}
                </div>
              ) : (
                filteredInsights.map((insight) => (
                  <Card key={insight.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge className={getSeverityColor(insight.severity)}>
                            {getSeverityIcon(insight.severity)}
                            <span className="ml-1 capitalize">{insight.severity}</span>
                          </Badge>
                          <Badge variant="outline">
                            {insight.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Confiança: {insight.confidence}%</span>
                          <span>
                            {new Date(insight.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(insight)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(insight.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InsightsModal;