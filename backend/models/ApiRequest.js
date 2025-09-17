const mongoose = require('mongoose');

const apiRequestSchema = new mongoose.Schema({
  apiKeyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  endpoint: {
    type: String,
    required: true,
    maxlength: 500
  },
  statusCode: {
    type: Number,
    required: true
  },
  responseTime: {
    type: Number, // em millisegundos
    required: true
  },
  clientIP: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    maxlength: 1000
  },
  requestSize: {
    type: Number, // em bytes
    default: 0
  },
  responseSize: {
    type: Number, // em bytes
    default: 0
  },
  errorMessage: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Índices para performance e queries
apiRequestSchema.index({ apiKeyId: 1, createdAt: -1 });
apiRequestSchema.index({ createdAt: -1 });
apiRequestSchema.index({ statusCode: 1 });
apiRequestSchema.index({ endpoint: 1 });

// TTL index para limpar logs antigos automaticamente (30 dias)
apiRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Método estático para registrar requisição
apiRequestSchema.statics.logRequest = async function(data) {
  try {
    const request = new this(data);
    await request.save();
  } catch (error) {
    // Log silencioso para não afetar a API
    console.error('Erro ao registrar requisição da API:', error.message);
  }
};

// Método estático para obter estatísticas
apiRequestSchema.statics.getStats = async function(apiKeyId, timeRange = 24) {
  const startTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
  
  const stats = await this.aggregate([
    {
      $match: {
        apiKeyId: new mongoose.Types.ObjectId(apiKeyId),
        createdAt: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: {
          $sum: {
            $cond: [{ $lt: ['$statusCode', 400] }, 1, 0]
          }
        },
        errorRequests: {
          $sum: {
            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
          }
        },
        avgResponseTime: { $avg: '$responseTime' },
        totalDataTransfer: { $sum: { $add: ['$requestSize', '$responseSize'] } }
      }
    }
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    successfulRequests: 0,
    errorRequests: 0,
    avgResponseTime: 0,
    totalDataTransfer: 0
  };
};

module.exports = mongoose.model('ApiRequest', apiRequestSchema);