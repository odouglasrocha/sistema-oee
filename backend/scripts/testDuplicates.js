const mongoose = require('mongoose');
const ProductionRecord = require('../models/ProductionRecord');
const Machine = require('../models/Machine');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco';

async function testDuplicates() {
  try {
    console.log('🧪 Testando validação de duplicatas...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar máquina e usuário
    const machine = await Machine.findOne();
    const user = await User.findOne();
    
    if (!machine || !user) {
      console.log('❌ Máquina ou usuário não encontrado');
      return;
    }
    
    console.log(`🏭 Usando máquina: ${machine.name}`);
    console.log(`👤 Usando usuário: ${user.name}`);
    
    const today = new Date();
    const baseRecord = {
      machine: machine._id,
      date: today,
      startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0),
      endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      operator: user._id,
      material: {
        code: 'TEST-001',
        name: 'Produto Teste',
        description: 'Teste de duplicatas'
      },
      production: {
        target: 1000,
        good: 950,
        waste: { film: 30, organic: 20 }
      },
      time: {
        planned: 480,
        actual: 470
      },
      notes: 'Teste de validação',
      createdBy: user._id
    };
    
    // Teste 1: Criar registro turno manhã
    console.log('\n📋 Teste 1: Criando registro turno MANHÃ...');
    try {
      const record1 = new ProductionRecord({
        ...baseRecord,
        shift: 'morning'
      });
      await record1.save();
      console.log('✅ Registro turno MANHÃ criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro turno MANHÃ:', error.message);
    }
    
    // Teste 2: Tentar criar outro registro turno manhã (deve falhar)
    console.log('\n📋 Teste 2: Tentando criar OUTRO registro turno MANHÃ (deve falhar)...');
    try {
      const record2 = new ProductionRecord({
        ...baseRecord,
        shift: 'morning'
      });
      await record2.save();
      console.log('❌ ERRO: Registro duplicado foi criado (não deveria!)'); 
    } catch (error) {
      console.log('✅ Correto: Registro duplicado foi rejeitado:', error.message);
    }
    
    // Teste 3: Criar registro turno tarde (deve funcionar)
    console.log('\n📋 Teste 3: Criando registro turno TARDE (deve funcionar)...');
    try {
      const record3 = new ProductionRecord({
        ...baseRecord,
        shift: 'afternoon',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0)
      });
      await record3.save();
      console.log('✅ Registro turno TARDE criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro turno TARDE:', error.message);
    }
    
    // Teste 4: Criar registro turno noite (deve funcionar)
    console.log('\n📋 Teste 4: Criando registro turno NOITE (deve funcionar)...');
    try {
      const record4 = new ProductionRecord({
        ...baseRecord,
        shift: 'night',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 6, 0)
      });
      await record4.save();
      console.log('✅ Registro turno NOITE criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro turno NOITE:', error.message);
    }
    
    // Verificar registros criados
    const records = await ProductionRecord.find({
      machine: machine._id,
      date: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    
    console.log(`\n📊 Total de registros criados para hoje: ${records.length}`);
    records.forEach((record, index) => {
      console.log(`   ${index + 1}. Turno: ${record.shift} - OEE: ${record.oee?.overall || 0}%`);
    });
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

testDuplicates();