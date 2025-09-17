const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
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
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyHash: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    enum: [
      'read:machines',
      'write:machines',
      'read:production',
      'write:production',
      'read:analytics',
      'read:dashboard',
      'webhook:receive',
      'webhook:send'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active'
  },
  rateLimit: {
    requests: {
      type: Number,
      default: 1000 // requests per hour
    },
    window: {
      type: Number,
      default: 3600000 // 1 hour in milliseconds
    }
  },
  allowedIPs: [{
    type: String,
    validate: {
      validator: function(ip) {
        // Validar formato IP (IPv4 ou IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '*';
      },
      message: 'IP address format is invalid'
    }
  }],
  webhookUrl: {
    type: String,
    validate: {
      validator: function(url) {
        if (!url) return true;
        try {
          new URL(url);
          return url.startsWith('https://');
        } catch {
          return false;
        }
      },
      message: 'Webhook URL must be a valid HTTPS URL'
    }
  },
  webhookEvents: [{
    type: String,
    enum: [
      'machine.status_changed',
      'machine.created',
      'machine.updated',
      'production.started',
      'production.completed',
      'production.stopped',
      'alert.created',
      'oee.threshold_exceeded'
    ]
  }],
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Índices para performance
apiKeySchema.index({ keyId: 1, status: 1 });
apiKeySchema.index({ createdBy: 1 });
apiKeySchema.index({ lastUsed: -1 });

// Método para gerar nova API key
apiKeySchema.statics.generateApiKey = function() {
  const keyId = 'oee_' + crypto.randomBytes(16).toString('hex');
  const keySecret = crypto.randomBytes(32).toString('hex');
  const fullKey = `${keyId}.${keySecret}`;
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  
  return {
    keyId,
    fullKey,
    keyHash
  };
};

// Método para verificar API key
apiKeySchema.statics.verifyApiKey = async function(apiKey) {
  if (!apiKey || !apiKey.includes('.')) {
    return null;
  }
  
  const [keyId] = apiKey.split('.');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  const apiKeyDoc = await this.findOne({
    keyId,
    keyHash,
    status: 'active',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('createdBy', 'name email');
  
  if (apiKeyDoc) {
    // Atualizar último uso e contador
    await this.updateOne(
      { _id: apiKeyDoc._id },
      { 
        lastUsed: new Date(),
        $inc: { usageCount: 1 }
      }
    );
  }
  
  return apiKeyDoc;
};

// Método para verificar permissão
apiKeySchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Método para verificar IP permitido
apiKeySchema.methods.isIPAllowed = function(clientIP) {
  if (!this.allowedIPs || this.allowedIPs.length === 0) {
    return true; // Se não há restrição de IP, permite todos
  }
  
  return this.allowedIPs.includes('*') || this.allowedIPs.includes(clientIP);
};

// Método para verificar rate limit
apiKeySchema.methods.checkRateLimit = async function() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - this.rateLimit.window);
  
  // Contar requests na janela de tempo
  const requestCount = await mongoose.model('ApiRequest').countDocuments({
    apiKeyId: this._id,
    createdAt: { $gte: windowStart }
  });
  
  return requestCount < this.rateLimit.requests;
};

// Middleware para hash da key antes de salvar
apiKeySchema.pre('save', function(next) {
  if (this.isNew && !this.keyHash) {
    const generated = this.constructor.generateApiKey();
    this.keyId = generated.keyId;
    this.keyHash = generated.keyHash;
    // Armazenar a chave completa temporariamente para retornar ao usuário
    this._fullKey = generated.fullKey;
  }
  next();
});

module.exports = mongoose.model('ApiKey', apiKeySchema);