import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Shield,
  User,
  Settings,
  Key,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Loader2,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/config/api';

// Tipos para usuários
interface Role {
  id: string;
  name: 'operador' | 'supervisor' | 'administrador';
  displayName: string;
  permissions: string[];
  level: number;
}

// Tipos para respostas da API
interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

interface UsersApiResponse {
  users: ApiUser[];
  pagination: PaginationInfo;
}

interface RolesApiResponse {
  roles: Role[];
  userLevel?: number;
}

interface ApiUser {
  id: string;
  _id?: string; // MongoDB ObjectId como string
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  phone?: string;
  department?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  passwordNeedsChange?: boolean;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  department?: string;
  location?: string;
  notes?: string;
}



interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}



// Departamentos disponíveis
const DEPARTMENTS = [
  { value: 'producao', label: 'Produção' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'engenharia', label: 'Engenharia' },
  { value: 'administracao', label: 'Administração' },
  { value: 'ti', label: 'TI' }
];



const Users: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 20
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: '',
    status: 'active',
    phone: '',
    department: '',
    location: '',
    notes: ''
  });
  const [editUser, setEditUser] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: '',
    status: 'active',
    phone: '',
    department: '',
    location: '',
    notes: ''
  });


  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Validação de email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Validação de senha
  const isValidPassword = (password: string): boolean => {
    return password.length >= 6 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password);
  };

  // Validação de telefone
  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Campo opcional
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  // Carregar usuários
  const loadUsers = async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });
      
      const response = await apiRequest(`/users?${params}`);
      
      // A API retorna: { users: [...], pagination: {...} }
      if (response && response.users && Array.isArray(response.users)) {
        setUsers(response.users);
        setPagination(response.pagination || {
          currentPage: page,
          totalPages: Math.ceil((response.users.length || 0) / 20),
          totalUsers: response.users.length,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 20
        });
        
        console.log(`✅ ${response.users.length} usuários carregados com sucesso`);
      } else {
        console.warn('⚠️ Resposta da API não contém usuários:', response);
        setUsers([]);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalUsers: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 20
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar usuários: ${error.message}`,
        variant: "destructive"
      });
      setUsers([]);
    } finally {
      setIsLoading(false);

    }
  };

  // Carregar perfis disponíveis
  const loadRoles = async () => {
    try {
      const response = await apiRequest('/protected/roles') as unknown as RolesApiResponse;
      if (response && response.roles) {
        setRoles(response.roles);
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os perfis",
        variant: "destructive"
      });
    }
  };



  // Efeito para carregar dados iniciais
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  // Efeito para recarregar usuários quando filtros mudam
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers(1);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, roleFilter, statusFilter]);

  const getRoleInfo = (role: Role) => {
    switch (role.name) {
      case 'administrador':
        return { 
          label: role.displayName, 
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: Shield
        };
      case 'supervisor':
        return { 
          label: role.displayName, 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Settings
        };
      case 'operador':
        return { 
          label: role.displayName, 
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: User
        };
      default:
        return { 
          label: role.displayName, 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: User
        };
    }
  };

  const getStatusInfo = (status: ApiUser['status']) => {
    switch (status) {
      case 'active':
        return { label: 'Ativo', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'inactive':
        return { label: 'Inativo', color: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 'suspended':
        return { label: 'Suspenso', color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getRoleCounts = () => {
    return {
      administrador: users.filter(u => u.role.name === 'administrador').length,
      supervisor: users.filter(u => u.role.name === 'supervisor').length,
      operador: users.filter(u => u.role.name === 'operador').length,
      total: pagination.totalUsers,
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      suspended: users.filter(u => u.status === 'suspended').length
    };
  };

  // Criar usuário
  const handleAddUser = async () => {
    // Validações básicas
    if (!newUser.name?.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!newUser.email?.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!isValidEmail(newUser.email)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return;
    }

    if (!newUser.password?.trim()) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (!isValidPassword(newUser.password)) {
      toast({
        title: "Erro",
        description: "Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número",
        variant: "destructive"
      });
      return;
    }

    if (!newUser.role) {
      toast({
        title: "Erro",
        description: "Perfil é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (newUser.phone && !isValidPhone(newUser.phone)) {
      toast({
        title: "Erro",
        description: "Telefone inválido",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Preparar dados para envio
      const userData = {
        name: newUser.name.trim(),
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password,
        role: newUser.role,
        status: newUser.status || 'active',
        ...(newUser.phone && { phone: newUser.phone.trim() }),
        ...(newUser.department && { department: newUser.department }),
        ...(newUser.location && { location: newUser.location.trim() })
      };
      
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso"
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      loadUsers(pagination.currentPage);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar usuário",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editar usuário
  const handleEditUser = (user: ApiUser) => {
    console.log('🔍 handleEditUser - Usuário recebido:', user);
    console.log('🔍 handleEditUser - ID do usuário:', user.id || user._id);
    
    if (!user.id && !user._id) {
      console.error('❌ Usuário sem ID válido:', user);
      toast({
        title: "Erro",
        description: "Usuário inválido - ID não encontrado",
        variant: "destructive"
      });
      return;
    }
    
    setEditingUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      role: user.role.id,
      status: user.status,
      phone: user.phone || '',
      department: user.department || '',
      location: user.location || ''
    });
  };

  // Atualizar usuário
  const handleUpdateUser = async () => {
    console.log('🔍 handleUpdateUser - editingUser:', editingUser);
    
    if (!editingUser) {
      toast({
        title: "Erro",
        description: "Usuário não selecionado para edição",
        variant: "destructive"
      });
      return;
    }
    
    const userId = editingUser.id || editingUser._id;
    console.log('🔍 handleUpdateUser - ID do usuário:', userId);
    
    if (!userId) {
      console.error('❌ ID de usuário inválido:', editingUser);
      toast({
        title: "Erro",
        description: "ID de usuário inválido",
        variant: "destructive"
      });
      return;
    }

    // Validações básicas
    if (!editUser.name?.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!editUser.email?.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!isValidEmail(editUser.email)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return;
    }

    if (!editUser.role) {
      toast({
        title: "Erro",
        description: "Perfil é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (editUser.phone && !isValidPhone(editUser.phone)) {
      toast({
        title: "Erro",
        description: "Telefone inválido",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Preparar dados para envio (sem senha)
      const updateData = {
        name: editUser.name.trim(),
        email: editUser.email.toLowerCase().trim(),
        role: editUser.role,
        status: editUser.status,
        ...(editUser.phone && { phone: editUser.phone.trim() }),
        ...(editUser.department && { department: editUser.department }),
        ...(editUser.location && { location: editUser.location.trim() })
      };
      
      console.log('🌐 Fazendo requisição PUT para:', `/users/${userId}`);
      await apiRequest(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso"
      });
      
      setEditingUser(null);
      resetEditForm();
      loadUsers(pagination.currentPage);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar usuário",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deletar usuário
  const handleDeleteUser = async (id: string) => {
    try {
      await apiRequest(`/users/${id}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Sucesso",
        description: "Usuário removido com sucesso"
      });
      
      loadUsers(pagination.currentPage);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover usuário",
        variant: "destructive"
      });
    }
  };

  // Alterar status do usuário
  const toggleUserStatus = async (user: ApiUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    try {
      await apiRequest(`/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      toast({
        title: "Status alterado",
        description: `Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso`
      });
      
      loadUsers(pagination.currentPage);
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao alterar status",
        variant: "destructive"
      });
    }
  };

  // Funções para manipular inputs - Novo usuário (igual ao MachineFormSimple)
  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof UserFormData, value: string) => {
    setNewUser(prev => ({ ...prev, [field]: value }));
  };

  // Funções para manipular inputs - Editar usuário
  const handleEditInputChange = (field: keyof UserFormData, value: string) => {
    setEditUser(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSelectChange = (field: keyof UserFormData, value: string) => {
    setEditUser(prev => ({ ...prev, [field]: value }));
  };

  // Resetar formulário - otimizado com useCallback
  const resetForm = useCallback(() => {
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: '',
      status: 'active',
      phone: '',
      department: '',
      location: '',
      notes: ''
    });
  }, []);

  // Resetar formulário de edição
  const resetEditForm = useCallback(() => {
    setEditUser({
      name: '',
      email: '',
      password: '',
      role: '',
      status: 'active',
      phone: '',
      department: '',
      location: '',
      notes: ''
    });
  }, []);

  // Resetar senha do usuário
  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await apiRequest(`/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      });
      
      toast({
        title: "Sucesso",
        description: "Senha resetada com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao resetar senha",
        variant: "destructive"
      });
    }
  };

  // Formulário com refs para evitar re-renders durante digitação
  const UserForm = ({ isEdit = false }: { isEdit?: boolean }) => {
    const userData = isEdit ? editUser : newUser;
    const setUserData = isEdit ? setEditUser : setNewUser;
    
    // Refs para controlar os valores sem causar re-render
    const nameRef = React.useRef<HTMLInputElement>(null);
    const emailRef = React.useRef<HTMLInputElement>(null);
    const passwordRef = React.useRef<HTMLInputElement>(null);
    const phoneRef = React.useRef<HTMLInputElement>(null);
    const locationRef = React.useRef<HTMLInputElement>(null);
    
    // Atualizar refs quando userData mudar
    React.useEffect(() => {
      if (nameRef.current) nameRef.current.value = userData.name || '';
      if (emailRef.current) emailRef.current.value = userData.email || '';
      if (passwordRef.current) passwordRef.current.value = userData.password || '';
      if (phoneRef.current) phoneRef.current.value = userData.phone || '';
      if (locationRef.current) locationRef.current.value = userData.location || '';
    }, [userData]);
    
    // Função para atualizar estado apenas quando necessário
    const updateField = (field: keyof UserFormData, value: string) => {
      setUserData(prev => ({ ...prev, [field]: value }));
    };
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  type="text"
                  defaultValue={userData.name}
                  onBlur={(e) => updateField('name', e.target.value)}
                  placeholder="Ex: João Silva"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  defaultValue={userData.email}
                  onBlur={(e) => updateField('email', e.target.value)}
                  placeholder="joao@empresa.com"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  ref={passwordRef}
                  id="password"
                  type="password"
                  defaultValue={userData.password || ''}
                  onBlur={(e) => updateField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <Select 
                  value={userData.role} 
                  onValueChange={(value) => setUserData(prev => ({ ...prev, role: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={userData.status} 
                  onValueChange={(value) => setUserData(prev => ({ ...prev, status: value as 'active' | 'inactive' | 'suspended' }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
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
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  ref={phoneRef}
                  id="phone"
                  type="text"
                  defaultValue={userData.phone || ''}
                  onBlur={(e) => updateField('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select 
                  value={userData.department || ''} 
                  onValueChange={(value) => setUserData(prev => ({ ...prev, department: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                ref={locationRef}
                id="location"
                type="text"
                defaultValue={userData.location || ''}
                onBlur={(e) => updateField('location', e.target.value)}
                placeholder="Ex: São Paulo - SP"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const roleCounts = getRoleCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-primary" />
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de acesso e permissões do sistema
          </p>
        </div>
        
        {currentUser?.role.permissions.includes('users.create') && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema OEE Monitor
                </DialogDescription>
              </DialogHeader>
              <UserForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={handleAddUser} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
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

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{roleCounts.administrador}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{roleCounts.supervisor}</p>
                <p className="text-xs text-muted-foreground">Supervisores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{roleCounts.operador}</p>
                <p className="text-xs text-muted-foreground">Operadores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-success-foreground rounded-full" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roleCounts.active}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-muted-foreground rounded-full" />
              </div>
              <div>
                <p className="text-2xl font-bold">{roleCounts.inactive + roleCounts.suspended}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Perfis</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="suspended">Suspensos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {users.length > 0 ? (
          users.map((user) => {
            const roleInfo = getRoleInfo(user.role);
            const statusInfo = getStatusInfo(user.status);
            const RoleIcon = roleInfo.icon;
            
            return (
              <Card key={user.id || user._id} className="hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          <Badge className={`${roleInfo.color} border`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                          <Badge className={`${statusInfo.color} border`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                          {user.department && (
                            <div className="flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              {DEPARTMENTS.find(d => d.value === user.department)?.label || user.department}
                            </div>
                          )}
                          {user.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                          {user.lastLogin && (
                            <div className="flex items-center gap-1">
                              <Key className="h-3 w-3" />
                              Último login: {new Date(user.lastLogin).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {currentUser?.role.permissions.includes('users.edit') && (
                        <>
                          <div className="flex items-center gap-2 mr-4">
                            <Label htmlFor={`status-${user.id}`} className="text-sm">
                              {user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Label>
                            <Switch
                              id={`status-${user.id}`}
                              checked={user.status === 'active'}
                              onCheckedChange={() => toggleUserStatus(user)}
                              disabled={user.id === currentUser?.id}
                            />
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        </>
                      )}
                      
                      {currentUser?.role.permissions.includes('users.delete') && user.id !== currentUser?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Ajuste os filtros para ver mais usuários'
                  : 'Cadastre o primeiro usuário para começar'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {users.length} de {pagination.totalUsers} usuários
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage || isLoading}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadUsers(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || isLoading}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => { setEditingUser(null); resetEditForm(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <UserForm isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingUser(null); resetEditForm(); }} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={isSubmitting}>
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
    </div>
  );
};

export default Users;