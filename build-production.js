#!/usr/bin/env node

/**
 * Script de build para produção
 * Configura automaticamente as variáveis de ambiente para https://planing-ita.com/
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build para produção...');
console.log('🌐 Ambiente: https://planing-ita.com/');

// Verificar se o arquivo .env.production existe
const envProdPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envProdPath)) {
  console.error('❌ Arquivo .env.production não encontrado!');
  process.exit(1);
}

try {
  // Definir variáveis de ambiente para o build
  process.env.NODE_ENV = 'production';
  process.env.VITE_API_BASE_URL = 'https://planing-ita.com/api';
  process.env.VITE_APP_ENV = 'production';
  process.env.VITE_APP_NAME = 'OEE Monitor';
  process.env.VITE_PRODUCTION_URL = 'https://planing-ita.com';
  process.env.VITE_BACKEND_URL = 'https://planing-ita.com/api';
  
  console.log('📦 Executando build...');
  
  // Executar o build
  execSync('npm run build', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('✅ Build concluído com sucesso!');
  console.log('📁 Arquivos gerados em: ./dist/');
  console.log('🌐 Configurado para: https://planing-ita.com/');
  console.log('');
  console.log('📋 Próximos passos:');
  console.log('1. Fazer upload da pasta ./dist/ para o servidor');
  console.log('2. Configurar o servidor web para servir os arquivos');
  console.log('3. Garantir que o backend esteja rodando em https://planing-ita.com/api');
  
} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}