const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const AIInsight = require('./models/AIInsight');

// Simular dados de produção para teste
const mockProductionRecord = {
  machine: {
    _id: new mongoose.Types.ObjectId(),
    name: 'Máquina Teste Direct'
  },
  oee: {
    availability: 100,
    performance: 85,
    quality: 98,
    overall: 83
  },
  production: {
    good: 800,
    target: 1000,
    waste: {
      film: 15,
      organic: 5
    }
  },
  shift: 'Manhã',
  date: new Date(),
  operator: 'Teste'
};

// Função de geração de insights (copiada do production.js)
async function generateProductionInsights(productionRecord) {
  console.log(`🧠 Analisando dados de produção para insights: ${productionRecord.machine.name}`);
  
  const insights = [];
  const oee = productionRecord.oee;
  
  // 1. Análise de OEE baixo
  if (oee.overall < 85) {
    let severity = 'medium';
    let description = '';
    let recommendation = '';
    
    if (oee.overall < 70) {
      severity = 'high';
    } else if (oee.overall < 60) {
      severity = 'critical';
    }
    
    // Identificar o componente mais problemático
    const components = [
      { name: 'Disponibilidade', value: oee.availability, threshold: 90 },
      { name: 'Performance', value: oee.performance, threshold: 95 },
      { name: 'Qualidade', value: oee.quality, threshold: 99 }
    ];
    
    const worstComponent = components.reduce((worst, current) => 
      (current.value < current.threshold && current.value < worst.value) ? current : worst
    );
    
    if (worstComponent.name === 'Disponibilidade') {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa disponibilidade (${oee.availability}%). Isso indica possíveis paradas não planejadas ou tempos de setup elevados.`;
      recommendation = 'Revisar plano de manutenção preventiva, otimizar tempos de setup e investigar causas de paradas não planejadas.';
    } else if (worstComponent.name === 'Performance') {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa performance (${oee.performance}%). A máquina está operando abaixo da velocidade ideal.`;
      recommendation = 'Verificar calibração da máquina, treinamento de operadores e possíveis gargalos no processo.';
    } else {
      description = `OEE baixo (${oee.overall}%) devido principalmente à baixa qualidade (${oee.quality}%). Alto índice de produtos defeituosos.`;
      recommendation = 'Revisar parâmetros de qualidade, calibrar sensores e verificar matéria-prima.';
    }
    
    insights.push({
      type: 'optimization',
      severity,
      title: `OEE Abaixo do Ideal - ${productionRecord.machine.name}`,
      description,
      recommendation,
      confidence: 85,
      machineId: productionRecord.machine._id,
      data: {
        oee: oee,
        shift: productionRecord.shift,
        date: productionRecord.date,
        worstComponent: worstComponent.name
      },
      metrics: {
        impactOEE: Math.round(85 - oee.overall),
        estimatedSavings: Math.round((85 - oee.overall) * 100)
      },
      tags: ['oee', 'performance', worstComponent.name.toLowerCase()],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
  }
  
  // 2. Análise de desperdícios elevados
  const totalWaste = (productionRecord.production.waste.film || 0) + (productionRecord.production.waste.organic || 0);
  const wastePercentage = (totalWaste / productionRecord.production.good) * 100;
  
  if (wastePercentage > 5) {
    let severity = 'medium';
    if (wastePercentage > 10) severity = 'high';
    if (wastePercentage > 15) severity = 'critical';
    
    insights.push({
      type: 'optimization',
      severity,
      title: `Desperdício Elevado - ${productionRecord.machine.name}`,
      description: `Desperdício de ${wastePercentage.toFixed(1)}% detectado (${totalWaste} unidades). Filme: ${productionRecord.production.waste.film || 0}, Orgânico: ${productionRecord.production.waste.organic || 0}.`,
      recommendation: 'Revisar configurações da máquina, verificar qualidade da matéria-prima e treinar operadores para reduzir desperdícios.',
      confidence: 80,
      machineId: productionRecord.machine._id,
      data: {
        wastePercentage,
        filmWaste: productionRecord.production.waste.film || 0,
        organicWaste: productionRecord.production.waste.organic || 0,
        shift: productionRecord.shift,
        date: productionRecord.date
      },
      metrics: {
        impactQuality: Math.round(wastePercentage),
        estimatedSavings: Math.round(totalWaste * 2)
      },
      tags: ['waste', 'quality', 'cost'],
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    });
  }
  
  // 4. Análise de tempo vs meta
  if (productionRecord.production.target && productionRecord.production.good < productionRecord.production.target * 0.9) {
    const achievementPercentage = (productionRecord.production.good / productionRecord.production.target) * 100;
    
    insights.push({
      type: 'anomaly',
      severity: achievementPercentage < 80 ? 'high' : 'medium',
      title: `Meta de Produção Não Atingida - ${productionRecord.machine.name}`,
      description: `Produção atingiu apenas ${achievementPercentage.toFixed(1)}% da meta (${productionRecord.production.good}/${productionRecord.production.target} unidades).`,
      recommendation: 'Investigar causas da baixa produção: paradas não planejadas, problemas de qualidade, ou necessidade de ajustes na meta.',
      confidence: 90,
      machineId: productionRecord.machine._id,
      data: {
        achieved: productionRecord.production.good,
        target: productionRecord.production.target,
        achievementPercentage,
        shift: productionRecord.shift,
        date: productionRecord.date
      },
      metrics: {
        impactPerformance: Math.round(100 - achievementPercentage)
      },
      tags: ['target', 'production', 'planning'],
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    });
  }
  
  // Salvar insights no banco de dados
  if (insights.length > 0) {
    try {
      const createdInsights = await AIInsight.insertMany(insights);
      console.log(`✅ ${createdInsights.length} insights gerados para ${productionRecord.machine.name}`);
      return createdInsights;
    } catch (error) {
      console.error('Erro ao salvar insights:', error);
      throw error;
    }
  } else {
    console.log(`ℹ️ Nenhum insight gerado para ${productionRecord.machine.name} - dados dentro dos parâmetros normais`);
    return [];
  }
}

async function testInsights() {
  try {
    console.log('🔧 Testando geração direta de insights...\n');
    
    console.log('📊 Dados de teste:');
    console.log('- OEE:', mockProductionRecord.oee);
    console.log('- Produção:', mockProductionRecord.production.good, '/', mockProductionRecord.production.target);
    console.log('- Desperdício:', mockProductionRecord.production.waste);
    
    const insights = await generateProductionInsights(mockProductionRecord);
    
    console.log('\n📋 Resultados:');
    console.log(`- Total de insights gerados: ${insights.length}`);
    
    if (insights.length > 0) {
      insights.forEach((insight, index) => {
        console.log(`\n${index + 1}. ${insight.title}`);
        console.log(`   Tipo: ${insight.type}`);
        console.log(`   Severidade: ${insight.severity}`);
        console.log(`   Descrição: ${insight.description}`);
        console.log(`   Recomendação: ${insight.recommendation}`);
      });
    }
    
    // Limpar insights de teste
    await AIInsight.deleteMany({ machineId: mockProductionRecord.machine._id });
    console.log('\n🧹 Insights de teste removidos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n✅ Teste concluído');
  }
}

testInsights();