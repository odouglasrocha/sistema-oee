const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testAuth() {
  try {
    console.log('🔧 Testando autenticação...\n');
    
    // 1. Fazer login
    console.log('1. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@oee-monitor.com',
      password: 'Admin@123'
    });
    
    console.log('✅ Login Status:', loginResponse.status);
    console.log('📋 Response keys:', Object.keys(loginResponse.data));
    
    if (loginResponse.data.tokens) {
      console.log('🔑 Tokens keys:', Object.keys(loginResponse.data.tokens));
      console.log('🔑 AccessToken presente:', !!loginResponse.data.tokens.accessToken);
    }
    
    const token = loginResponse.data.tokens.accessToken;
    
    // 2. Testar rota protegida simples
    console.log('\n2. Testando rota protegida...');
    const protectedResponse = await axios.get(`${API_BASE}/protected/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Rota protegida Status:', protectedResponse.status);
    console.log('👤 User:', protectedResponse.data.name);
    
    // 3. Testar rota de máquinas
    console.log('\n3. Testando rota de máquinas...');
    const machinesResponse = await axios.get(`${API_BASE}/machines-admin`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Máquinas Status:', machinesResponse.status);
    console.log('📋 Total de máquinas:', machinesResponse.data.length || 0);
    
    // 4. Testar criação de máquina
    console.log('\n4. Testando criação de máquina...');
    const machineData = {
      name: 'Máquina Teste Auth',
      code: 'TEST-AUTH-001',
      manufacturer: 'Fabricante Teste',
      model: 'Modelo Teste',
      category: 'Produção',
      type: 'Automática',
      capacity: {
        value: 100,
        unit: 'pcs/h'
      },
      location: {
        plant: 'Planta Teste',
        area: 'Setor Teste'
      },
      description: 'Máquina criada para teste de autenticação'
    };
    
    const createResponse = await axios.post(`${API_BASE}/machines-admin`, machineData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Criação Status:', createResponse.status);
    console.log('🏭 Máquina criada:', createResponse.data.machine?.name);
    console.log('🔍 ID da máquina:', createResponse.data.machine?._id);
    
    // 5. Limpar - deletar a máquina de teste
    if (createResponse.data.machine?._id) {
      console.log('\n5. Limpando - deletando máquina de teste...');
      const deleteResponse = await axios.delete(`${API_BASE}/machines-admin/${createResponse.data.machine._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Deleção Status:', deleteResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Data:', error.response.data);
    }
  }
}

testAuth();