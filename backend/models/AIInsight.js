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
aiInsightSchema.methods.apply = async function(userId) {
  const OptimizationOpportunity = require('./OptimizationOpportunity');
  const OptimizationSchedule = require('./OptimizationSchedule');
  
  this.status = 'applied';
  this.appliedAt = new Date();
  this.appliedBy = userId;
  
  // Criar oportunidade de melhoria baseada no insight
  if (this.type === 'optimization' || this.type === 'anomaly') {
    const opportunity = new OptimizationOpportunity({
      title: this.title,
      category: this._getCategoryFromInsight(),
      machineId: this.machineId,
      currentValue: this._getCurrentValueFromInsight(),
      potentialValue: this._getPotentialValueFromInsight(),
      impact: this.metrics || {},
      difficulty: this._getDifficultyFromSeverity(),
      priority: this._getPriorityFromSeverity(),
      estimatedSavings: this.metrics?.estimatedSavings || 0,
      description: this.description,
      recommendation: this.recommendation,
      insightId: this._id,
      status: 'identified'
    });
    
    await opportunity.save();
    
    // Criar cronograma de otimização
    const currentWeek = this._getCurrentWeek();
    const schedule = new OptimizationSchedule({
      week: currentWeek + 1, // Próxima semana
      year: new Date().getFullYear(),
      title: `Implementação: ${this.title}`,
      description: `Implementar melhorias baseadas no insight: ${this.description}`,
      category: this._getScheduleCategoryFromInsight(),
      machineIds: [this.machineId],
      opportunityId: opportunity._id,
      status: 'planned',
      priority: this._getPriorityFromSeverity(),
      startDate: this._getNextWeekDate(),
      endDate: new Date(this._getNextWeekDate().getTime() + this._getEstimatedDuration() * 24 * 60 * 60 * 1000),
      responsibleUser: userId,
      estimatedDuration: this._getEstimatedDuration(),
      estimatedCost: this.metrics?.estimatedSavings ? this.metrics.estimatedSavings * 0.3 : 1000,
      expectedROI: this.metrics?.estimatedSavings || 0,
      insightId: this._id
    });
    
    await schedule.save();
  }
  
  return this.save();
};

// Métodos auxiliares para conversão de dados do insight
aiInsightSchema.methods._getCategoryFromInsight = function() {
  if (this.title.toLowerCase().includes('desperdício')) return 'waste_reduction';
  if (this.title.toLowerCase().includes('oee')) return 'speed';
  if (this.title.toLowerCase().includes('produção')) return 'speed';
  if (this.title.toLowerCase().includes('setup')) return 'setup_time';
  if (this.title.toLowerCase().includes('qualidade')) return 'quality';
  if (this.title.toLowerCase().includes('manutenção')) return 'maintenance';
  return 'speed';
};

aiInsightSchema.methods._getCurrentValueFromInsight = function() {
  // Extrair valores do insight baseado no tipo
  if (this.data && this.data.currentOEE) {
    return { value: this.data.currentOEE, unit: 'percentual' };
  }
  if (this.data && this.data.wastePercentage) {
    return { value: this.data.wastePercentage, unit: 'percentual' };
  }
  return { value: 0, unit: 'unidades' };
};

aiInsightSchema.methods._getPotentialValueFromInsight = function() {
  const current = this._getCurrentValueFromInsight();
  if (current.unit === 'percentual') {
    // Melhoria estimada baseada na severidade
    const improvement = this.severity === 'high' ? 15 : this.severity === 'medium' ? 10 : 5;
    return { value: current.value + improvement, unit: current.unit };
  }
  return { value: current.value * 0.8, unit: current.unit }; // Redução de 20%
};

aiInsightSchema.methods._getPriorityFromSeverity = function() {
  const severityMap = {
    'critical': 'critical',
    'high': 'high', 
    'medium': 'medium',
    'low': 'low'
  };
  return severityMap[this.severity] || 'medium';
};

aiInsightSchema.methods._getScheduleCategoryFromInsight = function() {
  if (this.title.toLowerCase().includes('desperdício')) return 'process_improvement';
  if (this.title.toLowerCase().includes('oee')) return 'speed_optimization';
  if (this.title.toLowerCase().includes('produção')) return 'speed_optimization';
  if (this.title.toLowerCase().includes('setup')) return 'setup_reduction';
  if (this.title.toLowerCase().includes('qualidade')) return 'quality_improvement';
  if (this.title.toLowerCase().includes('manutenção')) return 'maintenance';
  return 'process_improvement';
};

aiInsightSchema.methods._getCurrentWeek = function() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
};

aiInsightSchema.methods._getNextWeekDate = function() {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return nextWeek;
};

aiInsightSchema.methods._getEstimatedDuration = function() {
  // Duração estimada baseada na severidade (em dias)
  const durationMap = {
    'critical': 3,
    'high': 5,
    'medium': 7,
    'low': 10
  };
  return durationMap[this.severity] || 7;
};

aiInsightSchema.methods._getDifficultyFromSeverity = function() {
  // Mapear severidade para dificuldade
  const difficultyMap = {
    'critical': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
  };
  return difficultyMap[this.severity] || 'medium';
};

// Método para descartar insight
aiInsightSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  return this.save();
};

module.exports = mongoose.model('AIInsight', aiInsightSchema);