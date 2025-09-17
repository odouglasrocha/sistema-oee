const mongoose = require('mongoose');
const ProductionRecord = require('../models/ProductionRecord');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não está definida no arquivo .env');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

async function fixOEE() {
  try {
    console.log('🔧 Corrigindo cálculos OEE...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar todos os registros
    const records = await ProductionRecord.find();
    console.log(`📊 Encontrados ${records.length} registros para corrigir`);
    
    for (const record of records) {
      console.log(`\n🔍 Analisando registro ${record._id}:`);
      console.log(`   Máquina: ${record.machine}`);
      console.log(`   Data: ${record.date}`);
      console.log(`   Turno: ${record.shift}`);
      
      // Mostrar valores antes da correção
      console.log(`   📈 Valores ANTES:`);
      console.log(`      Meta: ${record.production?.target || 0}`);
      console.log(`      Produção Boa: ${record.production?.good || 0}`);
      console.log(`      Refugo Filme: ${record.production?.waste?.film || 0}`);
      console.log(`      Refugo Orgânico: ${record.production?.waste?.organic || 0}`);
      console.log(`      Total: ${record.production?.total || 0}`);
      console.log(`      Disponibilidade: ${record.oee?.availability || 0}%`);
      console.log(`      Performance: ${record.oee?.performance || 0}%`);
      console.log(`      Qualidade: ${record.oee?.quality || 0}%`);
      console.log(`      OEE: ${record.oee?.overall || 0}%`);
      
      // Forçar recálculo salvando o registro
      await record.save();
      
      // Buscar o registro atualizado
      const updatedRecord = await ProductionRecord.findById(record._id);
      
      console.log(`   ✅ Valores DEPOIS:`);
      console.log(`      Meta: ${updatedRecord.production?.target || 0}`);
      console.log(`      Produção Boa: ${updatedRecord.production?.good || 0}`);
      console.log(`      Refugo Filme: ${updatedRecord.production?.waste?.film || 0}`);
      console.log(`      Refugo Orgânico: ${updatedRecord.production?.waste?.organic || 0}`);
      console.log(`      Total: ${updatedRecord.production?.total || 0}`);
      console.log(`      Disponibilidade: ${updatedRecord.oee?.availability || 0}%`);
      console.log(`      Performance: ${updatedRecord.oee?.performance || 0}%`);
      console.log(`      Qualidade: ${updatedRecord.oee?.quality || 0}%`);
      console.log(`      OEE: ${updatedRecord.oee?.overall || 0}%`);
      
      // Verificar se há valores incorretos
      if (updatedRecord.oee?.performance > 100 || updatedRecord.oee?.quality > 100 || updatedRecord.oee?.overall > 100) {
        console.log(`   ⚠️  ATENÇÃO: Valores ainda incorretos!`);
        
        // Corrigir manualmente
        updatedRecord.oee.performance = Math.min(100, updatedRecord.oee.performance || 0);
        updatedRecord.oee.quality = Math.min(100, updatedRecord.oee.quality || 0);
        updatedRecord.oee.overall = Math.min(100, updatedRecord.oee.overall || 0);
        
        await updatedRecord.save();
        console.log(`   🔧 Valores corrigidos manualmente`);
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

fixOEE();