const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');

// Middleware para autenticar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      await logSecurityEvent(req, null, 'unauthorized_access_attempt', {
        reason: 'Token não fornecido',
        endpoint: req.originalUrl
      });
      
      return res.status(401).json({
        error: 'Token de acesso requerido',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'oee-monitor',
      audience: 'oee-monitor-users'
    });
    
    // Buscar usuário no banco de dados
    const user = await User.findById(decoded.id)
      .populate('role')
      .select('-password -refreshTokens -twoFactorSecret');
    
    if (!user) {
      await logSecurityEvent(req, decoded.id, 'unauthorized_access_attempt', {
        reason: 'Usuário não encontrado',
        tokenUserId: decoded.id
      });
      
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verificar se usuário está ativo
    if (user.status !== 'active') {
      await logSecurityEvent(req, user._id, 'unauthorized_access_attempt', {
        reason: 'Usuário inativo',
        userStatus: user.status
      });
      
      return res.status(401).json({
        error: 'Conta de usuário inativa',
        code: 'USER_INACTIVE'
      });
    }
    
    // Verificar se conta está bloqueada
    if (user.isLocked) {
      await logSecurityEvent(req, user._id, 'unauthorized_access_attempt', {
        reason: 'Conta bloqueada',
        lockUntil: user.lockUntil
      });
      
      return res.status(401).json({
        error: 'Conta temporariamente bloqueada',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }
    
    // Verificar se o perfil existe e está ativo
    if (!user.role || !user.role.isActive) {
      await logSecurityEvent(req, user._id, 'unauthorized_access_attempt', {
        reason: 'Perfil inativo ou inexistente',
        roleId: user.role?._id
      });
      
      return res.status(403).json({
        error: 'Perfil de usuário inválido',
        code: 'INVALID_ROLE'
      });
    }
    
    // Verificar se a senha foi alterada após a emissão do token
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    if (user.passwordChangedAt && user.passwordChangedAt > tokenIssuedAt) {
      await logSecurityEvent(req, user._id, 'unauthorized_access_attempt', {
        reason: 'Token inválido após mudança de senha',
        tokenIssuedAt,
        passwordChangedAt: user.passwordChangedAt
      });
      
      return res.status(401).json({
        error: 'Token inválido. Faça login novamente.',
        code: 'TOKEN_INVALIDATED'
      });
    }
    
    // Adicionar informações do usuário à requisição
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;
    
    // Atualizar último acesso (de forma assíncrona para não afetar performance)
    setImmediate(() => {
      User.findByIdAndUpdate(user._id, {
        lastLogin: new Date(),
        lastLoginIP: getClientIP(req)
      }).catch(err => {
        console.error('Erro ao atualizar último acesso:', err);
      });
    });
    
    next();
    
  } catch (error) {
    let errorCode = 'TOKEN_INVALID';
    let errorMessage = 'Token inválido';
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token expirado';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'TOKEN_MALFORMED';
      errorMessage = 'Token malformado';
    }
    
    await logSecurityEvent(req, null, 'unauthorized_access_attempt', {
      reason: errorMessage,
      error: error.message,
      tokenError: error.name
    });
    
    return res.status(401).json({
      error: errorMessage,
      code: errorCode
    });
  }
};

// Middleware para verificar permissões específicas
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      const hasPermission = req.user.role.permissions.includes(permission);
      
      if (!hasPermission) {
        await logSecurityEvent(req, req.user._id, 'unauthorized_access_attempt', {
          reason: 'Permissão insuficiente',
          requiredPermission: permission,
          userPermissions: req.user.role.permissions
        });
        
        return res.status(403).json({
          error: 'Permissão insuficiente',
          code: 'INSUFFICIENT_PERMISSION',
          required: permission
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Erro na verificação de permissão:', error);
      return res.status(500).json({
        error: 'Erro interno na verificação de permissões',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// Middleware para verificar múltiplas permissões (OR)
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      const hasAnyPermission = permissions.some(permission => 
        req.user.role.permissions.includes(permission)
      );
      
      if (!hasAnyPermission) {
        await logSecurityEvent(req, req.user._id, 'unauthorized_access_attempt', {
          reason: 'Nenhuma permissão necessária encontrada',
          requiredPermissions: permissions,
          userPermissions: req.user.role.permissions
        });
        
        return res.status(403).json({
          error: 'Permissão insuficiente',
          code: 'INSUFFICIENT_PERMISSION',
          required: permissions
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Erro na verificação de permissões:', error);
      return res.status(500).json({
        error: 'Erro interno na verificação de permissões',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// Middleware para verificar nível de perfil mínimo
const requireMinLevel = (minLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      if (req.user.role.level < minLevel) {
        await logSecurityEvent(req, req.user._id, 'unauthorized_access_attempt', {
          reason: 'Nível de acesso insuficiente',
          requiredLevel: minLevel,
          userLevel: req.user.role.level
        });
        
        return res.status(403).json({
          error: 'Nível de acesso insuficiente',
          code: 'INSUFFICIENT_LEVEL',
          required: minLevel,
          current: req.user.role.level
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Erro na verificação de nível:', error);
      return res.status(500).json({
        error: 'Erro interno na verificação de nível',
        code: 'LEVEL_CHECK_ERROR'
      });
    }
  };
};

// Middleware para verificar se usuário pode acessar recurso próprio ou tem permissão admin
const requireOwnershipOrPermission = (permission, userIdParam = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuário não autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      const targetUserId = req.params[userIdParam] || req.body[userIdParam];
      const isOwner = req.user._id.toString() === targetUserId;
      const hasPermission = req.user.role.permissions.includes(permission);
      
      if (!isOwner && !hasPermission) {
        await logSecurityEvent(req, req.user._id, 'unauthorized_access_attempt', {
          reason: 'Tentativa de acesso a recurso de outro usuário sem permissão',
          targetUserId,
          requiredPermission: permission
        });
        
        return res.status(403).json({
          error: 'Acesso negado. Você só pode acessar seus próprios recursos ou precisa de permissão administrativa.',
          code: 'ACCESS_DENIED'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Erro na verificação de propriedade:', error);
      return res.status(500).json({
        error: 'Erro interno na verificação de acesso',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

// Middleware opcional de autenticação (não falha se não houver token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'oee-monitor',
      audience: 'oee-monitor-users'
    });
    
    const user = await User.findById(decoded.id)
      .populate('role')
      .select('-password -refreshTokens -twoFactorSecret');
    
    if (user && user.status === 'active' && !user.isLocked) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }
    
    next();
    
  } catch (error) {
    // Ignorar erros de token em autenticação opcional
    next();
  }
};

// Função auxiliar para obter IP do cliente
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
};

// Função auxiliar para registrar eventos de segurança
const logSecurityEvent = async (req, userId, action, details = {}) => {
  try {
    await AuditLog.createLog({
      user: userId,
      action,
      resource: 'auth',
      details,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: 401,
      success: false,
      severity: 'high'
    });
  } catch (error) {
    console.error('Erro ao registrar evento de segurança:', error);
  }
};

// Middleware para log de auditoria de ações bem-sucedidas
const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Interceptar a resposta para capturar o status code
    const originalSend = res.send;
    const startTime = Date.now();
    
    res.send = function(data) {
      const responseTime = Date.now() - startTime;
      
      // Registrar log de auditoria de forma assíncrona
      setImmediate(async () => {
        try {
          if (req.user) {
            await AuditLog.createLog({
              user: req.user._id,
              action,
              resource,
              resourceId: req.params.id || req.body.id || null,
              details: {
                method: req.method,
                params: req.params,
                query: req.query,
                // Não incluir dados sensíveis no body
                bodyKeys: req.body ? Object.keys(req.body) : []
              },
              ipAddress: getClientIP(req),
              userAgent: req.headers['user-agent'] || 'unknown',
              method: req.method,
              endpoint: req.originalUrl,
              statusCode: res.statusCode,
              responseTime,
              success: res.statusCode >= 200 && res.statusCode < 400
            });
          }
        } catch (error) {
          console.error('Erro ao registrar log de auditoria:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireAnyPermission,
  requireMinLevel,
  requireOwnershipOrPermission,
  optionalAuth,
  auditLog,
  getClientIP
};