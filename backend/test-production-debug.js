const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api';

async function testProductionFlow() {
  try {
    console.log('🔧 Testando fluxo de produção com debug...\n');

    // 1. Login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@oee-monitor.com',
      password: 'Admin@123'
    });
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ Login realizado com sucesso');

    // 2. Criar máquina
    const timestamp = Date.now().toString().slice(-8);
    const machineData = {
      name: `Máquina Debug ${timestamp}`,
      code: `DBG-${timestamp}`,
      manufacturer: 'Fabricante Teste',
      model: 'Modelo Teste',
      capacity: {
        value: 1000,
        unit: 'pcs/h'
      },
      location: {
        plant: 'Planta Teste',
        area: 'Área Teste'
      },
      category: 'Produção',
      type: 'Automática',
      status: 'Ativa'
    };

    console.log('\n2. Criando nova máquina...');
    const machineResponse = await axios.post(`${API_BASE}/machines-admin`, machineData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const machineId = machineResponse.data.machine._id;
    console.log('✅ Máquina criada:', machineData.name);
    console.log('🔍 ID da máquina:', machineId);

    // 3. Criar registro de produção com dados que devem gerar insights
    console.log('\n3. Criando registro de produção...');
    const productionData = {
      machineId: machineId,
      shift: 'morning',
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 horas depois
      materialCode: 'MAT001',
      materialName: 'Material Teste',
      goodProduction: 700,  // Baixo para gerar insight de meta não atingida
      productionTarget: 1000,
      plannedTime: 480,
      actualTime: 480,
      filmWaste: 25,  // Alto para gerar insight de desperdício
      organicWaste: 15,
      notes: 'Teste de debug para insights'
    };

    const productionResponse = await axios.post(`${API_BASE}/production`, productionData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Registro de produção criado');
    console.log('📊 OEE calculado:', productionResponse.data.data?.record?.oee || 'N/A');
    
    // Aguardar um pouco mais para processamento
    console.log('\n4. Aguardando processamento (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 5. Verificar insights
    console.log('\n5. Verificando insights gerados...');
    const insightsResponse = await axios.get(`${API_BASE}/analytics/insights?machineId=${machineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Insights encontrados:', insightsResponse.data.data.length);
    if (insightsResponse.data.data.length > 0) {
      console.log('📊 Insights detalhados:');
      insightsResponse.data.data.forEach((insight, index) => {
        console.log(`\n   ${index + 1}. ${insight.title}`);
        console.log(`      Tipo: ${insight.type}`);
        console.log(`      Severidade: ${insight.severity}`);
        console.log(`      Descrição: ${insight.description}`);
        console.log(`      Recomendação: ${insight.recommendation}`);
        console.log(`      Confiança: ${insight.confidence}%`);
        console.log(`      Status: ${insight.status}`);
        console.log(`      Criado em: ${new Date(insight.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  Nenhum insight encontrado. Verificando possíveis causas...');
      
      // Verificar se há insights em geral no sistema
      const allInsightsResponse = await axios.get(`${API_BASE}/analytics/insights?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📊 Total de insights no sistema:', allInsightsResponse.data.data.length);
      
      if (allInsightsResponse.data.data.length > 0) {
        console.log('📋 Últimos insights no sistema:');
        allInsightsResponse.data.data.slice(0, 3).forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight.title} - Máquina: ${insight.machineId?.name || 'N/A'}`);
        });
      }
    }

    // 6. Limpar
    console.log('\n6. Limpando - deletando máquina de teste...');
    await axios.delete(`${API_BASE}/machines-admin/${machineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Máquina deletada com sucesso');

    console.log('\n🎉 Teste de debug concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('📋 Detalhes:', error.response.data.details);
    }
  }
}

testProductionFlow();