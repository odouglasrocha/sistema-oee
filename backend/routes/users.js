const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const { 
  requirePermission, 
  requireOwnershipOrPermission, 
  auditLog,
  getClientIP 
} = require('../middleware/auth');

const router = express.Router();

// Validações
const createUserValidation = [
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
    .isMongoId()
    .withMessage('ID do perfil inválido'),
  body('department')
    .optional()
    .isIn(['producao', 'manutencao', 'qualidade', 'engenharia', 'administracao', 'ti'])
    .withMessage('Departamento inválido'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Status inválido')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('role')
    .optional()
    .isMongoId()
    .withMessage('ID do perfil inválido'),
  body('department')
    .optional()
    .isIn(['producao', 'manutencao', 'qualidade', 'engenharia', 'administracao', 'ti'])
    .withMessage('Departamento inválido'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Status inválido')
];

const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Busca deve ter entre 1 e 100 caracteres'),
  query('role')
    .optional()
    .isMongoId()
    .withMessage('ID do perfil inválido'),
  query('department')
    .optional()
    .isIn(['producao', 'manutencao', 'qualidade', 'engenharia', 'administracao', 'ti'])
    .withMessage('Departamento inválido'),
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended', 'pending'])
    .withMessage('Status inválido')
];

// Listar usuários
router.get('/', 
  requirePermission('users.view'),
  queryValidation,
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
        search,
        role,
        department,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      // Construir filtros
      const filters = {};
      
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (role) filters.role = role;
      if (department) filters.department = department;
      if (status) filters.status = status;
      
      // Configurar ordenação
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Calcular skip
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Buscar usuários
      const [users, total] = await Promise.all([
        User.find(filters)
          .populate('role', 'name displayName level')
          .populate('createdBy', 'name email')
          .select('-password -refreshTokens -twoFactorSecret')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(filters)
      ]);

      // Mapear _id para id para compatibilidade com o frontend
      const mappedUsers = users.map(user => ({
        ...user,
        id: user._id.toString(),
        _id: user._id.toString()
      }));

      // Calcular metadados de paginação
      const totalPages = Math.ceil(total / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        users: mappedUsers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        },
        filters: {
          search,
          role,
          department,
          status,
          sortBy,
          sortOrder
        }
      });
      
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Obter usuário por ID
router.get('/:id', 
  requireOwnershipOrPermission('users.view', 'id'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id)
        .populate('role')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .select('-password -refreshTokens -twoFactorSecret');
      
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Mapear _id para id para compatibilidade com o frontend
      const mappedUser = {
        ...user.toObject(),
        id: user._id.toString(),
        _id: user._id.toString()
      };
      
      res.json({ user: mappedUser });
      
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de usuário inválido',
          code: 'INVALID_USER_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Criar usuário
router.post('/', 
  requirePermission('users.create'),
  createUserValidation,
  auditLog('user_created', 'user'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const { name, email, password, role: roleId, department, location, phone, status = 'active' } = req.body;
      
      // Verificar se email já existe
      const existingUser = await User.emailExists(email);
      if (existingUser) {
        return res.status(400).json({
          error: 'Email já está em uso',
          code: 'EMAIL_EXISTS'
        });
      }
      
      // Buscar perfil
      const role = await Role.findById(roleId);
      if (!role) {
        return res.status(400).json({
          error: 'Perfil não encontrado',
          code: 'ROLE_NOT_FOUND'
        });
      }
      
      if (!role.isActive) {
        return res.status(400).json({
          error: 'Perfil inativo',
          code: 'ROLE_INACTIVE'
        });
      }
      
      // Verificar se usuário pode atribuir este perfil
      if (role.level >= req.user.role.level) {
        return res.status(403).json({
          error: 'Você não pode criar usuários com nível igual ou superior ao seu',
          code: 'INSUFFICIENT_LEVEL'
        });
      }
      
      // Criar usuário
      const newUser = new User({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        role: roleId,
        department,
        location,
        phone,
        status,
        createdBy: req.user._id
      });
      
      await newUser.save();
      
      // Buscar usuário criado com dados populados
      const createdUser = await User.findById(newUser._id)
        .populate('role')
        .populate('createdBy', 'name email')
        .select('-password -refreshTokens -twoFactorSecret');
      
      // Mapear _id para id para compatibilidade com o frontend
      const mappedUser = {
        ...createdUser.toObject(),
        id: createdUser._id.toString(),
        _id: createdUser._id.toString()
      };
      
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        user: mappedUser
      });
      
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      
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
  }
);

// Atualizar usuário
router.put('/:id', 
  requireOwnershipOrPermission('users.edit', 'id'),
  updateUserValidation,
  auditLog('user_updated', 'user'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const { id } = req.params;
      const updateData = req.body;
      
      // Buscar usuário atual
      const currentUser = await User.findById(id).populate('role');
      if (!currentUser) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Verificar se email já existe (se estiver sendo alterado)
      if (updateData.email) {
        const existingUser = await User.emailExists(updateData.email, id);
        if (existingUser) {
          return res.status(400).json({
            error: 'Email já está em uso',
            code: 'EMAIL_EXISTS'
          });
        }
      }
      
      // Verificar mudança de perfil
      if (updateData.role && updateData.role !== currentUser.role._id.toString()) {
        const newRole = await Role.findById(updateData.role);
        if (!newRole) {
          return res.status(400).json({
            error: 'Perfil não encontrado',
            code: 'ROLE_NOT_FOUND'
          });
        }
        
        if (!newRole.isActive) {
          return res.status(400).json({
            error: 'Perfil inativo',
            code: 'ROLE_INACTIVE'
          });
        }
        
        // Verificar se usuário pode atribuir este perfil
        // Administradores podem atribuir perfis de mesmo nível ou inferior
        // Outros perfis só podem atribuir perfis de nível inferior
        const canAssignRole = req.user.role.name === 'administrador' 
          ? newRole.level <= req.user.role.level
          : newRole.level < req.user.role.level;
          
        if (!canAssignRole) {
          return res.status(403).json({
            error: 'Você não pode atribuir perfis com nível superior ao seu',
            code: 'INSUFFICIENT_LEVEL'
          });
        }
        
        // Verificar se usuário pode alterar o perfil do usuário atual
        // Administradores podem alterar usuários de mesmo nível ou inferior (exceto a si mesmo)
        // Outros perfis só podem alterar usuários de nível inferior
        const canEditUser = req.user.role.name === 'administrador' 
          ? currentUser.role.level <= req.user.role.level && currentUser._id.toString() !== req.user._id.toString()
          : currentUser.role.level < req.user.role.level;
          
        if (!canEditUser) {
          return res.status(403).json({
            error: 'Você não pode alterar usuários com nível superior ao seu',
            code: 'INSUFFICIENT_LEVEL'
          });
        }
      }
      
      // Preparar dados de atualização
      const allowedUpdates = ['name', 'email', 'role', 'department', 'location', 'phone', 'status'];
      const updates = {};
      
      allowedUpdates.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });
      
      // Adicionar metadados de auditoria
      updates.updatedBy = req.user._id;
      
      // Atualizar usuário
      const updatedUser = await User.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      )
        .populate('role')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .select('-password -refreshTokens -twoFactorSecret');
      
      // Mapear _id para id para compatibilidade com o frontend
      const mappedUser = {
        ...updatedUser.toObject(),
        id: updatedUser._id.toString(),
        _id: updatedUser._id.toString()
      };
      
      res.json({
        message: 'Usuário atualizado com sucesso',
        user: mappedUser
      });
      
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de usuário inválido',
          code: 'INVALID_USER_ID'
        });
      }
      
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
  }
);

// Deletar usuário
router.delete('/:id', 
  requirePermission('users.delete'),
  auditLog('user_deleted', 'user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se usuário existe
      const user = await User.findById(id).populate('role');
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Não permitir deletar a si mesmo
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Você não pode deletar sua própria conta',
          code: 'CANNOT_DELETE_SELF'
        });
      }
      
      // Verificar se usuário pode deletar este usuário
      // Administradores podem deletar usuários de mesmo nível ou inferior
      // Outros perfis só podem deletar usuários de nível inferior
      const canDelete = req.user.role.name === 'administrador' 
        ? user.role.level <= req.user.role.level
        : user.role.level < req.user.role.level;
        
      if (!canDelete) {
        return res.status(403).json({
          error: 'Você não pode deletar usuários com nível igual ou superior ao seu',
          code: 'INSUFFICIENT_LEVEL'
        });
      }
      
      // Deletar usuário
      await User.findByIdAndDelete(id);
      
      res.json({
        message: 'Usuário deletado com sucesso',
        deletedUser: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
      
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de usuário inválido',
          code: 'INVALID_USER_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Ativar/Desativar usuário
router.patch('/:id/status', 
  requirePermission('users.edit'),
  [
    body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Status deve ser: active, inactive ou suspended')
  ],
  auditLog('user_status_changed', 'user'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      // Buscar usuário
      const user = await User.findById(id).populate('role');
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Não permitir alterar status de si mesmo
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          error: 'Você não pode alterar o status da sua própria conta',
          code: 'CANNOT_CHANGE_OWN_STATUS'
        });
      }
      
      // Verificar se usuário pode alterar este usuário
      // Administradores podem alterar status de usuários de mesmo nível ou inferior (exceto a si mesmo)
      // Outros perfis só podem alterar usuários de nível inferior
      const canChangeStatus = req.user.role.name === 'administrador' 
        ? user.role.level <= req.user.role.level
        : user.role.level < req.user.role.level;
        
      if (!canChangeStatus) {
        return res.status(403).json({
          error: 'Você não pode alterar usuários com nível superior ao seu',
          code: 'INSUFFICIENT_LEVEL'
        });
      }
      
      // Atualizar status
      user.status = status;
      user.updatedBy = req.user._id;
      
      // Se suspendendo, revogar todos os tokens
      if (status === 'suspended' || status === 'inactive') {
        user.revokeAllRefreshTokens();
      }
      
      await user.save();
      
      res.json({
        message: `Usuário ${status === 'active' ? 'ativado' : status === 'inactive' ? 'desativado' : 'suspenso'} com sucesso`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status
        }
      });
      
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de usuário inválido',
          code: 'INVALID_USER_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Resetar senha do usuário
router.post('/:id/reset-password', 
  requirePermission('users.edit'),
  [
    body('newPassword')
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
      .withMessage('Nova senha deve ter pelo menos 6 caracteres, incluindo maiúscula, minúscula e número')
  ],
  auditLog('password_reset', 'user'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const { id } = req.params;
      const { newPassword } = req.body;
      
      // Buscar usuário
      const user = await User.findById(id).populate('role');
      if (!user) {
        return res.status(404).json({
          error: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Verificar se usuário pode resetar senha deste usuário
      // Administradores podem resetar senhas de usuários de mesmo nível ou inferior (exceto a si mesmo)
      // Outros perfis só podem resetar senhas de usuários de nível inferior
      const canResetPassword = req.user.role.name === 'administrador' 
        ? user.role.level <= req.user.role.level && user._id.toString() !== req.user._id.toString()
        : user.role.level < req.user.role.level;
        
      if (!canResetPassword) {
        return res.status(403).json({
          error: 'Você não pode resetar a senha de usuários com nível superior ao seu',
          code: 'INSUFFICIENT_LEVEL'
        });
      }
      
      // Atualizar senha
      user.password = newPassword;
      user.updatedBy = req.user._id;
      
      // Revogar todos os refresh tokens para forçar novo login
      user.revokeAllRefreshTokens();
      
      await user.save();
      
      res.json({
        message: 'Senha resetada com sucesso. O usuário deve fazer login novamente.'
      });
      
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de usuário inválido',
          code: 'INVALID_USER_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Obter estatísticas de usuários
router.get('/stats/overview', 
  requirePermission('users.view'),
  async (req, res) => {
    try {
      const [totalUsers, activeUsers, inactiveUsers, suspendedUsers, usersByRole, usersByDepartment] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: 'active' }),
        User.countDocuments({ status: 'inactive' }),
        User.countDocuments({ status: 'suspended' }),
        User.aggregate([
          {
            $lookup: {
              from: 'roles',
              localField: 'role',
              foreignField: '_id',
              as: 'roleInfo'
            }
          },
          {
            $unwind: '$roleInfo'
          },
          {
            $group: {
              _id: '$roleInfo.name',
              count: { $sum: 1 },
              displayName: { $first: '$roleInfo.displayName' }
            }
          }
        ]),
        User.aggregate([
          {
            $group: {
              _id: '$department',
              count: { $sum: 1 }
            }
          },
          {
            $match: {
              _id: { $ne: null }
            }
          }
        ])
      ]);
      
      res.json({
        totalUsers,
        usersByStatus: {
          active: activeUsers,
          inactive: inactiveUsers,
          suspended: suspendedUsers
        },
        usersByRole,
        usersByDepartment
      });
      
    } catch (error) {
      console.error('Erro ao obter estatísticas de usuários:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;