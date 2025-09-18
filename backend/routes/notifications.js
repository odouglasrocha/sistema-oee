const express = require('express');
const router = express.Router();
const NotificationSettings = require('../models/NotificationSettings');
const notificationService = require('../services/notificationService');
const { CredentialEncryption, SENSITIVE_FIELDS } = require('../utils/encryption');
const { authenticateToken } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

// Middleware para log de auditoria
const logAudit = async (req, action, details = {}) => {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      action,
      resource: 'notification_settings',
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
};

// GET /api/notifications/settings - Obter configurações de notificação
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    let settings = await NotificationSettings.getActiveSettings();
    
    if (!settings) {
      // Criar configurações padrão se não existirem
      settings = await NotificationSettings.createDefault(req.user.id);
    }

    // Remover campos sensíveis da resposta
    const safeSettings = settings.toJSON();
    
    res.json({
      success: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de notificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/notifications/settings - Atualizar configurações de notificação
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const updateData = req.body;
    
    // Validar dados de entrada
    const validationErrors = validateNotificationSettings(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: validationErrors
      });
    }

    // Criptografar campos sensíveis
    const encryptedData = CredentialEncryption.encryptCredentials(updateData, SENSITIVE_FIELDS);
    
    let settings = await NotificationSettings.getActiveSettings();
    
    if (!settings) {
      // Criar nova configuração
      settings = new NotificationSettings({
        ...encryptedData,
        createdBy: req.user.id
      });
    } else {
      // Atualizar configuração existente
      Object.assign(settings, encryptedData);
      settings.updatedBy = req.user.id;
    }

    await settings.save();
    
    // Recarregar configurações no serviço
    await notificationService.loadSettings();
    
    // Log de auditoria
    await logAudit(req, 'notification_settings_updated', {
      channels: {
        whatsapp: updateData.whatsapp?.enabled || false,
        email: updateData.email?.enabled || false,
        sms: updateData.sms?.enabled || false,
        teams: updateData.teams?.enabled || false,
        telegram: updateData.telegram?.enabled || false
      }
    });

    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: settings.toJSON()
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de notificação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/test/:channel - Testar canal de notificação
router.post('/test/:channel', authenticateToken, async (req, res) => {
  try {
    const { channel } = req.params;
    const testData = req.body;
    
    const supportedChannels = ['whatsapp', 'email', 'sms', 'teams', 'telegram'];
    if (!supportedChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: `Canal '${channel}' não suportado. Canais disponíveis: ${supportedChannels.join(', ')}`
      });
    }

    // Validar dados específicos do canal
    const channelValidation = validateChannelTestData(channel, testData);
    if (!channelValidation.valid) {
      return res.status(400).json({
        success: false,
        message: channelValidation.message
      });
    }

    const result = await notificationService.testChannel(channel, testData);
    
    // Log de auditoria
    await logAudit(req, 'notification_test_sent', {
      channel,
      testData: {
        ...testData,
        // Mascarar dados sensíveis no log
        phoneNumber: testData.phoneNumber ? CredentialEncryption.maskCredential(testData.phoneNumber, 3) : undefined,
        email: testData.email ? CredentialEncryption.maskCredential(testData.email, 3) : undefined
      }
    });

    res.json({
      success: true,
      message: `Teste enviado com sucesso via ${channel}`,
      data: result
    });
  } catch (error) {
    console.error(`Erro ao testar canal ${req.params.channel}:`, error);
    res.status(500).json({
      success: false,
      message: `Erro ao testar ${req.params.channel}: ${error.message}`
    });
  }
});

// GET /api/notifications/status - Obter status de todos os canais
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = notificationService.getChannelsStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Erro ao obter status dos canais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/send-alert - Enviar alerta manual
router.post('/send-alert', authenticateToken, async (req, res) => {
  try {
    const { type, machineData, alertData } = req.body;
    
    if (!type || !machineData) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de alerta e dados da máquina são obrigatórios'
      });
    }

    let results = [];
    
    switch (type) {
      case 'oee':
        if (!alertData.oeeData) {
          return res.status(400).json({
            success: false,
            message: 'Dados de OEE são obrigatórios para alerta de OEE'
          });
        }
        results = await notificationService.sendOEEAlert(machineData, alertData.oeeData);
        break;
        
      case 'maintenance':
        // Implementar alerta de manutenção
        results = await notificationService.sendMaintenanceAlert(machineData, alertData.maintenanceData);
        break;
        
      case 'production':
        // Implementar alerta de produção
        results = await notificationService.sendProductionAlert(machineData, alertData.productionData);
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: `Tipo de alerta '${type}' não suportado`
        });
    }
    
    // Log de auditoria
    await logAudit(req, 'manual_alert_sent', {
      type,
      machine: machineData.name,
      channels: results.map(r => r.channel)
    });

    res.json({
      success: true,
      message: 'Alerta enviado com sucesso',
      data: results
    });
  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    res.status(500).json({
      success: false,
      message: `Erro ao enviar alerta: ${error.message}`
    });
  }
});

// GET /api/notifications/templates/:channel - Obter templates de um canal
router.get('/templates/:channel', authenticateToken, async (req, res) => {
  try {
    const { channel } = req.params;
    const settings = await NotificationSettings.getActiveSettings();
    
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Configurações de notificação não encontradas'
      });
    }

    const templates = settings[channel]?.templates;
    if (!templates) {
      return res.status(404).json({
        success: false,
        message: `Templates para o canal '${channel}' não encontrados`
      });
    }

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/notifications/validate/telegram-token - Validar token do Telegram
router.post('/validate/telegram-token', authenticateToken, async (req, res) => {
  try {
    const { botToken } = req.body;
    
    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: 'Bot token é obrigatório'
      });
    }

    const validation = await notificationService.validateTelegramToken(botToken);
    
    // Log de auditoria
    await logAudit(req, 'telegram_token_validated', {
      valid: validation.valid,
      botUsername: validation.botInfo?.username
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Erro ao validar token Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/notifications/validate/telegram-chat - Validar acesso ao chat
router.post('/validate/telegram-chat', authenticateToken, async (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    
    if (!botToken || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Bot token e Chat ID são obrigatórios'
      });
    }

    const validation = await notificationService.validateTelegramChat(botToken, chatId);
    
    // Log de auditoria
    await logAudit(req, 'telegram_chat_validated', {
      valid: validation.valid,
      chatId: chatId,
      chatTitle: validation.chatInfo?.title
    });

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Erro ao validar chat Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/notifications/templates/:channel - Atualizar templates de um canal
router.put('/templates/:channel', authenticateToken, async (req, res) => {
  try {
    const { channel } = req.params;
    const { templates } = req.body;
    
    const settings = await NotificationSettings.getActiveSettings();
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Configurações de notificação não encontradas'
      });
    }

    if (!settings[channel]) {
      return res.status(400).json({
        success: false,
        message: `Canal '${channel}' não existe`
      });
    }

    settings[channel].templates = { ...settings[channel].templates, ...templates };
    settings.updatedBy = req.user.id;
    
    await settings.save();
    
    // Log de auditoria
    await logAudit(req, 'notification_templates_updated', {
      channel,
      templatesUpdated: Object.keys(templates)
    });

    res.json({
      success: true,
      message: 'Templates atualizados com sucesso',
      data: settings[channel].templates
    });
  } catch (error) {
    console.error('Erro ao atualizar templates:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Função de validação das configurações
function validateNotificationSettings(data) {
  const errors = [];
  
  // Validar WhatsApp
  if (data.whatsapp?.enabled) {
    if (!data.whatsapp.apiKey) {
      errors.push('API Key do WhatsApp é obrigatória quando habilitado');
    }
    if (!data.whatsapp.phoneNumber) {
      errors.push('Número de telefone do WhatsApp é obrigatório quando habilitado');
    }
  }
  
  // Validar Email
  if (data.email?.enabled) {
    if (data.email.provider === 'smtp') {
      if (!data.email.smtp?.host) {
        errors.push('Host SMTP é obrigatório quando email SMTP está habilitado');
      }
      if (!data.email.smtp?.user) {
        errors.push('Usuário SMTP é obrigatório quando email SMTP está habilitado');
      }
      if (!data.email.smtp?.password) {
        errors.push('Senha SMTP é obrigatória quando email SMTP está habilitado');
      }
    } else if (data.email.provider === 'sendgrid') {
      if (!data.email.sendgrid?.apiKey) {
        errors.push('API Key do SendGrid é obrigatória quando SendGrid está habilitado');
      }
    }
    
    if (!data.email.from?.email) {
      errors.push('Email remetente é obrigatório quando email está habilitado');
    }
  }
  
  // Validar SMS
  if (data.sms?.enabled) {
    if (data.sms.provider === 'twilio') {
      if (!data.sms.twilio?.accountSid) {
        errors.push('Account SID do Twilio é obrigatório quando SMS está habilitado');
      }
      if (!data.sms.twilio?.authToken) {
        errors.push('Auth Token do Twilio é obrigatório quando SMS está habilitado');
      }
      if (!data.sms.twilio?.fromNumber) {
        errors.push('Número remetente do Twilio é obrigatório quando SMS está habilitado');
      }
    }
  }
  
  // Validar Teams
  if (data.teams?.enabled) {
    if (!data.teams.webhookUrl) {
      errors.push('URL do webhook do Teams é obrigatória quando Teams está habilitado');
    }
  }
  
  // Validar Telegram
  if (data.telegram?.enabled) {
    if (!data.telegram.botToken) {
      errors.push('Token do bot do Telegram é obrigatório quando Telegram está habilitado');
    }
    if (!data.telegram.chatId) {
      errors.push('Chat ID do Telegram é obrigatório quando Telegram está habilitado');
    }
  }
  
  return errors;
}

// Função de validação dos dados de teste
function validateChannelTestData(channel, testData) {
  switch (channel) {
    case 'whatsapp':
      if (testData.phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(testData.phoneNumber)) {
        return { valid: false, message: 'Número de telefone inválido para WhatsApp' };
      }
      break;
      
    case 'email':
      if (testData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testData.email)) {
        return { valid: false, message: 'Email inválido' };
      }
      break;
      
    case 'sms':
      if (!testData.phoneNumber) {
        return { valid: false, message: 'Número de telefone é obrigatório para teste de SMS' };
      }
      if (!/^\+?[1-9]\d{1,14}$/.test(testData.phoneNumber)) {
        return { valid: false, message: 'Número de telefone inválido para SMS' };
      }
      break;
      
    case 'telegram':
      if (testData.chatId && !/^-?\d+$/.test(testData.chatId)) {
        return { valid: false, message: 'Chat ID do Telegram inválido' };
      }
      break;
  }
  
  return { valid: true };
}

module.exports = router;