const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do perfil é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    enum: {
      values: ['administrador', 'supervisor', 'operador'],
      message: 'Perfil deve ser: administrador, supervisor ou operador'
    }
  },
  displayName: {
    type: String,
    required: [true, 'Nome de exibição é obrigatório'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Descrição do perfil é obrigatória'],
    trim: true
  },
  permissions: [{
    type: String,
    required: true,
    enum: {
      values: [
        // Permissões de Dashboard
        'dashboard.view',
        'dashboard.export',
        
        // Permissões de Máquinas
        'machines.view',
        'machines.create',
        'machines.edit',
        'machines.delete',
        'machines.start',
        'machines.stop',
        'machines.maintenance',
        'machines.status',
        'machines.stats',
        'machines.status_change',
        'machines.assign_operator',
        'machines.view_stats',
        
        // Permissões de Produção
        'production.view',
        'production.create',
        'production.edit',
        'production.delete',
        'production.start',
        'production.stop',
        
        // Permissões de Análise
        'analytics.view',
        'analytics.advanced',
        'analytics.export',
        'analytics.ai_insights',
        
        // Permissões de Relatórios
        'reports.view',
        'reports.create',
        'reports.export',
        'reports.schedule',
        
        // Permissões de Usuários
        'users.view',
        'users.create',
        'users.edit',
        'users.delete',
        'users.manage_roles',
        
        // Permissões de Configurações
        'settings.view',
        'settings.system',
        'settings.security',
        'settings.integrations',
        'settings.alerts',
        'manage_settings',
        'view_audit',
        
        // Permissões de Sistema
        'system.audit_log',
        'system.backup',
        'system.maintenance',
        'system.api_access'
      ],
      message: 'Permissão inválida'
    }
  }],
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
roleSchema.index({ name: 1 });
roleSchema.index({ level: 1 });
roleSchema.index({ isActive: 1 });

// Virtual para contar usuários com este perfil
roleSchema.virtual('userCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'role',
  count: true
});

// Método estático para obter permissões por perfil
roleSchema.statics.getPermissionsByRole = function(roleName) {
  return this.findOne({ name: roleName.toLowerCase(), isActive: true })
    .select('permissions')
    .lean();
};

// Método estático para verificar se usuário tem permissão
roleSchema.statics.hasPermission = async function(userId, permission) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).populate('role');
  
  if (!user || !user.role || !user.role.isActive) {
    return false;
  }
  
  return user.role.permissions.includes(permission);
};

// Método para verificar se pode acessar recurso
roleSchema.methods.canAccess = function(permission) {
  return this.isActive && this.permissions.includes(permission);
};

// Middleware pre-save para validações
roleSchema.pre('save', function(next) {
  // Remover permissões duplicadas
  this.permissions = [...new Set(this.permissions)];
  
  // Definir nível baseado no perfil se não especificado
  if (!this.level) {
    switch (this.name) {
      case 'administrador':
        this.level = 10;
        break;
      case 'supervisor':
        this.level = 5;
        break;
      case 'operador':
        this.level = 1;
        break;
      default:
        this.level = 1;
    }
  }
  
  next();
});

// Middleware pre-remove para verificar dependências
roleSchema.pre('remove', async function(next) {
  const User = mongoose.model('User');
  const userCount = await User.countDocuments({ role: this._id });
  
  if (userCount > 0) {
    const error = new Error(`Não é possível excluir o perfil. Existem ${userCount} usuário(s) associado(s).`);
    error.status = 400;
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Role', roleSchema);