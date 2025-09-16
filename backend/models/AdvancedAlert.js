const mongoose = require('mongoose');

const advancedAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['predictive_maintenance', 'optimization_opportunity', 'pattern_detected', 'anomaly', 'quality_issue', 'performance_degradation', 'efficiency_drop']
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  confidenceLevel: {
    type: String,
    enum: ['very_low', 'low', 'medium', 'high', 'very_high']
  },
  aiGenerated: {
    type: Boolean,
    default: true
  },
  algorithm: {
    type: String,
    enum: ['pattern_recognition', 'anomaly_detection', 'predictive_model', 'statistical_analysis', 'machine_learning']
  },
  dataSource: {
    sensors: [String],
    timeRange: {
      start: Date,
      end: Date
    },
    dataPoints: Number
  },
  metrics: {
    currentOEE: Number,
    predictedOEE: Number,
    availability: Number,
    performance: Number,
    quality: Number,
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'critical']
    }
  },
  prediction: {
    timeToFailure: {
      value: Number, // em horas
      unit: {
        type: String,
        default: 'hours'
      }
    },
    failureProbability: {
      type: Number,
      min: 0,
      max: 100
    },
    impactAssessment: {
      productionLoss: Number, // em unidades
      downtimeEstimate: Number, // em minutos
      costImpact: Number // em reais
    }
  },
  recommendations: [{
    action: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true
    },
    estimatedTime: Number, // em minutos
    estimatedCost: Number,
    expectedBenefit: String,
    resources: [String]
  }],
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed', 'expired'],
    default: 'active'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String
  },
  escalationLevel: {
    type: Number,
    min: 0,
    max: 3,
    default: 0
  },
  escalatedAt: {
    type: Date
  },
  escalatedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdvancedAlert'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  historicalData: {
    similarOccurrences: Number,
    lastOccurrence: Date,
    averageResolutionTime: Number, // em minutos
    successRate: Number // percentual de resoluções bem-sucedidas
  },
  expiresAt: {
    type: Date
  },
  notificationsSent: [{
    method: {
      type: String,
      enum: ['email', 'sms', 'push', 'dashboard']
    },
    recipient: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['chart', 'report', 'image', 'log']
    },
    filename: String,
    url: String,
    description: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
advancedAlertSchema.index({ machineId: 1, status: 1 });
advancedAlertSchema.index({ type: 1, severity: 1 });
advancedAlertSchema.index({ createdAt: -1 });
advancedAlertSchema.index({ confidence: -1 });
advancedAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual para verificar se está expirado
advancedAlertSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual para calcular idade do alerta
advancedAlertSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60)); // em horas
});

// Virtual para determinar urgência
advancedAlertSchema.virtual('urgency').get(function() {
  const age = this.age;
  const severity = this.severity;
  
  if (severity === 'critical' && age > 1) return 'overdue';
  if (severity === 'high' && age > 4) return 'overdue';
  if (severity === 'critical') return 'urgent';
  if (severity === 'high' && age > 2) return 'urgent';
  if (severity === 'high') return 'high';
  if (severity === 'medium' && age > 8) return 'high';
  return 'normal';
});

// Middleware para definir nível de confiança baseado no valor numérico
advancedAlertSchema.pre('save', function(next) {
  if (this.isModified('confidence')) {
    if (this.confidence >= 90) this.confidenceLevel = 'very_high';
    else if (this.confidence >= 75) this.confidenceLevel = 'high';
    else if (this.confidence >= 50) this.confidenceLevel = 'medium';
    else if (this.confidence >= 25) this.confidenceLevel = 'low';
    else this.confidenceLevel = 'very_low';
  }
  
  // Definir expiração automática se não definida
  if (this.isNew && !this.expiresAt) {
    const now = new Date();
    switch (this.severity) {
      case 'critical':
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 horas
        break;
      case 'high':
        this.expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
        break;
      case 'medium':
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
        break;
      default:
        this.expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dias
    }
  }
  
  next();
});

// Método estático para buscar alertas ativos
advancedAlertSchema.statics.findActive = function(filters = {}) {
  return this.find({
    ...filters,
    status: { $in: ['active', 'acknowledged', 'in_progress'] },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('machineId', 'name code location')
    .populate('acknowledgedBy', 'name email')
    .sort({ severity: -1, confidence: -1, createdAt: -1 });
};

// Método estático para buscar por severidade
advancedAlertSchema.statics.findBySeverity = function(severity) {
  return this.findActive({ severity });
};

// Método para reconhecer alerta
advancedAlertSchema.methods.acknowledge = function(userId, notes) {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  if (notes) this.resolutionNotes = notes;
  return this.save();
};

// Método para resolver alerta
advancedAlertSchema.methods.resolve = function(userId, notes) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  if (notes) this.resolutionNotes = notes;
  return this.save();
};

// Método para escalar alerta
advancedAlertSchema.methods.escalate = function(userIds) {
  this.escalationLevel += 1;
  this.escalatedAt = new Date();
  this.escalatedTo = userIds;
  return this.save();
};

// Método para descartar alerta
advancedAlertSchema.methods.dismiss = function(userId, reason) {
  this.status = 'dismissed';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNotes = reason;
  return this.save();
};

module.exports = mongoose.model('AdvancedAlert', advancedAlertSchema);