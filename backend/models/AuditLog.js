const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: [true, 'Ação é obrigatória'],
    enum: {
      values: [
        // Autenticação
        'login', 'logout', 'login_failed', 'password_changed', 'password_reset',
        
        // Usuários
        'user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated',
        
        // Máquinas
        'machine_created', 'machine_updated', 'machine_deleted', 'machine_started', 'machine_stopped',
        'machine_maintenance_started', 'machine_maintenance_completed',
        
        // Produção
        'production_started', 'production_stopped', 'production_paused', 'production_resumed',
        'production_order_created', 'production_order_updated', 'production_order_completed',
        
        // Configurações
        'settings_updated', 'system_config_changed', 'security_config_changed',
        
        // Relatórios
        'report_generated', 'report_exported', 'report_scheduled',
        
        // Sistema
        'system_backup', 'system_restore', 'database_maintenance',
        
        // Segurança
        'permission_granted', 'permission_revoked', 'role_assigned', 'role_removed',
        'security_violation', 'unauthorized_access_attempt'
      ],
      message: 'Ação inválida'
    }
  },
  resource: {
    type: String,
    required: [true, 'Recurso é obrigatório'],
    enum: {
      values: [
        'user', 'role', 'machine', 'production', 'report', 'settings', 
        'system', 'auth', 'dashboard', 'analytics'
      ],
      message: 'Recurso inválido'
    }
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validar IPv4 e IPv6
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v) || v === '::1' || v === 'localhost';
      },
      message: 'IP address inválido'
    }
  },
  userAgent: {
    type: String,
    required: true,
    maxlength: [500, 'User Agent muito longo']
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    maxlength: [200, 'Endpoint muito longo']
  },
  statusCode: {
    type: Number,
    required: true,
    min: [100, 'Status code inválido'],
    max: [599, 'Status code inválido']
  },
  responseTime: {
    type: Number, // em millisegundos
    min: [0, 'Tempo de resposta não pode ser negativo']
  },
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  errorMessage: {
    type: String,
    maxlength: [1000, 'Mensagem de erro muito longa']
  },
  severity: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Severidade deve ser: low, medium, high ou critical'
    },
    default: 'low'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag muito longa']
  }],
  sessionId: {
    type: String,
    maxlength: [100, 'Session ID muito longo']
  },
  correlationId: {
    type: String,
    maxlength: [100, 'Correlation ID muito longo']
  }
}, {
  timestamps: true,
  // TTL index - logs expiram após 1 ano
  expireAfterSeconds: 31536000
});

// Índices para performance e consultas
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ success: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // Para consultas por data
auditLogSchema.index({ tags: 1 });
auditLogSchema.index({ correlationId: 1 });

// Índice composto para consultas complexas
auditLogSchema.index({ 
  user: 1, 
  resource: 1, 
  action: 1, 
  createdAt: -1 
});

// Virtual para determinar se é uma ação crítica
auditLogSchema.virtual('isCritical').get(function() {
  const criticalActions = [
    'user_deleted', 'role_removed', 'security_violation', 
    'unauthorized_access_attempt', 'system_backup', 'system_restore',
    'security_config_changed', 'permission_revoked'
  ];
  return criticalActions.includes(this.action) || this.severity === 'critical';
});

// Virtual para formatar data de criação
auditLogSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Método estático para criar log de auditoria
auditLogSchema.statics.createLog = async function(logData) {
  try {
    // Determinar severidade automaticamente se não fornecida
    if (!logData.severity) {
      const criticalActions = [
        'user_deleted', 'security_violation', 'unauthorized_access_attempt',
        'system_backup', 'system_restore', 'security_config_changed'
      ];
      const highActions = [
        'user_created', 'user_updated', 'role_assigned', 'role_removed',
        'permission_granted', 'permission_revoked', 'settings_updated'
      ];
      const mediumActions = [
        'login_failed', 'password_changed', 'machine_started', 'machine_stopped',
        'production_started', 'production_stopped'
      ];
      
      if (criticalActions.includes(logData.action)) {
        logData.severity = 'critical';
      } else if (highActions.includes(logData.action)) {
        logData.severity = 'high';
      } else if (mediumActions.includes(logData.action)) {
        logData.severity = 'medium';
      } else {
        logData.severity = 'low';
      }
    }
    
    // Determinar sucesso baseado no status code se não fornecido
    if (logData.success === undefined && logData.statusCode) {
      logData.success = logData.statusCode >= 200 && logData.statusCode < 400;
    }
    
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    // Não falhar a operação principal se o log falhar
    return null;
  }
};

// Método estático para buscar logs por usuário
auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    startDate,
    endDate,
    actions,
    resources,
    severity
  } = options;
  
  const query = { user: userId };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  if (actions && actions.length > 0) {
    query.action = { $in: actions };
  }
  
  if (resources && resources.length > 0) {
    query.resource = { $in: resources };
  }
  
  if (severity) {
    query.severity = severity;
  }
  
  return this.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Método estático para estatísticas de auditoria
auditLogSchema.statics.getStats = function(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    endDate = new Date()
  } = options;
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
        },
        criticalActions: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        uniqueUsers: { $addToSet: '$user' },
        actionsByType: {
          $push: '$action'
        },
        resourcesByType: {
          $push: '$resource'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalLogs: 1,
        successfulActions: 1,
        failedActions: 1,
        criticalActions: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        successRate: {
          $multiply: [
            { $divide: ['$successfulActions', '$totalLogs'] },
            100
          ]
        }
      }
    }
  ]);
};

// Middleware pre-save para validações adicionais
auditLogSchema.pre('save', function(next) {
  // Adicionar tags automáticas baseadas na ação
  if (!this.tags || this.tags.length === 0) {
    this.tags = [];
    
    if (this.action.includes('login')) {
      this.tags.push('authentication');
    }
    if (this.action.includes('user')) {
      this.tags.push('user-management');
    }
    if (this.action.includes('machine')) {
      this.tags.push('machine-operation');
    }
    if (this.action.includes('production')) {
      this.tags.push('production-control');
    }
    if (this.action.includes('security') || this.action.includes('permission')) {
      this.tags.push('security');
    }
  }
  
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);