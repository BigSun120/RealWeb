module.exports = {
  apps: [{
    name: 'website-backend',
    script: 'backend/app.js',
    cwd: '/root/RealWeb',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000,
      // 使用安全的MongoDB连接（带认证）
      MONGODB_URI: 'mongodb://admin:SecureMongo2024!@127.0.0.1:27017/personal_website_prod?authSource=admin',
      FRONTEND_URL: 'https://godaug.fun',
      UPLOAD_PATH: '/var/www/uploads',
      JWT_SECRET: 'prod_jwt_secret_2024_secure_key_godaug_new',

      // 邮件服务配置
      SMTP_HOST: 'localhost',
      SMTP_PORT: 2500,
      SMTP_SECURE: 'false',
      SMTP_AUTH: 'false',
      SMTP_USER: '',
      SMTP_PASS: '',
      SMTP_FROM: 'noreply@godaug.fun',

      // Augment Token Manager 加密密钥
      AUGMENT_TOKEN_ENCRYPTION_KEY: 'godaug_secure_32byte_encryption_key',

      // 强制重新初始化管理员账户
      FORCE_ADMIN_PASSWORD_UPDATE: 'true',
      ADMIN_EMAIL: 'admin@godaug.fun',
      ADMIN_USERNAME: 'godaug_admin_new',
      ADMIN_PASSWORD: 'NewSecureAdmin2024!',
      ADMIN_DISPLAY_NAME: '超级管理员',
      ADMIN_BIO: '系统重建后的超级管理员账户'
    },
    error_file: '/root/.pm2/logs/website-backend-error.log',
    out_file: '/root/.pm2/logs/website-backend-out.log',
    log_file: '/root/.pm2/logs/website-backend.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
