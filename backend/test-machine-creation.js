const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Credenciais do admin para autenticação
const ADMIN_CREDENTIALS = {
  email: 'admin@oee-monitor.com',
  password: 'Admin@123'
};

// Dados de teste para criar uma máquina
const testMachine = {
  name: `Máquina Teste ${Date.now()}`,
  code: `TEST-${Date.now()}`,
  type: 'Produção',
  category: 'Fresadora',
  location: 'Setor A',
  status: 'Operacional',
  manufacturer: 'Fabricante Teste',
  model: 'Modelo X1',
  serialNumber: `SN${Date.now()}`,
  installationDate: new Date().toISOString(),
  warrantyExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  nextMaintenance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  specifications: {
    power: '10kW',
    capacity: '1000 unidades/hora',
    dimensions: '2x1.5x1.8m'
  }
};

async function testMachineCreation() {
  try {
    console.log('🔧 Testando criação de máquina com insights automáticos...\n');
    
    // 0. Fazer login para obter token
    console.log('0. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
    
    if (loginResponse.status !== 200) {
      throw new Error('Falha no login');
    }
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ Login realizado com sucesso!');
    console.log('🔑 Token obtido:', token ? 'Presente' : 'Ausente');
    
    // Configurar headers de autenticação
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🔑 Header Authorization:', authHeaders.Authorization.substring(0, 20) + '...');
    
    // 1. Criar a máquina
    console.log('\n1. Criando máquina:', testMachine.name);
    const createResponse = await axios.post(`${API_BASE}/machines`, testMachine, {
      headers: authHeaders
    });
    
    if (createResponse.status === 201) {
      console.log('✅ Máquina criada com sucesso!');
      console.log('📋 ID da máquina:', createResponse.data._id);
      console.log('📝 Código:', createResponse.data.code);
      
      const machineId = createResponse.data._id;
      
      // 2. Aguardar um pouco para os insights serem processados
      console.log('\n⏳ Aguardando processamento dos insights (3 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 3. Verificar se os insights foram criados
      console.log('\n2. Verificando insights gerados automaticamente...');
      const insightsResponse = await axios.get(`${API_BASE}/analytics/insights?machineId=${machineId}`, {
        headers: authHeaders
      });
      
      if (insightsResponse.data && insightsResponse.data.length > 0) {
        console.log(`✅ ${insightsResponse.data.length} insights foram gerados automaticamente:`);
        
        insightsResponse.data.forEach((insight, index) => {
          console.log(`\n📊 Insight ${index + 1}:`);
          console.log(`   Tipo: ${insight.type}`);
          console.log(`   Título: ${insight.title}`);
          console.log(`   Descrição: ${insight.description}`);
          console.log(`   Prioridade: ${insight.priority}`);
          console.log(`   Status: ${insight.status}`);
        });
        
        // Verificar se temos os 3 insights esperados
        const expectedTypes = ['setup', 'monitoring', 'maintenance'];
        const foundTypes = insightsResponse.data.map(i => i.type);
        
        console.log('\n🔍 Verificação dos tipos de insights:');
        expectedTypes.forEach(type => {
          const found = foundTypes.includes(type);
          console.log(`   ${found ? '✅' : '❌'} ${type}: ${found ? 'Encontrado' : 'Não encontrado'}`);
        });
        
        if (expectedTypes.every(type => foundTypes.includes(type))) {
          console.log('\n🎉 TESTE PASSOU! Todos os insights esperados foram gerados automaticamente.');
        } else {
          console.log('\n⚠️  TESTE PARCIAL: Alguns insights esperados não foram encontrados.');
        }
        
      } else {
        console.log('❌ Nenhum insight foi gerado automaticamente.');
        console.log('🔍 Resposta da API:', insightsResponse.data);
      }
      
      // 4. Limpar - remover a máquina de teste
      console.log('\n3. Limpando dados de teste...');
      try {
        await axios.delete(`${API_BASE}/machines/${machineId}`, {
          headers: authHeaders
        });
        console.log('✅ Máquina de teste removida com sucesso.');
      } catch (deleteError) {
        console.log('⚠️  Erro ao remover máquina de teste:', deleteError.message);
      }
      
    } else {
      console.log('❌ Erro ao criar máquina:', createResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (error.response) {
      console.error('📋 Status:', error.response.status);
      console.error('📋 Dados:', error.response.data);
    }
  }
}

// Executar o teste
testMachineCreation();