const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oee_monitor');

// Importar modelos
const User = require('./models/User');
const Role = require('./models/Role');

async function debugLogin() {
  try {
    console.log('🔍 Debug do Login - Passo a Passo');
    console.log('=====================================');
    
    const email = 'admin@oee-monitor.com';
    const password = 'Admin@123';
    
    console.log(`📧 Testando email: ${email}`);
    console.log(`🔑 Testando senha: ${password}`);
    console.log('');
    
    // Passo 1: Buscar usuário
    console.log('1️⃣ Buscando usuário por email...');
    const user = await User.findByEmail(email);
    
    if (!user) {
      console.log('❌ Usuário não encontrado!');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nome: ${user.name}`);
    console.log(`   ✅ Status: ${user.status}`);
    console.log(`   🔒 Hash da senha: ${user.password ? user.password.substring(0, 20) + '...' : 'SENHA NÃO ENCONTRADA'}`);
    console.log('');
    
    // Passo 2: Verificar se senha existe
    console.log('2️⃣ Verificando se senha existe no usuário...');
    if (!user.password) {
      console.log('❌ Senha não encontrada no usuário!');
      return;
    }
    console.log('✅ Senha encontrada no usuário');
    console.log('');
    
    // Passo 3: Testar comparação de senha
    console.log('3️⃣ Testando comparação de senha...');
    console.log(`   🔑 Senha fornecida: "${password}"`);
    console.log(`   🔒 Hash no banco: ${user.password}`);
    
    try {
      const isValid = await user.comparePassword(password);
      console.log(`   🎯 Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
      
      if (!isValid) {
        // Testar comparação direta com bcrypt
        console.log('');
        console.log('4️⃣ Testando comparação direta com bcrypt...');
        const directCompare = await bcrypt.compare(password, user.password);
        console.log(`   🎯 Comparação direta: ${directCompare ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        
        // Testar diferentes variações da senha
        console.log('');
        console.log('5️⃣ Testando variações da senha...');
        const variations = [
          password,
          password.trim(),
          password.toLowerCase(),
          password.toUpperCase(),
          'admin@123',
          'Admin123',
          'admin123'
        ];
        
        for (const variation of variations) {
          const testResult = await bcrypt.compare(variation, user.password);
          console.log(`   🔑 "${variation}": ${testResult ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na comparação: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugLogin();