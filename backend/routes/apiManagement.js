const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const ApiRequest = require('../models/ApiRequest');
const Webhook = require('../models/Webhook');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { webhookService } = require('../services/webhookService');

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// ===== GERENCIAMENTO DE API KEYS =====

// GET /api/api-management/keys - Listar API keys
router.get('/keys', requirePermission('system.api_access'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);
    
    const [apiKeys, total] = await Promise.all([
      ApiKey.find(filters)
        .populate('createdBy', 'name email')
        .select('-keyHash') // Não retornar o hash da chave
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ApiKey.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: apiKeys,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/api-management/keys - Criar nova API key
router.post('/keys', requirePermission('system.api_access'), async (req, res) => {
  try {
    const {
      name,
      description,
      permissions,
      rateLimit,
      allowedIPs,
      webhookUrl,
      webhookEvents,
      expiresAt
    } = req.body;
    
    // Validar permissões
    const validPermissions = [
      'read:machines', 'write:machines',
      'read:production', 'write:production',
      'read:analytics', 'read:dashboard',
      'webhook:receive', 'webhook:send'
    ];
    
    const invalidPermissions = permissions?.filter(p => !validPermissions.includes(p));
    if (invalidPermissions?.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Permissões inválidas',
        invalidPermissions
      });
    }
    
    const apiKey = new ApiKey({
      name,
      description,
      permissions: permissions || [],
      rateLimit: rateLimit || { requests: 1000, window: 3600000 },
      allowedIPs: allowedIPs || [],
      webhookUrl,
      webhookEvents: webhookEvents || [],
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });
    
    await apiKey.save();
    
    // Retornar a chave completa apenas uma vez (na criação)
    const response = {
      success: true,
      data: {
        ...apiKey.toObject(),
        fullKey: apiKey._fullKey // Chave completa disponível apenas na criação
      },
      message: 'API key criada com sucesso',
      warning: 'Guarde a chave completa em local seguro. Ela não será exibida novamente.'
    };
    
    // Remover a chave completa do objeto para não ficar em memória
    delete apiKey._fullKey;
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Erro ao criar API key:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /api/api-management/keys/:id - Atualizar API key
router.put('/keys/:id', requirePermission('system.api_access'), async (req, res) => {
  try {
    const { status, permissions, rateLimit, allowedIPs, webhookUrl, webhookEvents } = req.body;
    
    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      {
        status,
        permissions,
        rateLimit,
        allowedIPs,
        webhookUrl,
        webhookEvents,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: apiKey,
      message: 'API key atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar API key:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/api-management/keys/:id - Revogar API key
router.delete('/keys/:id', requirePermission('system.api_access'), async (req, res) => {
  try {
    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked', updatedAt: new Date() },
      { new: true }
    );
    
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key não encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'API key revogada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao revogar API key:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/api-management/keys/:id/stats - Estatísticas de uso da API key
router.get('/keys/:id/stats', requirePermission('system.api_access'), async (req, res) => {
  try {
    const { timeRange = 24 } = req.query;
    
    const apiKey = await ApiKey.findById(req.params.id);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key não encontrada'
      });
    }
    
    const stats = await ApiRequest.getStats(req.params.id, parseInt(timeRange));
    
    res.json({
      success: true,
      data: {
        apiKey: {
          name: apiKey.name,
          status: apiKey.status,
          lastUsed: apiKey.lastUsed,
          usageCount: apiKey.usageCount
        },
        stats,
        timeRange: parseInt(timeRange)
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ===== GERENCIAMENTO DE WEBHOOKS =====

// GET /api/api-management/webhooks - Listar webhooks
router.get('/webhooks', requirePermission('system.api_access'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, event } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (event) filters.events = event;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);
    
    const [webhooks, total] = await Promise.all([
      Webhook.find(filters)
        .populate('createdBy', 'name email')
        .populate('filters.machineIds', 'name model')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Webhook.countDocuments(filters)
    ]);
    
    res.json({
      success: true,
      data: webhooks,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/api-management/webhooks - Criar webhook
router.post('/webhooks', requirePermission('system.api_access'), async (req, res) => {
  try {
    const webhookData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const webhook = new Webhook(webhookData);
    await webhook.save();
    
    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook criado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao criar webhook:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /api/api-management/webhooks/:id - Atualizar webhook
router.put('/webhooks/:id', requirePermission('system.api_access'), async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: webhook,
      message: 'Webhook atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao atualizar webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/api-management/webhooks/:id - Deletar webhook
router.delete('/webhooks/:id', requirePermission('system.api_access'), async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook não encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Webhook deletado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao deletar webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/api-management/webhooks/:id/test - Testar webhook
router.post('/webhooks/:id/test', requirePermission('system.api_access'), async (req, res) => {
  try {
    const result = await webhookService.testWebhook(req.params.id, req.user.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Erro ao testar webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/api-management/webhook-events - Listar eventos disponíveis
router.get('/webhook-events', requirePermission('system.api_access'), (req, res) => {
  const events = [
    { value: 'machine.status_changed', label: 'Status da Máquina Alterado', category: 'Máquinas' },
    { value: 'machine.created', label: 'Máquina Criada', category: 'Máquinas' },
    { value: 'machine.updated', label: 'Máquina Atualizada', category: 'Máquinas' },
    { value: 'machine.deleted', label: 'Máquina Deletada', category: 'Máquinas' },
    { value: 'production.started', label: 'Produção Iniciada', category: 'Produção' },
    { value: 'production.completed', label: 'Produção Concluída', category: 'Produção' },
    { value: 'production.stopped', label: 'Produção Parada', category: 'Produção' },
    { value: 'production.paused', label: 'Produção Pausada', category: 'Produção' },
    { value: 'production.resumed', label: 'Produção Retomada', category: 'Produção' },
    { value: 'alert.created', label: 'Alerta Criado', category: 'Alertas' },
    { value: 'alert.resolved', label: 'Alerta Resolvido', category: 'Alertas' },
    { value: 'oee.threshold_exceeded', label: 'Limite de OEE Excedido', category: 'OEE' },
    { value: 'oee.threshold_recovered', label: 'OEE Recuperado', category: 'OEE' },
    { value: 'maintenance.scheduled', label: 'Manutenção Agendada', category: 'Manutenção' },
    { value: 'maintenance.completed', label: 'Manutenção Concluída', category: 'Manutenção' },
    { value: 'user.created', label: 'Usuário Criado', category: 'Sistema' },
    { value: 'user.updated', label: 'Usuário Atualizado', category: 'Sistema' },
    { value: 'system.backup_completed', label: 'Backup Concluído', category: 'Sistema' },
    { value: 'system.error', label: 'Erro do Sistema', category: 'Sistema' }
  ];
  
  res.json({
    success: true,
    data: events
  });
});

// GET /api/api-management/stats - Estatísticas gerais da API
router.get('/stats', requirePermission('system.api_access'), async (req, res) => {
  try {
    const [apiKeysCount, webhooksCount, recentRequests] = await Promise.all([
      ApiKey.countDocuments({ status: 'active' }),
      Webhook.countDocuments({ status: 'active' }),
      ApiRequest.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);
    
    const queueStats = webhookService.getQueueStats();
    
    res.json({
      success: true,
      data: {
        apiKeys: {
          active: apiKeysCount
        },
        webhooks: {
          active: webhooksCount
        },
        requests: {
          last24h: recentRequests
        },
        webhookQueue: queueStats
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;