const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(url) {
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.protocol === 'https:';
        } catch {
          return false;
        }
      },
      message: 'Webhook URL must be a valid HTTPS URL'
    }
  },
  secret: {
    type: String,
    required: true
  },
  events: [{
    type: String,
    required: true,
    enum: [
      'machine.status_changed',
      'machine.created',
      'machine.updated',
      'machine.deleted',
      'production.started',
      'production.completed',
      'production.stopped',
      'production.paused',
      'production.resumed',
      'alert.created',
      'alert.resolved',
      'oee.threshold_exceeded',
      'oee.threshold_recovered',
      'maintenance.scheduled',
      'maintenance.completed',
      'user.created',
      'user.updated',
      'system.backup_completed',
      'system.error'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'failed'],
    default: 'active'
  },
  retryPolicy: {
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    retryDelay: {
      type: Number,
      default: 1000, // milliseconds
      min: 100,
      max: 60000
    },
    backoffMultiplier: {
      type: Number,
      default: 2,
      min: 1,
      max: 5
    }
  },
  timeout: {
    type: Number,
    default: 30000, // 30 seconds
    min: 1000,
    max: 120000
  },
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  filters: {
    machineIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine'
    }],
    departments: [String],
    locations: [String],
    conditions: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  statistics: {
    totalSent: {
      type: Number,
      default: 0
    },
    totalSuccess: {
      type: Number,
      default: 0
    },
    totalFailed: {
      type: Number,
      default: 0
    },
    lastSuccess: Date,
    lastFailure: Date,
    lastError: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índices
webhookSchema.index({ status: 1, events: 1 });
webhookSchema.index({ createdBy: 1 });
webhookSchema.index({ 'filters.machineIds': 1 });

// Método para gerar secret
webhookSchema.statics.generateSecret = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Método para gerar assinatura HMAC
webhookSchema.methods.generateSignature = function(payload) {
  return crypto
    .createHmac('sha256', this.secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

// Método para verificar se o webhook deve ser disparado para um evento
webhookSchema.methods.shouldTrigger = function(eventType, eventData) {
  // Verificar se o evento está na lista de eventos do webhook
  if (!this.events.includes(eventType)) {
    return false;
  }
  
  // Verificar filtros
  if (this.filters) {
    // Filtro por máquina
    if (this.filters.machineIds && this.filters.machineIds.length > 0) {
      const machineId = eventData.machineId || eventData.machine?._id;
      if (machineId && !this.filters.machineIds.some(id => id.toString() === machineId.toString())) {
        return false;
      }
    }
    
    // Filtro por departamento
    if (this.filters.departments && this.filters.departments.length > 0) {
      const department = eventData.department || eventData.machine?.department;
      if (department && !this.filters.departments.includes(department)) {
        return false;
      }
    }
    
    // Filtro por localização
    if (this.filters.locations && this.filters.locations.length > 0) {
      const location = eventData.location || eventData.machine?.location;
      if (location && !this.filters.locations.includes(location)) {
        return false;
      }
    }
    
    // Filtros customizados
    if (this.filters.conditions) {
      for (const [key, expectedValue] of this.filters.conditions) {
        const actualValue = this.getNestedValue(eventData, key);
        if (actualValue !== expectedValue) {
          return false;
        }
      }
    }
  }
  
  return true;
};

// Método auxiliar para obter valores aninhados
webhookSchema.methods.getNestedValue = function(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

// Método para atualizar estatísticas
webhookSchema.methods.updateStats = function(success, error = null) {
  this.statistics.totalSent += 1;
  
  if (success) {
    this.statistics.totalSuccess += 1;
    this.statistics.lastSuccess = new Date();
  } else {
    this.statistics.totalFailed += 1;
    this.statistics.lastFailure = new Date();
    if (error) {
      this.statistics.lastError = error.toString().substring(0, 500);
    }
  }
  
  return this.save();
};

// Middleware para gerar secret se não existir
webhookSchema.pre('save', function(next) {
  if (this.isNew && !this.secret) {
    this.secret = this.constructor.generateSecret();
  }
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);