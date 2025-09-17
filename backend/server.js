const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Carregar configuração baseada no ambiente
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: envFile });

console.log(`🔧 Carregando configurações do arquivo: ${envFile}`);
console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const protectedRoutes = require('./routes/protected');
const machineRoutes = require('./routes/machines');
const productionRoutes = require('./routes/production');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const externalRoutes = require('./routes/external');
const apiManagementRoutes = require('./routes/apiManagement');
const reportsRoutes = require('./routes/reports');

// Importar middleware de autenticação
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurações de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting - Configuração baseada no ambiente
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo requests por IP
  message: {
    error: 'Muitas tentativas de acesso. Tente novamente em alguns minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  skipSuccessfulRequests: true,
});

// Middleware
app.use(limiter);
app.use(compression());
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS - Configuração baseada no ambiente
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(url => url.trim())
  : process.env.NODE_ENV === 'production'
    ? [
        'https://planing-ita.com',
        'https://www.planing-ita.com'
      ]
    : [
        'http://localhost:8080',
        'http://localhost:8081', 
        'http://localhost:3000'
      ];

console.log('🌐 CORS configurado para:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log para debug mas permite a requisição
      console.log('⚠️ Origin não configurado no CORS:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // Cache preflight por 24 horas
}));

// Conexão com MongoDB
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não está definida no arquivo .env');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ Conectado ao MongoDB com sucesso!');
  console.log('🔗 Database:', mongoose.connection.name);
})
.catch((error) => {
  console.error('❌ Erro ao conectar com MongoDB:', error.message);
  process.exit(1);
});

// Middleware de log para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas públicas
// app.use('/api/auth', loginLimiter, authRoutes); // Rate limiting temporariamente desabilitado// Rotas públicas (sem autenticação)
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes); // Rota pública para consulta
app.use('/api/dashboard', dashboardRoutes); // Rota pública para dashboard OEE

// Rotas da API externa (autenticação via API key)
app.use('/api/external', externalRoutes);

// Rotas protegidas (requerem autenticação JWT)
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/machines-admin', authenticateToken, machineRoutes); // Gestão de máquinas protegida
app.use('/api/production', authenticateToken, productionRoutes); // Rotas de produção
app.use('/api/analytics', analyticsRoutes); // Rotas de analytics (já tem autenticação interna)
app.use('/api/settings', settingsRoutes); // Rotas de configurações (já tem autenticação interna)
app.use('/api/api-management', apiManagementRoutes); // Gerenciamento de API keys e webhooks
app.use('/api/reports', reportsRoutes); // Rotas de relatórios
app.use('/api/protected', authenticateToken, protectedRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'OEE Monitor API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      protected: '/api/protected',
      health: '/api/health'
    }
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err.stack);
  
  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors
    });
  }
  
  // Erro de cast do Mongoose (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID inválido fornecido'
    });
  }
  
  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} já está em uso`
    });
  }
  
  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado'
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Recebido SIGTERM. Encerrando servidor graciosamente...');
  try {
    await mongoose.connection.close();
    console.log('🔌 Conexão MongoDB fechada.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao fechar conexão MongoDB:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 Recebido SIGINT. Encerrando servidor graciosamente...');
  try {
    await mongoose.connection.close();
    console.log('🔌 Conexão MongoDB fechada.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao fechar conexão MongoDB:', error);
    process.exit(1);
  }
});

// Iniciar servidor com suporte a HTTPS em produção
function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  
  // Verificar se SSL está configurado para produção
  if (isProduction && sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    console.log('🔒 Iniciando servidor HTTPS...');
    
    const options = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };
    
    const httpsServer = https.createServer(options, app);
    
    httpsServer.listen(PORT, () => {
      console.log(`🚀 Servidor HTTPS rodando na porta ${PORT}`);
      console.log(`🌐 API disponível em: https://planing-ita.com/api`);
      console.log(`📊 Health check: https://planing-ita.com/api/health`);
      console.log(`🔐 Ambiente: ${process.env.NODE_ENV}`);
    });
    
    // Redirecionar HTTP para HTTPS
    const httpApp = express();
    httpApp.use((req, res) => {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
    });
    
    const httpServer = http.createServer(httpApp);
    httpServer.listen(80, () => {
      console.log('🔄 Redirecionamento HTTP -> HTTPS ativo na porta 80');
    });
    
  } else {
    // Servidor HTTP para desenvolvimento ou produção sem SSL
    console.log('🌐 Iniciando servidor HTTP...');
    
    const httpServer = http.createServer(app);
    
    httpServer.listen(PORT, () => {
      const baseUrl = isProduction ? 'https://planing-ita.com' : `http://localhost:${PORT}`;
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌐 API disponível em: ${baseUrl}/api`);
      console.log(`📊 Health check: ${baseUrl}/api/health`);
      console.log(`🔐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      
      if (isProduction && (!sslKeyPath || !sslCertPath)) {
        console.log('⚠️  SSL não configurado. Configure SSL_KEY_PATH e SSL_CERT_PATH para HTTPS.');
      }
    });
  }
}

startServer();

module.exports = app;