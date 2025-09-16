# 🚀 Guia de Deploy - OEE Monitor

Este guia contém as instruções para fazer deploy do sistema OEE Monitor tanto em ambiente local quanto no servidor de produção.

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- MongoDB Atlas (já configurado)
- Servidor web (Nginx, Apache, etc.) para produção

## 🏠 Ambiente Local (Desenvolvimento)

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

**URLs Locais:**
- Frontend: http://localhost:8081
- Backend API: http://localhost:3001

## 🌐 Deploy para Produção (https://planing-ita.com)

### 1. Configuração do Backend

#### Variáveis de Ambiente (.env)
```bash
# Servidor
PORT=3001
NODE_ENV=production

# URLs do Frontend
FRONTEND_URLS=https://planing-ita.com,https://www.planing-ita.com

# MongoDB (já configurado)
MONGODB_URI=mongodb+srv://orlanddouglas_db_user:TqtwMu2HTPBszmv7@banco.asm5oa1.mongodb.net/oee_monitor?retryWrites=true&w=majority&appName=Banco

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=7d

# Segurança
BCRYPT_ROUNDS=12
SESSION_SECRET=sua_session_secret_aqui

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
```

#### Deploy do Backend
```bash
cd backend
npm install --production
npm start
```

### 2. Configuração do Frontend

#### Build para Produção
```bash
# Usar o arquivo .env.production (já configurado)
npm run build
```

#### Arquivos gerados
Os arquivos de build estarão na pasta `dist/` e devem ser servidos pelo servidor web.

### 3. Configuração do Servidor Web (Nginx)

#### Configuração para Frontend
```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name planing-ita.com www.planing-ita.com;
    
    # SSL Configuration (configure seus certificados)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Frontend (arquivos estáticos)
    location / {
        root /path/to/oee-monitor/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache para assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers (caso necessário)
        add_header Access-Control-Allow-Origin "https://planing-ita.com";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    
    # Redirect HTTP to HTTPS
    if ($scheme != "https") {
        return 301 https://$server_name$request_uri;
    }
}
```

### 4. Configuração do PM2 (Gerenciador de Processos)

#### Instalar PM2
```bash
npm install -g pm2
```

#### Arquivo ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'oee-monitor-api',
    script: './backend/server.js',
    cwd: '/path/to/oee-monitor',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Iniciar com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Scripts de Deploy Automatizado

### Script de Deploy (deploy.sh)
```bash
#!/bin/bash

echo "🚀 Iniciando deploy do OEE Monitor..."

# Atualizar código
git pull origin main

# Backend
echo "📦 Instalando dependências do backend..."
cd backend
npm install --production
cd ..

# Frontend
echo "🏗️ Fazendo build do frontend..."
npm install
npm run build

# Reiniciar serviços
echo "🔄 Reiniciando serviços..."
pm2 restart oee-monitor-api

# Recarregar Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Acesse: https://planing-ita.com"
```

## 🔍 Verificação do Deploy

### Checklist de Verificação
- [ ] Backend rodando na porta 3001
- [ ] Frontend acessível em https://planing-ita.com
- [ ] API respondendo em https://planing-ita.com/api/health
- [ ] Login funcionando com usuários demo
- [ ] CORS configurado corretamente
- [ ] SSL/HTTPS ativo
- [ ] Logs sendo gerados corretamente

### Comandos de Verificação
```bash
# Verificar se o backend está rodando
curl https://planing-ita.com/api/health

# Verificar logs do PM2
pm2 logs oee-monitor-api

# Verificar status dos serviços
pm2 status
sudo systemctl status nginx
```

## 🔐 Credenciais de Acesso

**Usuários Demo:**
- **Administrador**: `admin@oee.com` / `demo123`
- **Supervisor**: `supervisor@oee.com` / `demo123`
- **Operador**: `operator@oee.com` / `demo123`

## 📊 Monitoramento

### Logs Importantes
- Backend: `pm2 logs oee-monitor-api`
- Nginx: `/var/log/nginx/access.log` e `/var/log/nginx/error.log`
- Sistema: `journalctl -u nginx -f`

### Métricas
- CPU e Memória: `pm2 monit`
- Conexões MongoDB: Logs da aplicação
- Requests HTTP: Logs do Nginx

## 🆘 Troubleshooting

### Problemas Comuns

1. **CORS Error**
   - Verificar se o domínio está na lista `FRONTEND_URLS`
   - Conferir configuração do Nginx

2. **API não responde**
   - Verificar se o backend está rodando: `pm2 status`
   - Conferir logs: `pm2 logs oee-monitor-api`

3. **Erro de conexão MongoDB**
   - Verificar string de conexão no `.env`
   - Conferir se o IP do servidor está liberado no MongoDB Atlas

4. **Frontend não carrega**
   - Verificar se os arquivos estão na pasta correta
   - Conferir configuração do Nginx
   - Verificar permissões dos arquivos

### Comandos de Emergência
```bash
# Reiniciar tudo
pm2 restart all
sudo systemctl restart nginx

# Verificar logs em tempo real
pm2 logs --lines 100
tail -f /var/log/nginx/error.log

# Rollback (se necessário)
git checkout HEAD~1
./deploy.sh
```

## 📞 Suporte

Em caso de problemas, verificar:
1. Logs da aplicação
2. Status dos serviços
3. Conectividade de rede
4. Configurações de DNS

---

**Última atualização:** Janeiro 2025
**Versão:** 1.0.0