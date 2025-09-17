# Guia Completo de Deploy - Sistema OEE no VPS

## Informações do Deploy
- **Repositório**: git@github.com:odouglasrocha/sistema-oee.git
- **Domínio**: planing-ita.com
- **Servidor**: Ubuntu 22.04 VPS
- **Stack**: MERN (MongoDB, Express.js, React.js, Node.js)

---

## PASSO 1: Preparar o Servidor VPS

### 1.1 Conectar ao servidor via SSH
```bash
ssh root@planing-ita.com
# ou usando IP se o domínio ainda não estiver configurado
# ssh root@SEU_IP_VPS
```

### 1.2 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Instalar dependências básicas
```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## PASSO 2: Instalar Node.js, npm e PM2

### 2.1 Instalar Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2.2 Verificar instalação
```bash
node --version  # Deve mostrar v18.x.x
npm --version   # Deve mostrar versão do npm
```

### 2.3 Instalar PM2 globalmente
```bash
sudo npm install -g pm2
pm2 --version
```

---

## PASSO 3: Instalar e Configurar MongoDB

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

### 3.5 Configurar usuários do MongoDB
```bash
mongo
```

No shell do MongoDB, execute:
```javascript
use admin
db.createUser({
  user: "admin",
  pwd: "SuaSenhaAdminSegura123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

use sistema_oee
db.createUser({
  user: "oee_user",
  pwd: "SenhaSistemaOEE456!",
  roles: [ { role: "readWrite", db: "sistema_oee" } ]
})

exit
```

### 3.6 Habilitar autenticação
```bash
sudo nano /etc/mongod.conf
```

Adicionar/modificar a seção security:
```yaml
security:
  authorization: enabled
```

Reiniciar MongoDB:
```bash
sudo systemctl restart mongod
```

---

## PASSO 4: Instalar e Configurar Nginx

### 4.1 Instalar Nginx
```bash
sudo apt install -y nginx
```

### 4.2 Iniciar e habilitar Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 4.3 Configurar firewall
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## PASSO 5: Clonar o Repositório

### 5.1 Criar diretório para aplicações
```bash
sudo mkdir -p /var/www
cd /var/www
```

### 5.2 Configurar chave SSH (se necessário)
```bash
# Se você não tiver acesso SSH ao repositório, configure sua chave SSH
ssh-keygen -t rsa -b 4096 -C "seu-email@exemplo.com"
cat ~/.ssh/id_rsa.pub
# Adicione esta chave ao seu GitHub
```

### 5.3 Clonar o repositório
```bash
sudo git clone git@github.com:odouglasrocha/sistema-oee.git
sudo chown -R $USER:$USER sistema-oee
cd sistema-oee
```

---

## PASSO 6: Configurar Variáveis de Ambiente e Build

### 6.1 Configurar backend
```bash
cd backend
npm install
```

### 6.2 Criar arquivo .env do backend
```bash
nano .env
```

Conteúdo do .env:
```env
PORT=5000
MONGODB_URI=mongodb://oee_user:SenhaSistemaOEE456!@localhost:27017/sistema_oee
JWT_SECRET=seu_jwt_secret_muito_seguro_e_longo_aqui_123456789
NODE_ENV=production
CORS_ORIGIN=https://planing-ita.com
```

### 6.3 Configurar frontend
```bash
cd ../
npm install
```

### 6.4 Configurar API URL no frontend
```bash
nano src/config/api.ts
```

Modificar para:
```typescript
const API_BASE_URL = 'https://planing-ita.com/api';
export { API_BASE_URL };
```

### 6.5 Fazer build do frontend
```bash
npm run build
```

---

## PASSO 7: Configurar PM2 para o Backend

### 7.1 Verificar arquivo ecosystem.config.js
```bash
cd backend
cat ecosystem.config.js
```

### 7.2 Criar diretório de logs
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 7.3 Iniciar aplicação com PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Execute o comando que o PM2 mostrar para configurar inicialização automática
```

---

## PASSO 8: Configurar Nginx como Proxy Reverso

### 8.1 Criar configuração do site
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

### 8.2 Habilitar o site
```bash
sudo ln -s /etc/nginx/sites-available/planing-ita.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 8.3 Testar e reiniciar Nginx
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## PASSO 9: Configurar SSL com Let's Encrypt

### 9.1 Instalar Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 Obter certificado SSL
```bash
sudo certbot --nginx -d planing-ita.com -d www.planing-ita.com
```

### 9.3 Configurar renovação automática
```bash
sudo crontab -e
```

Adicionar linha:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## PASSO 10: Executar Seeds e Verificação Final

### 10.1 Executar seeds do banco
```bash
cd /var/www/sistema-oee/backend
node scripts/seedDatabase.js
node scripts/seedSettings.js
node scripts/seedAnalytics.js
```

### 10.2 Verificar status dos serviços
```bash
# Status do PM2
pm2 status
pm2 logs

# Status do MongoDB
sudo systemctl status mongod

# Status do Nginx
sudo systemctl status nginx
```

### 10.3 Testar a aplicação
```bash
# Testar API
curl -I https://planing-ita.com/api/health

# Testar frontend
curl -I https://planing-ita.com
```

---

## COMANDOS ÚTEIS PARA MANUTENÇÃO

### Logs e Monitoramento
```bash
# Ver logs do PM2
pm2 logs

# Ver logs do Nginx
sudo tail -f /var/log/nginx/planing-ita.com.access.log
sudo tail -f /var/log/nginx/planing-ita.com.error.log

# Ver logs do MongoDB
sudo journalctl -u mongod -f
```

### Atualizações
```bash
# Atualizar código
cd /var/www/sistema-oee
git pull origin main
npm run build
pm2 restart sistema-oee-backend
```

### Backup
```bash
# Backup do banco
mongodump --host localhost --port 27017 --username oee_user --password SenhaSistemaOEE456! --db sistema_oee --out /backup/$(date +%Y%m%d)
```

---

## VERIFICAÇÃO FINAL

✅ **Checklist de Verificação:**

1. [ ] Servidor VPS preparado e atualizado
2. [ ] Node.js, npm e PM2 instalados
3. [ ] MongoDB instalado e configurado com autenticação
4. [ ] Nginx instalado e configurado
5. [ ] Repositório clonado com sucesso
6. [ ] Variáveis de ambiente configuradas
7. [ ] Build do frontend realizado
8. [ ] PM2 configurado e aplicação rodando
9. [ ] Nginx configurado como proxy reverso
10. [ ] SSL configurado com Let's Encrypt
11. [ ] Seeds do banco executados
12. [ ] Aplicação acessível em https://planing-ita.com
13. [ ] API respondendo em https://planing-ita.com/api/health

---

## TROUBLESHOOTING

### Problemas Comuns:

**Erro 502 Bad Gateway:**
- Verificar se o backend está rodando: `pm2 status`
- Verificar logs: `pm2 logs`

**Erro de conexão com MongoDB:**
- Verificar status: `sudo systemctl status mongod`
- Verificar credenciais no arquivo .env

**Arquivos estáticos não carregam:**
- Verificar permissões: `sudo chown -R www-data:www-data /var/www/sistema-oee`
- Verificar configuração do Nginx

**SSL não funciona:**
- Verificar se o domínio aponta para o servidor
- Executar novamente: `sudo certbot --nginx -d planing-ita.com`

---

**🎉 Parabéns! Seu sistema OEE está agora rodando em produção no domínio planing-ita.com**

**📞 Suporte:** Em caso de problemas, verifique os logs e consulte a documentação de troubleshooting acima.