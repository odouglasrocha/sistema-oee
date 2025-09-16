const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco';

async function seedSettings() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existem configurações
    const existingSettings = await SystemSettings.findOne({ isActive: true });
    if (existingSettings) {
      console.log('⚠️  Configurações já existem. Pulando seed...');
      return;
    }

    // Buscar um usuário administrador para ser o criador
    console.log('🔍 Buscando perfil administrador...');
    const adminRole = await Role.findOne({ name: 'administrador' });
    console.log('📋 Perfis encontrados:', await Role.find({}, 'name displayName').lean());
    
    if (!adminRole) {
      console.log('❌ Perfil administrador não encontrado. Execute seedDatabase.js primeiro.');
      return;
    }
    
    console.log('✅ Perfil administrador encontrado:', adminRole.name);
    console.log('🔍 Buscando usuário administrador...');
    const adminUser = await User.findOne({ role: adminRole._id });
    
    if (!adminUser) {
      console.log('❌ Usuário administrador não encontrado. Execute seedDatabase.js primeiro.');
      return;
    }
    
    console.log('✅ Usuário administrador encontrado:', adminUser.name);

    console.log('📝 Criando configurações padrão do sistema...');

    // Criar configurações padrão
    const defaultSettings = new SystemSettings({
      companyName: 'Indústria OEE Monitor',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      theme: 'system',
      autoRefresh: true,
      refreshInterval: 30,
      
      alertSettings: {
        emailNotifications: true,
        pushNotifications: false,
        oeeThreshold: 75,
        availabilityThreshold: 85,
        performanceThreshold: 80,
        qualityThreshold: 95,
        maintenanceAlerts: true,
        productionAlerts: true
      },
      
      securitySettings: {
        sessionTimeout: 480, // 8 horas
        passwordExpiry: 90, // 90 dias
        twoFactorAuth: false,
        auditLog: true,
        loginAttempts: 3
      },
      
      integrationSettings: {
        mesIntegration: false,
        erpIntegration: false,
        iotSensors: true,
        apiAccess: true,
        webhooks: false,
        webhookUrls: []
      },
      
      isActive: true,
      createdBy: adminUser._id
    });

    await defaultSettings.save();
    console.log('✅ Configurações padrão criadas com sucesso!');

    // Exibir resumo das configurações criadas
    console.log('\n📊 Resumo das Configurações:');
    console.log(`   • Empresa: ${defaultSettings.companyName}`);
    console.log(`   • Fuso Horário: ${defaultSettings.timezone}`);
    console.log(`   • Idioma: ${defaultSettings.language}`);
    console.log(`   • Tema: ${defaultSettings.theme}`);
    console.log(`   • Auto Refresh: ${defaultSettings.autoRefresh ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Intervalo: ${defaultSettings.refreshInterval}s`);
    console.log('\n🔔 Configurações de Alertas:');
    console.log(`   • Email: ${defaultSettings.alertSettings.emailNotifications ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Push: ${defaultSettings.alertSettings.pushNotifications ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Limite OEE: ${defaultSettings.alertSettings.oeeThreshold}%`);
    console.log(`   • Limite Disponibilidade: ${defaultSettings.alertSettings.availabilityThreshold}%`);
    console.log(`   • Limite Performance: ${defaultSettings.alertSettings.performanceThreshold}%`);
    console.log(`   • Limite Qualidade: ${defaultSettings.alertSettings.qualityThreshold}%`);
    console.log('\n🔒 Configurações de Segurança:');
    console.log(`   • Timeout Sessão: ${defaultSettings.securitySettings.sessionTimeout} min`);
    console.log(`   • Expiração Senha: ${defaultSettings.securitySettings.passwordExpiry} dias`);
    console.log(`   • 2FA: ${defaultSettings.securitySettings.twoFactorAuth ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Auditoria: ${defaultSettings.securitySettings.auditLog ? 'Ativa' : 'Inativa'}`);
    console.log(`   • Tentativas Login: ${defaultSettings.securitySettings.loginAttempts}`);
    console.log('\n🔗 Configurações de Integração:');
    console.log(`   • MES: ${defaultSettings.integrationSettings.mesIntegration ? 'Ativo' : 'Inativo'}`);
    console.log(`   • ERP: ${defaultSettings.integrationSettings.erpIntegration ? 'Ativo' : 'Inativo'}`);
    console.log(`   • IoT Sensores: ${defaultSettings.integrationSettings.iotSensors ? 'Ativo' : 'Inativo'}`);
    console.log(`   • API Access: ${defaultSettings.integrationSettings.apiAccess ? 'Ativo' : 'Inativo'}`);
    console.log(`   • Webhooks: ${defaultSettings.integrationSettings.webhooks ? 'Ativo' : 'Inativo'}`);
    
    console.log('\n🎉 Seed de configurações concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar seed de configurações:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  seedSettings()
    .then(() => {
      console.log('✅ Processo concluído');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = seedSettings;