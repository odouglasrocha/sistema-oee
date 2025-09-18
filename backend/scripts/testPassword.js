const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Carregar variáveis de ambiente
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/oee-monitor';

async function testPassword() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar o usuário admin com a senha
    const user = await User.findOne({ email: 'admin@oee-monitor.com' }).select('+password');
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('\n👤 Usuário encontrado:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nome: ${user.name}`);
    console.log(`   🔒 Hash da senha: ${user.password.substring(0, 20)}...`);
    console.log(`   ✅ Status: ${user.status}`);
    
    // Testar a senha
    const testPassword = 'Admin@123';
    console.log(`\n🔑 Testando senha: ${testPassword}`);
    
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`\n🎯 Resultado: ${isMatch ? '✅ SENHA CORRETA' : '❌ SENHA INCORRETA'}`);
    
    if (!isMatch) {
      console.log('\n🔧 Vou resetar a senha para Admin@123...');
      
      const newHashedPassword = await bcrypt.hash('Admin@123', 12);
      await User.updateOne(
        { email: 'admin@oee-monitor.com' },
        { password: newHashedPassword }
      );
      
      console.log('✅ Senha resetada com sucesso!');
      
      // Testar novamente
      const userUpdated = await User.findOne({ email: 'admin@oee-monitor.com' }).select('+password');
      const isMatchAfter = await bcrypt.compare('Admin@123', userUpdated.password);
      console.log(`🎯 Teste após reset: ${isMatchAfter ? '✅ SENHA CORRETA' : '❌ AINDA INCORRETA'}`);
    }
    
    console.log('\n🔐 CREDENCIAIS CONFIRMADAS:');
    console.log('📧 admin@oee-monitor.com');
    console.log('🔑 Admin@123');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

testPassword();