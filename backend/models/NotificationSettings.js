const mongoose = require('mongoose');
const crypto = require('crypto');

// Schema para configurações de notificação
const notificationSettingsSchema = new mongoose.Schema({
  // Configurações WhatsApp
  whatsapp: {
    enabled: {
      type: Boolean,
      default: false
    },
    apiKey: {
      type: String,
      set: function(value) {
        return value ? this.encrypt(value) : value;
      },
      get: function(value) {
        return value ? this.decrypt(value) : value;
      }
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    webhookUrl: {
      type: String,
      trim: true
    },
    templates: {
      oeeAlert: {
        type: String,
        default: '🚨 *Alerta OEE*\n\nMáquina: {{machine}}\nOEE: {{oee}}%\nStatus: {{status}}\n\nData: {{date}}'
      },
      maintenanceAlert: {
        type: String,
        default: '🔧 *Manutenção Necessária*\n\nMáquina: {{machine}}\nTipo: {{type}}\nPrioridade: {{priority}}\n\nData: {{date}}'
      },
      productionAlert: {
        type: String,
        default: '📊 *Alerta de Produção*\n\nMáquina: {{machine}}\nMeta: {{target}}\nRealizado: {{actual}}\n\nData: {{date}}'
      }
    }
  },

  // Configurações Email
  email: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'gmail', 'outlook'],
      default: 'smtp'
    },
    smtp: {
      host: {
        type: String,
        trim: true
      },
      port: {
        type: Number,
        default: 587
      },
      secure: {
        type: Boolean,
        default: false
      },
      user: {
        type: String,
        trim: true
      },
      password: {
        type: String,
        set: function(value) {
          return value ? this.encrypt(value) : value;
        },
        get: function(value) {
          return value ? this.decrypt(value) : value;
        }
      }
    },
    sendgrid: {
      apiKey: {
        type: String,
        set: function(value) {
          return value ? this.encrypt(value) : value;
        },
        get: function(value) {
          return value ? this.decrypt(value) : value;
        }
      }
    },
    from: {
      email: {
        type: String,
        trim: true
      },
      name: {
        type: String,
        trim: true,
        default: 'OEE Monitor'
      }
    },
    templates: {
      oeeAlert: {
        subject: {
          type: String,
          default: '🚨 Alerta OEE - {{machine}}'
        },
        html: {
          type: String,
          default: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">🚨 Alerta OEE</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>Máquina:</strong> {{machine}}</p>
                <p><strong>OEE Atual:</strong> {{oee}}%</p>
                <p><strong>Status:</strong> {{status}}</p>
                <p><strong>Data/Hora:</strong> {{date}}</p>
              </div>
              <p style="margin-top: 20px; color: #6c757d; font-size: 12px;">
                Este é um alerta automático do Sistema OEE Monitor.
              </p>
            </div>
          `
        }
      },
      maintenanceAlert: {
        subject: {
          type: String,
          default: '🔧 Manutenção Necessária - {{machine}}'
        },
        html: {
          type: String,
          default: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ffc107;">🔧 Manutenção Necessária</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <p><strong>Máquina:</strong> {{machine}}</p>
                <p><strong>Tipo:</strong> {{type}}</p>
                <p><strong>Prioridade:</strong> {{priority}}</p>
                <p><strong>Data/Hora:</strong> {{date}}</p>
              </div>
              <p style="margin-top: 20px; color: #6c757d; font-size: 12px;">
                Este é um alerta automático do Sistema OEE Monitor.
              </p>
            </div>
          `
        }
      }
    }
  },

  // Configurações SMS
  sms: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['twilio', 'infobip', 'nexmo'],
      default: 'twilio'
    },
    twilio: {
      accountSid: {
        type: String,
        set: function(value) {
          return value ? this.encrypt(value) : value;
        },
        get: function(value) {
          return value ? this.decrypt(value) : value;
        }
      },
      authToken: {
        type: String,
        set: function(value) {
          return value ? this.encrypt(value) : value;
        },
        get: function(value) {
          return value ? this.decrypt(value) : value;
        }
      },
      fromNumber: {
        type: String,
        trim: true
      }
    },
    authorizedNumbers: [{
      type: String,
      trim: true
    }],
    templates: {
      criticalAlert: {
        type: String,
        default: 'ALERTA CRÍTICO OEE: {{machine}} - {{message}}. Verificar imediatamente.'
      },
      maintenanceUrgent: {
        type: String,
        default: 'MANUTENÇÃO URGENTE: {{machine}} requer atenção imediata. Tipo: {{type}}.'
      }
    }
  },

  // Configurações Microsoft Teams
  teams: {
    enabled: {
      type: Boolean,
      default: false
    },
    webhookUrl: {
      type: String,
      set: function(value) {
        return value ? this.encrypt(value) : value;
      },
      get: function(value) {
        return value ? this.decrypt(value) : value;
      }
    },
    channelId: {
      type: String,
      trim: true
    },
    templates: {
      oeeAlert: {
        type: Object,
        default: {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": "dc3545",
          "summary": "Alerta OEE",
          "sections": [{
            "activityTitle": "🚨 Alerta OEE",
            "activitySubtitle": "Sistema de Monitoramento",
            "facts": [
              {"name": "Máquina", "value": "{{machine}}"},
              {"name": "OEE", "value": "{{oee}}%"},
              {"name": "Status", "value": "{{status}}"},
              {"name": "Data/Hora", "value": "{{date}}"}
            ]
          }]
        }
      },
      maintenanceAlert: {
        type: Object,
        default: {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          "themeColor": "ffc107",
          "summary": "Manutenção Necessária",
          "sections": [{
            "activityTitle": "🔧 Manutenção Necessária",
            "activitySubtitle": "Sistema de Monitoramento",
            "facts": [
              {"name": "Máquina", "value": "{{machine}}"},
              {"name": "Tipo", "value": "{{type}}"},
              {"name": "Prioridade", "value": "{{priority}}"},
              {"name": "Data/Hora", "value": "{{date}}"}
            ]
          }]
        }
      }
    }
  },

  // Configurações Telegram
  telegram: {
    enabled: {
      type: Boolean,
      default: false
    },
    botToken: {
      type: String,
      set: function(value) {
        return value ? this.encrypt(value) : value;
      },
      get: function(value) {
        return value ? this.decrypt(value) : value;
      }
    },
    chatId: {
      type: String,
      trim: true
    },
    templates: {
      oeeAlert: {
        type: String,
        default: '🚨 <b>Alerta OEE</b>\n\n<b>Máquina:</b> {{machine}}\n<b>OEE:</b> {{oee}}%\n<b>Status:</b> {{status}}\n<b>Data:</b> {{date}}'
      },
      maintenanceAlert: {
        type: String,
        default: '🔧 <b>Manutenção Necessária</b>\n\n<b>Máquina:</b> {{machine}}\n<b>Tipo:</b> {{type}}\n<b>Prioridade:</b> {{priority}}\n<b>Data:</b> {{date}}'
      },
      productionAlert: {
        type: String,
        default: '📊 <b>Alerta de Produção</b>\n\n<b>Máquina:</b> {{machine}}\n<b>Meta:</b> {{target}}\n<b>Realizado:</b> {{actual}}\n<b>Data:</b> {{date}}'
      }
    }
  },

  // Configurações gerais
  general: {
    testMode: {
      type: Boolean,
      default: false
    },
    retryAttempts: {
      type: Number,
      default: 3,
      min: 1,
      max: 10
    },
    retryDelay: {
      type: Number,
      default: 5000, // 5 segundos
      min: 1000,
      max: 60000
    }
  },

  // Metadados
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    getters: true,
    transform: function(doc, ret) {
      // Remover campos sensíveis do JSON de resposta
      if (ret.whatsapp && ret.whatsapp.apiKey) {
        ret.whatsapp.apiKey = '***';
      }
      if (ret.email && ret.email.smtp && ret.email.smtp.password) {
        ret.email.smtp.password = '***';
      }
      if (ret.email && ret.email.sendgrid && ret.email.sendgrid.apiKey) {
        ret.email.sendgrid.apiKey = '***';
      }
      if (ret.sms && ret.sms.twilio) {
        if (ret.sms.twilio.accountSid) ret.sms.twilio.accountSid = '***';
        if (ret.sms.twilio.authToken) ret.sms.twilio.authToken = '***';
      }
      if (ret.teams && ret.teams.webhookUrl) {
        ret.teams.webhookUrl = '***';
      }
      if (ret.telegram && ret.telegram.botToken) {
        ret.telegram.botToken = '***';
      }
      return ret;
    }
  },
  toObject: { virtuals: true, getters: true }
});

// Índices
notificationSettingsSchema.index({ isActive: 1 });
notificationSettingsSchema.index({ createdAt: -1 });

// Métodos de criptografia
const ENCRYPTION_KEY = process.env.NOTIFICATION_ENCRYPTION_KEY || 'oee-monitor-notification-key-32-chars';
const ALGORITHM = 'aes-256-cbc';

notificationSettingsSchema.methods.encrypt = function(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

notificationSettingsSchema.methods.decrypt = function(text) {
  if (!text || !text.includes(':')) return text;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Middleware para atualização
notificationSettingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Métodos estáticos
notificationSettingsSchema.statics.getActiveSettings = function() {
  return this.findOne({ isActive: true }).populate('createdBy updatedBy', 'name email');
};

notificationSettingsSchema.statics.createDefault = function(userId) {
  return this.create({
    createdBy: userId,
    isActive: true
  });
};

// Virtual para status geral
notificationSettingsSchema.virtual('hasAnyEnabled').get(function() {
  return this.whatsapp.enabled || 
         this.email.enabled || 
         this.sms.enabled || 
         this.teams.enabled || 
         this.telegram.enabled;
});

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

module.exports = NotificationSettings;