const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  // Informações básicas da máquina
  name: {
    type: String,
    required: [true, 'Nome da máquina é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  code: {
    type: String,
    required: [true, 'Código da máquina é obrigatório'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Código deve ter no máximo 20 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  
  // Especificações técnicas
  manufacturer: {
    type: String,
    required: [true, 'Fabricante é obrigatório'],
    trim: true,
    maxlength: [100, 'Fabricante deve ter no máximo 100 caracteres']
  },
  model: {
    type: String,
    required: [true, 'Modelo é obrigatório'],
    trim: true,
    maxlength: [100, 'Modelo deve ter no máximo 100 caracteres']
  },
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Número de série deve ter no máximo 50 caracteres']
  },
  yearManufacture: {
    type: Number,
    min: [1900, 'Ano de fabricação deve ser maior que 1900'],
    max: [new Date().getFullYear(), 'Ano de fabricação não pode ser futuro']
  },
  
  // Capacidade e especificações operacionais
  capacity: {
    value: {
      type: Number,
      required: [true, 'Capacidade é obrigatória'],
      min: [0, 'Capacidade deve ser positiva']
    },
    unit: {
      type: String,
      required: [true, 'Unidade de capacidade é obrigatória'],
      enum: {
        values: ['pcs/h', 'kg/h', 't/h', 'l/h', 'm³/h', 'unidades/min', 'outros'],
        message: 'Unidade de capacidade inválida'
      }
    }
  },
  
  // Localização e organização
  location: {
    plant: {
      type: String,
      required: [true, 'Planta é obrigatória'],
      trim: true
    },
    area: {
      type: String,
      required: [true, 'Área é obrigatória'],
      trim: true
    },
    line: {
      type: String,
      trim: true
    },
    position: {
      type: String,
      trim: true
    }
  },
  
  // Categoria e tipo
  category: {
    type: String,
    required: [true, 'Categoria é obrigatória'],
    enum: {
      values: [
        'Produção',
        'Embalagem',
        'Transporte',
        'Qualidade',
        'Manutenção',
        'Utilidades',
        'Outros'
      ],
      message: 'Categoria inválida'
    }
  },
  
  type: {
    type: String,
    required: [true, 'Tipo é obrigatório'],
    enum: {
      values: [
        'Automática',
        'Semi-automática',
        'Manual',
        'CNC',
        'Robótica',
        'Hidráulica',
        'Pneumática',
        'Elétrica'
      ],
      message: 'Tipo inválido'
    }
  },
  
  // Status operacional
  status: {
    type: String,
    required: true,
    enum: {
      values: ['Ativa', 'Inativa', 'Manutenção', 'Parada', 'Descartada'],
      message: 'Status inválido'
    },
    default: 'Ativa'
  },
  
  // Informações de manutenção
  maintenance: {
    lastMaintenance: {
      type: Date
    },
    nextMaintenance: {
      type: Date
    },
    maintenanceInterval: {
      type: Number, // em dias
      min: [1, 'Intervalo de manutenção deve ser positivo']
    },
    maintenanceType: {
      type: String,
      enum: ['Preventiva', 'Preditiva', 'Corretiva', 'Não definida'],
      default: 'Não definida'
    }
  },
  
  // Informações de aquisição
  acquisition: {
    purchaseDate: {
      type: Date
    },
    purchaseValue: {
      type: Number,
      min: [0, 'Valor de compra deve ser positivo']
    },
    supplier: {
      type: String,
      trim: true
    },
    warranty: {
      startDate: Date,
      endDate: Date,
      description: String
    }
  },
  
  // Especificações técnicas detalhadas
  specifications: {
    power: {
      value: Number,
      unit: {
        type: String,
        enum: ['kW', 'HP', 'W', 'CV']
      }
    },
    voltage: {
      value: Number,
      unit: {
        type: String,
        enum: ['V', 'kV']
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 't', 'g']
      }
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['mm', 'cm', 'm'],
        default: 'mm'
      }
    }
  },
  
  // Responsáveis
  responsible: {
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Documentação e anexos
  documentation: {
    manual: String, // URL ou caminho do manual
    certificates: [String], // URLs ou caminhos dos certificados
    drawings: [String], // URLs ou caminhos dos desenhos técnicos
    photos: [String] // URLs das fotos da máquina
  },
  
  // Configurações de OEE
  oeeConfig: {
    targetOEE: {
      type: Number,
      min: [0, 'OEE alvo deve ser positivo'],
      max: [100, 'OEE alvo não pode ser maior que 100'],
      default: 85
    },
    targetAvailability: {
      type: Number,
      min: [0, 'Disponibilidade alvo deve ser positiva'],
      max: [100, 'Disponibilidade alvo não pode ser maior que 100'],
      default: 90
    },
    targetPerformance: {
      type: Number,
      min: [0, 'Performance alvo deve ser positiva'],
      max: [100, 'Performance alvo não pode ser maior que 100'],
      default: 95
    },
    targetQuality: {
      type: Number,
      min: [0, 'Qualidade alvo deve ser positiva'],
      max: [100, 'Qualidade alvo não pode ser maior que 100'],
      default: 99
    }
  },
  
  // Observações e notas
  notes: {
    type: String,
    maxlength: [1000, 'Observações devem ter no máximo 1000 caracteres']
  },
  
  // Controle de versão e auditoria
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

// Índices para performance
machineSchema.index({ code: 1 });
machineSchema.index({ name: 1 });
machineSchema.index({ status: 1 });
machineSchema.index({ category: 1 });
machineSchema.index({ 'location.plant': 1, 'location.area': 1 });
machineSchema.index({ manufacturer: 1, model: 1 });
machineSchema.index({ createdAt: -1 });
machineSchema.index({ isActive: 1 });

// Virtual para nome completo da localização
machineSchema.virtual('fullLocation').get(function() {
  const parts = [this.location.plant, this.location.area];
  if (this.location.line) parts.push(this.location.line);
  if (this.location.position) parts.push(this.location.position);
  return parts.join(' > ');
});

// Virtual para próxima manutenção em dias
machineSchema.virtual('daysToNextMaintenance').get(function() {
  if (!this.maintenance.nextMaintenance) return null;
  const today = new Date();
  const nextMaintenance = new Date(this.maintenance.nextMaintenance);
  const diffTime = nextMaintenance - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para idade da máquina
machineSchema.virtual('age').get(function() {
  if (!this.yearManufacture) return null;
  return new Date().getFullYear() - this.yearManufacture;
});

// Middleware pre-save para validações customizadas
machineSchema.pre('save', function(next) {
  // Garantir que o código seja único e em maiúsculo
  if (this.code) {
    this.code = this.code.toUpperCase().trim();
  }
  
  // Validar datas de manutenção
  if (this.maintenance.lastMaintenance && this.maintenance.nextMaintenance) {
    if (this.maintenance.nextMaintenance <= this.maintenance.lastMaintenance) {
      return next(new Error('Data da próxima manutenção deve ser posterior à última manutenção'));
    }
  }
  
  // Validar garantia
  if (this.acquisition.warranty.startDate && this.acquisition.warranty.endDate) {
    if (this.acquisition.warranty.endDate <= this.acquisition.warranty.startDate) {
      return next(new Error('Data de fim da garantia deve ser posterior ao início'));
    }
  }
  
  next();
});

// Métodos estáticos
machineSchema.statics.findByLocation = function(plant, area) {
  return this.find({
    'location.plant': plant,
    'location.area': area,
    isActive: true
  });
};

machineSchema.statics.findByStatus = function(status) {
  return this.find({ status, isActive: true });
};

machineSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

machineSchema.statics.getMaintenanceDue = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'maintenance.nextMaintenance': { $lte: futureDate },
    status: { $in: ['Ativa', 'Parada'] },
    isActive: true
  });
};

// Métodos de instância
machineSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.updatedBy = userId;
  return this.save();
};

machineSchema.methods.scheduleMaintenance = function(date, userId) {
  this.maintenance.nextMaintenance = date;
  this.updatedBy = userId;
  return this.save();
};

machineSchema.methods.completeMaintenance = function(userId) {
  this.maintenance.lastMaintenance = new Date();
  
  // Calcular próxima manutenção se houver intervalo definido
  if (this.maintenance.maintenanceInterval) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + this.maintenance.maintenanceInterval);
    this.maintenance.nextMaintenance = nextDate;
  }
  
  this.updatedBy = userId;
  return this.save();
};

// Middleware para auditoria
machineSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

machineSchema.pre('updateOne', function() {
  this.set({ updatedAt: new Date() });
});

machineSchema.pre('updateMany', function() {
  this.set({ updatedAt: new Date() });
});

const Machine = mongoose.model('Machine', machineSchema);

module.exports = Machine;