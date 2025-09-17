const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não está definida no arquivo .env');
  process.exit(1);
}
const MONGODB_URI = process.env.MONGODB_URI;

async function testSettings() {
  try {
    console.log('🧪 Iniciando testes das configurações do sistema...');
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Teste 1: Buscar configurações ativas
    console.log('\n🧪 Teste 1: Buscar configurações ativas');
    const activeSettings = await SystemSettings.getActiveSettings();
    if (activeSettings) {
      console.log('✅ Configurações ativas encontradas:');
      console.log(`   • ID: ${activeSettings._id}`);
      console.log(`   • Empresa: ${activeSettings.companyName}`);
      console.log(`   • Criado por: ${activeSettings.createdBy?.name || 'N/A'}`);
      console.log(`   • Ativo: ${activeSettings.isActive}`);
    } else {
      console.log('❌ Nenhuma configuração ativa encontrada');
    }

    // Teste 2: Validar estrutura das configurações
    console.log('\n🧪 Teste 2: Validar estrutura das configurações');
    if (activeSettings) {
      const requiredFields = [
        'companyName', 'timezone', 'language', 'theme', 'autoRefresh', 'refreshInterval',
        'alertSettings', 'securitySettings', 'integrationSettings'
      ];
      
      let allFieldsPresent = true;
      for (const field of requiredFields) {
        if (activeSettings[field] === undefined) {
          console.log(`❌ Campo obrigatório ausente: ${field}`);
          allFieldsPresent = false;
        }
      }
      
      if (allFieldsPresent) {
        console.log('✅ Todos os campos obrigatórios estão presentes');
      }
      
      // Validar sub-estruturas
      const alertFields = ['emailNotifications', 'oeeThreshold', 'availabilityThreshold'];
      const securityFields = ['sessionTimeout', 'passwordExpiry', 'auditLog'];
      const integrationFields = ['iotSensors', 'apiAccess', 'webhooks'];
      
      console.log('   📧 Configurações de Alertas:');
      alertFields.forEach(field => {
        const value = activeSettings.alertSettings[field];
        console.log(`      • ${field}: ${value}`);
      });
      
      console.log('   🔒 Configurações de Segurança:');
      securityFields.forEach(field => {
        const value = activeSettings.securitySettings[field];
        console.log(`      • ${field}: ${value}`);
      });
      
      console.log('   🔗 Configurações de Integração:');
      integrationFields.forEach(field => {
        const value = activeSettings.integrationSettings[field];
        console.log(`      • ${field}: ${value}`);
      });
    }

    // Teste 3: Testar validações customizadas
    console.log('\n🧪 Teste 3: Testar validações customizadas');
    if (activeSettings) {
      const validationErrors = activeSettings.validateSettings();
      if (validationErrors.length === 0) {
        console.log('✅ Todas as validações passaram');
      } else {
        console.log('❌ Erros de validação encontrados:');
        validationErrors.forEach(error => console.log(`   • ${error}`));
      }
    }

    // Teste 4: Testar atualização de configurações
    console.log('\n🧪 Teste 4: Testar atualização de configurações');
    if (activeSettings) {
      const originalCompanyName = activeSettings.companyName;
      const testCompanyName = 'Teste OEE Monitor - ' + Date.now();
      
      activeSettings.companyName = testCompanyName;
      await activeSettings.save();
      
      const updatedSettings = await SystemSettings.getActiveSettings();
      if (updatedSettings.companyName === testCompanyName) {
        console.log('✅ Atualização de configurações funcionando');
        
        // Reverter mudança
        updatedSettings.companyName = originalCompanyName;
        await updatedSettings.save();
        console.log('✅ Configuração revertida com sucesso');
      } else {
        console.log('❌ Falha na atualização de configurações');
      }
    }

    // Teste 5: Testar criação de configuração duplicada (deve falhar)
    console.log('\n🧪 Teste 5: Testar prevenção de configurações duplicadas');
    try {
      const adminUser = await User.findOne().populate('role');
      const duplicateSettings = new SystemSettings({
        companyName: 'Teste Duplicado',
        isActive: true,
        createdBy: adminUser._id
      });
      
      await duplicateSettings.save();
      
      // Verificar se apenas uma configuração está ativa
      const activeCount = await SystemSettings.countDocuments({ isActive: true });
      if (activeCount === 1) {
        console.log('✅ Prevenção de duplicatas funcionando - apenas 1 configuração ativa');
      } else {
        console.log(`❌ Falha na prevenção de duplicatas - ${activeCount} configurações ativas`);
      }
      
    } catch (error) {
      console.log('✅ Erro esperado ao tentar criar configuração duplicada:', error.message);
    }

    // Teste 6: Testar histórico de configurações
    console.log('\n🧪 Teste 6: Testar histórico de configurações');
    const allSettings = await SystemSettings.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`✅ Encontradas ${allSettings.length} configurações no histórico:`);
    allSettings.forEach((setting, index) => {
      console.log(`   ${index + 1}. ${setting.companyName} - ${setting.isActive ? 'Ativa' : 'Inativa'} - ${new Date(setting.createdAt).toLocaleString('pt-BR')}`);
    });

    // Teste 7: Testar performance
    console.log('\n🧪 Teste 7: Testar performance de consulta');
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await SystemSettings.getActiveSettings();
    }
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;
    console.log(`✅ Tempo médio de consulta: ${avgTime.toFixed(2)}ms`);
    
    if (avgTime < 100) {
      console.log('✅ Performance excelente (< 100ms)');
    } else if (avgTime < 500) {
      console.log('⚠️  Performance aceitável (< 500ms)');
    } else {
      console.log('❌ Performance ruim (> 500ms)');
    }

    console.log('\n🎉 Todos os testes de configurações concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testSettings()
    .then(() => {
      console.log('✅ Testes concluídos com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro nos testes:', error);
      process.exit(1);
    });
}

module.exports = testSettings;