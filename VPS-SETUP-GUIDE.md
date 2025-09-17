# Guia de Configuração VPS - Sistema OEE Planing ITA

## 🚀 Configuração do Servidor VPS para https://planing-ita.com/

### 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou CentOS 8+
- Acesso root via SSH
- Domínio configurado (planing-ita.com)
- Certificado SSL válido

### 🔧 1. Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git unzip software-properties-common

# Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 📦 2. Instalação do Node.js

```bash
# Instalar Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 🗄️ 3. Instalação do MongoDB

```bash
# Importar chave pública do MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Adicionar repositório
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar e habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar status
sudo systemctl status mongod
```

### 🌐 4. Instalação e Configuração do Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Copiar configuração do projeto
sudo cp /var/www/planing-ita/nginx.conf /etc/nginx/sites-available/planing-ita.com

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/planing-ita.com /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 🔒 5. Configuração SSL (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d planing-ita.com -d www.planing-ita.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

### ⚙️ 6. Instalação do PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 📁 7. Estrutura de Diretórios

```bash
# Criar estrutura de diretórios
sudo mkdir -p /var/www/planing-ita/{frontend,backend,logs,uploads,backups}

# Configurar permissões
sudo chown -R $USER:www-data /var/www/planing-ita
sudo chmod -R 755 /var/www/planing-ita
```

### 🔐 8. Configuração de Segurança

```bash
# Configurar fail2ban
sudo apt install -y fail2ban

# Criar configuração personalizada
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

# Iniciar fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 🗃️ 9. Configuração do MongoDB

```bash
# Conectar ao MongoDB
mongo

# Criar usuário administrador
use admin
db.createUser({
  user: "admin",
  pwd: "sua_senha_segura_aqui",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Criar banco de dados da aplicação
use oee_monitor_production
db.createUser({
  user: "oee_user",
  pwd: "senha_do_usuario_oee",
  roles: [ { role: "readWrite", db: "oee_monitor_production" } ]
})

exit

# Habilitar autenticação no MongoDB
sudo nano /etc/mongod.conf
# Adicionar/modificar:
security:
  authorization: enabled

# Reiniciar MongoDB
sudo systemctl restart mongod
```

### 📝 10. Configuração de Variáveis de Ambiente

```bash
# Criar arquivo .env.production no backend
cd /var/www/planing-ita/backend
sudo nano .env.production

# Configurar com valores reais:
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://oee_user:senha_do_usuario_oee@localhost:27017/oee_monitor_production
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_muito_seguro_aqui
CORS_ORIGINS=https://planing-ita.com,https://www.planing-ita.com
# ... outras configurações
```

### 🚀 11. Deploy da Aplicação

```bash
# Clonar repositório (ou fazer upload dos arquivos)
git clone https://github.com/seu-usuario/oee-monitor.git /tmp/oee-monitor

# Copiar arquivos
cp -r /tmp/oee-monitor/backend/* /var/www/planing-ita/backend/
cp -r /tmp/oee-monitor/dist/* /var/www/planing-ita/frontend/

# Instalar dependências do backend
cd /var/www/planing-ita/backend
npm install --production

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

### 📊 12. Monitoramento e Logs

```bash
# Verificar status dos serviços
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# Verificar logs
pm2 logs
sudo tail -f /var/log/nginx/planing-ita.access.log
sudo tail -f /var/log/nginx/planing-ita.error.log
```

### 🔄 13. Backup Automático

```bash
# Criar script de backup
sudo tee /usr/local/bin/backup-oee.sh << 'EOF'
#!/bin/bash
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/planing-ita"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do MongoDB
mongodump --db oee_monitor_production --out $BACKUP_DIR/mongodb_$DATE

# Backup dos arquivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz -C /var/www/planing-ita .

# Manter apenas os 7 backups mais recentes
find $BACKUP_DIR -name "mongodb_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -name "files_*.tar.gz" -mtime +7 -delete

echo "Backup concluído: $DATE"
EOF

# Tornar executável
sudo chmod +x /usr/local/bin/backup-oee.sh

# Configurar cron para backup diário
sudo crontab -e
# Adicionar linha:
0 2 * * * /usr/local/bin/backup-oee.sh >> /var/log/backup-oee.log 2>&1
```

### ✅ 14. Verificação Final

```bash
# Testar API
curl -f https://planing-ita.com/api/health

# Testar frontend
curl -f https://planing-ita.com

# Verificar certificado SSL
ssl-cert-check -c planing-ita.com
```

### 🛠️ 15. Comandos Úteis para Manutenção

```bash
# Reiniciar aplicação
pm2 restart oee-monitor-api

# Ver logs em tempo real
pm2 logs --lines 100

# Recarregar configuração do Nginx
sudo nginx -s reload

# Verificar uso de recursos
htop
df -h
free -h

# Verificar conexões ativas
ss -tulpn | grep :3001
ss -tulpn | grep :443
```

### 🚨 16. Troubleshooting

#### Problema: API não responde
```bash
# Verificar se o processo está rodando
pm2 status

# Verificar logs de erro
pm2 logs oee-monitor-api --err

# Verificar porta
sudo netstat -tlnp | grep :3001
```

#### Problema: Frontend não carrega
```bash
# Verificar configuração do Nginx
sudo nginx -t

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/planing-ita.error.log

# Verificar permissões dos arquivos
ls -la /var/www/planing-ita/frontend/
```

#### Problema: Banco de dados
```bash
# Verificar status do MongoDB
sudo systemctl status mongod

# Verificar logs do MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Testar conexão
mongo --host localhost --port 27017 -u oee_user -p
```

### 📞 Suporte

Para suporte técnico:
- Logs: `/var/log/nginx/` e `pm2 logs`
- Monitoramento: `pm2 monit`
- Status: `systemctl status nginx mongod`

---

**🎉 Parabéns! Seu sistema OEE está configurado e rodando em produção!**

**🌐 Acesse: https://planing-ita.com/**