const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Email inválido'
    ]
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Por padrão não incluir a senha nas consultas
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Perfil é obrigatório']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending'],
      message: 'Status deve ser: active, inactive, suspended ou pending'
    },
    default: 'active'
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Telefone inválido']
  },
  department: {
    type: String,
    trim: true,
    enum: {
      values: ['producao', 'manutencao', 'qualidade', 'engenharia', 'administracao', 'ti'],
      message: 'Departamento inválido'
    }
  },
  location: {
    type: String,
    trim: true
  },
  
  // Configurações de segurança
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  
  // Configurações de sessão
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 dias
    },
    userAgent: String,
    ipAddress: String
  }],
  
  // Configurações de 2FA (para futuro)
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  // Configurações de preferências
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      enum: ['pt-BR', 'en-US', 'es-ES'],
      default: 'pt-BR'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      maintenance: { type: Boolean, default: true },
      production: { type: Boolean, default: true }
    }
  },
  
  // Auditoria
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
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.twoFactorSecret;
      delete ret.passwordResetToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices para performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ department: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Virtual para verificar se conta está bloqueada
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual para nome completo do perfil
userSchema.virtual('roleName', {
  ref: 'Role',
  localField: 'role',
  foreignField: '_id',
  justOne: true
});

// Middleware pre-save para hash da senha
userSchema.pre('save', async function(next) {
  // Só fazer hash se a senha foi modificada
  if (!this.isModified('password')) return next();
  
  try {
    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    
    // Atualizar data de mudança da senha
    this.passwordChangedAt = Date.now();
    
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    throw new Error('Senha não encontrada para este usuário');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para gerar JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    status: this.status
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      issuer: 'oee-monitor',
      audience: 'oee-monitor-users'
    }
  );
};

// Método para gerar refresh token
userSchema.methods.generateRefreshToken = function(userAgent, ipAddress) {
  const refreshToken = jwt.sign(
    { id: this._id, type: 'refresh' },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'oee-monitor',
      audience: 'oee-monitor-refresh'
    }
  );
  
  // Adicionar refresh token ao array
  this.refreshTokens.push({
    token: refreshToken,
    userAgent: userAgent,
    ipAddress: ipAddress
  });
  
  // Manter apenas os últimos 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return refreshToken;
};

// Método para revogar refresh token
userSchema.methods.revokeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
};

// Método para revogar todos os refresh tokens
userSchema.methods.revokeAllRefreshTokens = function() {
  this.refreshTokens = [];
};

// Método para incrementar tentativas de login
userSchema.methods.incLoginAttempts = function() {
  // Se já tem um lock e ainda não expirou, apenas retorna
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
  const lockTime = parseInt(process.env.LOCKOUT_TIME) || 900000; // 15 minutos
  
  // Se atingiu o máximo de tentativas e não está bloqueado, bloquear
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Método para resetar tentativas de login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: Date.now() }
  });
};

// Método para verificar se senha precisa ser alterada
userSchema.methods.passwordNeedsChange = function() {
  const passwordExpiry = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
  const expiryDate = new Date(this.passwordChangedAt);
  expiryDate.setDate(expiryDate.getDate() + passwordExpiry);
  return Date.now() > expiryDate;
};

// Método estático para encontrar por email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() })
    .populate('role')
    .select('+password');
};

// Método estático para verificar se email existe
userSchema.statics.emailExists = function(email, excludeId = null) {
  const query = { email: email.toLowerCase() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

// Middleware pre-remove para limpeza
userSchema.pre('remove', async function(next) {
  // Aqui você pode adicionar lógica para limpar dados relacionados
  // Por exemplo, logs de auditoria, sessões ativas, etc.
  next();
});

module.exports = mongoose.model('User', userSchema);