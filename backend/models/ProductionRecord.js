const mongoose = require('mongoose');

const productionRecordSchema = new mongoose.Schema({
  // Informações básicas do registro
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine',
    required: [true, 'Máquina é obrigatória']
  },
  
  // Informações do turno
  shift: {
    type: String,
    required: [true, 'Turno é obrigatório'],
    enum: {
      values: ['morning', 'afternoon', 'night'],
      message: 'Turno deve ser: morning, afternoon ou night'
    }
  },
  
  // Data e horários
  date: {
    type: Date,
    required: [true, 'Data é obrigatória'],
    default: Date.now
  },
  startTime: {
    type: Date,
    required: [true, 'Horário de início é obrigatório']
  },
  endTime: {
    type: Date,
    required: [true, 'Horário de fim é obrigatório']
  },
  
  // Operador responsável
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Operador é obrigatório']
  },
  
  // Material/Produto
  material: {
    code: {
      type: String,
      required: [true, 'Código do material é obrigatório'],
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Nome do material é obrigatório'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  
  // Dados de produção
  production: {
    target: {
      type: Number,
      required: [true, 'Meta de produção é obrigatória'],
      min: [0, 'Meta deve ser positiva']
    },
    good: {
      type: Number,
      required: [true, 'Quantidade produzida é obrigatória'],
      min: [0, 'Quantidade deve ser positiva']
    },
    waste: {
      film: {
        type: Number,
        default: 0,
        min: [0, 'Refugo de filme deve ser positivo']
      },
      organic: {
        type: Number,
        default: 0,
        min: [0, 'Refugo orgânico deve ser positivo']
      }
    },
    total: {
      type: Number,
      default: function() {
        return this.production.good + this.production.waste.film + this.production.waste.organic;
      }
    }
  },
  
  // Tempos operacionais
  time: {
    planned: {
      type: Number,
      required: [true, 'Tempo planejado é obrigatório'],
      min: [0, 'Tempo planejado deve ser positivo'],
      default: 480 // 8 horas em minutos
    },
    actual: {
      type: Number,
      required: [true, 'Tempo real é obrigatório'],
      min: [0, 'Tempo real deve ser positivo']
    },
    downtime: {
      type: Number,
      default: 0,
      min: [0, 'Tempo de parada deve ser positivo']
    }
  },
  
  // Paradas não planejadas
  downtimeEntries: [{
    reason: {
      type: String,
      required: [true, 'Motivo da parada é obrigatório'],
      enum: {
        values: [
          'quebra-equipamento',
          'falta-material',
          'falta-operador',
          'problema-qualidade',
          'limpeza',
          'setup',
          'troca-molde',
          'ajuste-processo',
          'manutencao-preventiva',
          'manutencao-corretiva',
          'outros'
        ],
        message: 'Motivo de parada inválido'
      }
    },
    duration: {
      type: Number,
      required: [true, 'Duração da parada é obrigatória'],
      min: [0, 'Duração deve ser positiva']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    }
  }],
  
  // Métricas OEE calculadas
  oee: {
    availability: {
      type: Number,
      min: [0, 'Disponibilidade deve ser positiva'],
      max: [100, 'Disponibilidade não pode ser maior que 100']
    },
    performance: {
      type: Number,
      min: [0, 'Performance deve ser positiva'],
      max: [100, 'Performance não pode ser maior que 100']
    },
    quality: {
      type: Number,
      min: [0, 'Qualidade deve ser positiva'],
      max: [100, 'Qualidade não pode ser maior que 100']
    },
    overall: {
      type: Number,
      min: [0, 'OEE deve ser positivo'],
      max: [100, 'OEE não pode ser maior que 100']
    }
  },
  
  // Observações
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observações devem ter no máximo 1000 caracteres']
  },
  
  // Status do registro
  status: {
    type: String,
    enum: {
      values: ['draft', 'completed', 'approved', 'rejected'],
      message: 'Status inválido'
    },
    default: 'completed'
  },
  
  // Controle de auditoria
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Aprovação
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para otimização de consultas
productionRecordSchema.index({ machine: 1, date: -1 });
productionRecordSchema.index({ shift: 1, date: -1 });
productionRecordSchema.index({ operator: 1, date: -1 });
productionRecordSchema.index({ 'material.code': 1 });
productionRecordSchema.index({ createdAt: -1 });
productionRecordSchema.index({ status: 1 });
productionRecordSchema.index({ date: -1, shift: 1, machine: 1 }, { unique: true }); // Evita registros duplicados para mesmo turno/máquina/data

// Virtual para duração total do turno
productionRecordSchema.virtual('duration').get(function() {
  if (this.startTime && this.endTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60)); // em minutos
  }
  return 0;
});

// Virtual para eficiência geral
productionRecordSchema.virtual('efficiency').get(function() {
  if (this.production.target > 0) {
    return Math.round((this.production.good / this.production.target) * 100);
  }
  return 0;
});

// Virtual para taxa de refugo
productionRecordSchema.virtual('wasteRate').get(function() {
  const totalWaste = this.production.waste.film + this.production.waste.organic;
  if (this.production.total > 0) {
    return Math.round((totalWaste / this.production.total) * 100);
  }
  return 0;
});

// Middleware para calcular OEE antes de salvar
productionRecordSchema.pre('save', function(next) {
  // Calcular produção total primeiro
  this.production.total = this.production.good + this.production.waste.film + this.production.waste.organic;
  
  // Calcular tempo de parada total
  const downtime = this.downtimeEntries.reduce((total, entry) => total + entry.duration, 0);
  this.time.downtime = downtime;
  
  const plannedTime = this.time.planned;
  const actualTime = this.time.actual;
  
  // Calcular disponibilidade: (Tempo Planejado - Tempo de Parada) / Tempo Planejado
  if (plannedTime > 0) {
    this.oee.availability = Math.min(100, Math.max(0, Math.round(((plannedTime - downtime) / plannedTime) * 100)));
  } else {
    this.oee.availability = 0;
  }
  
  // Calcular performance: Produção Real / Meta de Produção
  if (this.production.target > 0) {
    this.oee.performance = Math.min(100, Math.max(0, Math.round((this.production.good / this.production.target) * 100)));
  } else {
    this.oee.performance = 0;
  }
  
  // Calcular qualidade: Produção Boa / Produção Total
  if (this.production.total > 0) {
    this.oee.quality = Math.min(100, Math.max(0, Math.round((this.production.good / this.production.total) * 100)));
  } else {
    this.oee.quality = 0;
  }
  
  // Calcular OEE geral: (Disponibilidade × Performance × Qualidade) / 10000
  if (this.oee.availability >= 0 && this.oee.performance >= 0 && this.oee.quality >= 0) {
    this.oee.overall = Math.min(100, Math.max(0, Math.round((this.oee.availability * this.oee.performance * this.oee.quality) / 10000)));
  } else {
    this.oee.overall = 0;
  }
  
  next();
});

// Método estático para buscar registros por período
productionRecordSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (options.machine) query.machine = options.machine;
  if (options.shift) query.shift = options.shift;
  if (options.operator) query.operator = options.operator;
  
  return this.find(query)
    .populate('machine', 'name code')
    .populate('operator', 'name email')
    .sort({ date: -1, shift: 1 });
};

// Método estático para obter estatísticas por período
productionRecordSchema.statics.getStatsByPeriod = function(startDate, endDate, groupBy = 'day') {
  const matchStage = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  let groupStage;
  switch (groupBy) {
    case 'shift':
      groupStage = {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          shift: "$shift"
        }
      };
      break;
    case 'machine':
      groupStage = {
        _id: "$machine"
      };
      break;
    default:
      groupStage = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
      };
  }
  
  groupStage.totalProduction = { $sum: "$production.good" };
  groupStage.totalWaste = { $sum: { $add: ["$production.waste.film", "$production.waste.organic"] } };
  groupStage.avgOEE = { $avg: "$oee.overall" };
  groupStage.avgAvailability = { $avg: "$oee.availability" };
  groupStage.avgPerformance = { $avg: "$oee.performance" };
  groupStage.avgQuality = { $avg: "$oee.quality" };
  groupStage.totalDowntime = { $sum: "$time.downtime" };
  groupStage.recordCount = { $sum: 1 };
  
  return this.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    { $sort: { _id: 1 } }
  ]);
};

// Método para detectar turno automaticamente baseado no horário
productionRecordSchema.statics.detectShift = function(dateTime) {
  const hour = new Date(dateTime).getHours();
  
  if (hour >= 6 && hour < 14) {
    return 'morning';
  } else if (hour >= 14 && hour < 22) {
    return 'afternoon';
  } else {
    return 'night';
  }
};

const ProductionRecord = mongoose.model('ProductionRecord', productionRecordSchema);

module.exports = ProductionRecord;