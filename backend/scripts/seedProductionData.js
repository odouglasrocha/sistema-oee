const mongoose = require('mongoose');
const Machine = require('../models/Machine');
const ProductionRecord = require('../models/ProductionRecord');
const User = require('../models/User');
require('dotenv').config();

// Conectar ao MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/?retryWrites=true&w=majority&appName=Banco';

const seedProductionData = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB!');

    // Buscar máquinas e usuários
    const machines = await Machine.find({ isActive: true });
    const users = await User.find({ status: 'active' }).limit(1);
    
    if (machines.length === 0) {
      console.log('⚠️ Nenhuma máquina encontrada.');
      return;
    }
    
    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado.');
      return;
    }

    const operator = users[0];
    console.log(`👤 Usando operador: ${operator.name}`);

    // Gerar dados para cada máquina
    for (const machine of machines) {
      console.log(`🏭 Gerando dados para: ${machine.name}`);
      
      // Verificar se já tem dados hoje
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const existingRecord = await ProductionRecord.findOne({
        machine: machine._id,
        date: { $gte: startOfDay, $lt: endOfDay }
      });
      
      if (existingRecord) {
        console.log(`  ⏭️ Máquina ${machine.name} já tem dados hoje`);
        continue;
      }

      // Gerar dados aleatórios mas realistas
      const baseOEE = 60 + Math.random() * 35; // OEE entre 60-95%
      const availability = 80 + Math.random() * 18; // 80-98%
      const performance = 75 + Math.random() * 20; // 75-95%
      const quality = 85 + Math.random() * 14; // 85-99%
      
      const targetProduction = 1000 + Math.random() * 500; // 1000-1500 unidades
      const actualProduction = Math.round(targetProduction * (performance / 100));
      const goodProduction = Math.round(actualProduction * (quality / 100));
      const wasteFilm = Math.round((actualProduction - goodProduction) * 0.7);
      const wasteOrganic = actualProduction - goodProduction - wasteFilm;
      
      const plannedTime = 480; // 8 horas
      const downtime = Math.round(plannedTime * (1 - availability / 100));
      const actualTime = plannedTime - downtime;

      // Criar registro de produção
      const productionRecord = new ProductionRecord({
        machine: machine._id,
        shift: 'morning',
        date: today,
        startTime: new Date(today.getTime() - 8 * 60 * 60 * 1000), // 8 horas atrás
        endTime: new Date(today.getTime() - 1 * 60 * 60 * 1000), // 1 hora atrás
        operator: operator._id,
        material: {
          code: `MAT-${machine.code}`,
          name: `Material para ${machine.name}`,
          description: `Material de produção para ${machine.name}`
        },
        production: {
          target: Math.round(targetProduction),
          good: goodProduction,
          waste: {
            film: wasteFilm,
            organic: wasteOrganic
          },
          total: actualProduction
        },
        time: {
          planned: plannedTime,
          actual: actualTime,
          downtime: downtime
        },
        downtimeEntries: downtime > 0 ? [{
          reason: 'setup',
          duration: downtime,
          description: 'Tempo de setup e ajustes',
          startTime: new Date(today.getTime() - 4 * 60 * 60 * 1000),
          endTime: new Date(today.getTime() - 4 * 60 * 60 * 1000 + downtime * 60 * 1000)
        }] : [],
        notes: `Dados gerados automaticamente para ${machine.name}`,
        status: 'completed',
        createdBy: operator._id,
        updatedBy: operator._id
      });

      await productionRecord.save();
      console.log(`  ✅ Dados criados para ${machine.name} - OEE: ${productionRecord.oee.overall}%`);
    }

    console.log('🎉 Dados de produção gerados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar dados:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexão fechada.');
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedProductionData();
}

module.exports = seedProductionData;