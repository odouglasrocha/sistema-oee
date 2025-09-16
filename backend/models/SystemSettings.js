const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Configurações Gerais
  companyName: {
    type: String,
    required: [true, 'Nome da empresa é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome da empresa deve ter no máximo 100 caracteres']
  },
  timezone: {
    type: String,
    required: [true, 'Fuso horário é obrigatório'],
    enum: {
      values: ['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'Asia/Tokyo'],
      message: 'Fuso horário inválido'
    },
    default: 'America/Sao_Paulo'
  },
  language: {
    type: String,
    required: [true, 'Idioma é obrigatório'],
    enum: {
      values: ['pt-BR', 'en-US', 'es-ES'],
      message: 'Idioma inválido'
    },
    default: 'pt-BR'
  },
  theme: {
    type: String,
    enum: {
      values: ['light', 'dark', 'system'],
      message: 'Tema inválido'
    },
    default: 'system'
  },
  autoRefresh: {
    type: Boolean,
    default: true
  },
  refreshInterval: {
    type: Number,
    min: [10, 'Intervalo mínimo é 10 segundos'],
    max: [300, 'Intervalo máximo é 300 segundos'],
    default: 30
  },

  // Configurações de Alertas
  alertSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: false
    },
    oeeThreshold: {
      type: Number,
      min: [0, 'Limite OEE deve ser maior que 0'],
      max: [100, 'Limite OEE deve ser menor que 100'],
      default: 75
    },
    availabilityThreshold: {
      type: Number,
      min: [0, 'Limite disponibilidade deve ser maior que 0'],
      max: [100, 'Limite disponibilidade deve ser menor que 100'],
      default: 85
    },
    performanceThreshold: {
      type: Number,
      min: [0, 'Limite performance deve ser maior que 0'],
      max: [100, 'Limite performance deve ser menor que 100'],
      default: 80
    },
    qualityThreshold: {
      type: Number,
      min: [0, 'Limite qualidade deve ser maior que 0'],
      max: [100, 'Limite qualidade deve ser menor que 100'],
      default: 95
    },
    maintenanceAlerts: {
      type: Boolean,
      default: true
    },
    productionAlerts: {
      type: Boolean,
      default: true
    }
  },

  // Configurações de Segurança
  securitySettings: {
    sessionTimeout: {
      type: Number,
      min: [30, 'Timeout mínimo é 30 minutos'],
      max: [1440, 'Timeout máximo é 1440 minutos (24h)'],
      default: 480 // 8 horas
    },
    passwordExpiry: {
      type: Number,
      min: [30, 'Expiração mínima é 30 dias'],
      max: [365, 'Expiração máxima é 365 dias'],
      default: 90
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    auditLog: {
      type: Boolean,
      default: true
    },
    loginAttempts: {
      type: Number,
      min: [3, 'Mínimo 3 tentativas'],
      max: [10, 'Máximo 10 tentativas'],
      default: 3
    }
  },

  // Configurações de Integração
  integrationSettings: {
    mesIntegration: {
      type: Boolean,
      default: false
    },
    erpIntegration: {
      type: Boolean,
      default: false
    },
    iotSensors: {
      type: Boolean,
      default: true
    },
    apiAccess: {
      type: Boolean,
      default: true
    },
    webhooks: {
      type: Boolean,
      default: false
    },
    webhookUrls: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true,
        match: [/^https?:\/\/.+/, 'URL inválida']
      },
      events: [{
        type: String,
        enum: ['production_alert', 'maintenance_alert', 'oee_threshold', 'machine_status']
      }],
      active: {
        type: Boolean,
        default: true
      }
    }]
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
systemSettingsSchema.index({ isActive: 1 });
systemSettingsSchema.index({ createdAt: -1 });

// Middleware para garantir que só existe uma configuração ativa
systemSettingsSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    // Desativar todas as outras configurações
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  next();
});

// Método estático para obter configurações ativas
systemSettingsSchema.statics.getActiveSettings = function() {
  return this.findOne({ isActive: true })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
};

// Método para validar configurações
systemSettingsSchema.methods.validateSettings = function() {
  const errors = [];
  
  // Validar limites de alerta
  if (this.alertSettings.oeeThreshold >= this.alertSettings.availabilityThreshold) {
    errors.push('Limite OEE deve ser menor que limite de disponibilidade');
  }
  
  // Validar intervalo de atualização quando auto-refresh está ativo
  if (this.autoRefresh && (!this.refreshInterval || this.refreshInterval < 10)) {
    errors.push('Intervalo de atualização deve ser pelo menos 10 segundos quando auto-refresh está ativo');
  }
  
  return errors;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);