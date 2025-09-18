const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');

// Carregar variáveis de ambiente
require('dotenv').config();

// Configuração do banco de dados
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oee-monitor';

console.log('🔗 MongoDB URI:', MONGODB_URI ? 'Configurado' : 'Não encontrado');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'não definido');

// Dados dos perfis/roles base
const rolesData = [
  {
    name: 'administrador',
    displayName: 'Administrador',
    description: 'Acesso completo ao sistema',
    permissions: [
      'dashboard.view', 'dashboard.export',
      'machines.view', 'machines.create', 'machines.edit', 'machines.delete',
      'machines.start', 'machines.stop', 'machines.maintenance', 'machines.status',
      'production.view', 'production.create', 'production.edit', 'production.delete',
      'analytics.view', 'analytics.advanced', 'analytics.export',
      'reports.view', 'reports.create', 'reports.export',
      'users.view', 'users.create', 'users.edit', 'users.delete',
      'settings.view', 'settings.system', 'settings.security', 'settings.integrations',
      'system.audit_log', 'system.backup', 'system.maintenance', 'system.api_access'
    ],
    level: 10,
    isActive: true
  },
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Supervisão de produção e relatórios',
    permissions: [
      'dashboard.view', 'machines.view', 'machines.edit', 'machines.status',
      'production.view', 'production.create', 'production.edit',
      'analytics.view', 'reports.view', 'reports.create',
      'users.view', 'settings.view'
    ],
    level: 5,
    isActive: true
  },
  {
    name: 'operador',
    displayName: 'Operador',
    description: 'Operação de máquinas e registro de produção',
    permissions: [
      'dashboard.view', 'machines.view', 'machines.start', 'machines.stop',
      'production.view', 'production.create', 'analytics.view'
    ],
    level: 1,
    isActive: true
  }
];

// Dados dos usuários base
const usersData = [
  {
    name: 'Administrador do Sistema',
    email: 'admin@oee-monitor.com',
    password: 'Admin@123',
    role: 'administrador',
    isActive: true,
    department: 'ti',
    position: 'Administrador do Sistema'
  },
  {
    name: 'Supervisor de Produção',
    email: 'supervisor@oee-monitor.com',
    password: 'Supervisor@123',
    role: 'supervisor',
    isActive: true,
    department: 'producao',
    position: 'Supervisor'
  },
  {
    name: 'Operador Linha 1',
    email: 'operador1@oee-monitor.com',
    password: 'Operador@123',
    role: 'operador',
    isActive: true,
    department: 'producao',
    position: 'Operador de Máquina'
  },
  {
    name: 'Operador Linha 2',
    email: 'operador2@oee-monitor.com',
    password: 'Operador@123',
    role: 'operador',
    isActive: true,
    department: 'producao',
    position: 'Operador de Máquina'
  }
];

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

async function seedRoles() {
  console.log('\n📋 Criando perfis/roles...');
  
  try {
    // Limpar roles existentes
    await Role.deleteMany({});
    console.log('🗑️ Roles existentes removidos');
    
    // Criar novos roles
    const createdRoles = [];
    
    for (const roleData of rolesData) {
      const role = new Role(roleData);
      await role.save();
      createdRoles.push(role);
      console.log(`✅ Role criado: ${role.displayName} (${role.name})`);
    }
    
    console.log(`\n✅ ${createdRoles.length} perfis criados com sucesso!`);
    return createdRoles;
  } catch (error) {
    console.error('❌ Erro ao criar roles:', error);
    throw error;
  }
}

async function seedUsers() {
  console.log('\n👥 Criando usuários...');
  
  try {
    // Limpar usuários existentes
    await User.deleteMany({});
    console.log('🗑️ Usuários existentes removidos');
    
    // Buscar roles criados
    const roles = await Role.find({});
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role._id;
    });
    
    // Criar novos usuários
    const createdUsers = [];
    
    for (const userData of usersData) {
      // Hash da senha
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: roleMap[userData.role],
        isActive: userData.isActive,
        department: userData.department,
        position: userData.position,
        createdAt: new Date(),
        lastLogin: null
      });
      
      await user.save();
      createdUsers.push(user);
      
      console.log(`✅ Usuário criado: ${user.name} (${user.email}) - Role: ${userData.role}`);
    }
    
    console.log(`\n✅ ${createdUsers.length} usuários criados com sucesso!`);
    return createdUsers;
  } catch (error) {
    console.error('❌ Erro ao criar usuários:', error);
    throw error;
  }
}

async function displayCredentials() {
  console.log('\n🔐 CREDENCIAIS DE ACESSO:');
  console.log('='.repeat(50));
  
  const users = await User.find({}).populate('role');
  
  users.forEach(user => {
    const originalUserData = usersData.find(u => u.email === user.email);
    console.log(`\n👤 ${user.name}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   🔑 Senha: ${originalUserData?.password}`);
    console.log(`   👔 Cargo: ${user.position}`);
    console.log(`   🏢 Departamento: ${user.department}`);
    console.log(`   🎭 Perfil: ${user.role?.displayName}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('⚠️  IMPORTANTE: Altere as senhas padrão após o primeiro login!');
  console.log('🔒 As senhas estão criptografadas no banco de dados.');
}

async function main() {
  console.log('🚀 Iniciando seed de usuários e perfis...');
  console.log('📅 Data:', new Date().toLocaleString('pt-BR'));
  
  try {
    await connectDB();
    
    // Criar roles primeiro
    await seedRoles();
    
    // Criar usuários
    await seedUsers();
    
    // Exibir credenciais
    await displayCredentials();
    
    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📝 Resumo:');
    console.log(`   • ${rolesData.length} perfis criados`);
    console.log(`   • ${usersData.length} usuários criados`);
    console.log('   • Senhas criptografadas com bcrypt');
    console.log('   • Permissões configuradas por perfil');
    
  } catch (error) {
    console.error('\n❌ Erro durante o seed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  seedRoles,
  seedUsers,
  rolesData,
  usersData
};