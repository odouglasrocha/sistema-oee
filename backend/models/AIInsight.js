const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['prediction', 'optimization', 'pattern', 'anomaly', 'maintenance']
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
  recommendation: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'applied', 'dismissed', 'expired'],
    default: 'active'
  },
  appliedAt: {
    type: Date
  },
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  expiresAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  metrics: {
    impactOEE: {
      type: Number,
      min: -100,
      max: 100
    },
    impactAvailability: {
      type: Number,
      min: -100,
      max: 100
    },
    impactPerformance: {
      type: Number,
      min: -100,
      max: 100
    },
    impactQuality: {
      type: Number,
      min: -100,
      max: 100
    },
    estimatedSavings: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
aiInsightSchema.index({ type: 1, severity: 1 });
aiInsightSchema.index({ machineId: 1, status: 1 });
aiInsightSchema.index({ createdAt: -1 });
aiInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual para calcular se o insight está expirado
aiInsightSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Middleware para definir expiração automática baseada no tipo
aiInsightSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    const now = new Date();
    switch (this.type) {
      case 'prediction':
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias
        break;
      case 'maintenance':
        this.expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
        break;
      case 'optimization':
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
        break;
      default:
        this.expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dias
    }
  }
  next();
});

// Método estático para buscar insights ativos
aiInsightSchema.statics.findActive = function(filters = {}) {
  return this.find({
    ...filters,
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('machineId', 'name code').sort({ createdAt: -1 });
};

// Método para aplicar insight
aiInsightSchema.methods.apply = function(userId) {
  this.status = 'applied';
  this.appliedAt = new Date();
  this.appliedBy = userId;
  return this.save();
};

// Método para descartar insight
aiInsightSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  return this.save();
};

module.exports = mongoose.model('AIInsight', aiInsightSchema);