const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const protectedRoutes = require('./routes/protected');
const machineRoutes = require('./routes/machines');
const productionRoutes = require('./routes/production');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  message: {
    error: 'Muitas tentativas de acesso. Tente novamente em 15 minutos.',
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

// CORS configurado para o frontend (local e produção)
const allowedOrigins = process.env.FRONTEND_URLS 
  ? process.env.FRONTEND_URLS.split(',').map(url => url.trim())
  : [
      // Desenvolvimento local (fallback)
      'http://localhost:8080',
      'http://localhost:8081', 
      'http://localhost:3000',
      // Produção (fallback)
      'https://planing-ita.com',
      'https://www.planing-ita.com'
    ];

console.log('🌐 CORS configurado para:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // Cache preflight por 24 horas
}));

// Conexão com MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/?retryWrites=true&w=majority&appName=Banco';

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
// app.use('/api/auth', loginLimiter, authRoutes); // Rate limiting temporariamente desabilitado// Rotas públicas
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes); // Rota pública para consulta
app.use('/api/dashboard', dashboardRoutes); // Rota pública para dashboard OEE

// Rotas protegidas (requerem autenticação)
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/machines-admin', authenticateToken, machineRoutes); // Gestão de máquinas protegida
app.use('/api/production', authenticateToken, productionRoutes); // Rotas de produção
app.use('/api/analytics', analyticsRoutes); // Rotas de analytics (já tem autenticação interna)
app.use('/api/settings', settingsRoutes); // Rotas de configurações (já tem autenticação interna)
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;