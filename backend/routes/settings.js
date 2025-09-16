const express = require('express');
const { body, validationResult } = require('express-validator');
const SystemSettings = require('../models/SystemSettings');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

// Validações
const systemSettingsValidation = [
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome da empresa deve ter entre 1 e 100 caracteres'),
  
  body('timezone')
    .optional()
    .isIn(['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'Asia/Tokyo'])
    .withMessage('Fuso horário inválido'),
  
  body('language')
    .optional()
    .isIn(['pt-BR', 'en-US', 'es-ES'])
    .withMessage('Idioma inválido'),
  
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Tema inválido'),
  
  body('autoRefresh')
    .optional()
    .isBoolean()
    .withMessage('Auto refresh deve ser boolean'),
  
  body('refreshInterval')
    .optional()
    .isInt({ min: 10, max: 300 })
    .withMessage('Intervalo deve ser entre 10 e 300 segundos'),
  
  // Validações para alertSettings
  body('alertSettings.oeeThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Limite OEE deve ser entre 0 e 100'),
  
  body('alertSettings.availabilityThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Limite disponibilidade deve ser entre 0 e 100'),
  
  body('alertSettings.performanceThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Limite performance deve ser entre 0 e 100'),
  
  body('alertSettings.qualityThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Limite qualidade deve ser entre 0 e 100'),
  
  // Validações para securitySettings
  body('securitySettings.sessionTimeout')
    .optional()
    .isInt({ min: 30, max: 1440 })
    .withMessage('Timeout deve ser entre 30 e 1440 minutos'),
  
  body('securitySettings.passwordExpiry')
    .optional()
    .isInt({ min: 30, max: 365 })
    .withMessage('Expiração deve ser entre 30 e 365 dias'),
  
  body('securitySettings.loginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Tentativas de login devem ser entre 3 e 10')
];

// GET /api/settings - Obter configurações ativas
router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.getActiveSettings();
    
    // Se não existir configuração, criar uma padrão
    if (!settings) {
      settings = new SystemSettings({
        companyName: 'Indústria OEE Monitor',
        createdBy: req.user._id
      });
      await settings.save();
      settings = await SystemSettings.getActiveSettings();
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/settings - Atualizar configurações
router.put('/', requirePermission('manage_settings'), systemSettingsValidation, async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }
    
    let settings = await SystemSettings.getActiveSettings();
    
    if (!settings) {
      // Criar nova configuração
      settings = new SystemSettings({
        ...req.body,
        createdBy: req.user._id
      });
    } else {
      // Atualizar configuração existente
      Object.assign(settings, req.body);
      settings.updatedBy = req.user._id;
    }
    
    // Validar configurações customizadas
    const validationErrors = settings.validateSettings();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Configurações inválidas',
        errors: validationErrors
      });
    }
    
    await settings.save();
    
    // Recarregar com populações
    settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/settings/system - Atualizar apenas configurações do sistema
router.put('/system', requirePermission('manage_settings'), async (req, res) => {
  try {
    const { companyName, timezone, language, theme, autoRefresh, refreshInterval } = req.body;
    
    let settings = await SystemSettings.getActiveSettings();
    
    if (!settings) {
      settings = new SystemSettings({ createdBy: req.user._id });
    }
    
    // Atualizar apenas campos do sistema
    if (companyName !== undefined) settings.companyName = companyName;
    if (timezone !== undefined) settings.timezone = timezone;
    if (language !== undefined) settings.language = language;
    if (theme !== undefined) settings.theme = theme;
    if (autoRefresh !== undefined) settings.autoRefresh = autoRefresh;
    if (refreshInterval !== undefined) settings.refreshInterval = refreshInterval;
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações do sistema atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/settings/alerts - Atualizar apenas configurações de alertas
router.put('/alerts', requirePermission('manage_settings'), async (req, res) => {
  try {
    let settings = await SystemSettings.getActiveSettings();
    
    if (!settings) {
      settings = new SystemSettings({ createdBy: req.user._id });
    }
    
    // Atualizar configurações de alertas
    settings.alertSettings = {
      ...settings.alertSettings,
      ...req.body
    };
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações de alertas atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/settings/security - Atualizar apenas configurações de segurança
router.put('/security', requirePermission('manage_settings'), async (req, res) => {
  try {
    let settings = await SystemSettings.getActiveSettings();
    
    if (!settings) {
      settings = new SystemSettings({ createdBy: req.user._id });
    }
    
    // Atualizar configurações de segurança
    settings.securitySettings = {
      ...settings.securitySettings,
      ...req.body
    };
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações de segurança atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de segurança:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /api/settings/integration - Atualizar apenas configurações de integração
router.put('/integration', requirePermission('manage_settings'), async (req, res) => {
  try {
    let settings = await SystemSettings.getActiveSettings();
    
    if (!settings) {
      settings = new SystemSettings({ createdBy: req.user._id });
    }
    
    // Atualizar configurações de integração
    settings.integrationSettings = {
      ...settings.integrationSettings,
      ...req.body
    };
    
    settings.updatedBy = req.user._id;
    await settings.save();
    
    settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações de integração atualizadas com sucesso',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de integração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/settings/history - Histórico de configurações
router.get('/history', requirePermission('view_audit'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const settings = await SystemSettings.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await SystemSettings.countDocuments();
    
    res.json({
      success: true,
      data: {
        settings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/settings/reset - Resetar para configurações padrão
router.post('/reset', requirePermission('manage_settings'), async (req, res) => {
  try {
    // Desativar configuração atual
    await SystemSettings.updateMany({ isActive: true }, { isActive: false });
    
    // Criar nova configuração padrão
    const defaultSettings = new SystemSettings({
      companyName: 'Indústria OEE Monitor',
      createdBy: req.user._id
    });
    
    await defaultSettings.save();
    
    const settings = await SystemSettings.getActiveSettings();
    
    res.json({
      success: true,
      message: 'Configurações resetadas para o padrão',
      data: settings
    });
  } catch (error) {
    console.error('Erro ao resetar configurações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;