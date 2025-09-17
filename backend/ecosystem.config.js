module.exports = {
  apps: [{
    name: 'sistema-oee-backend',
    script: 'server.js',
    cwd: '/var/www/sistema-oee/backend',
    
    // Configurações de produção
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Configurações do processo
    instances: 1, // Usar 1 instância para evitar problemas com MongoDB
    exec_mode: 'fork',
    
    // Configurações de restart
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Configurações de logs
    log_file: '/var/log/pm2/sistema-oee-combined.log',
    out_file: '/var/log/pm2/sistema-oee-out.log',
    error_file: '/var/log/pm2/sistema-oee-error.log',
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
    health_check_url: 'http://localhost:5000/api/health',
    health_check_grace_period: 3000
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: 'planing-ita.com',
      ref: 'origin/main',
      repo: 'git@github.com:odouglasrocha/sistema-oee.git',
      path: '/var/www/sistema-oee',
      
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};