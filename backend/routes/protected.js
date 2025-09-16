const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { requirePermission, auditLog } = require('../middleware/auth');

const router = express.Router();

// Rota para obter perfil do usuário atual
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .select('-password -refreshTokens -twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json({
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
        phone: user.phone,
        avatar: user.avatar,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        passwordNeedsChange: user.passwordNeedsChange(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para atualizar perfil do usuário atual
router.put('/profile', 
  [
    // Validações para atualização de perfil
    require('express-validator').body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    require('express-validator').body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Telefone inválido'),
    require('express-validator').body('preferences.theme')
      .optional()
      .isIn(['light', 'dark', 'system'])
      .withMessage('Tema inválido'),
    require('express-validator').body('preferences.language')
      .optional()
      .isIn(['pt-BR', 'en-US', 'es-ES'])
      .withMessage('Idioma inválido')
  ],
  auditLog('profile_updated', 'user'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const allowedUpdates = ['name', 'phone', 'preferences'];
      const updates = {};
      
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      
      // Se atualizando preferências, fazer merge com as existentes
      if (updates.preferences) {
        const currentUser = await User.findById(req.user._id);
        updates.preferences = {
          ...currentUser.preferences,
          ...updates.preferences
        };
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      )
        .populate('role')
        .select('-password -refreshTokens -twoFactorSecret');
      
      res.json({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser
      });
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Rota para obter permissões do usuário atual
router.get('/permissions', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role');
    
    if (!user || !user.role) {
      return res.status(404).json({
        error: 'Usuário ou perfil não encontrado',
        code: 'USER_OR_ROLE_NOT_FOUND'
      });
    }
    
    res.json({
      permissions: user.role.permissions,
      role: {
        id: user.role._id,
        name: user.role.name,
        displayName: user.role.displayName,
        level: user.role.level
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter permissões:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para verificar permissão específica
router.get('/permissions/:permission', async (req, res) => {
  try {
    const { permission } = req.params;
    const hasPermission = req.user.role.permissions.includes(permission);
    
    res.json({
      permission,
      hasPermission,
      role: req.user.role.name
    });
    
  } catch (error) {
    console.error('Erro ao verificar permissão:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para obter perfis disponíveis
router.get('/roles', 
  requirePermission('users.view'),
  async (req, res) => {
    try {
      const roles = await Role.find({ isActive: true })
        .select('name displayName description level permissions')
        .sort({ level: 1 });
      
      // Filtrar perfis que o usuário pode atribuir (nível menor que o seu)
      const availableRoles = roles.filter(role => role.level < req.user.role.level);
      
      res.json({
        roles: availableRoles,
        userLevel: req.user.role.level
      });
      
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Rota para obter logs de auditoria do usuário atual
router.get('/audit-logs', 
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100'),
    query('action')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Ação inválida'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Data de início inválida'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Data de fim inválida')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Parâmetros inválidos',
          details: errors.array()
        });
      }
      
      const {
        page = 1,
        limit = 20,
        action,
        startDate,
        endDate
      } = req.query;
      
      const options = {
        limit: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        actions: action ? [action] : undefined
      };
      
      const logs = await AuditLog.findByUser(req.user._id, options);
      const total = await AuditLog.countDocuments({
        user: req.user._id,
        ...(options.startDate || options.endDate ? {
          createdAt: {
            ...(options.startDate && { $gte: options.startDate }),
            ...(options.endDate && { $lte: options.endDate })
          }
        } : {}),
        ...(action && { action })
      });
      
      const totalPages = Math.ceil(total / parseInt(limit));
      
      res.json({
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalLogs: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      });
      
    } catch (error) {
      console.error('Erro ao obter logs de auditoria:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Rota para obter estatísticas do sistema (apenas para administradores)
router.get('/system/stats', 
  requirePermission('system.audit_log'),
  async (req, res) => {
    try {
      const [userStats, auditStats] = await Promise.all([
        // Estatísticas de usuários
        User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
              },
              inactiveUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
              },
              suspendedUsers: {
                $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
              }
            }
          }
        ]),
        
        // Estatísticas de auditoria
        AuditLog.getStats()
      ]);
      
      res.json({
        users: userStats[0] || {
          totalUsers: 0,
          activeUsers: 0,
          inactiveUsers: 0,
          suspendedUsers: 0
        },
        audit: auditStats[0] || {
          totalLogs: 0,
          successfulActions: 0,
          failedActions: 0,
          criticalActions: 0,
          uniqueUsersCount: 0,
          successRate: 0
        }
      });
      
    } catch (error) {
      console.error('Erro ao obter estatísticas do sistema:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Rota para obter sessões ativas do usuário
router.get('/sessions', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('refreshTokens')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Mapear sessões ativas
    const sessions = user.refreshTokens.map(rt => ({
      id: rt._id,
      createdAt: rt.createdAt,
      userAgent: rt.userAgent,
      ipAddress: rt.ipAddress,
      isCurrent: rt.token === req.body.refreshToken || rt.token === req.cookies.refreshToken
    }));
    
    res.json({
      sessions,
      totalSessions: sessions.length
    });
    
  } catch (error) {
    console.error('Erro ao obter sessões:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota para revogar sessão específica
router.delete('/sessions/:sessionId', 
  auditLog('session_revoked', 'auth'),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Encontrar e remover a sessão
      const sessionIndex = user.refreshTokens.findIndex(
        rt => rt._id.toString() === sessionId
      );
      
      if (sessionIndex === -1) {
        return res.status(404).json({
          error: 'Sessão não encontrada',
          code: 'SESSION_NOT_FOUND'
        });
      }
      
      user.refreshTokens.splice(sessionIndex, 1);
      await user.save();
      
      res.json({
        message: 'Sessão revogada com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao revogar sessão:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de sessão inválido',
          code: 'INVALID_SESSION_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Rota para revogar todas as outras sessões
router.delete('/sessions', 
  auditLog('all_sessions_revoked', 'auth'),
  async (req, res) => {
    try {
      const currentRefreshToken = req.body.refreshToken || req.cookies.refreshToken;
      
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Manter apenas a sessão atual (se fornecida)
      if (currentRefreshToken) {
        user.refreshTokens = user.refreshTokens.filter(
          rt => rt.token === currentRefreshToken
        );
      } else {
        user.refreshTokens = [];
      }
      
      await user.save();
      
      res.json({
        message: 'Todas as outras sessões foram revogadas'
      });
      
    } catch (error) {
      console.error('Erro ao revogar sessões:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;