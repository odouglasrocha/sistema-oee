const mongoose = require('mongoose');
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco';

async function checkData() {
  try {
    console.log('🔍 Verificando dados no banco...');
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Verificar usuários
    const users = await User.find();
    console.log(`👥 Usuários: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    
    // Verificar máquinas
    const machines = await Machine.find();
    console.log(`\n🏭 Máquinas: ${machines.length}`);
    machines.forEach(machine => {
      console.log(`   - ${machine.name} (${machine.code})`);
    });
    
    // Verificar registros de produção
    const records = await ProductionRecord.find().populate('machine operator');
    console.log(`\n📊 Registros de Produção: ${records.length}`);
    records.forEach(record => {
      console.log(`   - ${record.machine?.name || 'N/A'} - ${record.shift} - ${new Date(record.date).toLocaleDateString()}`);
    });
    
    if (machines.length === 0) {
      console.log('\n⚠️  Nenhuma máquina encontrada. Criando máquinas de exemplo...');
      
      const sampleMachines = [
        {
          name: 'Linha 01 - Extrusão',
          code: 'EXT-001',
          type: 'producao',
          capacity: { value: 1200, unit: 'pcs/h' },
          status: 'ativa',
          location: 'Setor A',
          description: 'Máquina de extrusão principal'
        },
        {
          name: 'Linha 02 - Injeção',
          code: 'INJ-002',
          type: 'producao',
          capacity: { value: 800, unit: 'pcs/h' },
          status: 'ativa',
          location: 'Setor B',
          description: 'Máquina de injeção secundária'
        }
      ];
      
      for (const machineData of sampleMachines) {
        const machine = new Machine(machineData);
        await machine.save();
        console.log(`✅ Máquina criada: ${machine.name}`);
      }
    }
    
    if (records.length === 0) {
      console.log('\n⚠️  Nenhum registro de produção encontrado. Criando registros de exemplo...');
      
      const machines = await Machine.find();
      const users = await User.find();
      
      if (machines.length > 0 && users.length > 0) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const sampleRecords = [
          {
            machine: machines[0]._id,
            shift: 'morning',
            date: today,
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
            operator: users[0]._id,
            material: {
              code: 'MAT-001',
              name: 'Produto A',
              description: 'Material de teste'
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
            notes: 'Produção normal',
            createdBy: users[0]._id
          },
          {
            machine: machines[0]._id,
            shift: 'afternoon',
            date: today,
            startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
            endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0),
            operator: users[1]._id,
            material: {
              code: 'MAT-002',
              name: 'Produto B',
              description: 'Material de teste 2'
            },
            production: {
              target: 800,
              good: 780,
              waste: { film: 15, organic: 5 }
            },
            time: {
              planned: 480,
              actual: 475
            },
            notes: 'Produção com pequeno ajuste',
            createdBy: users[1]._id
          }
        ];
        
        for (const recordData of sampleRecords) {
          const record = new ProductionRecord(recordData);
          await record.save();
          console.log(`✅ Registro criado: ${record.shift} - ${record.production.good} unidades`);
        }
      }
    }
    
    console.log('\n🎉 Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

checkData();