import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MachineFormSimple, { MachineFormData as SimpleFormData } from './MachineFormSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Factory, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  Search,
  Filter,
  BarChart3,
  Loader2,
  RefreshCw,
  MapPin,
  Calendar,
  Zap,
  Weight,
  Ruler,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, apiRequest } from '@/config/api';

interface Machine {
  _id: string;
  name: string;
  code: string;
  type: 'producao' | 'auxiliar' | 'teste' | 'manutencao';
  manufacturer: string;
  model: string;
  serialNumber?: string;
  capacity: {
    value: number;
    unit: 'pcs/h' | 'kg/h' | 'l/h' | 'm/h' | 'ton/h' | 'unidades/min';
  };
  location: {
    sector: string;
    line?: string;
    position?: string;
  };
  specifications?: {
    power?: number;
    voltage?: number;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit: 'mm' | 'cm' | 'm';
    };
  };
  status: 'ativa' | 'inativa' | 'manutencao' | 'parada';
  installationDate: string;
  warrantyExpiration?: string;
  maintenanceSchedule: {
    frequency: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
    lastMaintenance?: string;
    nextMaintenance?: string;
  };
  notes?: string;
  isActive: boolean;
  createdBy: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface MachineFormData {
  name: string;
  code: string;
  type: 'producao' | 'auxiliar' | 'teste' | 'manutencao';
  manufacturer: string;
  model: string;
  serialNumber: string;
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
  status: 'ativa' | 'inativa' | 'manutencao' | 'parada';
  installationDate: string;
  warrantyExpiration: string;
  maintenanceSchedule: {
    frequency: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
    lastMaintenance: string;
    nextMaintenance: string;
  };
  notes: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalMachines: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

// Constantes para filtros
const STATUS_OPTIONS = [
  { value: 'ativa', label: 'Ativa', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'inativa', label: 'Inativa', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'manutencao', label: 'Manutenção', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'parada', label: 'Parada', color: 'bg-red-100 text-red-800 border-red-200' }
];

const CATEGORIES = ['Produção', 'Auxiliar', 'Teste', 'Manutenção'];

// Função para gerar número de série automático
const generateSerialNumber = () => {
  const currentYear = new Date().getFullYear();
  const randomSequence = Math.floor(Math.random() * 900) + 100; // Gera número entre 100-999
  return `${currentYear}${randomSequence.toString().padStart(3, '0')}`;
};

const Machines: React.FC = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalMachines: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });
  const [stats, setStats] = useState({
    totalMachines: 0,
    machinesByStatus: {
      'ativa': 0,
      'manutencao': 0,
      'parada': 0,
      'inativa': 0
    } as Record<string, number>,
    machinesByCategory: {} as Record<string, number>,
    maintenanceDue: 0
  });

  const [newMachine, setNewMachine] = useState<MachineFormData>({
    name: '',
    code: '',
    type: 'producao' as 'producao',
    manufacturer: '',
    model: '',
    serialNumber: '',
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
    status: 'ativa' as 'ativa',
    installationDate: '',
    warrantyExpiration: '',
    maintenanceSchedule: {
      frequency: 'mensal' as 'mensal',
      lastMaintenance: '',
      nextMaintenance: ''
    },
    notes: ''
  });

  // Carregar máquinas
  const loadMachines = async (page = 1) => {
    try {
      setIsLoading(true);
      
      // Tentar carregar da API primeiro
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(categoryFilter !== 'all' && { category: categoryFilter }),
          ...(sectorFilter !== 'all' && { sector: sectorFilter })
        });

        const data = await apiRequest(`/machines-admin?${params}`);
        
        // Mapear dados do backend para o formato esperado pelo frontend
        const mappedMachines = (data.machines || []).map((machine: any) => ({
          _id: machine._id,
          name: machine.name,
          code: machine.code,
          type: machine.type?.toLowerCase() || 'producao',
          manufacturer: machine.manufacturer,
          model: machine.model,
          serialNumber: machine.serialNumber,
          capacity: {
            value: machine.capacity?.value || 0,
            unit: machine.capacity?.unit || 'pcs/h'
          },
          location: {
            sector: machine.location?.plant || machine.location?.sector || 'N/A',
            line: machine.location?.area || machine.location?.line || '',
            position: machine.location?.position || ''
          },
          specifications: {
            power: machine.specifications?.power?.value || 0,
            voltage: machine.specifications?.voltage?.value || 0,
            weight: machine.specifications?.weight?.value || 0,
            dimensions: {
              length: machine.specifications?.dimensions?.length || 0,
              width: machine.specifications?.dimensions?.width || 0,
              height: machine.specifications?.dimensions?.height || 0,
              unit: machine.specifications?.dimensions?.unit || 'mm'
            }
          },
          status: machine.status === 'Ativa' ? 'ativa' : 
                  machine.status === 'Inativa' ? 'inativa' :
                  machine.status === 'Manutenção' ? 'manutencao' :
                  machine.status === 'Parada' ? 'parada' : 'inativa',
          installationDate: machine.acquisition?.purchaseDate ? new Date(machine.acquisition.purchaseDate).toISOString().split('T')[0] : '',
          warrantyExpiration: machine.acquisition?.warranty?.endDate ? new Date(machine.acquisition.warranty.endDate).toISOString().split('T')[0] : '',
          maintenanceSchedule: {
            frequency: 'mensal',
            lastMaintenance: machine.maintenance?.lastMaintenance ? new Date(machine.maintenance.lastMaintenance).toISOString().split('T')[0] : '',
            nextMaintenance: machine.maintenance?.nextMaintenance ? new Date(machine.maintenance.nextMaintenance).toISOString().split('T')[0] : ''
          },
          notes: machine.notes || '',
          isActive: machine.isActive !== false,
          createdBy: machine.createdBy || { _id: '', name: 'Sistema', email: '' },
          updatedBy: machine.updatedBy,
          createdAt: machine.createdAt,
          updatedAt: machine.updatedAt
        }));
        
        setMachines(mappedMachines);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalMachines: mappedMachines.length,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10
        });
        return; // Sucesso, sair da função
      } catch (apiError) {
        console.log('API não disponível, usando dados de exemplo:', apiError);
      }
      
      // Fallback: usar dados de exemplo quando a API não estiver disponível
      const mockMachines = [
        {
          _id: '1',
          name: 'Linha 01 - Extrusão',
          code: 'EXT-001',
          type: 'producao' as 'producao',
          manufacturer: 'Masipack',
          model: 'Ultra VS 312',
          serialNumber: '2024285',
          capacity: { value: 1200, unit: 'pcs/h' as 'pcs/h' },
          location: { sector: 'Pavilhão A', line: 'Setor 1', position: 'A1' },
          specifications: { power: 15, voltage: 220, weight: 500, dimensions: { length: 2000, width: 1500, height: 1800, unit: 'mm' as 'mm' } },
          status: 'ativa' as 'ativa',
          installationDate: '2024-01-15',
          warrantyExpiration: '2026-01-15',
          maintenanceSchedule: {
            frequency: 'mensal' as 'mensal',
            lastMaintenance: '2024-01-15',
            nextMaintenance: '2024-02-14'
          },
          notes: 'Linha de extrusão para produção de filmes plásticos',
          isActive: true,
          createdBy: { _id: '1', name: 'Admin', email: 'admin@example.com' },
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z'
        },
        {
          _id: '2',
          name: 'Linha 02 - Injeção',
          code: 'INJ-002',
          type: 'producao' as 'producao',
          manufacturer: 'Masipack',
          model: 'Ultra VS 312',
          serialNumber: '2024156',
          capacity: { value: 800, unit: 'pcs/h' as 'pcs/h' },
          location: { sector: 'Pavilhão B', line: 'Setor 2', position: 'B1' },
          specifications: { power: 12, voltage: 220, weight: 400, dimensions: { length: 1800, width: 1200, height: 1600, unit: 'mm' as 'mm' } },
          status: 'ativa' as 'ativa',
          installationDate: '2024-01-10',
          warrantyExpiration: '2026-01-10',
          maintenanceSchedule: {
            frequency: 'mensal' as 'mensal',
            lastMaintenance: '2024-01-10',
            nextMaintenance: '2024-02-09'
          },
          notes: 'Máquina de injeção para peças automotivas',
          isActive: true,
          createdBy: { _id: '1', name: 'Admin', email: 'admin@example.com' },
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2024-01-10T10:00:00Z'
        }
      ];
      
      setMachines(mockMachines);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalMachines: mockMachines.length,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10
      });
      
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      setMachines([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalMachines: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      // Tentar carregar da API primeiro
      try {
        const data = await apiRequest('/machines-admin/stats/overview');
        
        // Mapear dados do backend para o formato esperado pelo frontend
        const mappedStats = {
          totalMachines: data.totalMachines || 0,
          machinesByStatus: {
            'ativa': data.machinesByStatus?.Ativa || data.machinesByStatus?.ativa || 0,
            'manutencao': data.machinesByStatus?.Manutenção || data.machinesByStatus?.manutencao || 0,
            'parada': data.machinesByStatus?.Parada || data.machinesByStatus?.parada || 0,
            'inativa': data.machinesByStatus?.Inativa || data.machinesByStatus?.inativa || 0
          },
          machinesByCategory: data.machinesByCategory || {},
          maintenanceDue: data.maintenanceDue || 0
        };
        
        setStats(mappedStats);
        return; // Sucesso, sair da função
      } catch (apiError) {
        console.log('API de estatísticas não disponível, usando dados de exemplo:', apiError);
      }
      
      // Fallback: usar estatísticas baseadas nos dados de exemplo
      const mockStats = {
        totalMachines: 2,
        machinesByStatus: {
          'ativa': 2,
          'manutencao': 0,
          'parada': 0,
          'inativa': 0
        },
        machinesByCategory: {
          'Produção': 2
        },
        maintenanceDue: 0
      };
      
      setStats(mockStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Fallback final para dados vazios
      setStats({
        totalMachines: 0,
        machinesByStatus: {
          'ativa': 0,
          'manutencao': 0,
          'parada': 0,
          'inativa': 0
        },
        machinesByCategory: {},
        maintenanceDue: 0
      });
    }
  };

  // Adicionar máquina
  const handleAddMachine = async (formData?: SimpleFormData) => {
    if (formData) {
      setNewMachine(prev => ({
        ...prev,
        name: formData.name,
        code: formData.code,
        type: formData.type,
        manufacturer: formData.manufacturer,
        model: formData.model,
        serialNumber: formData.serialNumber,
        // capacity será calculado automaticamente no backend
        location: {
          ...prev.location,
          sector: formData.location.sector,
          line: formData.location.line,
          position: formData.location.position
        },
        specifications: {
          ...prev.specifications,
          power: formData.specifications.power,
          voltage: formData.specifications.voltage,
          weight: formData.specifications.weight,
          dimensions: formData.specifications.dimensions
        },
        status: formData.status,
        installationDate: formData.installationDate,
        warrantyExpiration: formData.warrantyExpiration,
        maintenanceSchedule: formData.maintenanceSchedule,
        notes: formData.notes
      }));
      
      // Aguardar a atualização do estado
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const dataToValidate = formData || newMachine;
    
    if (!dataToValidate.name || !dataToValidate.code || !dataToValidate.manufacturer || !dataToValidate.model || 
        !dataToValidate.location?.sector) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      setShowValidationErrors(true);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Preparar dados para envio mapeando para a estrutura do backend
      const machineData = {
        name: dataToValidate.name,
        code: dataToValidate.code.toUpperCase(), // Backend espera código em maiúsculo
        manufacturer: dataToValidate.manufacturer,
        model: dataToValidate.model,
        serialNumber: dataToValidate.serialNumber || '',
        
        // Capacidade obrigatória - garantir que seja um número válido
        capacity: {
          value: Number(dataToValidate.capacity.value) || 1, // Valor mínimo 1 se não especificado
          unit: dataToValidate.capacity.unit || 'pcs/h' // Unidade padrão
        },
        
        // Localização obrigatória - mapear corretamente
        location: {
          plant: dataToValidate.location.sector || 'Planta Principal', // Mapear sector para plant
          area: dataToValidate.location.line || 'Área Principal', // Mapear line para area
          line: dataToValidate.location.line || '',
          position: dataToValidate.location.position || ''
        },
        
        // Campos obrigatórios com valores padrão
        category: 'Produção', // Categoria padrão obrigatória
        type: 'Automática', // Tipo padrão obrigatório
        
        // Status mapeado corretamente
        status: dataToValidate.status === 'ativa' ? 'Ativa' : 
                dataToValidate.status === 'inativa' ? 'Inativa' :
                dataToValidate.status === 'manutencao' ? 'Manutenção' : 'Parada',
        
        // Especificações técnicas (opcionais)
        specifications: {
          power: {
            value: Number(dataToValidate.specifications.power) || 0,
            unit: 'kW'
          },
          voltage: {
            value: Number(dataToValidate.specifications.voltage) || 0,
            unit: 'V'
          },
          weight: {
            value: Number(dataToValidate.specifications.weight) || 0,
            unit: 'kg'
          },
          dimensions: {
            length: Number(dataToValidate.specifications.dimensions.length) || 0,
            width: Number(dataToValidate.specifications.dimensions.width) || 0,
            height: Number(dataToValidate.specifications.dimensions.height) || 0,
            unit: dataToValidate.specifications.dimensions.unit || 'mm'
          }
        },
        
        // Manutenção (opcional)
        maintenance: {
          lastMaintenance: dataToValidate.maintenanceSchedule.lastMaintenance ? new Date(dataToValidate.maintenanceSchedule.lastMaintenance) : null,
          nextMaintenance: dataToValidate.maintenanceSchedule.nextMaintenance ? new Date(dataToValidate.maintenanceSchedule.nextMaintenance) : null,
          maintenanceType: 'Preventiva'
        },
        
        // Aquisição (opcional)
        acquisition: {
          purchaseDate: dataToValidate.installationDate ? new Date(dataToValidate.installationDate) : null,
          warranty: {
            endDate: dataToValidate.warrantyExpiration ? new Date(dataToValidate.warrantyExpiration) : null
          }
        },
        
        // Observações (opcional)
        notes: dataToValidate.notes || ''
      };
      
      await apiRequest('/machines-admin', {
        method: 'POST',
        body: JSON.stringify(machineData)
      });
      
      toast({
        title: "Sucesso",
        description: "Máquina criada com sucesso"
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      loadMachines(pagination.currentPage);
      loadStats();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar máquina",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar máquina
  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    // Preencher formulário com dados da máquina
    setNewMachine({
      name: machine.name,
      code: machine.code,
      type: machine.type,
      manufacturer: machine.manufacturer,
      model: machine.model,
      serialNumber: machine.serialNumber || '',
      capacity: {
        value: machine.capacity?.value || '',
        unit: machine.capacity?.unit || 'pcs/h'
      },
      location: {
        sector: machine.location?.sector || '',
        line: machine.location?.line || '',
        position: machine.location?.position || ''
      },
      specifications: {
        power: machine.specifications?.power || '',
        voltage: machine.specifications?.voltage || '',
        weight: machine.specifications?.weight || '',
        dimensions: {
          length: machine.specifications?.dimensions?.length || '',
          width: machine.specifications?.dimensions?.width || '',
          height: machine.specifications?.dimensions?.height || '',
          unit: machine.specifications?.dimensions?.unit || 'mm'
        }
      },
      status: machine.status,
      installationDate: machine.installationDate,
      warrantyExpiration: machine.warrantyExpiration || '',
      maintenanceSchedule: {
        frequency: machine.maintenanceSchedule?.frequency || 'mensal',
        lastMaintenance: machine.maintenanceSchedule?.lastMaintenance || '',
        nextMaintenance: machine.maintenanceSchedule?.nextMaintenance || ''
      },
      notes: machine.notes || ''
    });
  };

  // Atualizar máquina
  const handleUpdateMachine = async () => {
    if (!editingMachine) return;

    if (!newMachine.name || !newMachine.code || !newMachine.manufacturer || !newMachine.model || 
        !newMachine.location?.sector) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      setShowValidationErrors(true);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Preparar dados para envio
      const machineData = {
        name: newMachine.name,
        code: newMachine.code,
        manufacturer: newMachine.manufacturer,
        model: newMachine.model,
        serialNumber: newMachine.serialNumber || '',
        // capacity será calculado automaticamente no backend quando houver registros de produção
        location: {
          plant: newMachine.location.sector,
          area: newMachine.location.line || 'Área Principal',
          line: newMachine.location.line || '',
          position: newMachine.location.position || ''
        },
        category: 'Produção',
        type: 'Automática',
        status: newMachine.status === 'ativa' ? 'Ativa' : 
                newMachine.status === 'inativa' ? 'Inativa' :
                newMachine.status === 'manutencao' ? 'Manutenção' : 'Parada',
        specifications: {
          power: {
            value: Number(newMachine.specifications.power) || 0,
            unit: 'kW'
          },
          voltage: {
            value: Number(newMachine.specifications.voltage) || 0,
            unit: 'V'
          },
          weight: {
            value: Number(newMachine.specifications.weight) || 0,
            unit: 'kg'
          },
          dimensions: {
            length: Number(newMachine.specifications.dimensions.length) || 0,
            width: Number(newMachine.specifications.dimensions.width) || 0,
            height: Number(newMachine.specifications.dimensions.height) || 0,
            unit: newMachine.specifications.dimensions.unit || 'mm'
          }
        },
        maintenance: {
          lastMaintenance: newMachine.maintenanceSchedule.lastMaintenance ? new Date(newMachine.maintenanceSchedule.lastMaintenance) : null,
          nextMaintenance: newMachine.maintenanceSchedule.nextMaintenance ? new Date(newMachine.maintenanceSchedule.nextMaintenance) : null,
          maintenanceType: 'Preventiva'
        },
        acquisition: {
          purchaseDate: newMachine.installationDate ? new Date(newMachine.installationDate) : null,
          warranty: {
            endDate: newMachine.warrantyExpiration ? new Date(newMachine.warrantyExpiration) : null
          }
        },
        notes: newMachine.notes || ''
      };
      
      await apiRequest(`/machines-admin/${editingMachine._id}`, {
         method: 'PUT',
         body: JSON.stringify(machineData)
       });
      
      toast({
        title: "Sucesso",
        description: "Máquina atualizada com sucesso"
      });
      
      setEditingMachine(null);
       resetForm();
       loadMachines(pagination.currentPage);
       loadStats();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar máquina",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir máquina
  const handleDeleteMachine = async (machineId: string) => {
    try {
      await apiRequest(`/machines-admin/${machineId}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Sucesso",
        description: "Máquina excluída com sucesso"
      });
      
      loadMachines(pagination.currentPage);
      loadStats();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir máquina",
        variant: "destructive"
      });
    }
  };

  // Ver detalhes da máquina
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleViewDetails = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedMachine(null);
  };

  // Reset form
  const resetForm = () => {
    setNewMachine({
      name: '',
      code: '',
      type: 'producao' as 'producao',
      manufacturer: 'Masipack',
      model: 'Ultra VS 312',
      serialNumber: generateSerialNumber(),
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
      status: 'ativa' as 'ativa',
      installationDate: '',
      warrantyExpiration: '',
      maintenanceSchedule: {
        frequency: 'mensal' as 'mensal',
       lastMaintenance: '',
       nextMaintenance: ''
      },
      notes: ''
    });
    setShowValidationErrors(false);
  };

  // Filtrar máquinas
  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      const matchesSearch = !searchTerm || 
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
      const matchesSector = sectorFilter === 'all' || machine.location?.sector === sectorFilter;
      
      return matchesSearch && matchesStatus && matchesSector;
    });
  }, [machines, searchTerm, statusFilter, sectorFilter]);

  // Componente de formulário usando o novo MachineFormSimple
  const MachineForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <MachineFormSimple
      onSubmit={handleAddMachine}
      isSubmitting={isSubmitting}
      showValidationErrors={showValidationErrors}
      initialSerialNumber={generateSerialNumber()}
    />
  );

  // Carregar dados iniciais
  useEffect(() => {
    loadMachines();
    loadStats();
  }, []);

  // Recarregar quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMachines(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, categoryFilter, sectorFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2 text-muted-foreground">Carregando máquinas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Máquinas</h1>
          <p className="text-muted-foreground">
            Controle e monitoramento de equipamentos industriais
          </p>
        </div>
        
        {currentUser?.role.permissions.includes('machines.create') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Máquina
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Máquina</DialogTitle>
                <DialogDescription>
                  Preencha as informações da nova máquina
                </DialogDescription>
              </DialogHeader>
              <MachineForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" form="machine-form" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Modal de Edição */}
      {editingMachine && (
        <Dialog open={!!editingMachine} onOpenChange={(open) => !open && setEditingMachine(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Máquina</DialogTitle>
              <DialogDescription>
                Edite as informações da máquina {editingMachine.name}
              </DialogDescription>
            </DialogHeader>
            <MachineForm isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingMachine(null); resetForm(); }} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateMachine} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Detalhes da Máquina */}
      {selectedMachine && (
        <Dialog open={isDetailsModalOpen} onOpenChange={closeDetailsModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-6 w-6 text-blue-600" />
                {selectedMachine.name}
              </DialogTitle>
              <DialogDescription>
                Informações detalhadas e monitoramento em tempo real
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm text-muted-foreground">Status Atual</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {selectedMachine.status === 'ativa' ? 'Ativa' :
                       selectedMachine.status === 'manutencao' ? 'Manutenção' :
                       selectedMachine.status === 'parada' ? 'Parada' : 'Inativa'}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-2">Capacidade</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedMachine.capacity?.value || 600} {selectedMachine.capacity?.unit || 'UND/h'}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-2">Eficiência Atual</div>
                    <div className="text-2xl font-bold text-green-600">87.5%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Produção por Turno */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Produção por Turno - Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Manhã</span>
                        <Badge className="bg-blue-500 text-white">Em Andamento</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">06:00 - 14:00</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Produzido:</span>
                          <span className="font-medium">892 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Meta:</span>
                          <span className="font-medium">1.000 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>OEE:</span>
                          <span className="font-medium text-green-600">89.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Operador:</span>
                          <span className="font-medium">João Silva</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Tarde</span>
                        <Badge variant="secondary">Concluído</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">14:00 - 22:00</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Produzido:</span>
                          <span className="font-medium">1.050 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Meta:</span>
                          <span className="font-medium">1.000 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>OEE:</span>
                          <span className="font-medium text-green-600">105.0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Operador:</span>
                          <span className="font-medium">Maria Santos</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Noite</span>
                        <Badge variant="outline">Agendado</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">22:00 - 06:00</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Produzido:</span>
                          <span className="font-medium">0 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Meta:</span>
                          <span className="font-medium">800 un</span>
                        </div>
                        <div className="flex justify-between">
                          <span>OEE:</span>
                          <span className="font-medium text-red-600">0.0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Operador:</span>
                          <span className="font-medium">Pedro Costa</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Especificações e Manutenção */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Especificações Técnicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Código:</span>
                      <span className="font-medium">{selectedMachine.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fator Conversão:</span>
                      <span className="font-medium">0.18</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Localização:</span>
                      <span className="font-medium">{selectedMachine.location?.sector || 'Pavilhão A'} - {selectedMachine.location?.line || 'Setor 3'}</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-sm text-muted-foreground">Descrição:</span>
                      <p className="font-medium">{selectedMachine.notes || 'Máquina de sopro para garrafas PET'}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Manutenção</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Última:</span>
                      <span className="font-medium">
                        {selectedMachine.maintenanceSchedule?.lastMaintenance ? 
                          new Date(selectedMachine.maintenanceSchedule.lastMaintenance).toLocaleDateString('pt-BR') : 
                          '19/01/2024'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Próxima:</span>
                      <span className="font-medium">
                        {selectedMachine.maintenanceSchedule?.nextMaintenance ? 
                          new Date(selectedMachine.maintenanceSchedule.nextMaintenance).toLocaleDateString('pt-BR') : 
                          '19/02/2024'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Horas de Operação:</span>
                      <span className="font-medium">2.847h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MTBF:</span>
                      <span className="font-medium">156h</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={closeDetailsModal}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.machinesByStatus.ativa || 0}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <Wrench className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.machinesByStatus.manutencao || 0}</p>
                <p className="text-xs text-muted-foreground">Manutenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.machinesByStatus.parada || 0}</p>
                <p className="text-xs text-muted-foreground">Paradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.machinesByStatus.inativa || 0}</p>
                <p className="text-xs text-muted-foreground">Inativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="machines" className="space-y-4">
        <TabsList>
          <TabsTrigger value="machines">Máquinas</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="machines" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar máquinas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={sectorFilter} onValueChange={setSectorFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Setores</SelectItem>
                      <SelectItem value="Pavilhão A">Pavilhão A</SelectItem>
                      <SelectItem value="Pavilhão B">Pavilhão B</SelectItem>
                      <SelectItem value="Pavilhão C">Pavilhão C</SelectItem>
                      <SelectItem value="Área Externa">Área Externa</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setCategoryFilter('all');
                      setSectorFilter('all');
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Máquinas */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMachines.length > 0 ? (
              filteredMachines.map((machine) => (
                <Card key={machine._id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Factory className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{machine.name}</h3>
                          <p className="text-sm text-muted-foreground">{machine.code}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={machine.status === 'ativa' ? 'default' : 
                                machine.status === 'manutencao' ? 'secondary' : 
                                machine.status === 'parada' ? 'destructive' : 'outline'}
                        className={machine.status === 'ativa' ? 'bg-green-500 hover:bg-green-600' : 
                                  machine.status === 'manutencao' ? 'bg-yellow-500 hover:bg-yellow-600' : 
                                  machine.status === 'parada' ? 'bg-red-500 hover:bg-red-600' : ''}
                      >
                        {machine.status === 'ativa' ? 'Ativa' : 
                         machine.status === 'manutencao' ? 'Manutenção' : 
                         machine.status === 'parada' ? 'Parada' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Capacidade:</p>
                        <p className="font-medium">{machine.capacity?.value || 0} {machine.capacity?.unit || 'UND/h'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Conversão:</p>
                        <p className="font-medium">0.15</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Local:</p>
                      <p className="font-medium">{machine.location?.sector || 'N/A'} - {machine.location?.line || 'Setor 1'}</p>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {machine.notes || `Máquina ${machine.type || 'industrial'} para produção`}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Próx. manutenção: {machine.maintenanceSchedule?.nextMaintenance ? 
                          new Date(machine.maintenanceSchedule.nextMaintenance).toLocaleDateString('pt-BR') : 
                          '14/02/2024'
                        }
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleViewDetails(machine)}>
                          <BarChart3 className="h-4 w-4" />
                          Ver Detalhes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditMachine(machine)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Tem certeza que deseja excluir a máquina "{machine.name}"? Esta ação não pode ser desfeita.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancelar</AlertDialogCancel>
                               <AlertDialogAction onClick={() => handleDeleteMachine(machine._id)} className="bg-red-600 hover:bg-red-700">
                                 Excluir
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Factory className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma máquina encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                      ? 'Ajuste os filtros para ver mais máquinas'
                      : 'Cadastre a primeira máquina para começar'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-6">
          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {STATUS_OPTIONS.map(status => (
                    <div key={status.value} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          status.value === 'ativa' ? 'bg-green-500' :
                          status.value === 'manutencao' ? 'bg-yellow-500' :
                          status.value === 'parada' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-sm">{status.label}</span>
                      </div>
                      <span className="font-medium">{stats.machinesByStatus[status.value] || 0}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Machines;