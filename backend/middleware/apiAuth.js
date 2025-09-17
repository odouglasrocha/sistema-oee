const ApiKey = require('../models/ApiKey');
const ApiRequest = require('../models/ApiRequest');
const AuditLog = require('../models/AuditLog');

// Middleware para autenticação via API Key
const authenticateApiKey = async (req, res, next) => {
  const startTime = Date.now();
  let apiKeyDoc = null;
  let statusCode = 200;
  let errorMessage = null;
  
  try {
    // Extrair API key do header
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      statusCode = 401;
      errorMessage = 'API key é obrigatória';
      return res.status(401).json({
        error: 'API key é obrigatória',
        code: 'API_KEY_REQUIRED',
        message: 'Forneça uma API key válida no header X-API-Key ou Authorization'
      });
    }
    
    // Verificar e validar API key
    apiKeyDoc = await ApiKey.verifyApiKey(apiKey);
    
    if (!apiKeyDoc) {
      statusCode = 401;
      errorMessage = 'API key inválida ou expirada';
      
      // Log de tentativa de acesso não autorizado
      await logSecurityEvent(req, null, 'invalid_api_key_attempt', {
        providedKey: apiKey.substring(0, 10) + '...',
        clientIP: getClientIP(req)
      });
      
      return res.status(401).json({
        error: 'API key inválida ou expirada',
        code: 'INVALID_API_KEY'
      });
    }
    
    // Verificar IP permitido
    const clientIP = getClientIP(req);
    if (!apiKeyDoc.isIPAllowed(clientIP)) {
      statusCode = 403;
      errorMessage = 'IP não autorizado';
      
      await logSecurityEvent(req, apiKeyDoc._id, 'ip_not_allowed', {
        clientIP,
        allowedIPs: apiKeyDoc.allowedIPs
      });
      
      return res.status(403).json({
        error: 'IP não autorizado para esta API key',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    // Verificar rate limit
    const rateLimitOk = await apiKeyDoc.checkRateLimit();
    if (!rateLimitOk) {
      statusCode = 429;
      errorMessage = 'Rate limit excedido';
      
      return res.status(429).json({
        error: 'Rate limit excedido',
        code: 'RATE_LIMIT_EXCEEDED',
        limit: apiKeyDoc.rateLimit.requests,
        window: apiKeyDoc.rateLimit.window / 1000 / 60 + ' minutos'
      });
    }
    
    // Adicionar informações da API key ao request
    req.apiKey = apiKeyDoc;
    req.apiKeyId = apiKeyDoc._id;
    req.isApiKeyAuth = true;
    
    next();
    
  } catch (error) {
    console.error('Erro na autenticação da API key:', error);
    statusCode = 500;
    errorMessage = error.message;
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    // Registrar a requisição para estatísticas e rate limiting
    if (apiKeyDoc) {
      const responseTime = Date.now() - startTime;
      
      await ApiRequest.logRequest({
        apiKeyId: apiKeyDoc._id,
        method: req.method,
        endpoint: req.originalUrl,
        statusCode,
        responseTime,
        clientIP: getClientIP(req),
        userAgent: req.headers['user-agent'],
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
        errorMessage
      });
    }
  }
};

// Middleware para verificar permissões específicas
const requireApiPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Autenticação via API key necessária',
        code: 'API_KEY_AUTH_REQUIRED'
      });
    }
    
    if (!req.apiKey.hasPermission(permission)) {
      return res.status(403).json({
        error: `Permissão '${permission}' necessária`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        available: req.apiKey.permissions
      });
    }
    
    next();
  };
};

// Middleware para verificar múltiplas permissões (qualquer uma)
const requireAnyApiPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'Autenticação via API key necessária',
        code: 'API_KEY_AUTH_REQUIRED'
      });
    }
    
    const hasPermission = permissions.some(permission => 
      req.apiKey.hasPermission(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        error: `Uma das seguintes permissões é necessária: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        available: req.apiKey.permissions
      });
    }
    
    next();
  };
};

// Middleware opcional para API key (não obrigatório)
const optionalApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKey) {
    try {
      const apiKeyDoc = await ApiKey.verifyApiKey(apiKey);
      if (apiKeyDoc && apiKeyDoc.isIPAllowed(getClientIP(req))) {
        req.apiKey = apiKeyDoc;
        req.apiKeyId = apiKeyDoc._id;
        req.isApiKeyAuth = true;
      }
    } catch (error) {
      // Ignorar erros em autenticação opcional
      console.warn('Erro na autenticação opcional da API key:', error.message);
    }
  }
  
  next();
};

// Função auxiliar para obter IP do cliente
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

// Função para log de eventos de segurança
const logSecurityEvent = async (req, apiKeyId, action, details = {}) => {
  try {
    await AuditLog.create({
      userId: apiKeyId,
      action,
      resource: 'api_key',
      details: {
        ...details,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req)
    });
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error);
  }
};

// Middleware para adicionar headers de rate limit
const addRateLimitHeaders = async (req, res, next) => {
  if (req.apiKey) {
    const stats = await ApiRequest.getStats(req.apiKey._id, 1); // última hora
    const remaining = Math.max(0, req.apiKey.rateLimit.requests - stats.totalRequests);
    
    res.set({
      'X-RateLimit-Limit': req.apiKey.rateLimit.requests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + req.apiKey.rateLimit.window).toISOString()
    });
  }
  
  next();
};

module.exports = {
  authenticateApiKey,
  requireApiPermission,
  requireAnyApiPermission,
  optionalApiKey,
  addRateLimitHeaders,
  getClientIP
};