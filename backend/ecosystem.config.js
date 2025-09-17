module.exports = {
  apps: [{
    name: 'oee-monitor-api',
    script: 'server.js',
    cwd: '/var/www/planing-ita/backend',
    
    // Configurações de produção
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    
    // Configurações do processo
    instances: 'max', // Usar todos os cores disponíveis
    exec_mode: 'cluster',
    
    // Configurações de restart
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Configurações de logs
    log_file: '/var/www/planing-ita/logs/combined.log',
    out_file: '/var/www/planing-ita/logs/out.log',
    error_file: '/var/www/planing-ita/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configurações de monitoramento
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configurações de deploy
    source_map_support: false,
    instance_var: 'INSTANCE_ID',
    
    // Configurações de performance
    node_args: '--max-old-space-size=1024',
    
    // Configurações de saúde
    health_check_url: 'http://localhost:3001/api/health',
    health_check_grace_period: 3000
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: 'planing-ita.com',
      ref: 'origin/main',
      repo: 'https://github.com/seu-usuario/oee-monitor.git',
      path: '/var/www/planing-ita',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};