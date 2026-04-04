const path = require('path');

const appRoot = process.env.EDREADING_CWD || __dirname;
const logDir = process.env.EDREADING_LOG_DIR || path.join(appRoot, 'logs');
const port = Number(process.env.PORT || 3000);
const instances = process.env.PM2_INSTANCES || 1;

module.exports = {
  apps: [
    {
      name: 'edreading',
      script: 'npm',
      args: 'start',
      cwd: appRoot,
      instances,
      exec_mode: Number(instances) > 1 ? 'cluster' : 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: port,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: port,
      },
      error_file: path.join(logDir, 'error.log'),
      out_file: path.join(logDir, 'out.log'),
      log_file: path.join(logDir, 'combined.log'),
      time: true,
    },
  ],
};
