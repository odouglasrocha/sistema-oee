import React, { useState, useEffect } from 'react';
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
import { settingsService, SystemSettings } from '@/services/settingsService';
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
  BarChart3,
  MessageCircle,
  Mail,
  Smartphone,
  Users as TeamsIcon,
  Send,
  TestTube,
  Eye,
  EyeOff
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Estados para as configurações (derivados dos dados do backend)
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
  
  // Estados para configurações de notificação
  const [notificationSettings, setNotificationSettings] = useState({
    whatsapp: {
      enabled: false,
      apiKey: '',
      phoneNumber: '',
      webhookUrl: ''
    },
    email: {
      enabled: false,
      provider: 'smtp',
      smtp: {
        host: '',
        port: 587,
        user: '',
        password: ''
      },
      from: {
        email: '',
        name: 'OEE Monitor'
      }
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      twilio: {
        accountSid: '',
        authToken: '',
        fromNumber: ''
      },
      authorizedNumbers: []
    },
    teams: {
      enabled: false,
      webhookUrl: '',
      channelId: ''
    },
    telegram: {
      enabled: false,
      botToken: '',
      chatId: ''
    }
  });
  
  const [testResults, setTestResults] = useState({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // Carregar configurações do backend
  const loadSettings = async () => {
    try {
      setIsLoadingData(true);
      const data = await settingsService.getSettings();
      setSettings(data);
      
      // Atualizar estados locais com dados do backend
      setSystemSettings({
        companyName: data.companyName,
        timezone: data.timezone,
        language: data.language,
        theme: data.theme,
        autoRefresh: data.autoRefresh,
        refreshInterval: data.refreshInterval
      });
      
      setAlertSettings(data.alertSettings);
      setSecuritySettings(data.securitySettings);
      
      // Carregar configurações de notificação se existirem
      if (data.notificationSettings) {
        setNotificationSettings(data.notificationSettings);
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações do sistema.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };
  
  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadSettings();
  }, []);

  // Função para validar token do Telegram
  const validateTelegramToken = async (botToken) => {
    if (!botToken) return;
    
    try {
      const response = await fetch('/api/notifications/validate/telegram-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('oee-token')}`
        },
        body: JSON.stringify({ botToken })
      });
      
      const result = await response.json();
      
      if (result.success && result.data.valid) {
        toast({
          title: "Token válido",
          description: `Bot: @${result.data.botInfo.username}`,
        });
        return true;
      } else {
        toast({
          title: "Token inválido",
          description: result.data.error || 'Token do bot não é válido',
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Erro na validação",
        description: `Erro ao validar token: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Função para validar chat do Telegram
  const validateTelegramChat = async (botToken, chatId) => {
    if (!botToken || !chatId) return;
    
    try {
      const response = await fetch('/api/notifications/validate/telegram-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('oee-token')}`
        },
        body: JSON.stringify({ botToken, chatId })
      });
      
      const result = await response.json();
      
      if (result.success && result.data.valid) {
        toast({
          title: "Chat acessível",
          description: `Chat: ${result.data.chatInfo.title}`,
        });
        return true;
      } else {
        toast({
          title: "Chat inacessível",
          description: result.data.error || 'Bot não tem acesso ao chat',
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Erro na validação",
        description: `Erro ao validar chat: ${error.message}`,
        variant: "destructive",
      });
      return false;
    }
  };

  // Função para testar conexão de um canal
  const testConnection = async (channel, testData = {}) => {
    setIsTestingConnection(true);
    setTestResults(prev => ({ ...prev, [channel]: { status: 'testing', message: 'Testando conexão...' } }));
    
    try {
      // Validação específica para Telegram
      if (channel === 'telegram') {
        const { botToken, chatId } = notificationSettings.telegram;
        
        if (!botToken || !chatId) {
          throw new Error('Bot Token e Chat ID são obrigatórios');
        }
        
        // Validar token primeiro
        const tokenValid = await validateTelegramToken(botToken);
        if (!tokenValid) {
          throw new Error('Token do bot inválido');
        }
        
        // Validar acesso ao chat
        const chatValid = await validateTelegramChat(botToken, chatId);
        if (!chatValid) {
          throw new Error('Bot não tem acesso ao chat');
        }
      }
      
      const response = await fetch(`/api/notifications/test/${channel}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('oee-token')}`
        },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestResults(prev => ({ ...prev, [channel]: { status: 'success', message: 'Conexão testada com sucesso!' } }));
        toast({
          title: "Teste bem-sucedido",
          description: `Conexão com ${channel} testada com sucesso!`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, [channel]: { status: 'error', message: error.message } }));
      toast({
        title: "Erro no teste",
        description: `Falha ao testar ${channel}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Função para salvar configurações de notificação
  const saveNotificationSettings = async () => {
    setIsLoading(true);
    try {
      // Validar configurações do Telegram se estiver habilitado
      if (notificationSettings.telegram.enabled) {
        const { botToken, chatId } = notificationSettings.telegram;
        
        if (!botToken || !chatId) {
          throw new Error('Bot Token e Chat ID são obrigatórios quando Telegram está habilitado');
        }
        
        // Validar token
        const tokenValid = await validateTelegramToken(botToken);
        if (!tokenValid) {
          throw new Error('Token do bot Telegram é inválido');
        }
        
        // Validar acesso ao chat
        const chatValid = await validateTelegramChat(botToken, chatId);
        if (!chatValid) {
          throw new Error('Bot não tem acesso ao chat especificado');
        }
      }
      
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('oee-token')}`
        },
        body: JSON.stringify(notificationSettings)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Configurações salvas",
          description: "Configurações de notificação salvas com sucesso!",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: `Erro ao salvar configurações: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para alternar visibilidade de senhas
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveSettings = async (section: string) => {
    setIsLoading(true);
    try {
      let updatedSettings: SystemSettings;
      
      switch (section) {
        case 'sistema':
          updatedSettings = await settingsService.updateSystemSettings(systemSettings);
          break;
        case 'alertas':
          updatedSettings = await settingsService.updateAlertSettings(alertSettings);
          break;
        case 'segurança':
          updatedSettings = await settingsService.updateSecuritySettings(securitySettings);
          break;
        case 'integrações':
          updatedSettings = await settingsService.updateIntegrationSettings(integrationSettings);
          break;
        default:
          throw new Error('Seção inválida');
      }
      
      setSettings(updatedSettings);
      
      toast({
        title: "Configurações salvas",
        description: `As configurações de ${section} foram atualizadas com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para resetar configurações
  const handleResetSettings = async () => {
    setIsLoading(true);
    try {
      const defaultSettings = await settingsService.resetSettings();
      setSettings(defaultSettings);
      
      // Atualizar estados locais
      setSystemSettings({
        companyName: defaultSettings.companyName,
        timezone: defaultSettings.timezone,
        language: defaultSettings.language,
        theme: defaultSettings.theme,
        autoRefresh: defaultSettings.autoRefresh,
        refreshInterval: defaultSettings.refreshInterval
      });
      
      setAlertSettings(defaultSettings.alertSettings);
      setSecuritySettings(defaultSettings.securitySettings);
      setIntegrationSettings(defaultSettings.integrationSettings);
      
      toast({
        title: "Configurações resetadas",
        description: "As configurações foram resetadas para os valores padrão.",
      });
    } catch (error: any) {
      console.error('Erro ao resetar configurações:', error);
      toast({
        title: "Erro ao resetar",
        description: error.message || "Ocorreu um erro ao resetar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mostrar loading enquanto carrega dados
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

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
          {settings?.updatedAt && (
            <Badge variant="outline">
              <Clock className="w-3 h-3 mr-1" />
              Atualizado: {new Date(settings.updatedAt).toLocaleString('pt-BR')}
            </Badge>
          )}
        </div>
      </div>

      {/* Configurações em Tabs */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
          <TabsTrigger value="system" className="flex items-center gap-1 text-xs">
            <SettingsIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 text-xs">
            <Bell className="w-3 h-3" />
            <span className="hidden sm:inline">Produção</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 text-xs">
            <Shield className="w-3 h-3" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1 text-xs">
            <MessageCircle className="w-3 h-3" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-1 text-xs">
            <Mail className="w-3 h-3" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-1 text-xs">
            <Smartphone className="w-3 h-3" />
            <span className="hidden sm:inline">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1 text-xs">
            <TeamsIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Teams</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-1 text-xs">
            <Send className="w-3 h-3" />
            <span className="hidden sm:inline">Telegram</span>
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
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleResetSettings} 
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Resetar Padrão
            </Button>
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
                        {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleDateString('pt-BR') : 'Nunca'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>2FA Ativo:</span>
                      <Badge variant={securitySettings.twoFactorAuth ? "default" : "outline"}>
                        {securitySettings.twoFactorAuth ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Auditoria:</span>
                      <Badge variant={securitySettings.auditLog ? "default" : "outline"}>
                        {securitySettings.auditLog ? 'Ativa' : 'Inativa'}
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

        {/* Configurações WhatsApp */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Configurações WhatsApp
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure integração com WhatsApp Business API
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificações via WhatsApp</p>
                </div>
                <Switch
                  checked={notificationSettings.whatsapp.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, enabled: checked }
                  }))}
                />
              </div>
              
              {notificationSettings.whatsapp.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-apikey">API Key</Label>
                    <Input
                      id="whatsapp-apikey"
                      value={notificationSettings.whatsapp.apiKey}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, apiKey: e.target.value }
                      }))}
                      placeholder="Digite sua API key do WhatsApp"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-phone">Número de Telefone</Label>
                    <Input
                      id="whatsapp-phone"
                      value={notificationSettings.whatsapp.phoneNumber}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, phoneNumber: e.target.value }
                      }))}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-webhook">Webhook URL</Label>
                    <Input
                      id="whatsapp-webhook"
                      value={notificationSettings.whatsapp.webhookUrl}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, webhookUrl: e.target.value }
                      }))}
                      placeholder="https://seu-dominio.com/webhook/whatsapp"
                    />
                    <p className="text-sm text-muted-foreground">
                      URL para receber webhooks do WhatsApp
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => testConnection('whatsapp', { phoneNumber: notificationSettings.whatsapp.phoneNumber })}
                      disabled={isTestingConnection}
                      variant="outline"
                    >
                      {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                    
                    {testResults.whatsapp && (
                      <Badge variant={testResults.whatsapp.status === 'success' ? 'default' : testResults.whatsapp.status === 'error' ? 'destructive' : 'secondary'}>
                        {testResults.whatsapp.message}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações Email */}
        <TabsContent value="email" className="space-y-6">
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Configurações de Email
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure provedor de email para notificações
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar Email</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificações por email</p>
                </div>
                <Switch
                  checked={notificationSettings.email.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, enabled: checked }
                  }))}
                />
              </div>
              
              {notificationSettings.email.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email-provider">Provedor de Email</Label>
                    <Select 
                      value={notificationSettings.email.provider} 
                      onValueChange={(value) => setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, provider: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smtp">SMTP</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                        <SelectItem value="gmail">Gmail API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="smtp-host">Servidor SMTP</Label>
                       <Input
                         id="smtp-host"
                         value={notificationSettings.email.smtp.host}
                         onChange={(e) => setNotificationSettings(prev => ({
                           ...prev,
                           email: { ...prev.email, smtp: { ...prev.email.smtp, host: e.target.value } }
                         }))}
                         placeholder="smtp.gmail.com"
                       />
                     </div>
                     
                     <div className="space-y-2">
                       <Label htmlFor="smtp-port">Porta</Label>
                       <Input
                         id="smtp-port"
                         value={notificationSettings.email.smtp.port}
                         onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, smtp: { ...prev.email.smtp, port: e.target.value } }
                          }))}
                         placeholder="587"
                       />
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="smtp-user">Usuário</Label>
                     <Input
                       id="smtp-user"
                       value={notificationSettings.email.smtp.user}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         email: { ...prev.email, smtp: { ...prev.email.smtp, user: e.target.value } }
                       }))}
                       placeholder="usuario@empresa.com"
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="smtp-password">Senha</Label>
                     <Input
                       id="smtp-password"
                       type="password"
                       value={notificationSettings.email.smtp.password}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         email: { ...prev.email, smtp: { ...prev.email.smtp, password: e.target.value } }
                       }))}
                       placeholder="Digite a senha"
                     />
                   </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-from">Email Remetente</Label>
                      <Input
                        id="email-from"
                        value={notificationSettings.email.from.email}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, from: { ...prev.email.from, email: e.target.value } }
                        }))}
                        placeholder="noreply@empresa.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email-name">Nome Remetente</Label>
                      <Input
                        id="email-name"
                        value={notificationSettings.email.from.name}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, from: { ...prev.email.from, name: e.target.value } }
                        }))}
                        placeholder="OEE Monitor"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => testConnection('email', { email: notificationSettings.email.from.email })}
                      disabled={isTestingConnection}
                      variant="outline"
                    >
                      {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                    
                    {testResults.email && (
                      <Badge variant={testResults.email.status === 'success' ? 'default' : testResults.email.status === 'error' ? 'destructive' : 'secondary'}>
                        {testResults.email.message}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações SMS */}
        <TabsContent value="sms" className="space-y-6">
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Configurações SMS
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure provedor de SMS para notificações críticas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar SMS</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificações por SMS</p>
                </div>
                <Switch
                  checked={notificationSettings.sms.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    sms: { ...prev.sms, enabled: checked }
                  }))}
                />
              </div>
              
              {notificationSettings.sms.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">Provedor SMS</Label>
                    <Select 
                      value={notificationSettings.sms.provider} 
                      onValueChange={(value) => setNotificationSettings(prev => ({
                        ...prev,
                        sms: { ...prev.sms, provider: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="infobip">Infobip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                     <Label htmlFor="twilio-sid">API Key</Label>
                     <Input
                       id="twilio-sid"
                       value={notificationSettings.sms.twilio.accountSid}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         sms: { ...prev.sms, twilio: { ...prev.sms.twilio, accountSid: e.target.value } }
                       }))}
                       placeholder="Digite sua API Key"
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="twilio-token">API Secret</Label>
                     <Input
                       id="twilio-token"
                       type="password"
                       value={notificationSettings.sms.twilio.authToken}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         sms: { ...prev.sms, twilio: { ...prev.sms.twilio, authToken: e.target.value } }
                       }))}
                       placeholder="Digite seu API Secret"
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="twilio-from">Número Remetente</Label>
                     <Input
                       id="twilio-from"
                       value={notificationSettings.sms.twilio.fromNumber}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         sms: { ...prev.sms, twilio: { ...prev.sms.twilio, fromNumber: e.target.value } }
                       }))}
                       placeholder="+55 11 99999-9999"
                     />
                     <p className="text-sm text-muted-foreground">
                       Número configurado no provedor SMS
                     </p>
                   </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => testConnection('sms', { phoneNumber: '+5511999999999' })}
                      disabled={isTestingConnection}
                      variant="outline"
                    >
                      {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                    
                    {testResults.sms && (
                      <Badge variant={testResults.sms.status === 'success' ? 'default' : testResults.sms.status === 'error' ? 'destructive' : 'secondary'}>
                        {testResults.sms.message}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações Teams */}
        <TabsContent value="teams" className="space-y-6">
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TeamsIcon className="w-5 h-5" />
                Configurações Microsoft Teams
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure integração com Microsoft Teams
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar Teams</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificações no Microsoft Teams</p>
                </div>
                <Switch
                  checked={notificationSettings.teams.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    teams: { ...prev.teams, enabled: checked }
                  }))}
                />
              </div>
              
              {notificationSettings.teams.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="teams-webhook">Webhook URL</Label>
                    <Input
                      id="teams-webhook"
                      value={notificationSettings.teams.webhookUrl}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        teams: { ...prev.teams, webhookUrl: e.target.value }
                      }))}
                      placeholder="https://outlook.office.com/webhook/..."
                    />
                    <p className="text-sm text-muted-foreground">
                      URL do webhook do canal do Teams
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teams-channel">ID do Canal (Opcional)</Label>
                    <Input
                      id="teams-channel"
                      value={notificationSettings.teams.channelId}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        teams: { ...prev.teams, channelId: e.target.value }
                      }))}
                      placeholder="19:xxxxxxxx@thread.tacv2"
                    />
                    <p className="text-sm text-muted-foreground">
                      ID específico do canal para notificações
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                     <h4 className="font-medium mb-2">⚠️ Como configurar</h4>
                     <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                       <li>Acesse o canal do Teams desejado</li>
                       <li>Clique em &quot;...&quot; &gt; &quot;Conectores&quot; &gt; &quot;Webhook de Entrada&quot;</li>
                       <li>Configure o webhook e copie a URL gerada</li>
                     </ol>
                   </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => testConnection('teams')}
                      disabled={isTestingConnection}
                      variant="outline"
                    >
                      {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                    
                    {testResults.teams && (
                      <Badge variant={testResults.teams.status === 'success' ? 'default' : testResults.teams.status === 'error' ? 'destructive' : 'secondary'}>
                        {testResults.teams.message}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
              {isLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Configurações Telegram */}
        <TabsContent value="telegram" className="space-y-6">
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Configurações Telegram
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure bot do Telegram para notificações
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativar Telegram</Label>
                  <p className="text-sm text-muted-foreground">Habilitar notificações via Telegram</p>
                </div>
                <Switch
                  checked={notificationSettings.telegram.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    telegram: { ...prev.telegram, enabled: checked }
                  }))}
                />
              </div>
              
              {notificationSettings.telegram.enabled && (
                <>
                  <div className="space-y-2">
                      <Label htmlFor="telegram-token">Bot Token</Label>
                      <Input
                        id="telegram-token"
                        value={notificationSettings.telegram.botToken}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          telegram: { ...prev.telegram, botToken: e.target.value }
                        }))}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value.length > 10) {
                            validateTelegramToken(e.target.value);
                          }
                        }}
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      />
                      <p className="text-sm text-muted-foreground">
                        Token do bot obtido do @BotFather
                      </p>
                    </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="telegram-chat">Chat ID</Label>
                     <Input
                       id="telegram-chat"
                       value={notificationSettings.telegram.chatId}
                       onChange={(e) => setNotificationSettings(prev => ({
                         ...prev,
                         telegram: { ...prev.telegram, chatId: e.target.value }
                       }))}
                       onBlur={(e) => {
                         if (e.target.value && notificationSettings.telegram.botToken) {
                           validateTelegramChat(notificationSettings.telegram.botToken, e.target.value);
                         }
                       }}
                       placeholder="-100123456789"
                     />
                     <p className="text-sm text-muted-foreground">
                       ID do chat ou grupo para receber notificações
                     </p>
                   </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">⚠️ Como configurar</h4>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Crie um bot usando @BotFather no Telegram</li>
                      <li>Adicione o bot ao grupo desejado</li>
                      <li>Use @userinfobot para obter o Chat ID</li>
                    </ol>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => testConnection('telegram', { chatId: notificationSettings.telegram.chatId })}
                      disabled={isTestingConnection}
                      variant="outline"
                    >
                      {isTestingConnection ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      Testar Conexão
                    </Button>
                    
                    {testResults.telegram && (
                      <Badge variant={testResults.telegram.status === 'success' ? 'default' : testResults.telegram.status === 'error' ? 'destructive' : 'secondary'}>
                        {testResults.telegram.message}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={saveNotificationSettings} disabled={isLoading}>
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