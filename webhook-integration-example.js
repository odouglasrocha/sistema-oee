/**
 * Exemplo de Integração com Webhooks do Sistema OEE
 * 
 * Este exemplo demonstra como receber e processar webhooks
 * do sistema OEE em uma aplicação Node.js/Express
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'seu_webhook_secret_aqui';
const OEE_API_KEY = process.env.OEE_API_KEY || 'sua_api_key_aqui';
const OEE_API_BASE = 'https://planing-ita.com/api/external';

// Middleware para parsing JSON
app.use(express.json());

// Cliente da API OEE
class OEEApiClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await axios({
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro na API OEE:', error.response?.data || error.message);
      throw error;
    }
  }

  async getMachine(machineId) {
    return this.request(`/machines/${machineId}`);
  }

  async getOEEData(startDate, endDate, machineId) {
    const params = new URLSearchParams({ startDate, endDate });
    if (machineId) params.append('machineId', machineId);
    return this.request(`/analytics/oee?${params}`);
  }
}

const oeeClient = new OEEApiClient(OEE_API_KEY, OEE_API_BASE);

// Função para verificar assinatura do webhook
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// Endpoint principal para receber webhooks
app.post('/webhook/oee', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const payload = req.body;
    
    // Verificar assinatura
    if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('Assinatura de webhook inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
    
    console.log(`📡 Webhook recebido: ${payload.event}`);
    console.log(`⏰ Timestamp: ${payload.timestamp}`);
    
    // Responder rapidamente
    res.status(200).json({ status: 'received' });
    
    // Processar evento de forma assíncrona
    processWebhookEvent(payload);
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Processador principal de eventos
async function processWebhookEvent(payload) {
  const { event, data, timestamp } = payload;
  
  try {
    switch (event) {
      case 'machine.status_changed':
        await handleMachineStatusChange(data);
        break;
        
      case 'production.completed':
        await handleProductionCompleted(data);
        break;
        
      case 'production.started':
        await handleProductionStarted(data);
        break;
        
      case 'oee.threshold_exceeded':
        await handleOEEThresholdExceeded(data);
        break;
        
      case 'alert.created':
        await handleAlertCreated(data);
        break;
        
      case 'maintenance.scheduled':
        await handleMaintenanceScheduled(data);
        break;
        
      default:
        console.log(`⚠️  Evento não tratado: ${event}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar evento ${event}:`, error);
  }
}

// Handlers específicos para cada tipo de evento

async function handleMachineStatusChange(data) {
  const { machineId, machine, previousStatus, currentStatus, reason } = data;
  
  console.log(`🏭 Máquina ${machine.name} mudou de ${previousStatus} para ${currentStatus}`);
  
  // Exemplo: Notificar equipe se máquina parou
  if (currentStatus === 'stopped' || currentStatus === 'error') {
    await notifyTeam({
      type: 'machine_stopped',
      machine: machine.name,
      status: currentStatus,
      reason: reason || 'Não especificado',
      timestamp: new Date().toISOString()
    });
  }
  
  // Exemplo: Registrar em sistema externo
  await logToExternalSystem('machine_status_change', {
    machineId,
    machineName: machine.name,
    previousStatus,
    currentStatus,
    reason
  });
}

async function handleProductionCompleted(data) {
  const { machineId, machine, productName, quantityProduced, targetQuantity, efficiency } = data;
  
  console.log(`✅ Produção concluída na ${machine.name}: ${quantityProduced}/${targetQuantity} unidades`);
  
  // Calcular eficiência
  const efficiencyPercent = (quantityProduced / targetQuantity) * 100;
  
  // Exemplo: Atualizar dashboard externo
  await updateExternalDashboard({
    machineId,
    machineName: machine.name,
    productName,
    quantityProduced,
    targetQuantity,
    efficiency: efficiencyPercent
  });
  
  // Exemplo: Gerar relatório se eficiência baixa
  if (efficiencyPercent < 80) {
    await generateLowEfficiencyReport({
      machine: machine.name,
      product: productName,
      efficiency: efficiencyPercent,
      shortfall: targetQuantity - quantityProduced
    });
  }
}

async function handleProductionStarted(data) {
  const { machineId, machine, productName, targetQuantity, estimatedDuration } = data;
  
  console.log(`🚀 Produção iniciada na ${machine.name}: ${productName} (${targetQuantity} unidades)`);
  
  // Exemplo: Agendar verificação de progresso
  setTimeout(async () => {
    await checkProductionProgress(machineId);
  }, estimatedDuration * 0.5); // Verificar na metade do tempo estimado
}

async function handleOEEThresholdExceeded(data) {
  const { machineId, machine, currentOEE, threshold, period } = data;
  
  console.log(`⚠️  OEE da ${machine.name} abaixo do limite: ${currentOEE}% (limite: ${threshold}%)`);
  
  // Buscar dados detalhados de OEE
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const oeeData = await oeeClient.getOEEData(startDate, endDate, machineId);
    
    // Exemplo: Enviar alerta para supervisores
    await sendOEEAlert({
      machine: machine.name,
      currentOEE,
      threshold,
      period,
      detailedData: oeeData.data
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados de OEE:', error);
  }
}

async function handleAlertCreated(data) {
  const { alertId, type, severity, message, machineId, machine } = data;
  
  console.log(`🚨 Novo alerta (${severity}): ${message}`);
  
  // Exemplo: Escalar alertas críticos
  if (severity === 'critical') {
    await escalateCriticalAlert({
      alertId,
      type,
      message,
      machine: machine.name,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleMaintenanceScheduled(data) {
  const { machineId, machine, maintenanceType, scheduledDate, estimatedDuration } = data;
  
  console.log(`🔧 Manutenção agendada para ${machine.name}: ${maintenanceType} em ${scheduledDate}`);
  
  // Exemplo: Atualizar calendário de manutenção
  await updateMaintenanceCalendar({
    machineId,
    machineName: machine.name,
    type: maintenanceType,
    date: scheduledDate,
    duration: estimatedDuration
  });
}

// Funções auxiliares (implementar conforme necessário)

async function notifyTeam(notification) {
  // Exemplo: Enviar para Slack, Teams, email, etc.
  console.log('📧 Notificando equipe:', notification);
  
  // Implementar integração com sistema de notificação
  // await slackClient.sendMessage(notification);
  // await emailService.sendAlert(notification);
}

async function logToExternalSystem(eventType, data) {
  // Exemplo: Registrar em sistema de logs externo
  console.log('📝 Registrando em sistema externo:', { eventType, data });
  
  // Implementar integração com sistema de logs
  // await logSystem.record(eventType, data);
}

async function updateExternalDashboard(data) {
  // Exemplo: Atualizar dashboard em tempo real
  console.log('📊 Atualizando dashboard:', data);
  
  // Implementar integração com dashboard
  // await dashboardAPI.updateProduction(data);
}

async function generateLowEfficiencyReport(data) {
  // Exemplo: Gerar relatório de baixa eficiência
  console.log('📋 Gerando relatório de baixa eficiência:', data);
  
  // Implementar geração de relatório
  // await reportGenerator.createEfficiencyReport(data);
}

async function checkProductionProgress(machineId) {
  try {
    const machine = await oeeClient.getMachine(machineId);
    console.log(`🔍 Verificando progresso da ${machine.data.name}`);
    
    // Implementar lógica de verificação de progresso
    // Se necessário, enviar alertas ou ajustar parâmetros
    
  } catch (error) {
    console.error('Erro ao verificar progresso:', error);
  }
}

async function sendOEEAlert(data) {
  // Exemplo: Enviar alerta de OEE baixo
  console.log('⚠️  Enviando alerta de OEE:', data);
  
  // Implementar envio de alerta
  // await alertSystem.sendOEEAlert(data);
}

async function escalateCriticalAlert(data) {
  // Exemplo: Escalar alerta crítico
  console.log('🚨 Escalando alerta crítico:', data);
  
  // Implementar escalação
  // await escalationSystem.escalate(data);
}

async function updateMaintenanceCalendar(data) {
  // Exemplo: Atualizar calendário de manutenção
  console.log('📅 Atualizando calendário de manutenção:', data);
  
  // Implementar atualização do calendário
  // await calendarAPI.scheduleMaintenace(data);
}

// Endpoint de teste
app.get('/test', async (req, res) => {
  try {
    // Testar conexão com API OEE
    const response = await oeeClient.request('/status');
    res.json({
      status: 'ok',
      oeeApiStatus: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de webhooks rodando na porta ${PORT}`);
  console.log(`📡 Endpoint de webhook: http://localhost:${PORT}/webhook/oee`);
  console.log(`🔍 Teste: http://localhost:${PORT}/test`);
  console.log(`❤️  Saúde: http://localhost:${PORT}/health`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;