# 🔒 Guia de Segurança - Sistema OEE Monitor

## ⚠️ PROBLEMAS CRÍTICOS CORRIGIDOS

### 1. Credenciais Hardcoded Removidas
- **ANTES**: Credenciais MongoDB e JWT expostas diretamente no código
- **DEPOIS**: Todas as credenciais movidas para variáveis de ambiente
- **IMPACTO**: Eliminação do risco de exposição de credenciais no controle de versão

### 2. Validação de Variáveis de Ambiente
- Adicionada validação obrigatória para `MONGODB_URI` e `JWT_SECRET`
- Sistema falha de forma segura se variáveis críticas não estiverem definidas
- Mensagens de erro claras para facilitar debugging

### 3. Arquivo .env Removido do Repositório
- **CRÍTICO**: Arquivo `.env` com credenciais reais foi removido
- Arquivo `.env.example` atualizado com todas as variáveis necessárias
- `.gitignore` já configurado corretamente para ignorar arquivos `.env`

## 🛡️ CONFIGURAÇÃO SEGURA

### Passo 1: Criar Arquivo .env
```bash
cd backend
cp .env.example .env
```

### Passo 2: Configurar Variáveis Obrigatórias
Edite o arquivo `.env` e configure:

#### MongoDB (OBRIGATÓRIO)
```env
MONGODB_URI=mongodb+srv://seu_usuario:sua_senha@cluster.mongodb.net/database?retryWrites=true&w=majority
```

#### JWT Secret (OBRIGATÓRIO)
Gere uma chave segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configure no .env:
```env
JWT_SECRET=sua_chave_gerada_aqui
```

#### Session Secret (OBRIGATÓRIO)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

```env
SESSION_SECRET=sua_session_secret_aqui
```

### Passo 3: Configurar URLs do Frontend
```env
FRONTEND_URLS=http://localhost:8080,http://localhost:8081,http://localhost:3000
```

## 🔐 BOAS PRÁTICAS DE SEGURANÇA

### 1. Gerenciamento de Credenciais
- ✅ **NUNCA** commitar arquivos `.env`
- ✅ Usar variáveis de ambiente para todas as credenciais
- ✅ Gerar chaves JWT com pelo menos 32 caracteres
- ✅ Rotacionar credenciais regularmente

### 2. Configuração de Produção
```env
NODE_ENV=production
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=8h
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_TIME=900000
```

### 3. Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
```

### 4. CORS Seguro
- Configure apenas as URLs necessárias em `FRONTEND_URLS`
- Remova URLs de desenvolvimento em produção
- Use HTTPS em produção

## 🚨 CHECKLIST DE SEGURANÇA

### Antes do Deploy
- [ ] Arquivo `.env` configurado com credenciais únicas
- [ ] `NODE_ENV=production` definido
- [ ] URLs do frontend configuradas corretamente
- [ ] Credenciais de banco de dados seguras
- [ ] JWT_SECRET único e seguro (32+ caracteres)
- [ ] Rate limiting configurado
- [ ] Logs de auditoria habilitados

### Monitoramento
- [ ] Logs de tentativas de login falhadas
- [ ] Monitoramento de rate limiting
- [ ] Alertas para tentativas de acesso não autorizadas
- [ ] Backup regular do banco de dados

## 🔧 COMANDOS ÚTEIS

### Gerar Chaves Seguras
```bash
# JWT Secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Session Secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# API Key
node -e "console.log('oee_' + require('crypto').randomBytes(16).toString('hex'))"
```

### Verificar Configuração
```bash
# Testar conexão com banco
node scripts/checkData.js

# Testar autenticação
node scripts/testAuth.js
```

## 📞 SUPORTE

Em caso de problemas de segurança:
1. Verifique se todas as variáveis obrigatórias estão definidas no `.env`
2. Confirme se as credenciais estão corretas
3. Verifique os logs do servidor para mensagens de erro
4. Consulte este guia para configuração adequada

---

**⚠️ IMPORTANTE**: Este sistema agora está configurado com práticas de segurança adequadas. Mantenha sempre as credenciais seguras e nunca as exponha no código-fonte.