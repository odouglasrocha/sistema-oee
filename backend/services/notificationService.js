const NotificationSettings = require('../models/NotificationSettings');
const { CredentialEncryption, SENSITIVE_FIELDS } = require('../utils/encryption');
const axios = require('axios');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

/**
 * Serviço principal de notificações
 */
class NotificationService {
  constructor() {
    this.settings = null;
    this.emailTransporter = null;
    this.twilioClient = null;
  }

  /**
   * Carrega as configurações de notificação
   */
  async loadSettings() {
    try {
      this.settings = await NotificationSettings.getActiveSettings();
      if (!this.settings) {
        console.warn('⚠️ Nenhuma configuração de notificação encontrada');
        return false;
      }
      
      // Descriptografar credenciais para uso interno
      this.settings = CredentialEncryption.decryptCredentials(this.settings.toObject(), SENSITIVE_FIELDS);
      
      // Inicializar clientes
      await this.initializeClients();
      
      console.log('✅ Configurações de notificação carregadas');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar configurações de notificação:', error);
      return false;
    }
  }

  /**
   * Inicializa os clientes de notificação
   */
  async initializeClients() {
    if (!this.settings) return;

    // Inicializar cliente de email
    if (this.settings.email.enabled) {
      await this.initializeEmailClient();
    }

    // Inicializar cliente Twilio
    if (this.settings.sms.enabled && this.settings.sms.provider === 'twilio') {
      this.initializeTwilioClient();
    }
  }

  /**
   * Inicializa o cliente de email
   */
  async initializeEmailClient() {
    try {
      const emailConfig = this.settings.email;
      
      if (emailConfig.provider === 'smtp') {
        this.emailTransporter = nodemailer.createTransporter({
          host: emailConfig.smtp.host,
          port: emailConfig.smtp.port,
          secure: emailConfig.smtp.secure,
          auth: {
            user: emailConfig.smtp.user,
            pass: emailConfig.smtp.password
          }
        });
      } else if (emailConfig.provider === 'sendgrid') {
        this.emailTransporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: emailConfig.sendgrid.apiKey
          }
        });
      }
      
      // Verificar conexão
      if (this.emailTransporter) {
        await this.emailTransporter.verify();
        console.log('✅ Cliente de email inicializado');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar cliente de email:', error);
      this.emailTransporter = null;
    }
  }

  /**
   * Inicializa o cliente Twilio
   */
  initializeTwilioClient() {
    try {
      const smsConfig = this.settings.sms.twilio;
      this.twilioClient = twilio(smsConfig.accountSid, smsConfig.authToken);
      console.log('✅ Cliente Twilio inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar cliente Twilio:', error);
      this.twilioClient = null;
    }
  }

  /**
   * Envia notificação via WhatsApp
   */
  async sendWhatsApp(message, phoneNumber = null) {
    if (!this.settings?.whatsapp.enabled) {
      throw new Error('WhatsApp não está habilitado');
    }

    try {
      const config = this.settings.whatsapp;
      const targetNumber = phoneNumber || config.phoneNumber;
      
      // Implementação para WhatsApp Business API
      const response = await axios.post('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
        messaging_product: 'whatsapp',
        to: targetNumber,
        type: 'text',
        text: { body: message }
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ WhatsApp enviado:', response.data);
      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      console.error('❌ Erro ao enviar WhatsApp:', error);
      throw new Error(`Falha no envio WhatsApp: ${error.message}`);
    }
  }

  /**
   * Envia notificação via Email
   */
  async sendEmail(subject, htmlContent, to, template = null) {
    if (!this.settings?.email.enabled || !this.emailTransporter) {
      throw new Error('Email não está habilitado ou configurado');
    }

    try {
      const emailConfig = this.settings.email;
      
      const mailOptions = {
        from: {
          name: emailConfig.from.name,
          address: emailConfig.from.email
        },
        to: to,
        subject: subject,
        html: htmlContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      console.log('✅ Email enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      throw new Error(`Falha no envio de email: ${error.message}`);
    }
  }

  /**
   * Envia notificação via SMS
   */
  async sendSMS(message, phoneNumber) {
    if (!this.settings?.sms.enabled || !this.twilioClient) {
      throw new Error('SMS não está habilitado ou configurado');
    }

    try {
      const smsConfig = this.settings.sms;
      
      // Verificar se o número está autorizado
      if (!smsConfig.authorizedNumbers.includes(phoneNumber)) {
        throw new Error('Número não autorizado para receber SMS');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: smsConfig.twilio.fromNumber,
        to: phoneNumber
      });

      console.log('✅ SMS enviado:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('❌ Erro ao enviar SMS:', error);
      throw new Error(`Falha no envio de SMS: ${error.message}`);
    }
  }

  /**
   * Envia notificação via Microsoft Teams
   */
  async sendTeams(cardData) {
    if (!this.settings?.teams.enabled) {
      throw new Error('Teams não está habilitado');
    }

    try {
      const config = this.settings.teams;
      
      const response = await axios.post(config.webhookUrl, cardData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Teams enviado:', response.status);
      return { success: true, status: response.status };
    } catch (error) {
      console.error('❌ Erro ao enviar Teams:', error);
      throw new Error(`Falha no envio Teams: ${error.message}`);
    }
  }

  /**
   * Valida token do bot Telegram
   */
  async validateTelegramToken(botToken) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);
      
      if (response.data.ok) {
        const botInfo = response.data.result;
        console.log('✅ Token válido:', botInfo.username);
        return { 
          valid: true, 
          botInfo: {
            id: botInfo.id,
            username: botInfo.username,
            first_name: botInfo.first_name
          }
        };
      } else {
        throw new Error('Token inválido');
      }
    } catch (error) {
      console.error('❌ Erro ao validar token Telegram:', error);
      return { 
        valid: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  /**
   * Verifica acesso do bot ao chat
   */
  async validateTelegramChat(botToken, chatId) {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getChat`, {
        params: { chat_id: chatId }
      });
      
      if (response.data.ok) {
        const chatInfo = response.data.result;
        console.log('✅ Chat acessível:', chatInfo.title || chatInfo.first_name);
        return { 
          valid: true, 
          chatInfo: {
            id: chatInfo.id,
            type: chatInfo.type,
            title: chatInfo.title || `${chatInfo.first_name} ${chatInfo.last_name || ''}`.trim()
          }
        };
      } else {
        throw new Error('Chat inacessível');
      }
    } catch (error) {
      console.error('❌ Erro ao validar chat Telegram:', error);
      return { 
        valid: false, 
        error: error.response?.data?.description || error.message 
      };
    }
  }

  /**
   * Envia notificação via Telegram
   */
  async sendTelegram(message, chatId = null) {
    if (!this.settings?.telegram.enabled) {
      throw new Error('Telegram não está habilitado');
    }

    try {
      const config = this.settings.telegram;
      const targetChatId = chatId || config.chatId;
      
      const response = await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML'
      });

      console.log('✅ Telegram enviado:', response.data.result.message_id);
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('❌ Erro ao enviar Telegram:', error);
      throw new Error(`Falha no envio Telegram: ${error.message}`);
    }
  }

  /**
   * Envia alerta OEE específico via Telegram
   */
  async sendTelegramOEEAlert(message, oeeData, machineData) {
    if (!this.settings?.telegram.enabled) {
      throw new Error('Telegram não está habilitado');
    }

    try {
      const config = this.settings.telegram;
      
      // Determinar emoji baseado no OEE
      const emoji = oeeData.overall >= 85 ? '✅' : oeeData.overall >= 75 ? '⚠️' : '🚨';
      const status = oeeData.overall >= 85 ? 'EXCELENTE' : oeeData.overall >= 75 ? 'ATENÇÃO' : 'CRÍTICO';
      
      // Criar mensagem formatada
      const formattedMessage = `${emoji} <b>ALERTA OEE - ${status}</b>\n\n` +
        `🏭 <b>Máquina:</b> ${machineData.name}\n` +
        `📊 <b>OEE Atual:</b> ${oeeData.overall.toFixed(1)}%\n` +
        `⚡ <b>Disponibilidade:</b> ${oeeData.availability?.toFixed(1) || 'N/A'}%\n` +
        `🎯 <b>Performance:</b> ${oeeData.performance?.toFixed(1) || 'N/A'}%\n` +
        `✨ <b>Qualidade:</b> ${oeeData.quality?.toFixed(1) || 'N/A'}%\n` +
        `🕐 <b>Data/Hora:</b> ${new Date().toLocaleString('pt-BR')}\n\n` +
        `${oeeData.overall < 75 ? '⚠️ <i>Ação necessária para melhorar o OEE</i>' : '✅ <i>OEE dentro do esperado</i>'}`;
      
      const response = await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        chat_id: config.chatId,
        text: formattedMessage,
        parse_mode: 'HTML'
      });

      console.log('✅ Alerta OEE Telegram enviado:', response.data.result.message_id);
      return { success: true, messageId: response.data.result.message_id };
    } catch (error) {
      console.error('❌ Erro ao enviar alerta OEE Telegram:', error);
      throw new Error(`Falha no envio de alerta OEE Telegram: ${error.message}`);
    }
  }

  /**
   * Processa template com variáveis
   */
  processTemplate(template, variables = {}) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    let processed = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, variables[key] || '');
    });

    return processed;
  }

  /**
   * Envia alerta de OEE
   */
  async sendOEEAlert(machineData, oeeData) {
    if (!this.settings) {
      await this.loadSettings();
    }

    const variables = {
      machine: machineData.name,
      oee: oeeData.overall.toFixed(1),
      status: oeeData.overall < 75 ? 'CRÍTICO' : 'ATENÇÃO',
      date: new Date().toLocaleString('pt-BR')
    };

    const results = [];

    try {
      // WhatsApp
      if (this.settings.whatsapp.enabled) {
        const message = this.processTemplate(this.settings.whatsapp.templates.oeeAlert, variables);
        const result = await this.sendWhatsApp(message);
        results.push({ channel: 'whatsapp', ...result });
      }

      // Email
      if (this.settings.email.enabled) {
        const template = this.settings.email.templates.oeeAlert;
        const subject = this.processTemplate(template.subject, variables);
        const html = this.processTemplate(template.html, variables);
        const result = await this.sendEmail(subject, html, this.settings.email.from.email);
        results.push({ channel: 'email', ...result });
      }

      // Teams
      if (this.settings.teams.enabled) {
        const cardTemplate = JSON.parse(JSON.stringify(this.settings.teams.templates.oeeAlert));
        const processedCard = this.processObjectTemplate(cardTemplate, variables);
        const result = await this.sendTeams(processedCard);
        results.push({ channel: 'teams', ...result });
      }

      // Telegram
      if (this.settings.telegram.enabled) {
        const result = await this.sendTelegramOEEAlert(null, oeeData, machineData);
        results.push({ channel: 'telegram', ...result });
      }

      // SMS (apenas para alertas críticos)
      if (this.settings.sms.enabled && oeeData.overall < 60) {
        const message = this.processTemplate(this.settings.sms.templates.criticalAlert, {
          machine: machineData.name,
          message: `OEE crítico: ${oeeData.overall.toFixed(1)}%`
        });
        
        for (const phoneNumber of this.settings.sms.authorizedNumbers) {
          const result = await this.sendSMS(message, phoneNumber);
          results.push({ channel: 'sms', phoneNumber, ...result });
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Erro ao enviar alerta OEE:', error);
      throw error;
    }
  }

  /**
   * Processa templates em objetos (para Teams)
   */
  processObjectTemplate(obj, variables) {
    if (typeof obj === 'string') {
      return this.processTemplate(obj, variables);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.processObjectTemplate(item, variables));
    }
    
    if (obj && typeof obj === 'object') {
      const processed = {};
      Object.keys(obj).forEach(key => {
        processed[key] = this.processObjectTemplate(obj[key], variables);
      });
      return processed;
    }
    
    return obj;
  }

  /**
   * Testa envio para um canal específico
   */
  async testChannel(channel, testData = {}) {
    if (!this.settings) {
      await this.loadSettings();
    }

    const testMessage = `🧪 Teste de notificação OEE Monitor\n\nCanal: ${channel.toUpperCase()}\nData/Hora: ${new Date().toLocaleString('pt-BR')}\n\nSe você recebeu esta mensagem, a integração está funcionando corretamente! ✅`;

    try {
      switch (channel) {
        case 'whatsapp':
          return await this.sendWhatsApp(testMessage, testData.phoneNumber);
        
        case 'email':
          return await this.sendEmail(
            '🧪 Teste de Email - OEE Monitor',
            `<div style="font-family: Arial, sans-serif;">
              <h2>🧪 Teste de Email</h2>
              <p>${testMessage.replace(/\n/g, '<br>')}</p>
            </div>`,
            testData.email || this.settings.email.from.email
          );
        
        case 'sms':
          if (!testData.phoneNumber) {
            throw new Error('Número de telefone é obrigatório para teste de SMS');
          }
          return await this.sendSMS(testMessage, testData.phoneNumber);
        
        case 'teams':
          const testCard = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0078D4",
            "summary": "Teste OEE Monitor",
            "sections": [{
              "activityTitle": "🧪 Teste de Integração",
              "activitySubtitle": "OEE Monitor",
              "text": testMessage
            }]
          };
          return await this.sendTeams(testCard);
        
        case 'telegram':
          return await this.sendTelegram(testMessage, testData.chatId);
        
        default:
          throw new Error(`Canal '${channel}' não suportado`);
      }
    } catch (error) {
      console.error(`❌ Erro no teste do canal ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Obtém status de todos os canais
   */
  getChannelsStatus() {
    if (!this.settings) {
      return {
        whatsapp: { enabled: false, status: 'not_configured' },
        email: { enabled: false, status: 'not_configured' },
        sms: { enabled: false, status: 'not_configured' },
        teams: { enabled: false, status: 'not_configured' },
        telegram: { enabled: false, status: 'not_configured' }
      };
    }

    return {
      whatsapp: {
        enabled: this.settings.whatsapp.enabled,
        status: this.settings.whatsapp.enabled && this.settings.whatsapp.apiKey ? 'configured' : 'not_configured'
      },
      email: {
        enabled: this.settings.email.enabled,
        status: this.settings.email.enabled && this.emailTransporter ? 'configured' : 'not_configured'
      },
      sms: {
        enabled: this.settings.sms.enabled,
        status: this.settings.sms.enabled && this.twilioClient ? 'configured' : 'not_configured'
      },
      teams: {
        enabled: this.settings.teams.enabled,
        status: this.settings.teams.enabled && this.settings.teams.webhookUrl ? 'configured' : 'not_configured'
      },
      telegram: {
        enabled: this.settings.telegram.enabled,
        status: this.settings.telegram.enabled && this.settings.telegram.botToken ? 'configured' : 'not_configured'
      }
    };
  }
}

// Instância singleton
const notificationService = new NotificationService();

module.exports = notificationService;