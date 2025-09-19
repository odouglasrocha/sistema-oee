const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testInsightsDetailed() {
  try {
    console.log('🔧 Teste detalhado de geração de insights...\n');

    // 1. Login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@oee-monitor.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ Login realizado com sucesso');

    // 2. Criar máquina
    console.log('\n2. Criando nova máquina...');
    const timestamp = Date.now().toString().slice(-8);
    const machineData = {
      name: `Máquina Debug Insights ${timestamp}`,
      code: `DEBUG-${timestamp}`,
      manufacturer: 'Fabricante Debug',
      model: 'Modelo Debug',
      category: 'Produção',
      type: 'Automática',
      capacity: {
        value: 1000,
        unit: 'pcs/h'
      },
      location: {
        plant: 'Planta Debug',
        area: 'Área Debug'
      },
      status: 'Ativa'
    };

    const machineResponse = await axios.post(`${API_BASE}/machines-admin`, machineData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const machineId = machineResponse.data.machine._id;
    console.log('✅ Máquina criada:', machineData.name);
    console.log('🔍 ID da máquina:', machineId);

    // 3. Criar registro com dados que DEVEM gerar insights
    console.log('\n3. Criando registro de produção com dados problemáticos...');
    const productionData = {
      machineId: machineId,
      shift: 'morning',
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      materialCode: 'MAT001',
      materialName: 'Material Debug',
      goodProduction: 600,  // Muito baixo (60% da meta)
      productionTarget: 1000,
      plannedTime: 480,
      actualTime: 480,
      filmWaste: 50,  // Muito alto (8.3% de desperdício)
      organicWaste: 30,
      notes: 'Teste debug com dados problemáticos'
    };

    console.log('📊 Dados que devem gerar insights:');
    console.log(`   - Produção: ${productionData.goodProduction}/${productionData.productionTarget} (${(productionData.goodProduction/productionData.productionTarget*100).toFixed(1)}%)`);
    console.log(`   - Desperdício total: ${productionData.filmWaste + productionData.organicWaste} unidades`);
    console.log(`   - % Desperdício: ${((productionData.filmWaste + productionData.organicWaste)/productionData.goodProduction*100).toFixed(1)}%`);

    const productionResponse = await axios.post(`${API_BASE}/production`, productionData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Registro de produção criado');
    const oee = productionResponse.data.data?.record?.oee;
    console.log('📊 OEE calculado:', oee);
    
    if (oee) {
      console.log(`   - OEE Overall: ${oee.overall}% (deve ser < 85 para gerar insight)`);
      console.log(`   - Disponibilidade: ${oee.availability}%`);
      console.log(`   - Performance: ${oee.performance}%`);
      console.log(`   - Qualidade: ${oee.quality}%`);
    }

    // 4. Aguardar processamento
    console.log('\n4. Aguardando processamento (15 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 5. Verificar insights específicos da máquina
    console.log('\n5. Verificando insights da máquina...');
    const machineInsightsResponse = await axios.get(`${API_BASE}/analytics/insights?machineId=${machineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Insights da máquina: ${machineInsightsResponse.data.data.length}`);
    
    if (machineInsightsResponse.data.data.length > 0) {
      machineInsightsResponse.data.data.forEach((insight, index) => {
        console.log(`\n   ${index + 1}. ${insight.title}`);
        console.log(`      Tipo: ${insight.type} | Severidade: ${insight.severity}`);
        console.log(`      Descrição: ${insight.description}`);
      });
    }

    // 6. Verificar todos os insights do sistema
    console.log('\n6. Verificando todos os insights do sistema...');
    const allInsightsResponse = await axios.get(`${API_BASE}/analytics/insights`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Total de insights no sistema: ${allInsightsResponse.data.data.length}`);

    // 7. Verificar insights recentes (últimas 24h)
    console.log('\n7. Verificando insights recentes...');
    const recentInsightsResponse = await axios.get(`${API_BASE}/analytics/insights?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Insights recentes: ${recentInsightsResponse.data.data.length}`);
    
    if (recentInsightsResponse.data.data.length > 0) {
      console.log('\n📋 Últimos insights:');
      recentInsightsResponse.data.data.slice(0, 3).forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight.title} (${insight.type}/${insight.severity})`);
        console.log(`      Máquina: ${insight.machineId?.name || insight.machineId?.code || insight.machineId || 'N/A'}`);
        console.log(`      Criado: ${new Date(insight.createdAt).toLocaleString()}`);
      });
    }

    // 8. Limpeza
    console.log('\n8. Limpando dados de teste...');
    await axios.delete(`${API_BASE}/machines-admin/${machineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Máquina deletada');

    console.log('\n🎉 Teste detalhado concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

testInsightsDetailed();