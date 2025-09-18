const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');

// Carregar variáveis de ambiente
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oee-monitor';

async function checkUsers() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
    
    // Verificar usuários
    const users = await User.find({}).populate('role');
    console.log('\n👥 Usuários encontrados:', users.length);
    console.log('=' .repeat(60));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🎭 Role: ${user.role?.displayName || 'Não definido'} (${user.role?.name || 'N/A'})`);
      console.log(`   🏢 Departamento: ${user.department || 'Não definido'}`);
      console.log(`   ✅ Ativo: ${user.status === 'active' ? 'Sim' : 'Não'}`);
      console.log(`   📅 Criado: ${user.createdAt?.toLocaleDateString('pt-BR') || 'N/A'}`);
    });
    
    // Verificar roles
    const roles = await Role.find({});
    console.log('\n\n👔 Perfis encontrados:', roles.length);
    console.log('=' .repeat(60));
    
    roles.forEach((role, index) => {
      console.log(`\n${index + 1}. ${role.displayName} (${role.name})`);
      console.log(`   📝 Descrição: ${role.description}`);
      console.log(`   🔢 Nível: ${role.level}`);
      console.log(`   🔐 Permissões: ${role.permissions.length}`);
      console.log(`   ✅ Ativo: ${role.isActive ? 'Sim' : 'Não'}`);
    });
    
    console.log('\n\n🔐 CREDENCIAIS PARA TESTE:');
    console.log('=' .repeat(60));
    console.log('📧 admin@oee-monitor.com');
    console.log('🔑 Admin@123');
    console.log('');
    console.log('📧 supervisor@oee-monitor.com');
    console.log('🔑 Supervisor@123');
    console.log('');
    console.log('📧 operador1@oee-monitor.com');
    console.log('🔑 Operador@123');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

checkUsers();