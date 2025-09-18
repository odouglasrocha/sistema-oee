const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oee_monitor');

// Importar modelos
const User = require('./models/User');
const Role = require('./models/Role');

async function fixPasswords() {
  try {
    console.log('🔧 Corrigindo senhas dos usuários...');
    console.log('=====================================');
    
    const users = [
      { email: 'admin@oee-monitor.com', password: 'Admin@123' },
      { email: 'supervisor@oee-monitor.com', password: 'Supervisor@123' },
      { email: 'operador1@oee-monitor.com', password: 'Operador@123' },
      { email: 'operador2@oee-monitor.com', password: 'Operador@123' }
    ];
    
    for (const userData of users) {
      console.log(`\n🔍 Processando: ${userData.email}`);
      
      // Buscar usuário
      const user = await User.findOne({ email: userData.email });
      if (!user) {
        console.log(`❌ Usuário não encontrado: ${userData.email}`);
        continue;
      }
      
      // Gerar novo hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Atualizar senha diretamente no banco
      await User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            password: hashedPassword,
            passwordChangedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Senha atualizada para: ${userData.email}`);
      
      // Testar a nova senha
      const updatedUser = await User.findById(user._id).select('+password');
      const isValid = await bcrypt.compare(userData.password, updatedUser.password);
      console.log(`🎯 Teste da nova senha: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    }
    
    console.log('\n🎉 Todas as senhas foram corrigidas!');
    console.log('\n🔐 CREDENCIAIS ATUALIZADAS:');
    console.log('============================');
    console.log('📧 admin@oee-monitor.com');
    console.log('🔑 Admin@123');
    console.log('');
    console.log('📧 supervisor@oee-monitor.com');
    console.log('🔑 Supervisor@123');
    console.log('');
    console.log('📧 operador1@oee-monitor.com');
    console.log('🔑 Operador@123');
    console.log('');
    console.log('📧 operador2@oee-monitor.com');
    console.log('🔑 Operador@123');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir senhas:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixPasswords();