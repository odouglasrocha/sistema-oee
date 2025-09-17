# 🔄 Atualizações de Deploy - Sistema OEE Monitor

## 📋 Mudanças Aplicadas

### 🔧 Correções no Servidor de Produção

As seguintes correções foram aplicadas no servidor VPS e também devem ser aplicadas localmente:

### 1. **Configuração do Nginx**
- ✅ **Porta da API corrigida:** `5000` → `3001`
- ✅ **Caminho da API:** `/api` → `/api/` (com barra final)
- ✅ **Diretório dos arquivos:** `/var/www/sistema-oee/dist`

### 2. **Arquivo .env**
- ✅ **Correção:** `MONGODB_URImongodb` → `MONGODB_URI=mongodb`
- ✅ **String de conexão válida configurada**

### 3. **Senhas dos Usuários**
- ✅ **Resetadas para funcionamento correto**

## 🔑 Credenciais Atualizadas

### Usuários do Sistema:

**👨‍💼 Administrador:**
- **Email:** `admin@oee.com`
- **Senha:** `admin123`
- **Permissões:** Acesso completo

**👨‍🔧 Supervisor:**
- **Email:** `supervisor@oee.com`
- **Senha:** `supervisor123`
- **Permissões:** Supervisão de produção

**👨‍🏭 Operador:**
- **Email:** `operator@oee.com`
- **Senha:** `operator123`
- **Permissões:** Operação de máquinas

## 🛠️ Como Aplicar Localmente

### 1. **Reset de Senhas Local**

```bash
# No diretório backend
cd backend
node resetPasswordLocal.js
```

### 2. **Verificar .env Local**

Certifique-se de que o arquivo `backend/.env` está correto:

```env
MONGODB_URI=mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco
PORT=3001
NODE_ENV=development
```

### 3. **Deploy Atualizado**

O arquivo `deploy.sh` foi atualizado com:
- Porta correta da API (3001)
- Configuração correta do Nginx

## ✅ Status do Sistema

### Produção (https://planing-ita.com)
- ✅ Frontend funcionando
- ✅ Backend funcionando (porta 3001)
- ✅ MongoDB conectado
- ✅ Autenticação funcionando
- ✅ SSL configurado

### Desenvolvimento Local
- ✅ Configurações sincronizadas
- ✅ Script de reset de senhas disponível
- ✅ Deploy script atualizado

## 🚀 Próximos Passos

1. **Testar localmente** com as novas credenciais
2. **Verificar** se todas as funcionalidades estão operacionais
3. **Documentar** qualquer nova funcionalidade adicionada

---

**Data da atualização:** $(date)
**Ambiente:** Produção e Desenvolvimento
**Status:** ✅ Aplicado com sucesso