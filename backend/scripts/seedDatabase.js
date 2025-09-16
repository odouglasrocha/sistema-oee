const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const User = require('../models/User');
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');

// Configuração do banco de dados
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco';

// Dados dos perfis
const rolesData = [
  {
    name: 'administrador',
    displayName: 'Administrador',
    description: 'Acesso completo ao sistema com todas as permissões administrativas',
    level: 10,
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.export',
      
      // Máquinas
      'machines.view',
      'machines.create',
      'machines.edit',
      'machines.delete',
      'machines.start',
      'machines.stop',
      'machines.maintenance',
      'machines.status_change',
      'machines.assign_operator',
      'machines.view_stats',
      
      // Produção
      'production.view',
      'production.create',
      'production.edit',
      'production.delete',
      'production.start',
      'production.stop',
      
      // Análise
      'analytics.view',
      'analytics.advanced',
      'analytics.export',
      'analytics.ai_insights',
      
      // Relatórios
      'reports.view',
      'reports.create',
      'reports.export',
      'reports.schedule',
      
      // Usuários
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'users.manage_roles',
      
      // Configurações
      'settings.view',
      'settings.system',
      'settings.security',
      'settings.integrations',
      'settings.alerts',
      
      // Sistema
      'system.audit_log',
      'system.backup',
      'system.maintenance',
      'system.api_access'
    ]
  },
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Supervisão de produção e análise avançada com permissões de gerenciamento',
    level: 5,
    permissions: [
      // Dashboard
      'dashboard.view',
      'dashboard.export',
      
      // Máquinas
      'machines.view',
      'machines.edit',
      'machines.start',
      'machines.stop',
      'machines.maintenance',
      'machines.status_change',
      'machines.assign_operator',
      'machines.view_stats',
      
      // Produção
      'production.view',
      'production.create',
      'production.edit',
      'production.start',
      'production.stop',
      
      // Análise
      'analytics.view',
      'analytics.advanced',
      'analytics.export',
      'analytics.ai_insights',
      
      // Relatórios
      'reports.view',
      'reports.create',
      'reports.export',
      'reports.schedule',
      
      // Usuários (limitado)
      'users.view',
      
      // Configurações (limitado)
      'settings.view',
      'settings.alerts'
    ]
  },
  {
    name: 'operador',
    displayName: 'Operador',
    description: 'Operação básica de máquinas e visualização de dados de produção',
    level: 1,
    permissions: [
      // Dashboard
      'dashboard.view',
      
      // Máquinas
      'machines.view',
      'machines.start',
      'machines.stop',
      'machines.view_stats',
      
      // Produção
      'production.view',
      'production.start',
      'production.stop',
      
      // Análise (básica)
      'analytics.view',
      
      // Relatórios (visualização)
      'reports.view'
    ]
  }
];

// Dados dos usuários padrão
const usersData = [
  {
    name: 'Administrador do Sistema',
    email: 'admin@oee.com',
    password: 'demo123',
    role: 'administrador',
    department: 'administracao',
    location: 'Sede',
    status: 'active'
  },
  {
    name: 'Supervisor de Produção',
    email: 'supervisor@oee.com',
    password: 'demo123',
    role: 'supervisor',
    department: 'producao',
    location: 'Fábrica A',
    status: 'active'
  },
  {
    name: 'Operador de Máquina',
    email: 'operator@oee.com',
    password: 'demo123',
    role: 'operador',
    department: 'producao',
    location: 'Linha 1',
    status: 'active'
  }
];

// Função para conectar ao banco
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
    process.exit(1);
  }
}

// Função para criar perfis
async function createRoles() {
  console.log('\n📋 Criando perfis...');
  
  try {
    // Limpar perfis existentes
    await Role.deleteMany({});
    console.log('🗑️  Perfis existentes removidos');
    
    // Criar novos perfis
    const createdRoles = [];
    
    for (const roleData of rolesData) {
      const role = new Role(roleData);
      await role.save();
      createdRoles.push(role);
      console.log(`✅ Perfil criado: ${role.displayName} (${role.name})`);
    }
    
    console.log(`\n📋 ${createdRoles.length} perfis criados com sucesso!`);
    return createdRoles;
    
  } catch (error) {
    console.error('❌ Erro ao criar perfis:', error.message);
    throw error;
  }
}

// Função para criar usuários
async function createUsers(roles) {
  console.log('\n👥 Criando usuários...');
  
  try {
    // Limpar usuários existentes
    await User.deleteMany({});
    console.log('🗑️  Usuários existentes removidos');
    
    // Criar mapa de perfis por nome
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role._id;
    });
    
    // Criar novos usuários
    const createdUsers = [];
    
    for (const userData of usersData) {
      const user = new User({
        ...userData,
        role: roleMap[userData.role]
      });
      
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Usuário criado: ${user.name} (${user.email})`);
    }
    
    console.log(`\n👥 ${createdUsers.length} usuários criados com sucesso!`);
    return createdUsers;
    
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error.message);
    throw error;
  }
}

// Função para criar logs de auditoria iniciais
async function createInitialAuditLogs(users) {
  console.log('\n📊 Criando logs de auditoria iniciais...');
  
  try {
    // Limpar logs existentes
    await AuditLog.deleteMany({});
    console.log('🗑️  Logs existentes removidos');
    
    const adminUser = users.find(u => u.email === 'admin@oee.com');
    
    if (adminUser) {
      // Log de inicialização do sistema
      await AuditLog.createLog({
        user: adminUser._id,
        action: 'system_backup',
        resource: 'system',
        details: {
          type: 'database_seed',
          description: 'Inicialização do banco de dados com dados padrão',
          rolesCreated: rolesData.length,
          usersCreated: users.length
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seed Script',
        method: 'POST',
        endpoint: '/system/seed',
        statusCode: 200,
        success: true,
        severity: 'medium'
      });
      
      console.log('✅ Log de inicialização criado');
    }
    
    console.log('\n📊 Logs de auditoria iniciais criados!');
    
  } catch (error) {
    console.error('❌ Erro ao criar logs de auditoria:', error.message);
    throw error;
  }
}

// Função para verificar dados existentes
async function checkExistingData() {
  const [roleCount, userCount] = await Promise.all([
    Role.countDocuments(),
    User.countDocuments()
  ]);
  
  return { roleCount, userCount };
}

// Função principal
async function seedDatabase() {
  console.log('🌱 Iniciando população do banco de dados OEE Monitor...');
  console.log('=' .repeat(60));
  
  try {
    // Conectar ao banco
    await connectDatabase();
    
    // Verificar dados existentes
    const existing = await checkExistingData();
    console.log(`\n📊 Dados existentes: ${existing.roleCount} perfis, ${existing.userCount} usuários`);
    
    if (existing.roleCount > 0 || existing.userCount > 0) {
      console.log('⚠️  ATENÇÃO: Dados existentes serão removidos!');
      
      // Em produção, você pode querer adicionar uma confirmação aqui
      if (process.env.NODE_ENV === 'production') {
        console.log('❌ Operação cancelada em ambiente de produção');
        process.exit(1);
      }
    }
    
    // Criar perfis
    const roles = await createRoles();
    
    // Criar usuários
    const users = await createUsers(roles);
    
    // Criar logs iniciais
    await createInitialAuditLogs(users);
    
    // Resumo final
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 POPULAÇÃO DO BANCO CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(60));
    
    console.log('\n📋 PERFIS CRIADOS:');
    roles.forEach(role => {
      console.log(`   • ${role.displayName} (${role.name}) - Nível ${role.level}`);
    });
    
    console.log('\n👥 USUÁRIOS CRIADOS:');
    users.forEach(user => {
      console.log(`   • ${user.name} - ${user.email}`);
    });
    
    console.log('\n🔐 CREDENCIAIS DE ACESSO:');
    console.log('   • Administrador: admin@oee.com / demo123');
    console.log('   • Supervisor: supervisor@oee.com / demo123');
    console.log('   • Operador: operator@oee.com / demo123');
    
    console.log('\n🚀 O sistema está pronto para uso!');
    
  } catch (error) {
    console.error('\n❌ ERRO NA POPULAÇÃO DO BANCO:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    await mongoose.connection.close();
    console.log('\n🔌 Conexão com MongoDB fechada');
    process.exit(0);
  }
}

// Função para limpar banco (útil para desenvolvimento)
async function clearDatabase() {
  console.log('🧹 Limpando banco de dados...');
  
  try {
    await connectDatabase();
    
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      AuditLog.deleteMany({})
    ]);
    
    console.log('✅ Banco de dados limpo com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);

if (args.includes('--clear')) {
  clearDatabase();
} else {
  seedDatabase();
}

// Exportar funções para uso em outros scripts
module.exports = {
  seedDatabase,
  clearDatabase,
  connectDatabase,
  createRoles,
  createUsers,
  createInitialAuditLogs
};