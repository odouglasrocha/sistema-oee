const mongoose = require('mongoose');
const User = require('../models/User');

// Carregar variáveis de ambiente
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oee-monitor';

async function resetLoginAttempts() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
    
    // Resetar tentativas de login para todos os usuários
    const result = await User.updateMany(
      {},
      {
        $unset: {
          loginAttempts: 1,
          lockUntil: 1
        },
        $set: {
          status: 'active'
        }
      }
    );
    
    console.log(`\n🔓 Resetadas tentativas de login para ${result.modifiedCount} usuários`);
    
    // Verificar usuários após reset
    const users = await User.find({}, 'name email status loginAttempts lockUntil');
    console.log('\n👥 Status dos usuários após reset:');
    console.log('=' .repeat(60));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   ✅ Status: ${user.status}`);
      console.log(`   🔒 Tentativas: ${user.loginAttempts || 0}`);
      console.log(`   ⏰ Bloqueado até: ${user.lockUntil ? user.lockUntil.toLocaleString('pt-BR') : 'Não bloqueado'}`);
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
    
    console.log('\n✅ Reset concluído! Agora você pode tentar fazer login novamente.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

resetLoginAttempts();