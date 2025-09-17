const axios = require('axios');
const Webhook = require('../models/Webhook');
const AuditLog = require('../models/AuditLog');

class WebhookService {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 5;
    this.processingCount = 0;
  }

  // Disparar webhook para um evento específico
  async trigger(eventType, eventData, options = {}) {
    try {
      // Buscar webhooks ativos para este tipo de evento
      const webhooks = await Webhook.find({
        status: 'active',
        events: eventType
      }).populate('createdBy', 'name email');

      if (webhooks.length === 0) {
        console.log(`Nenhum webhook configurado para o evento: ${eventType}`);
        return;
      }

      // Filtrar webhooks que devem ser disparados
      const triggeredWebhooks = webhooks.filter(webhook => 
        webhook.shouldTrigger(eventType, eventData)
      );

      if (triggeredWebhooks.length === 0) {
        console.log(`Nenhum webhook passou nos filtros para o evento: ${eventType}`);
        return;
      }

      // Preparar payload do webhook
      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData,
        source: 'oee-monitor',
        version: '1.0.0',
        ...options
      };

      // Adicionar webhooks à fila de processamento
      for (const webhook of triggeredWebhooks) {
        this.addToQueue(webhook, payload);
      }

      // Processar fila se não estiver processando
      if (!this.processing) {
        this.processQueue();
      }

      console.log(`${triggeredWebhooks.length} webhooks adicionados à fila para o evento: ${eventType}`);

    } catch (error) {
      console.error('Erro ao disparar webhooks:', error);
    }
  }

  // Adicionar webhook à fila
  addToQueue(webhook, payload) {
    this.queue.push({
      webhook,
      payload,
      attempts: 0,
      createdAt: new Date()
    });
  }

  // Processar fila de webhooks
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.processingCount < this.maxConcurrent) {
      const item = this.queue.shift();
      this.processingCount++;
      
      // Processar webhook de forma assíncrona
      this.processWebhook(item)
        .finally(() => {
          this.processingCount--;
        });
    }

    // Aguardar um pouco antes de verificar novamente
    setTimeout(() => {
      this.processing = false;
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  // Processar um webhook individual
  async processWebhook(item) {
    const { webhook, payload, attempts } = item;
    const maxRetries = webhook.retryPolicy.maxRetries;

    try {
      // Gerar assinatura HMAC
      const signature = webhook.generateSignature(payload);
      
      // Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Source': 'oee-monitor',
        'User-Agent': 'OEE-Monitor-Webhook/1.0.0',
        ...Object.fromEntries(webhook.headers || [])
      };

      // Fazer requisição HTTP
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout,
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Webhook enviado com sucesso
      await webhook.updateStats(true);
      
      // Log de auditoria
      await this.logWebhookEvent(webhook, payload, 'success', {
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown',
        attempts: attempts + 1
      });

      console.log(`Webhook enviado com sucesso: ${webhook.name} -> ${webhook.url}`);

    } catch (error) {
      const isLastAttempt = attempts >= maxRetries;
      
      // Atualizar estatísticas
      if (isLastAttempt) {
        await webhook.updateStats(false, error);
        
        // Marcar webhook como falhou se muitos erros consecutivos
        if (webhook.statistics.totalFailed > 10 && 
            webhook.statistics.totalFailed / webhook.statistics.totalSent > 0.8) {
          webhook.status = 'failed';
          await webhook.save();
        }
      }

      // Log de auditoria
      await this.logWebhookEvent(webhook, payload, isLastAttempt ? 'failed' : 'retry', {
        error: error.message,
        statusCode: error.response?.status,
        attempts: attempts + 1,
        maxRetries: maxRetries + 1
      });

      if (!isLastAttempt) {
        // Reagendar para retry com backoff exponencial
        const delay = webhook.retryPolicy.retryDelay * 
                     Math.pow(webhook.retryPolicy.backoffMultiplier, attempts);
        
        setTimeout(() => {
          this.addToQueue(webhook, payload);
          item.attempts = attempts + 1;
        }, delay);

        console.log(`Webhook falhado, reagendando retry ${attempts + 1}/${maxRetries + 1} em ${delay}ms: ${webhook.name}`);
      } else {
        console.error(`Webhook falhado definitivamente após ${maxRetries + 1} tentativas: ${webhook.name} - ${error.message}`);
      }
    }
  }

  // Log de eventos de webhook
  async logWebhookEvent(webhook, payload, status, details = {}) {
    try {
      await AuditLog.create({
        userId: webhook.createdBy,
        action: `webhook_${status}`,
        resource: 'webhook',
        resourceId: webhook._id,
        details: {
          webhookName: webhook.name,
          webhookUrl: webhook.url,
          event: payload.event,
          ...details
        }
      });
    } catch (error) {
      console.error('Erro ao registrar log de webhook:', error);
    }
  }

  // Testar webhook
  async testWebhook(webhookId, userId) {
    try {
      const webhook = await Webhook.findById(webhookId);
      if (!webhook) {
        throw new Error('Webhook não encontrado');
      }

      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Este é um teste de webhook do sistema OEE Monitor',
          webhookId: webhook._id,
          webhookName: webhook.name
        },
        source: 'oee-monitor',
        version: '1.0.0',
        test: true
      };

      // Processar imediatamente (sem fila)
      await this.processWebhook({
        webhook,
        payload: testPayload,
        attempts: 0
      });

      return {
        success: true,
        message: 'Webhook de teste enviado com sucesso'
      };

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obter estatísticas da fila
  getQueueStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      processingCount: this.processingCount,
      maxConcurrent: this.maxConcurrent
    };
  }

  // Limpar fila (para manutenção)
  clearQueue() {
    this.queue = [];
    console.log('Fila de webhooks limpa');
  }
}

// Instância singleton
const webhookService = new WebhookService();

// Eventos comuns do sistema
const WEBHOOK_EVENTS = {
  MACHINE_STATUS_CHANGED: 'machine.status_changed',
  MACHINE_CREATED: 'machine.created',
  MACHINE_UPDATED: 'machine.updated',
  MACHINE_DELETED: 'machine.deleted',
  PRODUCTION_STARTED: 'production.started',
  PRODUCTION_COMPLETED: 'production.completed',
  PRODUCTION_STOPPED: 'production.stopped',
  PRODUCTION_PAUSED: 'production.paused',
  PRODUCTION_RESUMED: 'production.resumed',
  ALERT_CREATED: 'alert.created',
  ALERT_RESOLVED: 'alert.resolved',
  OEE_THRESHOLD_EXCEEDED: 'oee.threshold_exceeded',
  OEE_THRESHOLD_RECOVERED: 'oee.threshold_recovered',
  MAINTENANCE_SCHEDULED: 'maintenance.scheduled',
  MAINTENANCE_COMPLETED: 'maintenance.completed',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  SYSTEM_BACKUP_COMPLETED: 'system.backup_completed',
  SYSTEM_ERROR: 'system.error'
};

module.exports = {
  webhookService,
  WEBHOOK_EVENTS
};