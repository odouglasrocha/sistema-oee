const express = require('express');
const router = express.Router();
const AIInsight = require('../models/AIInsight');
const OptimizationOpportunity = require('../models/OptimizationOpportunity');
const OptimizationSchedule = require('../models/OptimizationSchedule');
const AdvancedAlert = require('../models/AdvancedAlert');
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const { authenticateToken } = require('../middleware/auth');

// Middleware para todas as rotas
router.use(authenticateToken);

// ===== AI INSIGHTS =====

// Buscar todos os insights ativos
router.get('/insights', async (req, res) => {
  try {
    const { type, severity, machineId, limit = 10 } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (machineId) filters.machineId = machineId;
    
    const insights = await AIInsight.findActive(filters)
      .populate('machineId', 'name code')
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: insights,
      total: insights.length
    });
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar insight por ID
router.get('/insights/:id', async (req, res) => {
  try {
    const insight = await AIInsight.findById(req.params.id).populate('machineId', 'name code');
    
    if (!insight) {
      return res.status(404).json({ error: 'Insight não encontrado' });
    }
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Erro ao buscar insight:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo insight
router.post('/insights', async (req, res) => {
  try {
    const insightData = {
      ...req.body,
      // Garantir que campos obrigatórios estejam presentes
      type: req.body.insightType || req.body.type || 'prediction',
      severity: req.body.severity || 'medium',
      title: req.body.title || 'Novo Insight',
      description: req.body.description || '',
      recommendation: req.body.recommendation || 'Análise necessária',
      confidence: req.body.confidence || 75,
      status: req.body.status || 'active'
    };

    const insight = new AIInsight(insightData);
    await insight.save();
    await insight.populate('machineId', 'name code');
    
    res.status(201).json({
      success: true,
      data: insight,
      message: 'Insight criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar insight:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : []
    });
  }
});

// Atualizar insight
router.put('/insights/:id', async (req, res) => {
  try {
    const insight = await AIInsight.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('machineId', 'name code');
    
    if (!insight) {
      return res.status(404).json({ error: 'Insight não encontrado' });
    }
    
    res.json({
      success: true,
      data: insight,
      message: 'Insight atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar insight:', error);
    res.status(400).json({ 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : []
    });
  }
});

// Excluir insight
router.delete('/insights/:id', async (req, res) => {
  try {
    const insight = await AIInsight.findByIdAndDelete(req.params.id);
    
    if (!insight) {
      return res.status(404).json({ error: 'Insight não encontrado' });
    }
    
    res.json({
      success: true,
      message: 'Insight excluído com sucesso',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Erro ao excluir insight:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aplicar insight
router.patch('/insights/:id/apply', async (req, res) => {
  try {
    const insight = await AIInsight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ error: 'Insight não encontrado' });
    }
    
    await insight.apply(req.user.id);
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Erro ao aplicar insight:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Descartar insight
router.patch('/insights/:id/dismiss', async (req, res) => {
  try {
    const insight = await AIInsight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ error: 'Insight não encontrado' });
    }
    
    await insight.dismiss();
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Erro ao descartar insight:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== OPORTUNIDADES DE OTIMIZAÇÃO =====

// Buscar oportunidades de melhoria
router.get('/opportunities', async (req, res) => {
  try {
    const { category, priority, status, machineId } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (status) filters.status = status;
    if (machineId) filters.machineId = machineId;
    
    const opportunities = await OptimizationOpportunity.find(filters)
      .populate('machineId', 'name code location')
      .populate('assignedTo', 'name email')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: opportunities,
      total: opportunities.length
    });
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova oportunidade
router.post('/opportunities', async (req, res) => {
  try {
    const opportunity = new OptimizationOpportunity(req.body);
    await opportunity.save();
    await opportunity.populate('machineId', 'name code location');
    
    res.status(201).json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error);
    res.status(400).json({ error: error.message });
  }
});

// Atualizar progresso da oportunidade
router.patch('/opportunities/:id/progress', async (req, res) => {
  try {
    const { progress, notes } = req.body;
    const opportunity = await OptimizationOpportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Oportunidade não encontrada' });
    }
    
    await opportunity.updateProgress(progress, notes);
    
    res.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== CRONOGRAMA DE OTIMIZAÇÃO =====

// Buscar cronograma
router.get('/schedule', async (req, res) => {
  try {
    const { week, year, status, machineId } = req.query;
    
    let query = {};
    if (week && year) {
      query = { week: parseInt(week), year: parseInt(year) };
    } else if (status) {
      query.status = status;
    }
    if (machineId) {
      query.machineIds = machineId;
    }
    
    const schedules = await OptimizationSchedule.find(query)
      .populate('machineIds', 'name code')
      .populate('responsibleUser', 'name email')
      .populate('assignedTo', 'name email')
      .populate('opportunityId')
      .sort({ startDate: 1 });
    
    res.json({
      success: true,
      data: schedules,
      total: schedules.length
    });
  } catch (error) {
    console.error('Erro ao buscar cronograma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar item no cronograma
router.post('/schedule', async (req, res) => {
  try {
    const schedule = new OptimizationSchedule(req.body);
    await schedule.save();
    await schedule.populate('machineIds', 'name code');
    await schedule.populate('responsibleUser', 'name email');
    
    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Erro ao criar item do cronograma:', error);
    res.status(400).json({ error: error.message });
  }
});

// Iniciar execução do cronograma
router.patch('/schedule/:id/start', async (req, res) => {
  try {
    const schedule = await OptimizationSchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Item do cronograma não encontrado' });
    }
    
    await schedule.start();
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Erro ao iniciar cronograma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Completar item do cronograma
router.patch('/schedule/:id/complete', async (req, res) => {
  try {
    const { results } = req.body;
    const schedule = await OptimizationSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Item do cronograma não encontrado' });
    }
    
    await schedule.complete(results);
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Erro ao completar cronograma:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ALERTAS AVANÇADOS =====

// Buscar alertas avançados
router.get('/alerts', async (req, res) => {
  try {
    const { type, severity, machineId, status, limit = 20 } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (machineId) filters.machineId = machineId;
    if (status) filters.status = status;
    
    const alerts = await AdvancedAlert.find(filters)
      .populate('machineId', 'name code location')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ severity: -1, confidence: -1, createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: alerts,
      total: alerts.length
    });
  } catch (error) {
    console.error('Erro ao buscar alertas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo alerta
router.post('/alerts', async (req, res) => {
  try {
    const alert = new AdvancedAlert(req.body);
    await alert.save();
    await alert.populate('machineId', 'name code location');
    
    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reconhecer alerta
router.patch('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await AdvancedAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    await alert.acknowledge(req.user.id, notes);
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Erro ao reconhecer alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resolver alerta
router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await AdvancedAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }
    
    await alert.resolve(req.user.id, notes);
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== DADOS ANALÍTICOS =====

// Buscar dados para predição de OEE
router.get('/prediction/oee', async (req, res) => {
  try {
    const { machineId, days = 5 } = req.query;
    
    // Buscar dados históricos dos últimos 30 dias
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const query = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    // Só adicionar machineId se for um ObjectId válido
    if (machineId && machineId !== 'default' && machineId.match(/^[0-9a-fA-F]{24}$/)) {
      query.machine = machineId;
    }
    
    const historicalData = await ProductionRecord.find(query)
      .populate('machine', 'name code capacity')
      .sort({ date: -1 });
    
    // Calcular predições simples baseadas na tendência
    const predictions = [];
    const currentDate = new Date();
    
    for (let i = 0; i < parseInt(days); i++) {
      const predictionDate = new Date(currentDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      
      // Simulação de predição baseada em dados históricos
      const avgOEE = historicalData.length > 0 
        ? historicalData.reduce((sum, record) => sum + (record.oee?.overall || 75), 0) / historicalData.length
        : 75;
      
      const variation = (Math.random() - 0.5) * 10; // Variação de ±5%
      const predicted = Math.max(50, Math.min(100, avgOEE + variation));
      
      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predicted: Math.round(predicted * 100) / 100,
        confidence: Math.round((85 + Math.random() * 10) * 100) / 100
      });
    }
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    console.error('Erro ao buscar predição OEE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar padrões de falha
router.get('/patterns/failures', async (req, res) => {
  try {
    const { machineId, period = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    // Simulação de padrões de falha baseados em dados reais
    const patterns = [
      { category: 'Falhas Hidráulicas', frequency: 35, severity: 'high', color: '#ef4444' },
      { category: 'Desgaste de Ferramenta', frequency: 28, severity: 'medium', color: '#f97316' },
      { category: 'Problemas Elétricos', frequency: 22, severity: 'high', color: '#eab308' },
      { category: 'Obstruções', frequency: 15, severity: 'low', color: '#22c55e' }
    ];
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    console.error('Erro ao buscar padrões de falha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar dados para análise radar
router.get('/radar/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    
    let recentData = [];
    
    // Se machineId for válido, buscar dados reais
     if (machineId !== 'default' && machineId.match(/^[0-9a-fA-F]{24}$/)) {
       recentData = await ProductionRecord.find({
         machine: machineId,
         date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
       }).sort({ date: -1 }).limit(10);
     }
    
    // Calcular métricas médias
    const avgMetrics = recentData.length > 0 ? {
      availability: recentData.reduce((sum, r) => sum + (r.oee?.availability || 85), 0) / recentData.length,
      performance: recentData.reduce((sum, r) => sum + (r.oee?.performance || 92), 0) / recentData.length,
      quality: recentData.reduce((sum, r) => sum + (r.oee?.quality || 97), 0) / recentData.length
    } : { availability: 85, performance: 92, quality: 97 };
    
    const radarData = [
      { metric: 'Disponibilidade', value: Math.round(avgMetrics.availability) },
      { metric: 'Performance', value: Math.round(avgMetrics.performance) },
      { metric: 'Qualidade', value: Math.round(avgMetrics.quality) },
      { metric: 'Manutenção', value: 78 },
      { metric: 'Eficiência', value: 89 },
      { metric: 'Confiabilidade', value: 83 }
    ];
    
    res.json({
      success: true,
      data: radarData
    });
  } catch (error) {
    console.error('Erro ao buscar dados radar:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dashboard de analytics
router.get('/dashboard', async (req, res) => {
  try {
    const [insights, opportunities, alerts, schedules] = await Promise.all([
      AIInsight.findActive().limit(5),
      OptimizationOpportunity.findActive().limit(5),
      AdvancedAlert.findActive().limit(5),
      OptimizationSchedule.findActive().limit(5)
    ]);
    
    res.json({
      success: true,
      data: {
        insights,
        opportunities,
        alerts,
        schedules,
        summary: {
          totalInsights: insights.length,
          totalOpportunities: opportunities.length,
          totalAlerts: alerts.length,
          totalSchedules: schedules.length
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard analytics:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;