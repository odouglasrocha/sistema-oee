const mongoose = require('mongoose');
const ProductionRecord = require('../models/ProductionRecord');
const Machine = require('../models/Machine');
const User = require('../models/User');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não está definida no arquivo .env');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

async function testMultipleShifts() {
  try {
    console.log('🧪 Testando múltiplos turnos por máquina...');
    
    await mongoose.connect(MONGODB_URI);
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
    const todayStr = today.toISOString().split('T')[0];
    
    // Limpar registros de teste existentes
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    await ProductionRecord.deleteMany({
      machine: machine._id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    console.log('🧹 Registros de teste limpos');
    
    // Teste 1: Criar registro turno MANHÃ
    console.log('\n📋 Teste 1: Criando registro turno MANHÃ...');
    try {
      const morningRecord = new ProductionRecord({
        machine: machine._id,
        shift: 'morning',
        date: today,
        startTime: new Date(`${todayStr}T06:00:00`),
        endTime: new Date(`${todayStr}T14:00:00`),
        operator: user._id,
        material: {
          code: 'TEST-MORNING',
          name: 'Produto Teste Manhã',
          description: 'Teste turno manhã'
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
        notes: 'Teste turno manhã',
        createdBy: user._id
      });
      
      await morningRecord.save();
      console.log('✅ Registro MANHÃ criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro MANHÃ:', error.message);
    }
    
    // Teste 2: Criar registro turno TARDE
    console.log('\n📋 Teste 2: Criando registro turno TARDE...');
    try {
      const afternoonRecord = new ProductionRecord({
        machine: machine._id,
        shift: 'afternoon',
        date: today,
        startTime: new Date(`${todayStr}T14:00:00`),
        endTime: new Date(`${todayStr}T22:00:00`),
        operator: user._id,
        material: {
          code: 'TEST-AFTERNOON',
          name: 'Produto Teste Tarde',
          description: 'Teste turno tarde'
        },
        production: {
          target: 1000,
          good: 980,
          waste: { film: 15, organic: 5 }
        },
        time: {
          planned: 480,
          actual: 475
        },
        notes: 'Teste turno tarde',
        createdBy: user._id
      });
      
      await afternoonRecord.save();
      console.log('✅ Registro TARDE criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro TARDE:', error.message);
    }
    
    // Teste 3: Criar registro turno NOITE
    console.log('\n📋 Teste 3: Criando registro turno NOITE...');
    try {
      const nightRecord = new ProductionRecord({
        machine: machine._id,
        shift: 'night',
        date: today,
        startTime: new Date(`${todayStr}T22:00:00`),
        endTime: new Date(`${todayStr}T06:00:00`),
        operator: user._id,
        material: {
          code: 'TEST-NIGHT',
          name: 'Produto Teste Noite',
          description: 'Teste turno noite'
        },
        production: {
          target: 1000,
          good: 920,
          waste: { film: 40, organic: 40 }
        },
        time: {
          planned: 480,
          actual: 460
        },
        notes: 'Teste turno noite',
        createdBy: user._id
      });
      
      await nightRecord.save();
      console.log('✅ Registro NOITE criado com sucesso');
    } catch (error) {
      console.log('❌ Erro ao criar registro NOITE:', error.message);
    }
    
    // Teste 4: Tentar criar registro duplicado (deve falhar)
    console.log('\n📋 Teste 4: Tentando criar registro MANHÃ duplicado (deve falhar)...');
    try {
      const duplicateRecord = new ProductionRecord({
        machine: machine._id,
        shift: 'morning',
        date: today,
        startTime: new Date(`${todayStr}T06:00:00`),
        endTime: new Date(`${todayStr}T14:00:00`),
        operator: user._id,
        material: {
          code: 'TEST-DUPLICATE',
          name: 'Produto Teste Duplicado',
          description: 'Teste duplicação'
        },
        production: {
          target: 1000,
          good: 900,
          waste: { film: 50, organic: 50 }
        },
        time: {
          planned: 480,
          actual: 450
        },
        notes: 'Teste duplicação',
        createdBy: user._id
      });
      
      await duplicateRecord.save();
      console.log('❌ ERRO: Registro duplicado foi criado (não deveria)');
    } catch (error) {
      console.log('✅ Registro duplicado rejeitado corretamente:', error.message);
    }
    
    // Verificar registros criados
    console.log('\n📊 Verificando registros criados...');
    const todayRecords = await ProductionRecord.find({
      machine: machine._id,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate('machine', 'name');
    
    console.log(`📈 Total de registros encontrados: ${todayRecords.length}`);
    todayRecords.forEach((record, index) => {
      const shiftName = record.shift === 'morning' ? 'Manhã' : 
                       record.shift === 'afternoon' ? 'Tarde' : 'Noite';
      console.log(`   ${index + 1}. ${shiftName} - ${record.material.code} - OEE: ${record.oee?.overall || 'N/A'}%`);
    });
    
    if (todayRecords.length === 3) {
      console.log('\n🎉 SUCESSO: Sistema permite exatamente 3 turnos por máquina por dia!');
    } else {
      console.log(`\n⚠️  ATENÇÃO: Esperado 3 registros, encontrado ${todayRecords.length}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testMultipleShifts()
    .then(() => {
      console.log('✅ Testes concluídos');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro nos testes:', error);
      process.exit(1);
    });
}

module.exports = testMultipleShifts;