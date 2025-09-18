# 👥 Seed de Usuários e Perfis - OEE Monitor

## 📋 Descrição

Script para popular o banco de dados com usuários e perfis base do sistema OEE Monitor, incluindo credenciais padrão para acesso inicial.

## 🚀 Como Executar

### Desenvolvimento:
```bash
cd backend
npm run seed:users
```

### Produção:
```bash
cd backend
npm run seed:users:prod
```

### Execução Direta:
```bash
cd backend
node scripts/seedUsersAndRoles.js
```

## 👔 Perfis Criados

### 1. **Administrador**
- **Nome:** `administrador`
- **Descrição:** Acesso completo ao sistema
- **Permissões:** Todas as funcionalidades
- **Nível:** 1 (mais alto)

### 2. **Supervisor**
- **Nome:** `supervisor`
- **Descrição:** Supervisão de produção e relatórios
- **Permissões:** Gestão de produção, relatórios, visualização
- **Nível:** 2

### 3. **Operador**
- **Nome:** `operador`
- **Descrição:** Operação de máquinas e registro de produção
- **Permissões:** Registro de produção, visualização básica
- **Nível:** 3

### 4. **Visualizador**
- **Nome:** `visualizador`
- **Descrição:** Apenas visualização de dados
- **Permissões:** Somente leitura
- **Nível:** 4 (mais baixo)

## 👤 Usuários Criados

### 🔐 **Credenciais de Acesso:**

| Nome | Email | Senha | Perfil | Departamento |
|------|-------|-------|--------|--------------|
| Administrador do Sistema | `admin@oee-monitor.com` | `Admin@123` | Administrador | TI |
| Supervisor de Produção | `supervisor@oee-monitor.com` | `Supervisor@123` | Supervisor | Produção |
| Operador Linha 1 | `operador1@oee-monitor.com` | `Operador@123` | Operador | Produção |
| Operador Linha 2 | `operador2@oee-monitor.com` | `Operador@123` | Operador | Produção |
| Analista de Qualidade | `qualidade@oee-monitor.com` | `Qualidade@123` | Visualizador | Qualidade |

## 🔒 Segurança

### **Senhas Criptografadas:**
- Todas as senhas são criptografadas com **bcrypt** (salt rounds: 12)
- As senhas nunca são armazenadas em texto plano
- Hash seguro para proteção contra ataques

### **⚠️ IMPORTANTE:**
- **Altere as senhas padrão** após o primeiro login
- Use senhas fortes em produção
- Desative usuários não utilizados
- Monitore logs de acesso

## 🎯 Permissões por Perfil

### **Administrador:**
```javascript
[
  'users.create', 'users.read', 'users.update', 'users.delete',
  'machines.create', 'machines.read', 'machines.update', 'machines.delete',
  'production.create', 'production.read', 'production.update', 'production.delete',
  'analytics.read', 'reports.read', 'settings.read', 'settings.update',
  'notifications.read', 'notifications.update', 'audit.read'
]
```

### **Supervisor:**
```javascript
[
  'users.read', 'machines.read', 'machines.update',
  'production.create', 'production.read', 'production.update',
  'analytics.read', 'reports.read', 'notifications.read'
]
```

### **Operador:**
```javascript
[
  'machines.read', 'production.create', 'production.read',
  'analytics.read'
]
```

### **Visualizador:**
```javascript
[
  'machines.read', 'production.read', 'analytics.read', 'reports.read'
]
```

## 🔄 Processo de Execução

1. **Conexão com MongoDB**
2. **Limpeza de dados existentes** (roles e usuários)
3. **Criação dos perfis/roles**
4. **Criação dos usuários**
5. **Criptografia das senhas**
6. **Associação usuário-perfil**
7. **Exibição das credenciais**

## 📊 Saída do Script

```
🚀 Iniciando seed de usuários e perfis...
📅 Data: 17/01/2025 16:30:45

✅ Conectado ao MongoDB

📋 Criando perfis/roles...
🗑️ Roles existentes removidos
✅ Role criado: Administrador (administrador)
✅ Role criado: Supervisor (supervisor)
✅ Role criado: Operador (operador)
✅ Role criado: Visualizador (visualizador)

✅ 4 perfis criados com sucesso!

👥 Criando usuários...
🗑️ Usuários existentes removidos
✅ Usuário criado: Administrador do Sistema (admin@oee-monitor.com) - Role: administrador
✅ Usuário criado: Supervisor de Produção (supervisor@oee-monitor.com) - Role: supervisor
✅ Usuário criado: Operador Linha 1 (operador1@oee-monitor.com) - Role: operador
✅ Usuário criado: Operador Linha 2 (operador2@oee-monitor.com) - Role: operador
✅ Usuário criado: Analista de Qualidade (qualidade@oee-monitor.com) - Role: visualizador

✅ 5 usuários criados com sucesso!

🔐 CREDENCIAIS DE ACESSO:
==================================================

👤 Administrador do Sistema
   📧 Email: admin@oee-monitor.com
   🔑 Senha: Admin@123
   👔 Cargo: Administrador do Sistema
   🏢 Departamento: TI
   🎭 Perfil: Administrador

[... outros usuários ...]

==================================================
⚠️  IMPORTANTE: Altere as senhas padrão após o primeiro login!
🔒 As senhas estão criptografadas no banco de dados.

🎉 Seed concluído com sucesso!

📝 Resumo:
   • 4 perfis criados
   • 5 usuários criados
   • Senhas criptografadas com bcrypt
   • Permissões configuradas por perfil

🔌 Desconectado do MongoDB
```

## 🛠️ Personalização

### **Adicionar Novos Usuários:**
Edite o array `usersData` em `seedUsersAndRoles.js`:

```javascript
{
  name: 'Nome do Usuário',
  email: 'email@empresa.com',
  password: 'SenhaSegura@123',
  role: 'operador', // ou outro perfil
  isActive: true,
  department: 'Departamento',
  position: 'Cargo'
}
```

### **Modificar Permissões:**
Edite o array `permissions` nos perfis em `rolesData`.

### **Criar Novos Perfis:**
Adicione novos objetos ao array `rolesData`.

## 🔍 Verificação

### **Verificar Usuários Criados:**
```bash
# No MongoDB
db.users.find({}, {name: 1, email: 1, isActive: 1})
```

### **Verificar Perfis:**
```bash
# No MongoDB
db.roles.find({}, {name: 1, displayName: 1, level: 1})
```

### **Testar Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oee-monitor.com","password":"Admin@123"}'
```

## 📚 Arquivos Relacionados

- **Script:** `backend/scripts/seedUsersAndRoles.js`
- **Modelos:** `backend/models/User.js`, `backend/models/Role.js`
- **Autenticação:** `backend/routes/auth.js`
- **Middleware:** `backend/middleware/auth.js`

## 🆘 Troubleshooting

### **Erro de Conexão MongoDB:**
```bash
# Verificar se MongoDB está rodando
sudo systemctl status mongod

# Verificar variável de ambiente
echo $MONGODB_URI
```

### **Erro de Permissões:**
```bash
# Verificar se o usuário tem permissão para escrever no banco
# Verificar se as collections existem
```

### **Usuários Duplicados:**
```bash
# O script remove usuários existentes automaticamente
# Se houver erro, limpe manualmente:
db.users.deleteMany({})
db.roles.deleteMany({})
```

---

**Data de Criação:** 17/01/2025  
**Versão:** 1.0  
**Autor:** Sistema OEE Monitor