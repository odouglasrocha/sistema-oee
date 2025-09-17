# Guia de Deploy - Sistema OEE no VPS Ubuntu 22.04

## Informações do Projeto
- **Stack**: MERN (MongoDB, Express.js, React.js, Node.js)
- **Servidor**: Ubuntu 22.04
- **Domínio**: planing-ita.com
- **Repositório**: git@github.com:odouglasrocha/sistema-oee.git

## Pré-requisitos
- Acesso SSH ao servidor VPS
- Domínio configurado apontando para o IP do servidor
- Usuário com privilégios sudo

## Passo 1: Preparação do Servidor

### 1.1 Conectar ao servidor via SSH
```bash
ssh usuario@planing-ita.com
# ou
ssh usuario@IP_DO_SERVIDOR
```

### 1.2 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalar dependências básicas
```bash
sudo apt install -y curl wget git build-essential
```

## Passo 2: Instalar Node.js e npm

### 2.1 Instalar Node.js via NodeSource
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2 Verificar instalação
```bash
node --version
npm --version
```

### 2.3 Instalar PM2 globalmente
```bash
sudo npm install -g pm2
```

## Passo 3: Instalar e Configurar MongoDB

### 3.1 Importar chave pública do MongoDB
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
```

### 3.2 Adicionar repositório do MongoDB
```bash
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

### 3.3 Instalar MongoDB
```bash
sudo apt update
sudo apt install -y mongodb-org
```

### 3.4 Iniciar e habilitar MongoDB
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 3.5 Configurar segurança do MongoDB
```bash
mongo
```

No shell do MongoDB:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "SUA_SENHA_SEGURA",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

use sistema_oee
db.createUser({
  user: "oee_user",
  pwd: "SENHA_DO_USUARIO_OEE",
  roles: [ { role: "readWrite", db: "sistema_oee" } ]
})

exit
```

### 3.6 Habilitar autenticação
```bash
sudo nano /etc/mongod.conf
```

Adicionar/modificar:
```yaml
security:
  authorization: enabled
```

Reiniciar MongoDB:
```bash
sudo systemctl restart mongod
```

## Passo 4: Configurar Nginx

### 4.1 Instalar Nginx
```bash
sudo apt install -y nginx
```

### 4.2 Iniciar e habilitar Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.3 Configurar firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Passo 5: Clonar e Configurar o Projeto

### 5.1 Criar diretório para aplicações
```bash
sudo mkdir -p /var/www
cd /var/www
```

### 5.2 Clonar o repositório
```bash
sudo git clone git@github.com:odouglasrocha/sistema-oee.git
sudo chown -R $USER:$USER sistema-oee
cd sistema-oee
```

### 5.3 Instalar dependências do backend
```bash
cd backend
npm install
```

### 5.4 Criar arquivo de ambiente do backend
```bash
nano .env
```

Conteúdo do .env:
```env
PORT=5000
MONGODB_URI=mongodb://oee_user:SENHA_DO_USUARIO_OEE@localhost:27017/sistema_oee
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
NODE_ENV=production
```

### 5.5 Instalar dependências do frontend
```bash
cd ../
npm install
```

### 5.6 Configurar API URL no frontend
```bash
nano src/config/api.ts
```

Modificar para:
```typescript
const API_BASE_URL = 'https://planing-ita.com/api';
```

### 5.7 Build do frontend
```bash
npm run build
```

## Passo 6: Configurar PM2 para o Backend

### 6.1 Criar arquivo de configuração do PM2
```bash
cd backend
nano ecosystem.config.js
```

Conteúdo:
```javascript
module.exports = {
  apps: [{
    name: 'sistema-oee-backend',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/sistema-oee-error.log',
    out_file: '/var/log/pm2/sistema-oee-out.log',
    log_file: '/var/log/pm2/sistema-oee-combined.log'
  }]
};
```

### 6.2 Criar diretório de logs
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 6.3 Iniciar aplicação com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Passo 7: Configurar Nginx como Proxy Reverso

### 7.1 Criar configuração do site
```bash
sudo nano /etc/nginx/sites-available/planing-ita.com
```

Conteúdo:
```nginx
server {
    listen 80;
    server_name planing-ita.com www.planing-ita.com;

    # Servir arquivos estáticos do React
    location / {
        root /var/www/sistema-oee/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy para API do backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/planing-ita.com.access.log;
    error_log /var/log/nginx/planing-ita.com.error.log;
}
```

### 7.2 Habilitar o site
```bash
sudo ln -s /etc/nginx/sites-available/planing-ita.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 7.3 Testar configuração do Nginx
```bash
sudo nginx -t
```

### 7.4 Reiniciar Nginx
```bash
sudo systemctl restart nginx
```

## Passo 8: Configurar SSL com Let's Encrypt

### 8.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obter certificado SSL
```bash
sudo certbot --nginx -d planing-ita.com -d www.planing-ita.com
```

### 8.3 Configurar renovação automática
```bash
sudo crontab -e
```

Adicionar linha:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

## Passo 9: Configurar Banco de Dados

### 9.1 Executar seeds do banco
```bash
cd /var/www/sistema-oee/backend
node scripts/seedDatabase.js
node scripts/seedSettings.js
node scripts/seedAnalytics.js
```

## Passo 10: Monitoramento e Logs

### 10.1 Verificar status dos serviços
```bash
# Status do PM2
pm2 status
pm2 logs

# Status do MongoDB
sudo systemctl status mongod

# Status do Nginx
sudo systemctl status nginx

# Logs do Nginx
sudo tail -f /var/log/nginx/planing-ita.com.access.log
sudo tail -f /var/log/nginx/planing-ita.com.error.log
```

### 10.2 Comandos úteis para manutenção
```bash
# Reiniciar aplicação
pm2 restart sistema-oee-backend

# Atualizar código
cd /var/www/sistema-oee
git pull origin master
npm run build
pm2 restart sistema-oee-backend

# Backup do banco
mongodump --host localhost --port 27017 --username oee_user --password SENHA --db sistema_oee --out /backup/$(date +%Y%m%d)
```

## Passo 11: Configurações de Segurança Adicionais

### 11.1 Configurar fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 11.2 Configurar backup automático
```bash
sudo nano /etc/cron.daily/mongodb-backup
```

Conteúdo:
```bash
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --host localhost --port 27017 --username oee_user --password SENHA_DO_USUARIO_OEE --db sistema_oee --out $BACKUP_DIR/$DATE

# Manter apenas backups dos últimos 7 dias
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +
```

```bash
sudo chmod +x /etc/cron.daily/mongodb-backup
```

## Verificação Final

1. Acesse https://planing-ita.com para verificar se o frontend está funcionando
2. Teste o login e funcionalidades principais
3. Verifique os logs para garantir que não há erros
4. Teste a API diretamente: https://planing-ita.com/api/health

## Troubleshooting

### Problemas comuns:

1. **Erro 502 Bad Gateway**: Verificar se o backend está rodando com `pm2 status`
2. **Erro de conexão com MongoDB**: Verificar credenciais no .env e status do MongoDB
3. **Arquivos estáticos não carregam**: Verificar permissões da pasta dist e configuração do Nginx
4. **SSL não funciona**: Verificar se o domínio está apontando corretamente para o servidor

### Comandos de diagnóstico:
```bash
# Verificar portas em uso
sudo netstat -tlnp

# Verificar logs do sistema
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f

# Testar conectividade
curl -I https://planing-ita.com
curl -I https://planing-ita.com/api/health
```

---

**Nota**: Substitua todas as senhas de exemplo por senhas seguras reais. Mantenha as credenciais em local seguro e faça backups regulares do sistema e banco de dados.