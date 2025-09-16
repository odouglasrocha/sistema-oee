const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/?retryWrites=true&w=majority&appName=Banco';

const testAuth = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB!');

    // Verificar se existe usuário admin
    const adminUser = await User.findOne({ email: 'admin@oee.com' });
    
    if (adminUser) {
      console.log('✅ Usuário admin encontrado:', adminUser.email);
      console.log('📧 Email:', adminUser.email);
      console.log('👤 Nome:', adminUser.name);
      console.log('🔑 Senha hash:', adminUser.password ? 'Presente' : 'Ausente');
    } else {
      console.log('❌ Usuário admin não encontrado!');
      console.log('🔍 Buscando outros usuários...');
      
      const users = await User.find().limit(5);
      console.log(`📊 Total de usuários encontrados: ${users.length}`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - ${user.name}`);
      });
    }

    // Testar login
    console.log('\n🧪 Testando login...');
    const fetch = require('node-fetch');
    
    const loginData = {
      email: 'admin@oee.com',
      password: 'demo123'
    };
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Login bem-sucedido!');
        console.log('🎫 Token recebido:', result.tokens?.accessToken ? 'Sim' : 'Não');
      } else {
        console.log('❌ Falha no login:', result.error || result.message);
      }
    } catch (error) {
      console.log('❌ Erro na requisição de login:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada.');
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  testAuth();
}

module.exports = testAuth;