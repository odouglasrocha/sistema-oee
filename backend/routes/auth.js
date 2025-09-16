const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, getClientIP, auditLog } = require('../middleware/auth');

const router = express.Router();

// Validações de entrada
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
];

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('Senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número'),
  body('role')
    .optional()
    .isMongoId()
    .withMessage('ID do perfil inválido'),
  body('department')
    .optional()
    .isIn(['producao', 'manutencao', 'qualidade', 'engenharia', 'administracao', 'ti'])
    .withMessage('Departamento inválido')
];

// Rota de login
router.post('/login', loginValidation, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }
    
    const { email, password, rememberMe = false } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Buscar usuário por email
    const user = await User.findByEmail(email);
    
    if (!user) {
      // Log de tentativa de login com email inexistente
      await AuditLog.createLog({
        user: null,
        action: 'login_failed',
        resource: 'auth',
        details: {
          email,
          reason: 'Email não encontrado',
          clientIP,
          userAgent
        },
        ipAddress: clientIP,
        userAgent,
        method: 'POST',
        endpoint: '/api/auth/login',
        statusCode: 401,
        responseTime: Date.now() - startTime,
        success: false,
        severity: 'medium'
      });
      
      return res.status(401).json({
        error: 'Email ou senha incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar se conta está bloqueada
    if (user.isLocked) {
      await AuditLog.createLog({
        user: user._id,
        action: 'login_failed',
        resource: 'auth',
        details: {
          email,
          reason: 'Conta bloqueada',
          lockUntil: user.lockUntil,
          clientIP,
          userAgent
        },
        ipAddress: clientIP,
        userAgent,
        method: 'POST',
        endpoint: '/api/auth/login',
        statusCode: 423,
        responseTime: Date.now() - startTime,
        success: false,
        severity: 'high'
      });
      
      return res.status(423).json({
        error: 'Conta temporariamente bloqueada devido a múltiplas tentativas de login falhadas',
        code: 'ACCOUNT_LOCKED',
        lockUntil: user.lockUntil
      });
    }
    
    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Incrementar tentativas de login
      await user.incLoginAttempts();
      
      await AuditLog.createLog({
        user: user._id,
        action: 'login_failed',
        resource: 'auth',
        details: {
          email,
          reason: 'Senha incorreta',
          loginAttempts: user.loginAttempts + 1,
          clientIP,
          userAgent
        },
        ipAddress: clientIP,
        userAgent,
        method: 'POST',
        endpoint: '/api/auth/login',
        statusCode: 401,
        responseTime: Date.now() - startTime,
        success: false,
        severity: 'medium'
      });
      
      return res.status(401).json({
        error: 'Email ou senha incorretos',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar status do usuário
    if (user.status !== 'active') {
      await AuditLog.createLog({
        user: user._id,
        action: 'login_failed',
        resource: 'auth',
        details: {
          email,
          reason: 'Usuário inativo',
          userStatus: user.status,
          clientIP,
          userAgent
        },
        ipAddress: clientIP,
        userAgent,
        method: 'POST',
        endpoint: '/api/auth/login',
        statusCode: 403,
        responseTime: Date.now() - startTime,
        success: false,
        severity: 'medium'
      });
      
      return res.status(403).json({
        error: 'Conta de usuário inativa. Entre em contato com o administrador.',
        code: 'USER_INACTIVE',
        status: user.status
      });
    }
    
    // Verificar se o perfil existe e está ativo
    if (!user.role || !user.role.isActive) {
      await AuditLog.createLog({
        user: user._id,
        action: 'login_failed',
        resource: 'auth',
        details: {
          email,
          reason: 'Perfil inativo ou inexistente',
          roleId: user.role?._id,
          clientIP,
          userAgent
        },
        ipAddress: clientIP,
        userAgent,
        method: 'POST',
        endpoint: '/api/auth/login',
        statusCode: 403,
        responseTime: Date.now() - startTime,
        success: false,
        severity: 'high'
      });
      
      return res.status(403).json({
        error: 'Perfil de usuário inválido. Entre em contato com o administrador.',
        code: 'INVALID_ROLE'
      });
    }
    
    // Login bem-sucedido - resetar tentativas
    await user.resetLoginAttempts();
    
    // Gerar tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken(userAgent, clientIP);
    
    // Salvar refresh token
    await user.save();
    
    // Atualizar último login
    user.lastLogin = new Date();
    user.lastLoginIP = clientIP;
    await user.save();
    
    // Log de login bem-sucedido
    await AuditLog.createLog({
      user: user._id,
      action: 'login',
      resource: 'auth',
      details: {
        email,
        rememberMe,
        clientIP,
        userAgent,
        roleName: user.role.name
      },
      ipAddress: clientIP,
      userAgent,
      method: 'POST',
      endpoint: '/api/auth/login',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      success: true,
      severity: 'low'
    });
    
    // Configurar cookie do refresh token se "lembrar de mim" estiver ativado
    if (rememberMe) {
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
      });
    }
    
    // Resposta de sucesso
    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role._id,
          name: user.role.name,
          displayName: user.role.displayName,
          permissions: user.role.permissions,
          level: user.role.level
        },
        status: user.status,
        department: user.department,
        location: user.location,
        avatar: user.avatar,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        passwordNeedsChange: user.passwordNeedsChange()
      },
      tokens: {
        accessToken,
        refreshToken: rememberMe ? undefined : refreshToken, // Só retornar se não for cookie
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    
    // Log de erro interno
    await AuditLog.createLog({
      user: null,
      action: 'login_failed',
      resource: 'auth',
      details: {
        error: error.message,
        stack: error.stack
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      method: 'POST',
      endpoint: '/api/auth/login',
      statusCode: 500,
      responseTime: Date.now() - startTime,
      success: false,
      severity: 'critical'
    });
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota de registro (apenas para administradores)
router.post('/register', authenticateToken, registerValidation, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Verificar se usuário tem permissão para criar usuários
    if (!req.user.role.permissions.includes('users.create')) {
      return res.status(403).json({
        error: 'Permissão insuficiente para criar usuários',
        code: 'INSUFFICIENT_PERMISSION'
      });
    }
    
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: errors.array()
      });
    }
    
    const { name, email, password, role: roleId, department, location, phone } = req.body;
    
    // Verificar se email já existe
    const existingUser = await User.emailExists(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }
    
    // Buscar perfil ou usar perfil padrão (operador)
    let userRole;
    if (roleId) {
      userRole = await Role.findById(roleId);
      if (!userRole) {
        return res.status(400).json({
          error: 'Perfil não encontrado',
          code: 'ROLE_NOT_FOUND'
        });
      }
    } else {
      userRole = await Role.findOne({ name: 'operador' });
      if (!userRole) {
        return res.status(500).json({
          error: 'Perfil padrão não encontrado. Configure os perfis do sistema.',
          code: 'DEFAULT_ROLE_NOT_FOUND'
        });
      }
    }
    
    // Verificar se usuário pode atribuir este perfil
    if (userRole.level >= req.user.role.level) {
      return res.status(403).json({
        error: 'Você não pode criar usuários com nível igual ou superior ao seu',
        code: 'INSUFFICIENT_LEVEL'
      });
    }
    
    // Criar novo usuário
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: userRole._id,
      department,
      location,
      phone,
      status: 'active',
      createdBy: req.user._id
    });
    
    await newUser.save();
    
    // Buscar usuário criado com dados do perfil
    const createdUser = await User.findById(newUser._id)
      .populate('role')
      .select('-password -refreshTokens');
    
    // Log de criação de usuário
    await AuditLog.createLog({
      user: req.user._id,
      action: 'user_created',
      resource: 'user',
      resourceId: createdUser._id,
      details: {
        createdUserEmail: createdUser.email,
        createdUserName: createdUser.name,
        assignedRole: userRole.name,
        department: createdUser.department
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      method: 'POST',
      endpoint: '/api/auth/register',
      statusCode: 201,
      responseTime: Date.now() - startTime,
      success: true,
      severity: 'medium'
    });
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: {
          id: createdUser.role._id,
          name: createdUser.role.name,
          displayName: createdUser.role.displayName
        },
        status: createdUser.status,
        department: createdUser.department,
        location: createdUser.location,
        createdAt: createdUser.createdAt
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Email já está em uso',
        code: 'EMAIL_EXISTS'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota de logout
router.post('/logout', authenticateToken, auditLog('logout', 'auth'), async (req, res) => {
  try {
    const { logoutAll = false } = req.body;
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (logoutAll) {
      // Revogar todos os refresh tokens
      req.user.revokeAllRefreshTokens();
    } else if (refreshToken) {
      // Revogar apenas o refresh token específico
      req.user.revokeRefreshToken(refreshToken);
    }
    
    await req.user.save();
    
    // Limpar cookie se existir
    res.clearCookie('refreshToken');
    
    res.json({
      message: logoutAll ? 'Logout realizado em todos os dispositivos' : 'Logout realizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }
    
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET, {
      issuer: 'oee-monitor',
      audience: 'oee-monitor-refresh'
    });
    
    // Buscar usuário
    const user = await User.findById(decoded.id)
      .populate('role')
      .select('-password -twoFactorSecret');
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verificar se refresh token existe na lista do usuário
    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    if (!tokenExists) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Verificar status do usuário
    if (user.status !== 'active' || user.isLocked) {
      return res.status(401).json({
        error: 'Usuário inativo ou bloqueado',
        code: 'USER_INACTIVE'
      });
    }
    
    // Gerar novo access token
    const newAccessToken = user.generateAuthToken();
    
    res.json({
      accessToken: newAccessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role._id,
          name: user.role.name,
          displayName: user.role.displayName,
          permissions: user.role.permissions,
          level: user.role.level
        },
        status: user.status
      }
    });
    
  } catch (error) {
    console.error('Erro no refresh token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: {
        id: req.user.role._id,
        name: req.user.role.name,
        displayName: req.user.role.displayName,
        permissions: req.user.role.permissions,
        level: req.user.role.level
      },
      status: req.user.status,
      department: req.user.department,
      location: req.user.location,
      avatar: req.user.avatar,
      preferences: req.user.preferences,
      lastLogin: req.user.lastLogin,
      passwordNeedsChange: req.user.passwordNeedsChange()
    }
  });
});

// Rota para alterar senha
router.post('/change-password', 
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Senha atual é obrigatória'),
    body('newPassword')
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
      .withMessage('Nova senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número')
  ],
  auditLog('password_changed', 'auth'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      // Buscar usuário com senha
      const user = await User.findById(req.user._id).select('+password');
      
      // Verificar senha atual
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Senha atual incorreta',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }
      
      // Verificar se nova senha é diferente da atual
      const isSamePassword = await user.comparePassword(newPassword);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'A nova senha deve ser diferente da senha atual',
          code: 'SAME_PASSWORD'
        });
      }
      
      // Atualizar senha
      user.password = newPassword;
      await user.save();
      
      // Revogar todos os refresh tokens para forçar novo login
      user.revokeAllRefreshTokens();
      await user.save();
      
      res.json({
        message: 'Senha alterada com sucesso. Faça login novamente.'
      });
      
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;