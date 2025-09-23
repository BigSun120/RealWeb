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
      MONGODB_URI: 'mongodb://admin:SecureMongo2024!@127.0.0.1:27017/personal_website_prod?authSource=admin',
      FRONTEND_URL: 'https://godaug.fun',
      UPLOAD_PATH: '/var/www/uploads',
      JWT_SECRET: 'prod_jwt_secret_2024_secure_key_godaug',

      // 邮件服务配置 - 使用Postfix发送验证邮件到真实邮箱
      SMTP_HOST: 'localhost',
      SMTP_PORT: 2500,  // 使用inbucket端口2500用于临时邮箱
      SMTP_SECURE: 'false',
      SMTP_AUTH: 'false',  // Postfix本地不需要认证
      SMTP_USER: '',
      SMTP_PASS: '',
      SMTP_FROM: 'noreply@godaug.fun',

      // Augment Token Manager 加密密钥
      AUGMENT_TOKEN_ENCRYPTION_KEY: 'godaug_secure_32byte_encryption_key',

      // 管理员账户配置
      ADMIN_EMAIL: 'admin@godaug.fun',
      ADMIN_USERNAME: 'godaug_admin',
      ADMIN_PASSWORD: 'SecureAdmin2024!',
      ADMIN_DISPLAY_NAME: '超级管理员',
      ADMIN_BIO: '系统默认超级管理员账户'
    },
    error_file: '/root/.pm2/logs/website-backend-error.log',
    out_file: '/root/.pm2/logs/website-backend-out.log',
    log_file: '/root/.pm2/logs/website-backend.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000
  }, {
    name: 'website-frontend',
    script: 'serve',
    args: '-s frontend/dist -l 3000',
    cwd: '/root/RealWeb',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/root/.pm2/logs/website-frontend-error.log',
    out_file: '/root/.pm2/logs/website-frontend-out.log',
    log_file: '/root/.pm2/logs/website-frontend.log',
    time: true,
    autorestart: true,
    watch: false
  }]
};
