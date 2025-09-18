#!/bin/bash

# Script de Deploy Automatizado - Sistema OEE
# Repositório: git@github.com:odouglasrocha/sistema-oee.git
# Domínio: planing-ita.com

set -e  # Parar execução em caso de erro

# Configurações
VPS_HOST="planing-ita.com"
VPS_USER="root"
VPS_PATH="/var/www/sistema-oee"
BACKUP_PATH="/var/backups/sistema-oee"
DATE=$(date +"%Y%m%d_%H%M%S")
REPO_URL="git@github.com:odouglasrocha/sistema-oee.git"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando deploy do Sistema OEE...${NC}"
echo -e "${BLUE}📅 Data: $(date)${NC}"
echo -e "${BLUE}🌐 Servidor: ${VPS_HOST}${NC}"
echo -e "${BLUE}📦 Repositório: ${REPO_URL}${NC}"

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# 1. Verificar dependências locais
log "📦 Verificando dependências locais..."
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado localmente"
fi

if ! command -v npm &> /dev/null; then
    error "npm não está instalado localmente"
fi

# 2. Build local do frontend
log "🏗️ Fazendo build do frontend localmente..."
npm install
npm run build || error "Falha no build do frontend"

# 3. Verificar conexão com VPS
log "🔗 Verificando conexão com VPS..."
ssh -o ConnectTimeout=10 ${VPS_USER}@${VPS_HOST} "echo 'Conexão OK'" || error "Não foi possível conectar ao VPS"

# 4. Preparar servidor (primeira vez)
log "⚙️ Preparando servidor..."
ssh ${VPS_USER}@${VPS_HOST} "
    # Atualizar sistema
    apt update && apt upgrade -y
    
    # Instalar dependências básicas
    apt install -y curl wget git build-essential software-properties-common
    
    # Instalar Node.js 18.x
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Instalar PM2
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi
    
    # Instalar MongoDB
    if ! command -v mongod &> /dev/null; then
        wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
        echo 'deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse' | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
        apt update
        apt install -y mongodb-org
        systemctl start mongod
        systemctl enable mongod
    fi
    
    # Instalar Nginx
    if ! command -v nginx &> /dev/null; then
        apt install -y nginx
        systemctl start nginx
        systemctl enable nginx
    fi
    
    # Configurar firewall
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    ufw --force enable
"

# 5. Criar backup no VPS
log "💾 Criando backup no VPS..."
ssh ${VPS_USER}@${VPS_HOST} "
    mkdir -p ${BACKUP_PATH}
    if [ -d ${VPS_PATH} ]; then
        tar -czf ${BACKUP_PATH}/backup_${DATE}.tar.gz -C ${VPS_PATH} . 2>/dev/null || echo 'Backup parcial criado'
        echo 'Backup criado: ${BACKUP_PATH}/backup_${DATE}.tar.gz'
    fi
"

# 6. Parar serviços no VPS
log "⏹️ Parando serviços..."
ssh ${VPS_USER}@${VPS_HOST} "
    pm2 stop all 2>/dev/null || echo 'Nenhuma aplicação PM2 rodando'
"

# 7. Clonar/atualizar repositório
log "📥 Clonando/atualizando repositório..."
ssh ${VPS_USER}@${VPS_HOST} "
    mkdir -p /var/www
    cd /var/www
    
    if [ -d sistema-oee ]; then
        cd sistema-oee
        git pull origin main
    else
        git clone ${REPO_URL}
        cd sistema-oee
    fi
"

# 8. Upload do build do frontend
log "📤 Fazendo upload do frontend..."
rsync -avz --delete dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/dist/ || error "Falha no upload do frontend"

# 9. Configurar backend no VPS
log "⚙️ Configurando backend..."
ssh ${VPS_USER}@${VPS_HOST} "
    cd ${VPS_PATH}/backend
    
    # Instalar dependências do backend
    npm install --production
    
    # Criar arquivo .env se não existir
    if [ ! -f .env ]; then
        cat > .env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://oee_user:SenhaSistemaOEE456!@localhost:27017/sistema_oee
JWT_SECRET=seu_jwt_secret_muito_seguro_e_longo_aqui_123456789
NODE_ENV=production
CORS_ORIGIN=https://planing-ita.com
EOF
        echo 'Arquivo .env criado. IMPORTANTE: Configure as senhas reais!'
    fi
    
    # Criar diretórios necessários
    mkdir -p logs uploads
    mkdir -p /var/log/pm2
    
    # Configurar permissões
    chown -R www-data:www-data ${VPS_PATH}
    chmod -R 755 ${VPS_PATH}
"

# 10. Configurar MongoDB (primeira vez)
log "🗄️ Configurando MongoDB..."
ssh ${VPS_USER}@${VPS_HOST} "
    # Verificar se usuários já existem
    if ! mongo --eval 'db.runCommand({connectionStatus: 1})' sistema_oee &>/dev/null; then
        echo 'Configurando usuários do MongoDB...'
        mongo << 'MONGOEOF'
use admin
db.createUser({
  user: \"admin\",
  pwd: \"SuaSenhaAdminSegura123!\",
  roles: [ { role: \"userAdminAnyDatabase\", db: \"admin\" } ]
})

use sistema_oee
db.createUser({
  user: \"oee_user\",
  pwd: \"SenhaSistemaOEE456!\",
  roles: [ { role: \"readWrite\", db: \"sistema_oee\" } ]
})

exit
MONGOEOF
        
        # Habilitar autenticação
        if ! grep -q \"authorization: enabled\" /etc/mongod.conf; then
            echo \"security:\" >> /etc/mongod.conf
            echo \"  authorization: enabled\" >> /etc/mongod.conf
            systemctl restart mongod
        fi
    fi
"

# 11. Configurar Nginx
log "🌐 Configurando Nginx..."
ssh ${VPS_USER}@${VPS_HOST} "
    # Criar configuração do site
    cat > /etc/nginx/sites-available/planing-ita.com << 'NGINXEOF'
server {
    listen 80;
    server_name planing-ita.com www.planing-ita.com;

    # Servir arquivos estáticos do React
    location / {
        root /var/www/sistema-oee/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cabeçalhos de cache para recursos estáticos
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)\$ {
            expires 1y;
            add_header Cache-Control \"public, immutable\";
        }
    }

    # Proxy para a API do backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Arquivos de log
    access_log /var/log/nginx/planing-ita.com.access.log;
    error_log /var/log/nginx/planing-ita.com.error.log;
}
NGINXEOF
    
    # Habilitar site
    ln -sf /etc/nginx/sites-available/planing-ita.com /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar e reiniciar Nginx
    nginx -t && systemctl restart nginx
"

# 12. Iniciar aplicação com PM2
log "▶️ Iniciando aplicação..."
ssh ${VPS_USER}@${VPS_HOST} "
    cd ${VPS_PATH}/backend
    
    # Iniciar com PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
    
    # Executar seeds do banco
    sleep 5
    node scripts/seedDatabase.js || echo 'Erro ao executar seedDatabase'
    node scripts/seedSettings.js || echo 'Erro ao executar seedSettings'
    node scripts/seedAnalytics.js || echo 'Erro ao executar seedAnalytics'
"

# 13. Configurar SSL (Let's Encrypt)
log "🔒 Configurando SSL..."
ssh ${VPS_USER}@${VPS_HOST} "
    # Instalar Certbot
    if ! command -v certbot &> /dev/null; then
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Obter certificado SSL
    certbot --nginx -d planing-ita.com -d www.planing-ita.com --non-interactive --agree-tos --email admin@planing-ita.com || echo 'Erro ao configurar SSL - configure manualmente'
    
    # Configurar renovação automática
    if ! crontab -l | grep -q certbot; then
        (crontab -l 2>/dev/null; echo \"0 12 * * * /usr/bin/certbot renew --quiet\") | crontab -
    fi
"

# 14. Verificar deploy
log "🔍 Verificando deploy..."
sleep 10

# Verificar serviços
ssh ${VPS_USER}@${VPS_HOST} "
    echo '=== Status dos Serviços ==='
    pm2 status
    systemctl status nginx --no-pager -l
    systemctl status mongod --no-pager -l
"

# Verificar API
if curl -f -s https://${VPS_HOST}/api/health > /dev/null; then
    log "✅ API está respondendo"
else
    if curl -f -s http://${VPS_HOST}/api/health > /dev/null; then
        warning "⚠️ API respondendo apenas em HTTP - SSL pode não estar configurado"
    else
        warning "⚠️ API não está respondendo - verificar logs"
    fi
fi

# Verificar frontend
if curl -f -s https://${VPS_HOST} > /dev/null; then
    log "✅ Frontend está acessível via HTTPS"
elif curl -f -s http://${VPS_HOST} > /dev/null; then
    log "✅ Frontend está acessível via HTTP"
else
    warning "⚠️ Frontend não está acessível"
fi

# 15. Limpeza
log "🧹 Limpando arquivos temporários..."
ssh ${VPS_USER}@${VPS_HOST} "
    # Manter apenas os 5 backups mais recentes
    cd ${BACKUP_PATH}
    ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    
    # Limpar logs antigos
    find ${VPS_PATH}/backend/logs -name '*.log' -mtime +7 -delete 2>/dev/null || true
"

echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo -e "${GREEN}🌐 Aplicação: https://${VPS_HOST}${NC}"
echo -e "${GREEN}📊 API Health: https://${VPS_HOST}/api/health${NC}"
echo -e "${BLUE}📋 Logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs'${NC}"

# Mostrar informações úteis
echo -e "\n${BLUE}📋 Comandos úteis:${NC}"
echo -e "${BLUE}  - Ver logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs'${NC}"
echo -e "${BLUE}  - Restart: ssh ${VPS_USER}@${VPS_HOST} 'pm2 restart all'${NC}"
echo -e "${BLUE}  - Status: ssh ${VPS_USER}@${VPS_HOST} 'pm2 status'${NC}"
echo -e "${BLUE}  - Nginx: ssh ${VPS_USER}@${VPS_HOST} 'systemctl status nginx'${NC}"
echo -e "${BLUE}  - MongoDB: ssh ${VPS_USER}@${VPS_HOST} 'systemctl status mongod'${NC}"

echo -e "\n${YELLOW}⚠️ IMPORTANTE:${NC}"
echo -e "${YELLOW}1. Configure senhas reais no arquivo .env do servidor${NC}"
echo -e "${YELLOW}2. Configure o email real para SSL no Certbot${NC}"
echo -e "${YELLOW}3. Faça backup regular do banco de dados${NC}"

echo -e "\n${GREEN}✨ Deploy finalizado em $(date)${NC}"