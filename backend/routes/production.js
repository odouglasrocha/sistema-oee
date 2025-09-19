const express = require('express');
const router = express.Router();
const ProductionRecord = require('../models/ProductionRecord');
const Machine = require('../models/Machine');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const AIInsight = require('../models/AIInsight');
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

    // Calcular e atualizar a capacidade da máquina automaticamente
    // Fórmula: Capacidade = Meta Calculada ÷ (Tempo Planejado ÷ 60)
    const metaCalculada = productionTarget || goodProduction; // Usar meta ou produção boa como referência
    const tempoPlanejadomHoras = (plannedTime || 480) / 60; // Converter minutos para horas
    const capacidadeCalculada = Math.round(metaCalculada / tempoPlanejadomHoras);

    // Atualizar a capacidade da máquina
    await Machine.findByIdAndUpdate(machineId, {
      'capacity.value': capacidadeCalculada,
      'capacity.unit': 'pcs/h', // Unidade padrão
      updatedBy: req.user.id
    });

    console.log(`✅ Capacidade da máquina ${machine.name} atualizada automaticamente:`);
    console.log(`   Meta Calculada: ${metaCalculada}`);
    console.log(`   Tempo Planejado: ${plannedTime || 480} min (${tempoPlanejadomHoras} h)`);
    console.log(`   Capacidade Calculada: ${capacidadeCalculada} pcs/h`);

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

    // Gerar insights baseados nos dados de produção
    try {
      console.log('🔍 Iniciando geração de insights para registro:', savedRecord._id);
      console.log('🔍 Dados do registro:', {
        machineId: savedRecord.machine._id,
        machineName: savedRecord.machine.name,
        oee: savedRecord.oee,
        production: savedRecord.production
      });
      await generateProductionInsights(savedRecord);
    } catch (insightError) {
      console.error('Erro ao gerar insights de produção:', insightError);
      // Não falhar a criação do registro por erro de insights
    }

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

    // Recalcular e atualizar a capacidade da máquina automaticamente
    // Fórmula: Capacidade = Meta Calculada ÷ (Tempo Planejado ÷ 60)
    const metaCalculada = record.production.target || record.production.good;
    const tempoPlanejadomHoras = record.time.planned / 60; // Converter minutos para horas
    const capacidadeCalculada = Math.round(metaCalculada / tempoPlanejadomHoras);

    // Atualizar a capacidade da máquina
    await Machine.findByIdAndUpdate(record.machine, {
      'capacity.value': capacidadeCalculada,
      'capacity.unit': 'pcs/h',
      updatedBy: req.user.id
    });

    console.log(`✅ Capacidade da máquina recalculada após atualização do registro:`);
    console.log(`   Meta Calculada: ${metaCalculada}`);
    console.log(`   Tempo Planejado: ${record.time.planned} min (${tempoPlanejadomHoras} h)`);
    console.log(`   Capacidade Recalculada: ${capacidadeCalculada} pcs/h`);

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

// Função para gerar insights baseados em dados de produção
async function generateProductionInsights(productionRecord) {
  console.log(`🧠 Analisando dados de produção para insights: ${productionRecord.machine.name}`);
  
  const insights = [];
  const oee = productionRecord.oee;
  
  // 1. Análise de OEE baixo
  if (oee.overall < 85) {
    let severity = 'medium';
    let description = '';
    let recommendation = '';
    
    if (oee.overall < 70) {
      severity = 'high';
    } else if (oee.overall < 60) {
      severity = 'critical';
    }
    
    // Identificar o componente mais problemático
    const components = [
      { name: 'Disponibilidade', value: oee.availability, threshold: 90 },
      { name: 'Performance', value: oee.performance, threshold: 95 },
      { name: 'Qualidade', value: oee.quality, threshold: 99 }
    ];
    
    const worstComponent = components.reduce((worst, current) => 
      (current.value < current.threshold && current.value < worst.value) ? current : worst
    );
    
    if (worstComponent.name === 'Disponibilidade') {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa disponibilidade (${oee.availability}%). Isso indica possíveis paradas não planejadas ou tempos de setup elevados.`;
      recommendation = 'Revisar plano de manutenção preventiva, otimizar tempos de setup e investigar causas de paradas não planejadas.';
    } else if (worstComponent.name === 'Performance') {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa performance (${oee.performance}%). A máquina está operando abaixo da velocidade ideal.`;
      recommendation = 'Verificar calibração da máquina, treinamento de operadores e possíveis gargalos no processo.';
    } else {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa qualidade (${oee.quality}%). Alto índice de produtos defeituosos.`;
      recommendation = 'Revisar parâmetros de qualidade, calibrar sensores e verificar matéria-prima.';
    }
    
    insights.push({
      type: 'optimization',
      severity,
      title: `OEE Abaixo do Ideal - ${productionRecord.machine.name}`,
      description,
      recommendation,
      confidence: 85,
      machineId: productionRecord.machine._id,
      data: {
        oee: oee,
        shift: productionRecord.shift,
        date: productionRecord.date,
        worstComponent: worstComponent.name
      },
      metrics: {
        impactOEE: Math.round(85 - oee.overall),
        estimatedSavings: Math.round((85 - oee.overall) * 100) // Estimativa simples
      },
      tags: ['oee', 'performance', worstComponent.name.toLowerCase()],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    });
  }
  
  // 2. Análise de desperdícios elevados
  const totalWaste = (productionRecord.production.waste.film || 0) + (productionRecord.production.waste.organic || 0);
  const wastePercentage = (totalWaste / productionRecord.production.good) * 100;
  
  if (wastePercentage > 5) {
    let severity = 'medium';
    if (wastePercentage > 10) severity = 'high';
    if (wastePercentage > 15) severity = 'critical';
    
    insights.push({
      type: 'optimization',
      severity,
      title: `Desperdício Elevado - ${productionRecord.machine.name}`,
      description: `Desperdício de ${wastePercentage.toFixed(1)}% detectado (${totalWaste} unidades). Filme: ${productionRecord.production.waste.film || 0}, Orgânico: ${productionRecord.production.waste.organic || 0}.`,
      recommendation: 'Revisar configurações da máquina, verificar qualidade da matéria-prima e treinar operadores para reduzir desperdícios.',
      confidence: 80,
      machineId: productionRecord.machine._id,
      data: {
        wastePercentage,
        filmWaste: productionRecord.production.waste.film || 0,
        organicWaste: productionRecord.production.waste.organic || 0,
        shift: productionRecord.shift,
        date: productionRecord.date
      },
      metrics: {
        impactQuality: Math.round(wastePercentage),
        estimatedSavings: Math.round(totalWaste * 2) // Estimativa de economia por unidade
      },
      tags: ['waste', 'quality', 'cost'],
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 dias
    });
  }
  
  // 3. Análise de performance excepcional (para reconhecimento)
  if (oee.overall > 95) {
    insights.push({
      type: 'pattern',
      severity: 'low',
      title: `Performance Excepcional - ${productionRecord.machine.name}`,
      description: `Excelente performance alcançada com OEE de ${oee.overall}%. Disponibilidade: ${oee.availability}%, Performance: ${oee.performance}%, Qualidade: ${oee.quality}%.`,
      recommendation: 'Documentar as práticas utilizadas neste turno para replicar em outros períodos e máquinas.',
      confidence: 95,
      machineId: productionRecord.machine._id,
      data: {
        oee: oee,
        shift: productionRecord.shift,
        date: productionRecord.date,
        operator: productionRecord.operator
      },
      metrics: {
        impactOEE: Math.round(oee.overall - 85)
      },
      tags: ['excellence', 'best-practice', 'oee'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    });
  }
  
  // 4. Análise de tempo vs meta
  if (productionRecord.production.target && productionRecord.production.good < productionRecord.production.target * 0.9) {
    const achievementPercentage = (productionRecord.production.good / productionRecord.production.target) * 100;
    
    insights.push({
      type: 'anomaly',
      severity: achievementPercentage < 80 ? 'high' : 'medium',
      title: `Meta de Produção Não Atingida - ${productionRecord.machine.name}`,
      description: `Produção atingiu apenas ${achievementPercentage.toFixed(1)}% da meta (${productionRecord.production.good}/${productionRecord.production.target} unidades).`,
      recommendation: 'Investigar causas da baixa produção: paradas não planejadas, problemas de qualidade, ou necessidade de ajustes na meta.',
      confidence: 90,
      machineId: productionRecord.machine._id,
      data: {
        achieved: productionRecord.production.good,
        target: productionRecord.production.target,
        achievementPercentage,
        shift: productionRecord.shift,
        date: productionRecord.date
      },
      metrics: {
        impactPerformance: Math.round(100 - achievementPercentage)
      },
      tags: ['target', 'production', 'planning'],
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias
    });
  }
  
  // Salvar insights no banco de dados
  if (insights.length > 0) {
    try {
      const createdInsights = await AIInsight.insertMany(insights);
      console.log(`✅ ${createdInsights.length} insights gerados para ${productionRecord.machine.name}`);
      return createdInsights;
    } catch (error) {
      console.error('Erro ao salvar insights:', error);
      throw error;
    }
  } else {
    console.log(`ℹ️ Nenhum insight gerado para ${productionRecord.machine.name} - dados dentro dos parâmetros normais`);
    return [];
  }
}

module.exports = router;