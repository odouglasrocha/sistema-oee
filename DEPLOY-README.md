# 🚀 Guia de Deploy - Sistema OEE Planing ITA

## 📋 Resumo da Configuração para VPS

### 🌐 URLs de Produção
- **Frontend**: https://planing-ita.com/
- **API**: https://planing-ita.com/api
- **Health Check**: https://planing-ita.com/api/health

### 📁 Arquivos de Configuração Criados

#### Backend
- ✅ `.env.production` - Variáveis de ambiente de produção
- ✅ `ecosystem.config.js` - Configuração do PM2
- ✅ Scripts npm atualizados para produção

#### Frontend
- ✅ `.env.production` - Configuração do Vite para produção
- ✅ Scripts npm para build e deploy
- ✅ `api.ts` já configurado para detectar ambiente

#### Infraestrutura
- ✅ `nginx.conf` - Configuração completa do Nginx
- ✅ `deploy.sh` - Script automatizado de deploy
- ✅ `VPS-SETUP-GUIDE.md` - Guia completo de configuração

### 🔧 Comandos Rápidos

#### Deploy Local para VPS
```bash
# Tornar script executável
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

#### Build Manual
```bash
# Frontend
npm run build:prod

# Backend
cd backend
npm run start:prod
```

#### Verificação
```bash
# Testar API
curl -f https://planing-ita.com/api/health

# Testar Frontend
curl -f https://planing-ita.com
```

### ⚙️ Configurações Importantes

#### 1. Variáveis de Ambiente (Backend)
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/oee_monitor_production
JWT_SECRET=your_super_secure_jwt_secret_key_here
CORS_ORIGINS=https://planing-ita.com,https://www.planing-ita.com
```

#### 2. Variáveis de Ambiente (Frontend)
```env
VITE_API_BASE_URL=https://planing-ita.com/api
VITE_APP_ENV=production
VITE_ENABLE_LOGS=false
```

#### 3. Nginx
- Proxy reverso para API (porta 3001)
- Servir arquivos estáticos do frontend
- SSL/HTTPS configurado
- Compressão gzip habilitada
- Cache otimizado

#### 4. PM2
- Modo cluster para alta disponibilidade
- Restart automático
- Logs centralizados
- Monitoramento de memória

### 🔒 Segurança Configurada

- ✅ HTTPS obrigatório
- ✅ HSTS headers
- ✅ CORS restritivo
- ✅ Rate limiting
- ✅ Headers de segurança
- ✅ Fail2ban configurado
- ✅ Firewall UFW

### 📊 Monitoramento

#### Logs
```bash
# Aplicação
pm2 logs

# Nginx
sudo tail -f /var/log/nginx/planing-ita.access.log
sudo tail -f /var/log/nginx/planing-ita.error.log

# Sistema
journalctl -u nginx -f
journalctl -u mongod -f
```

#### Status
```bash
# PM2
pm2 status
pm2 monit

# Serviços
sudo systemctl status nginx
sudo systemctl status mongod

# Recursos
htop
df -h
free -h
```

### 🔄 Backup Automático

- Backup diário do MongoDB
- Backup dos arquivos da aplicação
- Retenção de 7 dias
- Logs de backup

### 🚨 Troubleshooting

#### Problema Comum 1: API não responde
```bash
# Verificar processo
pm2 status

# Verificar porta
sudo netstat -tlnp | grep :3001

# Reiniciar
pm2 restart oee-monitor-api
```

#### Problema Comum 2: Frontend não carrega
```bash
# Verificar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Verificar arquivos
ls -la /var/www/planing-ita/frontend/
```

#### Problema Comum 3: Erro de CORS
```bash
# Verificar configuração no .env.production
cat /var/www/planing-ita/backend/.env.production | grep CORS

# Reiniciar aplicação
pm2 restart oee-monitor-api
```

### 📝 Checklist de Deploy

#### Antes do Deploy
- [ ] Código testado localmente
- [ ] Build do frontend sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Certificado SSL válido
- [ ] Backup do sistema atual

#### Durante o Deploy
- [ ] Parar serviços
- [ ] Upload dos arquivos
- [ ] Instalar dependências
- [ ] Configurar permissões
- [ ] Iniciar serviços

#### Após o Deploy
- [ ] Testar API (health check)
- [ ] Testar frontend
- [ ] Verificar logs
- [ ] Testar funcionalidades principais
- [ ] Monitorar por algumas horas

### 🎯 Performance

#### Otimizações Implementadas
- Compressão gzip
- Cache de assets estáticos
- Minificação do código
- Code splitting
- Lazy loading
- PM2 cluster mode

#### Métricas Esperadas
- Tempo de carregamento < 3s
- API response time < 500ms
- Uptime > 99.9%
- Memory usage < 512MB

### 🔗 Links Úteis

- **Aplicação**: https://planing-ita.com/
- **API Health**: https://planing-ita.com/api/health
- **PM2 Web**: http://planing-ita.com:9615 (se habilitado)
- **Logs**: SSH para ver logs em tempo real

### 📞 Suporte

#### Comandos de Emergência
```bash
# Rollback rápido (se necessário)
pm2 stop oee-monitor-api
# Restaurar backup
tar -xzf /var/backups/planing-ita/backup_YYYYMMDD_HHMMSS.tar.gz -C /var/www/planing-ita/
pm2 start oee-monitor-api

# Restart completo
sudo systemctl restart nginx
pm2 restart all
sudo systemctl restart mongod
```

#### Contatos
- **Desenvolvedor**: [seu-email@exemplo.com]
- **Servidor**: root@planing-ita.com
- **Monitoramento**: Logs via SSH

---

**✨ Sistema pronto para produção em https://planing-ita.com/ ✨**

**🎉 Deploy configurado com sucesso!**