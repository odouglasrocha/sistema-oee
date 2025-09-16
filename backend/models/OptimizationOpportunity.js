const mongoose = require('mongoose');

const optimizationOpportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['speed', 'setup_time', 'waste_reduction', 'availability', 'quality', 'maintenance', 'energy']
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: true
  },
  currentValue: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  },
  potentialValue: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    }
  },
  impact: {
    oee: {
      type: Number,
      min: -100,
      max: 100
    },
    availability: {
      type: Number,
      min: -100,
      max: 100
    },
    performance: {
      type: Number,
      min: -100,
      max: 100
    },
    quality: {
      type: Number,
      min: -100,
      max: 100
    }
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  estimatedCost: {
    type: Number,
    min: 0
  },
  estimatedSavings: {
    monthly: {
      type: Number,
      min: 0
    },
    annual: {
      type: Number,
      min: 0
    }
  },
  implementationTime: {
    type: Number, // em dias
    min: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['identified', 'planned', 'in_progress', 'completed', 'cancelled'],
    default: 'identified'
  },
  description: {
    type: String,
    required: true
  },
  requirements: [{
    type: String,
    trim: true
  }],
  risks: [{
    description: String,
    probability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  plannedStartDate: {
    type: Date
  },
  plannedEndDate: {
    type: Date
  },
  actualStartDate: {
    type: Date
  },
  actualEndDate: {
    type: Date
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  notes: {
    type: String
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiGenerated: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  dataSource: {
    type: String,
    enum: ['manual', 'ai_analysis', 'historical_data', 'benchmark']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
optimizationOpportunitySchema.index({ machineId: 1, status: 1 });
optimizationOpportunitySchema.index({ category: 1, priority: 1 });
optimizationOpportunitySchema.index({ createdAt: -1 });
optimizationOpportunitySchema.index({ plannedStartDate: 1 });

// Virtual para calcular ROI
optimizationOpportunitySchema.virtual('roi').get(function() {
  if (this.estimatedCost && this.estimatedSavings && this.estimatedSavings.annual) {
    return ((this.estimatedSavings.annual - this.estimatedCost) / this.estimatedCost) * 100;
  }
  return null;
});

// Virtual para calcular payback period (em meses)
optimizationOpportunitySchema.virtual('paybackPeriod').get(function() {
  if (this.estimatedCost && this.estimatedSavings && this.estimatedSavings.monthly) {
    return this.estimatedCost / this.estimatedSavings.monthly;
  }
  return null;
});

// Virtual para verificar se está atrasado
optimizationOpportunitySchema.virtual('isOverdue').get(function() {
  return this.plannedEndDate && this.plannedEndDate < new Date() && this.status !== 'completed';
});

// Método estático para buscar por prioridade
optimizationOpportunitySchema.statics.findByPriority = function(priority) {
  return this.find({ priority, status: { $ne: 'cancelled' } })
    .populate('machineId', 'name code')
    .populate('assignedTo', 'name email')
    .sort({ createdAt: -1 });
};

// Método estático para buscar oportunidades ativas
optimizationOpportunitySchema.statics.findActive = function() {
  return this.find({ status: { $in: ['identified', 'planned', 'in_progress'] } })
    .populate('machineId', 'name code')
    .populate('assignedTo', 'name email')
    .sort({ priority: -1, createdAt: -1 });
};

// Método para atualizar progresso
optimizationOpportunitySchema.methods.updateProgress = function(progress, notes) {
  this.progress = progress;
  if (notes) this.notes = notes;
  
  if (progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.actualEndDate = new Date();
  }
  
  return this.save();
};

// Método para iniciar implementação
optimizationOpportunitySchema.methods.startImplementation = function(userId) {
  this.status = 'in_progress';
  this.actualStartDate = new Date();
  if (userId) this.assignedTo = userId;
  return this.save();
};

module.exports = mongoose.model('OptimizationOpportunity', optimizationOpportunitySchema);