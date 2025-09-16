import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Factory, Clock, Target, BarChart3, User, Calendar, Plus, Trash2 } from 'lucide-react';
import { materialsData, Material } from '@/data/materialsData';
import { API_BASE_URL, apiRequest } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface Machine {
  _id: string;
  name: string;
  code: string;
  type: 'producao' | 'auxiliar' | 'teste' | 'manutencao';
  capacity: {
    value: number;
    unit: 'pcs/h' | 'kg/h' | 'l/h' | 'm/h' | 'ton/h' | 'unidades/min';
  };
  status: 'ativa' | 'inativa' | 'manutencao' | 'parada';
}

interface DowntimeEntry {
  id: string;
  reason: string;
  duration: number;
  description?: string;
}

interface ProductionFormData {
  machineId: string;
  shift: 'morning' | 'afternoon' | 'night';
  startDateTime: string;
  endDateTime: string;
  plannedTime: number;
  productCode: string;
  productName: string;
  productDescription: string;
  productionTarget: number;
  goodProduction: number;
  filmWaste: number;
  organicWaste: number;
  actualTime: number;
  downtimeEntries: DowntimeEntry[];
  notes: string;
}

interface ProductionFormSimpleProps {
  onSubmit?: (data: ProductionFormData) => void;
  isSubmitting?: boolean;
  showValidationErrors?: boolean;
  onSuccess?: () => void;
}

const ProductionFormSimple: React.FC<ProductionFormSimpleProps> = ({ 
  onSubmit, 
  isSubmitting = false, 
  showValidationErrors = false,
  onSuccess
}) => {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);
  const [formData, setFormData] = useState<ProductionFormData>({
    machineId: '',
    shift: 'morning',
    startDateTime: '',
    endDateTime: '',
    plannedTime: 480,
    productCode: '',
    productName: '',
    productDescription: '',
    productionTarget: 1000,
    goodProduction: 0,
    filmWaste: 0,
    organicWaste: 0,
    actualTime: 480,
    downtimeEntries: [],
    notes: ''
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Função para detectar turno automaticamente
  const detectShift = (dateTime: string): 'morning' | 'afternoon' | 'night' => {
    const hour = new Date(dateTime).getHours();
    
    if (hour >= 6 && hour < 14) {
      return 'morning';
    } else if (hour >= 14 && hour < 22) {
      return 'afternoon';
    } else {
      return 'night';
    }
  };

  // Carregar máquinas da base de dados
  const loadMachines = async () => {
    setIsLoadingMachines(true);
    try {
      const response = await fetch(`${API_BASE_URL}/machines/public`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Máquinas da base:', data);
      if (data.success && data.data?.machines) {
        setMachines(data.data.machines);
      }
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar máquinas",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMachines(false);
    }
  };

  useEffect(() => {
    loadMachines();
    
    // Definir data/hora atual como padrão
    const now = new Date();
    const currentDateTime = now.toISOString().slice(0, 16);
    
    // Calcular horário de fim (8 horas depois)
    const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const endDateTime = endTime.toISOString().slice(0, 16);
    
    setFormData(prev => ({
      ...prev,
      startDateTime: currentDateTime,
      endDateTime: endDateTime,
      shift: detectShift(currentDateTime)
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se há uma função onSubmit personalizada, usar ela
    if (onSubmit) {
      onSubmit(formData);
      return;
    }
    
    // Caso contrário, enviar diretamente para a API
    setIsSubmittingForm(true);
    
    try {
      const response = await apiRequest('/production', {
        method: 'POST',
        body: JSON.stringify({
          machineId: formData.machineId,
          shift: formData.shift,
          startDateTime: formData.startDateTime,
          endDateTime: formData.endDateTime,
          materialCode: formData.productCode,
          materialName: formData.productName,
          materialDescription: formData.productDescription,
          productionTarget: formData.productionTarget,
          goodProduction: formData.goodProduction,
          filmWaste: formData.filmWaste,
          organicWaste: formData.organicWaste,
          plannedTime: formData.plannedTime,
          actualTime: formData.actualTime,
          downtimeEntries: formData.downtimeEntries,
          notes: formData.notes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Registro de produção criado com sucesso"
        });
        
        // Resetar formulário
        const now = new Date();
        const currentDateTime = now.toISOString().slice(0, 16);
        const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const endDateTime = endTime.toISOString().slice(0, 16);
        
        setFormData({
          machineId: '',
          shift: detectShift(currentDateTime),
          startDateTime: currentDateTime,
          endDateTime: endDateTime,
          plannedTime: 480,
          productCode: '',
          productName: '',
          productDescription: '',
          productionTarget: 1000,
          goodProduction: 0,
          filmWaste: 0,
          organicWaste: 0,
          actualTime: 480,
          downtimeEntries: [],
          notes: ''
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Tratamento especial para erro 409 (registro duplicado)
        if (response.status === 409) {
          toast({
            title: "Registro Duplicado",
            description: data.message || "Já existe um registro para esta máquina e turno",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro",
            description: data.message || "Erro ao criar registro de produção",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Erro ao enviar registro:', error);
      
      // Tratar erro 409 (Conflict) - registro duplicado
      if (error.message && error.message.includes('409')) {
        toast({
          title: "Registro Duplicado",
          description: "Já existe um registro para esta máquina no turno selecionado desta data. Verifique os registros existentes ou escolha outro turno/data.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro de conexão com o servidor",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const updateField = (field: keyof ProductionFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Se mudou o horário de início, detectar turno automaticamente
      if (field === 'startDateTime' && value) {
        newData.shift = detectShift(value);
      }
      
      // Recalcular tempo planejado quando datas/horas mudarem
      if (field === 'startDateTime' || field === 'endDateTime') {
        if (newData.startDateTime && newData.endDateTime) {
          const start = new Date(newData.startDateTime);
          const end = new Date(newData.endDateTime);
          const diffMs = Math.max(0, end.getTime() - start.getTime());
          const plannedMinutes = Math.floor(diffMs / (1000 * 60));
          newData.plannedTime = plannedMinutes;
          
          // Recalcular meta se produto já estiver selecionado
           if (newData.productCode) {
             const material = materialsData.find(m => m.Mat === newData.productCode);
             if (material) {
               newData.productionTarget = Math.round(material.PPm * plannedMinutes * 0.85);
             }
           }
        }
      }
      
      return newData;
    });
  };

  const addDowntimeEntry = () => {
    const newEntry: DowntimeEntry = {
      id: Date.now().toString(),
      reason: '',
      duration: 0,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      downtimeEntries: [...prev.downtimeEntries, newEntry]
    }));
  };

  const updateDowntimeEntry = (id: string, field: keyof DowntimeEntry, value: any) => {
    setFormData(prev => ({
      ...prev,
      downtimeEntries: prev.downtimeEntries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    }));
  };

  const removeDowntimeEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      downtimeEntries: prev.downtimeEntries.filter(entry => entry.id !== id)
    }));
  };

  const calculateOEE = () => {
    const machine = machines.find(m => m._id === formData.machineId);
    if (!machine || !formData.goodProduction) return { availability: 0, performance: 0, quality: 0, oee: 0, target: 0 };

    const totalProduction = formData.goodProduction + formData.filmWaste;
    const totalDowntime = formData.downtimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
    const realTime = formData.plannedTime - totalDowntime; // Tempo real calculado
    const theoreticalProduction = (realTime / 60) * (machine.capacity?.value || 600);
    
    // Disponibilidade: Tempo Real / Tempo Planejado
    const availability = formData.plannedTime > 0 ? (realTime / formData.plannedTime) * 100 : 0;
    
    // Performance: Produção Real / Produção Teórica
    const performance = theoreticalProduction > 0 ? (totalProduction / theoreticalProduction) * 100 : 0;
    
    // Qualidade: Produção Boa / Produção Total
    const quality = totalProduction > 0 ? (formData.goodProduction / totalProduction) * 100 : 0;
    
    // OEE: Disponibilidade × Performance × Qualidade
    const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
    
    // Atingimento da Meta: Produção Boa / Meta
    const targetAchievement = formData.productionTarget > 0 ? (formData.goodProduction / formData.productionTarget) * 100 : 0;
    
    return {
      availability: Math.round(Math.max(0, availability) * 100) / 100,
      performance: Math.round(Math.max(0, performance) * 100) / 100,
      quality: Math.round(Math.max(0, quality) * 100) / 100,
      oee: Math.round(Math.max(0, oee) * 100) / 100,
      target: Math.round(targetAchievement * 100) / 100
    };
  };

  const oeeData = calculateOEE();

  return (
    <form id="production-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Informações da Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine">Máquina *</Label>
              <Select 
                value={formData.machineId} 
                onValueChange={(value) => updateField('machineId', value)}
              >
                <SelectTrigger className={showValidationErrors && !formData.machineId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione a máquina" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMachines ? (
                    <SelectItem value="loading" disabled>
                      Carregando máquinas...
                    </SelectItem>
                  ) : (
                    machines.map(machine => (
                      <SelectItem key={machine._id} value={machine._id}>
                        {machine.name} ({machine.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {showValidationErrors && !formData.machineId && (
                <p className="text-sm text-red-500">Selecione uma máquina</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shift">Turno * (Detectado automaticamente)</Label>
              <Select 
                value={formData.shift} 
                onValueChange={(value) => updateField('shift', value as ProductionFormData['shift'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manhã (06:00-14:00)</SelectItem>
                  <SelectItem value="afternoon">Tarde (14:00-22:00)</SelectItem>
                  <SelectItem value="night">Noite (22:00-06:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium">Período de Produção *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="startDateTime">Data - Hora Início</Label>
                <Input
                  id="startDateTime"
                  type="datetime-local"
                  value={formData.startDateTime}
                  onChange={(e) => updateField('startDateTime', e.target.value)}
                  className={showValidationErrors && !formData.startDateTime ? 'border-red-500' : ''}
                />
                {showValidationErrors && !formData.startDateTime && (
                  <p className="text-sm text-red-500">Data e hora de início são obrigatórias</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDateTime">Data - Hora Final</Label>
                <Input
                  id="endDateTime"
                  type="datetime-local"
                  value={formData.endDateTime}
                  onChange={(e) => updateField('endDateTime', e.target.value)}
                  className={showValidationErrors && !formData.endDateTime ? 'border-red-500' : ''}
                />
                {showValidationErrors && !formData.endDateTime && (
                  <p className="text-sm text-red-500">Data e hora final são obrigatórias</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tempo Planejado</Label>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-bold text-blue-600">
                  {(() => {
                    if (!formData.startDateTime || !formData.endDateTime) return '0 min';
                    const start = new Date(formData.startDateTime);
                    const end = new Date(formData.endDateTime);
                    const diffMs = Math.max(0, end.getTime() - start.getTime());
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    return `${diffMinutes} min`;
                  })()} 
                </div>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product">Produto *</Label>
              <Select 
                value={formData.productCode} 
                onValueChange={(value) => {
                   const selectedMaterial = materialsData.find(m => m.Mat === value);
                   updateField('productCode', value);
                   if (selectedMaterial) {
                     updateField('productName', selectedMaterial.Material);
                     updateField('productDescription', selectedMaterial.Material || '');
                   }
                   // Atualizar meta automaticamente
                   const material = materialsData.find(m => m.Mat === value);
                   if (material && formData.startDateTime && formData.endDateTime) {
                     const start = new Date(formData.startDateTime);
                     const end = new Date(formData.endDateTime);
                     const diffMs = Math.max(0, end.getTime() - start.getTime());
                     const plannedMinutes = Math.floor(diffMs / (1000 * 60));
                     const target = Math.round(material.PPm * plannedMinutes * 0.85);
                     updateField('productionTarget', target);
                   }
                }}
              >
                <SelectTrigger className={showValidationErrors && !formData.productCode ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {materialsData.map(material => (
                    <SelectItem key={material.Mat} value={material.Mat}>
                      <div className="flex flex-col">
                        <span className="font-medium">{material.Mat}</span>
                        <span className="text-xs text-gray-500 truncate">{material.Material}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidationErrors && !formData.productCode && (
                <p className="text-sm text-red-500">Produto é obrigatório</p>
              )}
            </div>
            
            {formData.productCode && (
              <div className="space-y-2">
                <Label htmlFor="productName">Nome do Produto</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                  placeholder="Nome do produto"
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Meta Calculada</Label>
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-bold text-green-600">
                  {(() => {
                    if (!formData.productCode || !formData.startDateTime || !formData.endDateTime) return '0 UND';
                    const material = materialsData.find(m => m.Mat === formData.productCode);
                    if (!material) return '0 UND';
                    const start = new Date(formData.startDateTime);
                     const end = new Date(formData.endDateTime);
                     const diffMs = Math.max(0, end.getTime() - start.getTime());
                     const plannedMinutes = Math.floor(diffMs / (1000 * 60));
                     const target = Math.round(material.PPm * plannedMinutes * 0.85);
                     return `${target} UND`;
                  })()} 
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados de Produção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Dados de Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goodProduction">Produção Boa (UND) *</Label>
              <Input
                id="goodProduction"
                type="number"
                value={formData.goodProduction}
                onChange={(e) => updateField('goodProduction', Number(e.target.value))}
                placeholder="Ex: 950"
                className={showValidationErrors && !formData.goodProduction ? 'border-red-500' : ''}
              />
              {showValidationErrors && !formData.goodProduction && (
                <p className="text-sm text-red-500">Produção boa é obrigatória</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filmWaste">Refugo Filme (UND)</Label>
              <Input
                id="filmWaste"
                type="number"
                value={formData.filmWaste}
                onChange={(e) => updateField('filmWaste', Number(e.target.value))}
                placeholder="Ex: 50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organicWaste">Refugo Orgânico (KG)</Label>
              <Input
                id="organicWaste"
                type="number"
                step="0.1"
                value={formData.organicWaste}
                onChange={(e) => updateField('organicWaste', Number(e.target.value))}
                placeholder="Ex: 25.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controle de Paradas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Controle de Paradas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tempo Real Calculado</Label>
              <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Planejado - Paradas:</span>
                  <span className="font-bold text-green-600">
                    {(() => {
                      const totalDowntime = formData.downtimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
                      const realTime = formData.plannedTime - totalDowntime;
                      return `${realTime} min`;
                    })()} 
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Resumo de Paradas</Label>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Total de paradas:</span>
                  <span className="font-bold text-gray-600">
                    {formData.downtimeEntries.length} ({formData.downtimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0)} min)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Motivos de Paradas</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDowntimeEntry}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Parada
              </Button>
            </div>
            
            {formData.downtimeEntries.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma parada registrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.downtimeEntries.map((entry, index) => (
                  <div key={entry.id} className="p-3 border rounded-md bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-xs text-gray-600">Parada #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDowntimeEntry(entry.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor={`reason-${entry.id}`} className="text-xs">Motivo *</Label>
                        <Select
                          value={entry.reason}
                          onValueChange={(value) => updateDowntimeEntry(entry.id, 'reason', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manutencao-preventiva">Manutenção Preventiva</SelectItem>
                            <SelectItem value="manutencao-corretiva">Manutenção Corretiva</SelectItem>
                            <SelectItem value="troca-molde">Troca de Molde</SelectItem>
                            <SelectItem value="ajuste-processo">Ajuste de Processo</SelectItem>
                            <SelectItem value="falta-material">Falta de Material</SelectItem>
                            <SelectItem value="falta-operador">Falta de Operador</SelectItem>
                            <SelectItem value="problema-qualidade">Problema de Qualidade</SelectItem>
                            <SelectItem value="limpeza">Limpeza</SelectItem>
                            <SelectItem value="setup">Setup</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor={`duration-${entry.id}`} className="text-xs">Duração (min) *</Label>
                        <Input
                          id={`duration-${entry.id}`}
                          type="number"
                          value={entry.duration}
                          onChange={(e) => updateDowntimeEntry(entry.id, 'duration', Number(e.target.value))}
                          placeholder="30"
                          min="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label htmlFor={`description-${entry.id}`} className="text-xs">Descrição</Label>
                        <Input
                          id={`description-${entry.id}`}
                          value={entry.description || ''}
                          onChange={(e) => updateDowntimeEntry(entry.id, 'description', e.target.value)}
                          placeholder="Detalhes..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {formData.downtimeEntries.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Tempo Total Parado:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 font-bold text-lg">
                      {(() => {
                        const totalMinutes = formData.downtimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
                      })()} 
                    </span>
                    <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                      {formData.downtimeEntries.length} parada{formData.downtimeEntries.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview dos Indicadores */}
      {formData.goodProduction > 0 && formData.machineId && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Preview dos Indicadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-green-600">{oeeData.target}%</div>
                <div className="text-muted-foreground">Meta</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{oeeData.availability}%</div>
                <div className="text-muted-foreground">Disponibilidade</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-purple-600">{oeeData.performance}%</div>
                <div className="text-muted-foreground">Performance</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-orange-600">{oeeData.quality}%</div>
                <div className="text-muted-foreground">Qualidade</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-primary text-lg">{oeeData.oee}%</div>
                <div className="text-muted-foreground font-medium">OEE</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações sobre a produção</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Descreva eventos importantes, ajustes realizados, problemas encontrados..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default ProductionFormSimple;
export type { ProductionFormData };