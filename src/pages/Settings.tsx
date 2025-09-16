import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Clock,
  Palette,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Factory,
  Users,
  BarChart3
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para as configurações
  const [systemSettings, setSystemSettings] = useState({
    companyName: 'Indústria OEE Monitor',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    theme: 'system',
    autoRefresh: true,
    refreshInterval: 30
  });
  
  const [alertSettings, setAlertSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    oeeThreshold: 75,
    availabilityThreshold: 85,
    performanceThreshold: 80,
    qualityThreshold: 95,
    maintenanceAlerts: true,
    productionAlerts: true
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 480, // 8 horas em minutos
    passwordExpiry: 90, // dias
    twoFactorAuth: false,
    auditLog: true,
    loginAttempts: 3
  });
  
  const [integrationSettings, setIntegrationSettings] = useState({
    mesIntegration: false,
    erpIntegration: false,
    iotSensors: true,
    apiAccess: true,
    webhooks: false
  });

  const handleSaveSettings = async (section: string) => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: `As configurações de ${section} foram atualizadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            Configurações do Sistema
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as configurações globais do sistema OEE Monitor
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-success border-success/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sistema Online
          </Badge>
        </div>
      </div>

      {/* Configurações em Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        {/* Configurações do Sistema */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Configurações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={systemSettings.companyName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select value={systemSettings.timezone} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (UTC-3)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select value={systemSettings.language} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Interface e Tema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select value={systemSettings.theme} onValueChange={(value) => setSystemSettings(prev => ({ ...prev, theme: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Atualização Automática</Label>
                    <p className="text-sm text-muted-foreground">Atualizar dados automaticamente</p>
                  </div>
                  <Switch
                    checked={systemSettings.autoRefresh}
                    onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, autoRefresh: checked }))}
                  />
                </div>
                
                {systemSettings.autoRefresh && (
                  <div className="space-y-2">
                    <Label htmlFor="refreshInterval">Intervalo de Atualização (segundos)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="300"
                      value={systemSettings.refreshInterval}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings('sistema')} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações de Alertas */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receber alertas por email</p>
                  </div>
                  <Switch
                    checked={alertSettings.emailNotifications}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">Notificações no navegador</p>
                  </div>
                  <Switch
                    checked={alertSettings.pushNotifications}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Manutenção</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre manutenções</p>
                  </div>
                  <Switch
                    checked={alertSettings.maintenanceAlerts}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, maintenanceAlerts: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Produção</Label>
                    <p className="text-sm text-muted-foreground">Notificar sobre produção</p>
                  </div>
                  <Switch
                    checked={alertSettings.productionAlerts}
                    onCheckedChange={(checked) => setAlertSettings(prev => ({ ...prev, productionAlerts: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Limites de Alerta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oeeThreshold">Limite OEE Crítico (%)</Label>
                  <Input
                    id="oeeThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={alertSettings.oeeThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, oeeThreshold: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="availabilityThreshold">Limite Disponibilidade (%)</Label>
                  <Input
                    id="availabilityThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={alertSettings.availabilityThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, availabilityThreshold: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="performanceThreshold">Limite Performance (%)</Label>
                  <Input
                    id="performanceThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={alertSettings.performanceThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, performanceThreshold: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="qualityThreshold">Limite Qualidade (%)</Label>
                  <Input
                    id="qualityThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={alertSettings.qualityThreshold}
                    onChange={(e) => setAlertSettings(prev => ({ ...prev, qualityThreshold: parseInt(e.target.value) }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings('alertas')} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações de Segurança */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Autenticação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="30"
                    max="1440"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Expiração de Senha (dias)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    min="30"
                    max="365"
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordExpiry: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loginAttempts">Tentativas de Login</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    min="3"
                    max="10"
                    value={securitySettings.loginAttempts}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, loginAttempts: parseInt(e.target.value) }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação de Dois Fatores</Label>
                    <p className="text-sm text-muted-foreground">Segurança adicional</p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Log de Auditoria</Label>
                    <p className="text-sm text-muted-foreground">Registrar ações dos usuários</p>
                  </div>
                  <Switch
                    checked={securitySettings.auditLog}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, auditLog: checked }))}
                  />
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Status da Segurança</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Última verificação:</span>
                      <Badge variant="outline" className="text-success border-success/20">
                        Hoje, 14:30
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Tentativas de login falhadas:</span>
                      <Badge variant="outline">
                        0 nas últimas 24h
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings('segurança')} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações de Integração */}
        <TabsContent value="integration" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sistemas Externos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Integração MES</Label>
                    <p className="text-sm text-muted-foreground">Manufacturing Execution System</p>
                  </div>
                  <Switch
                    checked={integrationSettings.mesIntegration}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, mesIntegration: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Integração ERP</Label>
                    <p className="text-sm text-muted-foreground">Enterprise Resource Planning</p>
                  </div>
                  <Switch
                    checked={integrationSettings.erpIntegration}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, erpIntegration: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sensores IoT</Label>
                    <p className="text-sm text-muted-foreground">Internet of Things</p>
                  </div>
                  <Switch
                    checked={integrationSettings.iotSensors}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, iotSensors: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5" />
                  API e Webhooks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Acesso à API</Label>
                    <p className="text-sm text-muted-foreground">Permitir acesso externo à API</p>
                  </div>
                  <Switch
                    checked={integrationSettings.apiAccess}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, apiAccess: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Webhooks</Label>
                    <p className="text-sm text-muted-foreground">Notificações automáticas</p>
                  </div>
                  <Switch
                    checked={integrationSettings.webhooks}
                    onCheckedChange={(checked) => setIntegrationSettings(prev => ({ ...prev, webhooks: checked }))}
                  />
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Status das Integrações</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Sensores conectados:</span>
                      <Badge variant="outline" className="text-success border-success/20">
                        12 ativos
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Última sincronização:</span>
                      <Badge variant="outline">
                        2 min atrás
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings('integrações')} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;