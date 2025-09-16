# 🚀 Guia de Deploy - OEE Monitor

## 📋 Configuração Multi-Ambiente

O sistema está configurado para funcionar automaticamente em **dois ambientes**:

### 🏠 Desenvolvimento Local
- **URL Frontend:** http://localhost:8081
- **URL Backend:** http://localhost:3001/api
- **Credenciais:** admin@oee.com / demo123
- **Logs:** Habilitados

### 🌐 Produção Online
- **URL Frontend:** https://planing-ita.com
- **URL Backend:** https://planing-ita.com/api
- **Credenciais:** admin@planing-ita.com / prod2024!
- **Logs:** Desabilitados

## 🔧 Detecção Automática de Ambiente

O sistema detecta automaticamente o ambiente baseado no hostname:

```typescript
// Detecção automática
const isProduction = window.location.hostname.includes('planing-ita.com');

if (isProduction) {
  // Configurações de produção
  API_URL = 'https://planing-ita.com/api';
  CREDENTIALS = { email: 'admin@planing-ita.com', password: 'prod2024!' };
} else {
  // Configurações de desenvolvimento
  API_URL = 'http://localhost:3001/api';
  CREDENTIALS = { email: 'admin@oee.com', password: 'demo123' };
}
```

## 📦 Build para Produção

### Método 1: Script Automatizado
```bash
node build-production.js
```

### Método 2: Build Manual
```bash
# Definir ambiente
export NODE_ENV=production

# Executar build
npm run build
```

## 🌐 Deploy em Produção

### 1. Preparar Arquivos
```bash
# Fazer build
node build-production.js

# Arquivos gerados em ./dist/
```

### 2. Upload para Servidor
```bash
# Fazer upload da pasta dist/ para o servidor web
# Exemplo com rsync:
rsync -avz ./dist/ user@planing-ita.com:/var/www/html/
```

### 3. Configurar Servidor Web

#### Nginx
```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name planing-ita.com www.planing-ita.com;
    
    root /var/www/html;
    index index.html;
    
    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Apache
```apache
<VirtualHost *:80>
<VirtualHost *:443>
    ServerName planing-ita.com
    ServerAlias www.planing-ita.com
    DocumentRoot /var/www/html
    
    # Frontend (SPA)
    <Directory /var/www/html>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Backend API
    ProxyPass /api/ http://localhost:3001/
    ProxyPassReverse /api/ http://localhost:3001/
</VirtualHost>
```

## 🔐 Configuração do Backend

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Configurar Variáveis de Ambiente
```bash
# backend/.env
MONGODB_URI=mongodb://localhost:27017/oee_monitor
JWT_SECRET=your-super-secret-key
PORT=3001
NODE_ENV=production
```

### 3. Iniciar Backend
```bash
# Desenvolvimento
npm start

# Produção com PM2
pm2 start server.js --name "oee-backend"
```

## 🗄️ Configuração do Banco de Dados

### 1. Instalar MongoDB
```bash
# Ubuntu/Debian
sudo apt install mongodb

# CentOS/RHEL
sudo yum install mongodb-server
```

### 2. Criar Dados Iniciais
```bash
cd backend
node scripts/seedDatabase.js
```

## ✅ Verificação de Deploy

### 1. Testar Frontend
```bash
curl https://planing-ita.com
# Deve retornar o HTML da aplicação
```

### 2. Testar Backend
```bash
curl https://planing-ita.com/api/health
# Deve retornar status da API
```

### 3. Testar Autenticação
```bash
curl -X POST https://planing-ita.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@planing-ita.com","password":"prod2024!"}'
# Deve retornar token JWT
```

## 🔍 Logs e Monitoramento

### Frontend
- **Desenvolvimento:** Logs habilitados no console
- **Produção:** Logs desabilitados por padrão

### Backend
```bash
# Ver logs do PM2
pm2 logs oee-backend

# Ver logs do sistema
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🚨 Troubleshooting

### Problema: API não conecta
```bash
# Verificar se backend está rodando
curl http://localhost:3001/api/health

# Verificar logs
pm2 logs oee-backend
```

### Problema: CORS Error
```javascript
// backend/server.js - Adicionar CORS
app.use(cors({
  origin: ['https://planing-ita.com', 'https://www.planing-ita.com'],
  credentials: true
}));
```

### Problema: 404 em rotas SPA
```nginx
# Nginx - Adicionar fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

## 📊 Monitoramento

### Métricas Importantes
- **Uptime:** Backend e Frontend
- **Response Time:** API endpoints
- **Error Rate:** 4xx/5xx responses
- **Database:** MongoDB connections

### Ferramentas Recomendadas
- **PM2:** Process management
- **Nginx:** Web server
- **MongoDB Compass:** Database GUI
- **Grafana:** Monitoring dashboard

---

## 🎯 Resumo

✅ **Sistema configurado para ambos ambientes**
✅ **Detecção automática de ambiente**
✅ **Credenciais específicas por ambiente**
✅ **Build otimizado para produção**
✅ **Documentação completa de deploy**

**O sistema está pronto para deploy em https://planing-ita.com/ !**