module.exports = {
  apps: [
    {
      name: 'edreading',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/edreading',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/edreading/error.log',
      out_file: '/var/log/edreading/out.log',
      log_file: '/var/log/edreading/combined.log',
      time: true,
    },
  ],
};
