const mongoose = require('mongoose');
const ProductionRecord = require('../models/ProductionRecord');
const User = require('../models/User');
const Machine = require('../models/Machine');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco';

async function testAPI() {
  try {
    console.log('🧪 Testando API de produção...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar um usuário para gerar token
    const user = await User.findOne({ email: 'admin@oee.com' });
    if (!user) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('👤 Usuário encontrado:', user.name);
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        roles: user.roles || ['admin'] 
      },
      process.env.JWT_SECRET || 'J6g7wPyaq2gqVlztQkG34RwiwH5hxOpRMVPEouvYkGo=',
      { expiresIn: '24h' }
    );
    
    console.log('🔑 Token gerado:', token.substring(0, 50) + '...');
    
    // Testar busca de registros diretamente no banco
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    console.log('📅 Buscando registros entre:', startDate.toISOString(), 'e', endDate.toISOString());
    
    const records = await ProductionRecord.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('machine', 'name code capacity')
    .populate('operator', 'name email')
    .populate('createdBy', 'name')
    .sort({ date: -1, shift: 1 });
    
    console.log('📊 Registros encontrados no banco:', records.length);
    
    records.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.machine?.name || 'N/A'} - ${record.shift} - ${new Date(record.date).toLocaleDateString()}`);
      console.log(`      Produção: ${record.production.good} unidades`);
      console.log(`      OEE: ${record.oee.overall}%`);
    });
    
    // Testar a API usando fetch
    const fetch = require('node-fetch');
    
    const apiUrl = `http://localhost:3001/api/production?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=50`;
    console.log('\n🔗 Testando API:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('📡 Resposta da API:', {
        status: response.status,
        success: data.success,
        recordCount: data.data?.records?.length || 0,
        message: data.message
      });
      
      if (data.success && data.data.records) {
        console.log('✅ API retornou registros:', data.data.records.length);
        data.data.records.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.machine?.name || 'N/A'} - ${record.shift}`);
        });
      } else {
        console.log('❌ API não retornou registros ou houve erro');
      }
      
    } catch (apiError) {
      console.error('❌ Erro ao testar API:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

testAPI();