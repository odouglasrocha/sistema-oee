const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Machine = require('../models/Machine');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { requirePermission, auditLog } = require('../middleware/auth');

const router = express.Router();

// Validações para criação de máquina
const createMachineValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('code')
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Código deve ter entre 2 e 20 caracteres')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Código deve conter apenas letras maiúsculas, números, hífens e underscores'),
  body('manufacturer')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Fabricante deve ter entre 2 e 100 caracteres'),
  body('model')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Modelo deve ter entre 2 e 100 caracteres'),
  body('capacity.value')
    .isFloat({ min: 0 })
    .withMessage('Capacidade deve ser um número positivo'),
  body('capacity.unit')
    .isIn(['pcs/h', 'kg/h', 't/h', 'l/h', 'm³/h', 'unidades/min', 'outros'])
    .withMessage('Unidade de capacidade inválida'),
  body('location.plant')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Planta deve ter entre 2 e 100 caracteres'),
  body('location.area')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Área deve ter entre 2 e 100 caracteres'),
  body('category')
    .isIn(['Produção', 'Embalagem', 'Transporte', 'Qualidade', 'Manutenção', 'Utilidades', 'Outros'])
    .withMessage('Categoria inválida'),
  body('type')
    .isIn(['Automática', 'Semi-automática', 'Manual', 'CNC', 'Robótica', 'Hidráulica', 'Pneumática', 'Elétrica'])
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(['Ativa', 'Inativa', 'Manutenção', 'Parada', 'Descartada'])
    .withMessage('Status inválido')
];

// Validações para atualização de máquina
const updateMachineValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Código deve ter entre 2 e 20 caracteres')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Código deve conter apenas letras maiúsculas, números, hífens e underscores'),
  body('capacity.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Capacidade deve ser um número positivo'),
  body('yearManufacture')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage('Ano de fabricação inválido')
];

// Rota pública para listar máquinas (sem autenticação)
router.get('/public', async (req, res) => {
  try {
    const machines = await Machine.find({})
      .select('name code type capacity status')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        machines,
        total: machines.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar máquinas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Listar máquinas com paginação e filtros (rota autenticada)
router.get('/', 
  // requirePermission('machines.view'), // Desabilitado para permitir acesso aos relatórios
  [
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
      .isLength({ min: 1 })
      .withMessage('Termo de busca inválido'),
    query('status')
      .optional()
      .isIn(['Ativa', 'Inativa', 'Manutenção', 'Parada', 'Descartada'])
      .withMessage('Status inválido'),
    query('category')
      .optional()
      .isIn(['Produção', 'Embalagem', 'Transporte', 'Qualidade', 'Manutenção', 'Utilidades', 'Outros'])
      .withMessage('Categoria inválida'),
    query('plant')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Planta inválida'),
    query('area')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Área inválida')
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
        search,
        status,
        category,
        plant,
        area,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      // Construir filtros
      const filters = { isActive: true };

      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } }
        ];
      }

      if (status) filters.status = status;
      if (category) filters.category = category;
      if (plant) filters['location.plant'] = { $regex: plant, $options: 'i' };
      if (area) filters['location.area'] = { $regex: area, $options: 'i' };

      // Configurar ordenação
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Executar consulta com paginação
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [machines, total] = await Promise.all([
        Machine.find(filters)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .populate('responsible.operator', 'name email')
          .populate('responsible.technician', 'name email')
          .populate('responsible.supervisor', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Machine.countDocuments(filters)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));
      const hasNextPage = parseInt(page) < totalPages;
      const hasPrevPage = parseInt(page) > 1;

      res.json({
        machines,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMachines: total,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        },
        filters: {
          search,
          status,
          category,
          plant,
          area,
          sortBy,
          sortOrder
        }
      });
      
    } catch (error) {
      console.error('Erro ao listar máquinas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Obter máquina por ID
router.get('/:id', 
  requirePermission('machines.view'),
  [
    param('id')
      .isMongoId()
      .withMessage('ID da máquina inválido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'ID inválido',
          details: errors.array()
        });
      }

      const { id } = req.params;
      
      const machine = await Machine.findOne({ _id: id, isActive: true })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('responsible.operator', 'name email')
        .populate('responsible.technician', 'name email')
        .populate('responsible.supervisor', 'name email');
      
      if (!machine) {
        return res.status(404).json({
          error: 'Máquina não encontrada',
          code: 'MACHINE_NOT_FOUND'
        });
      }
      
      res.json({ machine });
      
    } catch (error) {
      console.error('Erro ao buscar máquina:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID da máquina inválido',
          code: 'INVALID_MACHINE_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Criar nova máquina
router.post('/', 
  requirePermission('machines.create'),
  createMachineValidation,
  auditLog('machine_created', 'machine'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: errors.array()
        });
      }
      
      const machineData = req.body;
      
      // Verificar se código já existe
      const existingMachine = await Machine.findOne({ 
        code: machineData.code.toUpperCase(),
        isActive: true 
      });
      
      if (existingMachine) {
        return res.status(400).json({
          error: 'Código da máquina já está em uso',
          code: 'CODE_EXISTS'
        });
      }
      
      // Adicionar informações de auditoria
      machineData.createdBy = req.user._id;
      
      // Criar máquina
      const machine = new Machine(machineData);
      await machine.save();
      
      // Buscar máquina criada com populações
      const createdMachine = await Machine.findById(machine._id)
        .populate('createdBy', 'name email')
        .populate('responsible.operator', 'name email')
        .populate('responsible.technician', 'name email')
        .populate('responsible.supervisor', 'name email');
      
      res.status(201).json({
        message: 'Máquina criada com sucesso',
        machine: createdMachine
      });
      
    } catch (error) {
      console.error('Erro ao criar máquina:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          error: 'Código da máquina já está em uso',
          code: 'CODE_EXISTS'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Atualizar máquina
router.put('/:id', 
  requirePermission('machines.edit'),
  [
    param('id')
      .isMongoId()
      .withMessage('ID da máquina inválido'),
    ...updateMachineValidation
  ],
  auditLog('machine_updated', 'machine'),
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
      
      // Buscar máquina atual
      const currentMachine = await Machine.findOne({ _id: id, isActive: true });
      if (!currentMachine) {
        return res.status(404).json({
          error: 'Máquina não encontrada',
          code: 'MACHINE_NOT_FOUND'
        });
      }
      
      // Verificar se código já existe (se estiver sendo alterado)
      if (updateData.code && updateData.code.toUpperCase() !== currentMachine.code) {
        const existingMachine = await Machine.findOne({ 
          code: updateData.code.toUpperCase(),
          _id: { $ne: id },
          isActive: true 
        });
        
        if (existingMachine) {
          return res.status(400).json({
            error: 'Código da máquina já está em uso',
            code: 'CODE_EXISTS'
          });
        }
      }
      
      // Adicionar informações de auditoria
      updateData.updatedBy = req.user._id;
      
      // Atualizar máquina
      const updatedMachine = await Machine.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('responsible.operator', 'name email')
        .populate('responsible.technician', 'name email')
        .populate('responsible.supervisor', 'name email');
      
      res.json({
        message: 'Máquina atualizada com sucesso',
        machine: updatedMachine
      });
      
    } catch (error) {
      console.error('Erro ao atualizar máquina:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID da máquina inválido',
          code: 'INVALID_MACHINE_ID'
        });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          error: 'Código da máquina já está em uso',
          code: 'CODE_EXISTS'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Deletar máquina (soft delete)
router.delete('/:id', 
  requirePermission('machines.delete'),
  [
    param('id')
      .isMongoId()
      .withMessage('ID da máquina inválido')
  ],
  auditLog('machine_deleted', 'machine'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'ID inválido',
          details: errors.array()
        });
      }
      
      const { id } = req.params;
      
      // Verificar se máquina existe
      const machine = await Machine.findOne({ _id: id, isActive: true });
      if (!machine) {
        return res.status(404).json({
          error: 'Máquina não encontrada',
          code: 'MACHINE_NOT_FOUND'
        });
      }
      
      // Soft delete
      await Machine.findByIdAndUpdate(id, {
        isActive: false,
        updatedBy: req.user._id
      });
      
      res.json({
        message: 'Máquina removida com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao deletar máquina:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID da máquina inválido',
          code: 'INVALID_MACHINE_ID'
        });
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Alterar status da máquina
router.patch('/:id/status', 
  requirePermission('machines.edit'),
  [
    param('id')
      .isMongoId()
      .withMessage('ID da máquina inválido'),
    body('status')
      .isIn(['Ativa', 'Inativa', 'Manutenção', 'Parada', 'Descartada'])
      .withMessage('Status inválido')
  ],
  auditLog('machine_status_changed', 'machine'),
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
      
      const machine = await Machine.findOne({ _id: id, isActive: true });
      if (!machine) {
        return res.status(404).json({
          error: 'Máquina não encontrada',
          code: 'MACHINE_NOT_FOUND'
        });
      }
      
      const updatedMachine = await machine.updateStatus(status, req.user._id);
      
      res.json({
        message: `Status da máquina alterado para ${status}`,
        machine: {
          id: updatedMachine._id,
          name: updatedMachine.name,
          code: updatedMachine.code,
          status: updatedMachine.status
        }
      });
      
    } catch (error) {
      console.error('Erro ao alterar status da máquina:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Obter estatísticas das máquinas
router.get('/stats/overview', 
  requirePermission('machines.view'),
  async (req, res) => {
    try {
      const [totalMachines, machinesByStatus, machinesByCategory, maintenanceDue] = await Promise.all([
        Machine.countDocuments({ isActive: true }),
        Machine.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Machine.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Machine.getMaintenanceDue(7)
      ]);
      
      res.json({
        totalMachines,
        machinesByStatus: machinesByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        machinesByCategory: machinesByCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        maintenanceDue: maintenanceDue.length
      });
      
    } catch (error) {
      console.error('Erro ao obter estatísticas das máquinas:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// Obter máquinas com manutenção em atraso
router.get('/maintenance/due', 
  requirePermission('machines.view'),
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Dias deve ser entre 1 e 365')
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
      
      const { days = 7 } = req.query;
      
      const machines = await Machine.getMaintenanceDue(parseInt(days))
        .populate('responsible.technician', 'name email')
        .populate('responsible.supervisor', 'name email');
      
      res.json({
        machines,
        count: machines.length,
        days: parseInt(days)
      });
      
    } catch (error) {
      console.error('Erro ao obter máquinas com manutenção em atraso:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

module.exports = router;