const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testInsightsGeneration() {
  try {
    console.log('🔧 Testando geração automática de insights...\n');
    
    // 1. Fazer login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@oee-monitor.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ Login realizado com sucesso');
    
    // 2. Criar uma nova máquina para teste
  console.log('\n2. Criando nova máquina...');
  const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos
  const machineData = {
    name: `Máquina Teste Insights ${timestamp}`,
    code: `TEST-${timestamp}`,
    manufacturer: 'Fabricante Teste',
    model: 'Modelo Teste',
    category: 'Produção',
    type: 'Automática',
    capacity: {
      value: 1000,
      unit: 'pcs/h'
    },
    location: {
      plant: 'Planta Teste',
      area: 'Área Teste'
    },
    status: 'Ativa'
  };
    
    const createResponse = await axios.post(`${API_BASE}/machines-admin`, machineData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Máquina criada:', createResponse.data.machine.name);
    console.log('🔍 ID da máquina:', createResponse.data.machine._id);
    
    const machineId = createResponse.data.machine._id;
    
    console.log('\n3. Criando registro de produção para gerar dados...');
    const productionData = {
      machineId: machineId,
      shift: 'morning',
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 horas depois
      materialCode: 'MAT001',
      materialName: 'Material Teste',
      goodProduction: 850,
      productionTarget: 1000,
      plannedTime: 480,
      actualTime: 480,
      filmWaste: 15,
      organicWaste: 5,
      notes: 'Registro de teste para geração de insights'
    };

    try {
      const productionResponse = await axios.post(`${API_BASE}/production`, productionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Registro de produção criado');
      console.log('📊 OEE calculado:', productionResponse.data.data?.record?.oee || 'N/A');
    } catch (error) {
      console.log('❌ Erro ao criar registro de produção:', error.response?.data?.message || error.message);
    }

    console.log('\n4. Aguardando processamento de insights...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Aumentar tempo de espera

    // 5. Verificar se insights foram gerados através da rota de analytics
    console.log('\n5. Verificando insights gerados...');
    try {
      // Buscar insights específicos da máquina
      const insightsResponse = await axios.get(`${API_BASE}/analytics/insights?machineId=${machineId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Insights encontrados:', insightsResponse.data.data.length);
      if (insightsResponse.data.data.length > 0) {
        console.log('📊 Insights:');
        insightsResponse.data.data.forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight.title} (${insight.type}) - ${insight.severity}`);
          console.log(`      ${insight.description}`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao buscar insights:', error.message);
      console.log('📋 Status:', error.response?.status);
      console.log('📋 Data:', error.response?.data);
    }

    // 6. Verificar logs de auditoria relacionados à máquina
    console.log('\n6. Verificando logs de auditoria...');
    try {
       const auditResponse = await axios.get(`${API_BASE}/machines-admin/${machineId}/audit`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Logs de auditoria encontrados:', auditResponse.data.logs?.length || 0);
      
      if (auditResponse.data.logs && auditResponse.data.logs.length > 0) {
        console.log('\n📋 Últimos logs:');
        auditResponse.data.logs.slice(0, 3).forEach((log, index) => {
          console.log(`   ${index + 1}. Ação: ${log.action}`);
          console.log(`      Usuário: ${log.user?.name || 'Sistema'}`);
          console.log(`      Data: ${new Date(log.createdAt).toLocaleString()}`);
          console.log('');
        });
      }
    } catch (auditError) {
      console.log('⚠️  Não foi possível verificar logs de auditoria:', auditError.response?.status || auditError.message);
    }
    
    // 7. Limpar - deletar a máquina de teste
    console.log('\n7. Limpando - deletando máquina de teste...');
    const deleteResponse = await axios.delete(`${API_BASE}/machines-admin/${machineId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Máquina deletada com sucesso');
    
    console.log('\n🎉 Teste de geração de insights concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }
}

testInsightsGeneration();