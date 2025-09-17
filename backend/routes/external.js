const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const { 
  authenticateApiKey, 
  requireApiPermission, 
  requireAnyApiPermission,
  addRateLimitHeaders 
} = require('../middleware/apiAuth');

// Aplicar middleware de autenticação e rate limit para todas as rotas
router.use(authenticateApiKey);
router.use(addRateLimitHeaders);

// ===== ENDPOINTS DE MÁQUINAS =====

// GET /api/external/machines - Listar máquinas
router.get('/machines', requireApiPermission('read:machines'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      department, 
      location,
      search 
    } = req.query;
    
    // Construir filtros
    const filters = {};
    if (status) filters.status = status;
    if (department) filters.department = department;
    if (location) filters.location = location;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100); // Máximo 100 por página
    
    const [machines, total] = await Promise.all([
      Machine.find(filters)
        .select('-__v -createdAt -updatedAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Machine.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: machines,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar máquinas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/external/machines/:id - Obter máquina específica
router.get('/machines/:id', requireApiPermission('read:machines'), async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id)
      .select('-__v -createdAt -updatedAt')
      .lean();
    
    if (!machine) {
      return res.status(404).json({
        success: false,
        error: 'Máquina não encontrada',
        code: 'MACHINE_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: machine
    });
    
  } catch (error) {
    console.error('Erro ao buscar máquina:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/external/machines - Criar nova máquina
router.post('/machines', requireApiPermission('write:machines'), async (req, res) => {
  try {
    const machineData = {
      ...req.body,
      createdBy: req.apiKey.createdBy // Usar o criador da API key
    };
    
    const machine = new Machine(machineData);
    await machine.save();
    
    res.status(201).json({
      success: true,
      data: machine,
      message: 'Máquina criada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar máquina:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/external/machines/:id - Atualizar máquina
router.put('/machines/:id', requireApiPermission('write:machines'), async (req, res) => {
  try {
    const machine = await Machine.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!machine) {
      return res.status(404).json({
        success: false,
        error: 'Máquina não encontrada',
        code: 'MACHINE_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: machine,
      message: 'Máquina atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar máquina:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== ENDPOINTS DE PRODUÇÃO =====

// GET /api/external/production - Listar registros de produção
router.get('/production', requireApiPermission('read:production'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      machineId, 
      status,
      startDate,
      endDate,
      shift
    } = req.query;
    
    // Construir filtros
    const filters = {};
    if (machineId) filters.machineId = machineId;
    if (status) filters.status = status;
    if (shift) filters.shift = shift;
    
    // Filtro por data
    if (startDate || endDate) {
      filters.startTime = {};
      if (startDate) filters.startTime.$gte = new Date(startDate);
      if (endDate) filters.startTime.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);
    
    const [records, total] = await Promise.all([
      ProductionRecord.find(filters)
        .populate('machineId', 'name model department location')
        .select('-__v')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductionRecord.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar registros de produção:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/external/production - Criar registro de produção
router.post('/production', requireApiPermission('write:production'), async (req, res) => {
  try {
    const productionData = {
      ...req.body,
      createdBy: req.apiKey.createdBy
    };
    
    const record = new ProductionRecord(productionData);
    await record.save();
    
    // Popular dados da máquina
    await record.populate('machineId', 'name model department location');
    
    res.status(201).json({
      success: true,
      data: record,
      message: 'Registro de produção criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar registro de produção:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== ENDPOINTS DE ANALYTICS =====

// GET /api/external/analytics/oee - Obter dados de OEE
router.get('/analytics/oee', requireApiPermission('read:analytics'), async (req, res) => {
  try {
    const { 
      machineId, 
      startDate, 
      endDate, 
      groupBy = 'day' 
    } = req.query;
    
    // Validar parâmetros
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate e endDate são obrigatórios',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    const filters = {
      startTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (machineId) {
      filters.machineId = machineId;
    }
    
    // Agregação para calcular OEE
    const pipeline = [
      { $match: filters },
      {
        $group: {
          _id: {
            machine: '$machineId',
            date: {
              $dateToString: {
                format: groupBy === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d',
                date: '$startTime'
              }
            }
          },
          totalProduced: { $sum: '$quantityProduced' },
          totalDefects: { $sum: '$defectCount' },
          totalTime: { $sum: '$duration' },
          plannedTime: { $sum: '$plannedDuration' },
          records: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'machines',
          localField: '_id.machine',
          foreignField: '_id',
          as: 'machine'
        }
      },
      {
        $project: {
          date: '$_id.date',
          machine: { $arrayElemAt: ['$machine', 0] },
          totalProduced: 1,
          totalDefects: 1,
          totalTime: 1,
          plannedTime: 1,
          records: 1,
          availability: {
            $cond: [
              { $gt: ['$plannedTime', 0] },
              { $multiply: [{ $divide: ['$totalTime', '$plannedTime'] }, 100] },
              0
            ]
          },
          quality: {
            $cond: [
              { $gt: ['$totalProduced', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalProduced', '$totalDefects'] }, '$totalProduced'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          oee: {
            $multiply: [
              { $divide: ['$availability', 100] },
              { $divide: ['$quality', 100] },
              100
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ];
    
    const oeeData = await ProductionRecord.aggregate(pipeline);
    
    res.json({
      success: true,
      data: oeeData,
      summary: {
        period: { startDate, endDate },
        groupBy,
        totalRecords: oeeData.length
      }
    });
    
  } catch (error) {
    console.error('Erro ao calcular OEE:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== ENDPOINT DE STATUS DA API =====

// GET /api/external/status - Status da API
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    apiKey: {
      name: req.apiKey.name,
      permissions: req.apiKey.permissions,
      rateLimit: req.apiKey.rateLimit
    },
    version: '1.0.0'
  });
});

module.exports = router;