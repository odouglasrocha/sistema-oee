import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Factory, MapPin, Settings, Zap, Calendar, FileText, RefreshCw } from 'lucide-react';

interface MachineFormData {
  name: string;
  code: string;
  type: 'producao' | 'auxiliar' | 'teste' | 'manutencao';
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: 'ativa' | 'inativa' | 'manutencao' | 'parada';
  capacity: {
    value: number | string;
    unit: 'pcs/h' | 'kg/h' | 'l/h' | 'm/h' | 'ton/h' | 'unidades/min';
  };
  location: {
    sector: string;
    line: string;
    position: string;
  };
  specifications: {
    power: number | string;
    voltage: number | string;
    weight: number | string;
    dimensions: {
      length: number | string;
      width: number | string;
      height: number | string;
      unit: 'mm' | 'cm' | 'm';
    };
  };
  installationDate: string;
  warrantyExpiration: string;
  maintenanceSchedule: {
    frequency: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
    lastMaintenance: string;
    nextMaintenance: string;
  };
  notes: string;
}

interface MachineFormSimpleProps {
  onSubmit: (data: MachineFormData) => void;
  isSubmitting?: boolean;
  showValidationErrors?: boolean;
  initialSerialNumber?: string;
}

const MachineFormSimple: React.FC<MachineFormSimpleProps> = ({ 
  onSubmit, 
  isSubmitting = false, 
  showValidationErrors = false,
  initialSerialNumber 
}) => {
  const [formData, setFormData] = useState<MachineFormData>({
    name: '',
    code: '',
    type: 'producao' as 'producao',
    manufacturer: 'Masipack', // Valor padrão
    model: 'Ultra VS 312', // Valor padrão
    serialNumber: initialSerialNumber || '', // Usa o número gerado pelo componente pai
    status: 'ativa' as 'ativa',
    capacity: {
      value: '',
      unit: 'pcs/h'
    },
    location: {
      sector: '',
      line: '',
      position: ''
    },
    specifications: {
      power: '',
      voltage: '',
      weight: '',
      dimensions: {
        length: '',
        width: '',
        height: '',
        unit: 'mm'
      }
    },
    installationDate: '',
    warrantyExpiration: '',
    maintenanceSchedule: {
      frequency: 'mensal',
      lastMaintenance: '',
      nextMaintenance: ''
    },
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: string) => {
    setFormData(prev => {
      const parentObj = prev[parent as keyof MachineFormData] as Record<string, any>;
      return {
        ...prev,
        [parent]: {
          ...parentObj,
          [field]: value
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form id="machine-form" onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Máquina *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Linha 01 - Extrusão"
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showValidationErrors && !formData.name && (
                <p className="text-xs text-red-500">Campo obrigatório</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="Ex: EXT-001"
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showValidationErrors && !formData.code && (
                <p className="text-xs text-red-500">Campo obrigatório</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Fabricante *</Label>
              <Input
                id="manufacturer"
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                placeholder="Ex: Siemens"
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showValidationErrors && !formData.manufacturer && (
                <p className="text-xs text-red-500">Campo obrigatório</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Modelo *</Label>
              <Input
                id="model"
                type="text"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="Ex: S7-1200"
                disabled={isSubmitting}
                autoComplete="off"
              />
              {showValidationErrors && !formData.model && (
                <p className="text-xs text-red-500">Campo obrigatório</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="parada">Parada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialNumber">Número de Série</Label>
            <Input
              id="serialNumber"
              type="text"
              value={formData.serialNumber}
              onChange={(e) => handleInputChange('serialNumber', e.target.value)}
              placeholder="Ex: SN123456789"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Capacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity-value">Valor *</Label>
              <Input
                id="capacity-value"
                type="number"
                min="0"
                step="0.1"
                value={formData.capacity.value}
                onChange={(e) => handleNestedInputChange('capacity', 'value', e.target.value)}
                placeholder="Ex: 1200"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity-unit">Unidade *</Label>
              <Select value={formData.capacity.unit} onValueChange={(value) => handleNestedInputChange('capacity', 'unit', value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs/h">Peças/hora</SelectItem>
                  <SelectItem value="kg/h">Kg/hora</SelectItem>
                  <SelectItem value="l/h">Litros/hora</SelectItem>
                  <SelectItem value="m/h">Metros/hora</SelectItem>
                  <SelectItem value="ton/h">Toneladas/hora</SelectItem>
                  <SelectItem value="unidades/min">Unidades/minuto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Setor *</Label>
                <Input
                  id="sector"
                  type="text"
                  value={formData.location.sector}
                  onChange={(e) => handleNestedInputChange('location', 'sector', e.target.value)}
                  placeholder="Ex: Pavilhão A"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="line">Linha</Label>
                <Input
                  id="line"
                  type="text"
                  value={formData.location.line}
                  onChange={(e) => handleNestedInputChange('location', 'line', e.target.value)}
                  placeholder="Ex: Linha 01"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Posição</Label>
                <Input
                  id="position"
                  type="text"
                  value={formData.location.position}
                  onChange={(e) => handleNestedInputChange('location', 'position', e.target.value)}
                  placeholder="Ex: A1"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Especificações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="power">Potência (kW)</Label>
              <Input
                id="power"
                type="number"
                min="0"
                step="0.1"
                value={formData.specifications.power}
                onChange={(e) => handleNestedInputChange('specifications', 'power', e.target.value)}
                placeholder="Ex: 15"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voltage">Tensão (V)</Label>
              <Input
                id="voltage"
                type="number"
                min="0"
                value={formData.specifications.voltage}
                onChange={(e) => handleNestedInputChange('specifications', 'voltage', e.target.value)}
                placeholder="Ex: 220"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={formData.specifications.weight}
                onChange={(e) => handleNestedInputChange('specifications', 'weight', e.target.value)}
                placeholder="Ex: 500"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Datas e Manutenção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installationDate">Data de Instalação</Label>
              <Input
                id="installationDate"
                type="date"
                value={formData.installationDate}
                onChange={(e) => handleInputChange('installationDate', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warrantyExpiration">Vencimento da Garantia</Label>
              <Input
                id="warrantyExpiration"
                type="date"
                value={formData.warrantyExpiration}
                onChange={(e) => handleInputChange('warrantyExpiration', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência de Manutenção</Label>
              <Select value={formData.maintenanceSchedule.frequency} onValueChange={(value) => handleNestedInputChange('maintenanceSchedule', 'frequency', value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastMaintenance">Última Manutenção</Label>
              <Input
                id="lastMaintenance"
                type="date"
                value={formData.maintenanceSchedule.lastMaintenance}
                onChange={(e) => handleNestedInputChange('maintenanceSchedule', 'lastMaintenance', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nextMaintenance">Próxima Manutenção</Label>
              <Input
                id="nextMaintenance"
                type="date"
                value={formData.maintenanceSchedule.nextMaintenance}
                onChange={(e) => handleNestedInputChange('maintenanceSchedule', 'nextMaintenance', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Observações sobre a máquina..."
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default MachineFormSimple;
export type { MachineFormData };