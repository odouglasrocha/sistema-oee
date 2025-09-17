const express = require('express');
const router = express.Router();
const ProductionRecord = require('../models/ProductionRecord');
const Machine = require('../models/Machine');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticateToken } = require('../middleware/auth');

// Middleware para log de auditoria
const logAudit = async (req, action, details = {}) => {
  try {
    await AuditLog.create({
      userId: req.user?.id,
      action,
      resource: 'production',
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
  }
};

// GET /api/production - Listar registros de produção
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      machine,
      shift,
      operator,
      status
    } = req.query;

    // Construir filtros
    const filters = {};
    
    // Se não houver filtros de data, mostrar registros dos últimos 30 dias
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (!startDate && !endDate) {
      // Filtro padrão: últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filters.date = {
        $gte: thirtyDaysAgo
      };
    }
    
    if (machine) filters.machine = machine;
    if (shift) filters.shift = shift;
    if (operator) filters.operator = operator;
    if (status) filters.status = status;

    // Executar consulta com paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [records, total] = await Promise.all([
      ProductionRecord.find(filters)
        .populate('machine', 'name code capacity')
        .populate('operator', 'name email')
        .populate('createdBy', 'name')
        .sort({ date: -1, shift: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ProductionRecord.countDocuments(filters)
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar registros de produção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/production/recent - Buscar registros mais recentes (sem filtros de data)
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const {
      limit = 50,
      machine,
      shift,
      operator,
      status
    } = req.query;

    // Construir filtros (sem data)
    const filters = {};
    
    if (machine) filters.machine = machine;
    if (shift) filters.shift = shift;
    if (operator) filters.operator = operator;
    if (status) filters.status = status;

    // Buscar os registros mais recentes
    const records = await ProductionRecord.find(filters)
      .populate('machine', 'name code capacity')
      .populate('operator', 'name email')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit));

    const total = await ProductionRecord.countDocuments(filters);

    res.json({
      success: true,
      data: {
        records,
        total,
        message: `Exibindo os ${records.length} registros mais recentes`
      }
    });
  } catch (error) {
    console.error('Erro ao buscar registros recentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/production/:id - Buscar registro específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id)
      .populate('machine', 'name code capacity')
      .populate('operator', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .populate('approvedBy', 'name');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Registro de produção não encontrado'
      });
    }

    res.json({
      success: true,
      data: { record }
    });
  } catch (error) {
    console.error('Erro ao buscar registro de produção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/production - Criar novo registro de produção
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      machineId,
      shift,
      startDateTime,
      endDateTime,
      materialCode,
      materialName,
      materialDescription,
      productionTarget,
      goodProduction,
      filmWaste,
      organicWaste,
      plannedTime,
      actualTime,
      downtimeEntries,
      notes
    } = req.body;

    // Validações básicas
    if (!machineId || !shift || !startDateTime || !endDateTime || !materialCode || !goodProduction) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: machineId, shift, startDateTime, endDateTime, materialCode, goodProduction'
      });
    }

    // Verificar se a máquina existe
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Máquina não encontrada'
      });
    }

    // Detectar turno automaticamente se não fornecido ou validar o fornecido
    const detectedShift = ProductionRecord.detectShift(startDateTime);
    const finalShift = shift || detectedShift;

    // Verificar se já existe registro para a mesma máquina, data e turno
    const startOfDay = new Date(new Date(startDateTime).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(startDateTime).setHours(23, 59, 59, 999));
    
    const existingRecord = await ProductionRecord.findOne({
      machine: machineId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      shift: finalShift
    });

    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message: `Já existe um registro para esta máquina no turno ${finalShift === 'morning' ? 'Manhã' : finalShift === 'afternoon' ? 'Tarde' : 'Noite'} desta data. Para editar o registro existente, acesse a lista de registros de produção.`,
        existingRecordId: existingRecord._id
      });
    }
    
    // Verificar quantos registros já existem para esta máquina hoje
    const todayRecordsCount = await ProductionRecord.countDocuments({
      machine: machineId,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    // Permitir no máximo 3 registros por máquina por dia (manhã, tarde, noite)
    if (todayRecordsCount >= 3) {
      return res.status(409).json({
        success: false,
        message: 'Esta máquina já possui registros para todos os turnos (Manhã, Tarde e Noite) desta data. Para adicionar mais registros, escolha outra data ou edite um registro existente.'
      });
    }

    // Criar o registro
    const productionRecord = new ProductionRecord({
      machine: machineId,
      shift: finalShift,
      date: new Date(startDateTime),
      startTime: new Date(startDateTime),
      endTime: new Date(endDateTime),
      operator: req.user.id,
      material: {
        code: materialCode.toUpperCase(),
        name: materialName || materialCode,
        description: materialDescription
      },
      production: {
        target: productionTarget || 0,
        good: goodProduction,
        waste: {
          film: filmWaste || 0,
          organic: organicWaste || 0
        }
      },
      time: {
        planned: plannedTime || 480,
        actual: actualTime || 480
      },
      downtimeEntries: downtimeEntries || [],
      notes: notes || '',
      createdBy: req.user.id
    });

    await productionRecord.save();

    // Carregar o registro completo com populações
    const savedRecord = await ProductionRecord.findById(productionRecord._id)
      .populate('machine', 'name code capacity')
      .populate('operator', 'name email')
      .populate('createdBy', 'name');

    // Log de auditoria
    await logAudit(req, 'production_record_created', {
      recordId: savedRecord._id,
      machine: machine.name,
      shift: finalShift,
      production: goodProduction
    });

    res.status(201).json({
      success: true,
      message: 'Registro de produção criado com sucesso',
      data: { record: savedRecord }
    });
  } catch (error) {
    console.error('Erro ao criar registro de produção:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/production/:id - Atualizar registro de produção
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Registro de produção não encontrado'
      });
    }

    // Verificar permissões (apenas criador ou admin pode editar)
    // Buscar o role do usuário para verificar permissões
    const user = await User.findById(req.user.id).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const isCreator = record.createdBy.toString() === req.user.id;
    const isAdmin = user.role && (user.role.name === 'administrador');
    const hasEditPermission = user.role && user.role.permissions.includes('production.edit');
    
    if (!isCreator && !isAdmin && !hasEditPermission) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para editar este registro'
      });
    }

    // Atualizar campos permitidos
    const allowedUpdates = [
      'production.good', 'production.waste.film', 'production.waste.organic',
      'production.target', 'time.actual', 'downtimeEntries', 'notes'
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key.includes('.')) {
          const [parent, child, subchild] = key.split('.');
          if (subchild) {
            record[parent][child][subchild] = req.body[key];
          } else {
            record[parent][child] = req.body[key];
          }
        } else {
          record[key] = req.body[key];
        }
      }
    });

    record.updatedBy = req.user.id;
    await record.save();

    const updatedRecord = await ProductionRecord.findById(record._id)
      .populate('machine', 'name code capacity')
      .populate('operator', 'name email')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    // Log de auditoria
    await logAudit(req, 'production_record_updated', {
      recordId: record._id,
      changes: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: 'Registro de produção atualizado com sucesso',
      data: { record: updatedRecord }
    });
  } catch (error) {
    console.error('Erro ao atualizar registro de produção:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/production/:id - Excluir registro de produção
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await ProductionRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Registro de produção não encontrado'
      });
    }

    // Verificar permissões (apenas criador ou admin pode excluir)
    // Buscar o role do usuário para verificar permissões
    const user = await User.findById(req.user.id).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const isCreator = record.createdBy.toString() === req.user.id;
    const isAdmin = user.role && (user.role.name === 'administrador');
    const hasDeletePermission = user.role && user.role.permissions.includes('production.delete');
    
    if (!isCreator && !isAdmin && !hasDeletePermission) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para excluir este registro'
      });
    }

    await ProductionRecord.findByIdAndDelete(req.params.id);

    // Log de auditoria
    await logAudit(req, 'production_record_deleted', {
      recordId: req.params.id
    });

    res.json({
      success: true,
      message: 'Registro de produção excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir registro de produção:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/production/stats/summary - Estatísticas resumidas
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, machine, shift } = req.query;
    
    const filters = {};
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (machine) filters.machine = machine;
    if (shift) filters.shift = shift;

    const stats = await ProductionRecord.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          totalProduction: { $sum: '$production.good' },
          totalWaste: { $sum: { $add: ['$production.waste.film', '$production.waste.organic'] } },
          avgOEE: { $avg: '$oee.overall' },
          avgAvailability: { $avg: '$oee.availability' },
          avgPerformance: { $avg: '$oee.performance' },
          avgQuality: { $avg: '$oee.quality' },
          totalDowntime: { $sum: '$time.downtime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || {
          totalRecords: 0,
          totalProduction: 0,
          totalWaste: 0,
          avgOEE: 0,
          avgAvailability: 0,
          avgPerformance: 0,
          avgQuality: 0,
          totalDowntime: 0
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/production/stats/by-period - Estatísticas por período
router.get('/stats/by-period', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate e endDate são obrigatórios'
      });
    }

    const stats = await ProductionRecord.getStatsByPeriod(startDate, endDate, groupBy);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas por período:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/production/:id/approve - Aprovar registro
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário tem permissão para aprovar
    // Buscar o role do usuário para verificar permissões
    const user = await User.findById(req.user.id).populate('role');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    const isSupervisor = user.role && (user.role.name === 'supervisor');
    const isAdmin = user.role && (user.role.name === 'administrador');
    
    if (!isSupervisor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Sem permissão para aprovar registros'
      });
    }

    const record = await ProductionRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Registro de produção não encontrado'
      });
    }

    record.status = 'approved';
    record.approvedBy = req.user.id;
    record.approvedAt = new Date();
    await record.save();

    // Log de auditoria
    await logAudit(req, 'production_record_approved', {
      recordId: record._id
    });

    res.json({
      success: true,
      message: 'Registro aprovado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao aprovar registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;