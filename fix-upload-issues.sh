#!/bin/bash

# 修复图片上传显示问题的脚本
# 适用于服务器 74.48.194.227

set -e

echo "🔧 开始修复图片上传显示问题..."

# 1. 检查并创建上传目录
echo "📁 检查上传目录..."
UPLOAD_DIR="/var/www/uploads"
if [ ! -d "$UPLOAD_DIR" ]; then
    echo "创建上传目录: $UPLOAD_DIR"
    sudo mkdir -p "$UPLOAD_DIR"
    sudo mkdir -p "$UPLOAD_DIR/avatars"
    sudo mkdir -p "$UPLOAD_DIR/articles" 
    sudo mkdir -p "$UPLOAD_DIR/backgrounds"
fi

# 2. 设置正确的权限
echo "🔐 设置目录权限..."
sudo chown -R www-data:www-data "$UPLOAD_DIR"
sudo chmod -R 755 "$UPLOAD_DIR"

# 3. 检查现有上传文件并迁移
BACKEND_UPLOAD_DIR="/root/RealWeb/backend/uploads"
if [ -d "$BACKEND_UPLOAD_DIR" ]; then
    echo "📦 迁移现有上传文件..."
    sudo cp -r "$BACKEND_UPLOAD_DIR"/* "$UPLOAD_DIR/" 2>/dev/null || true
    sudo chown -R www-data:www-data "$UPLOAD_DIR"
fi

# 4. 更新PM2环境变量
echo "🔄 更新PM2环境变量..."
pm2 stop website-backend || true

# 创建或更新ecosystem.config.js
cat > /root/RealWeb/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'website-backend',
    script: 'backend/app.js',
    cwd: '/root/RealWeb',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000,
      UPLOAD_PATH: '/var/www/uploads',
      MONGODB_URI: 'mongodb://localhost:27017/personal_website_prod',
      JWT_SECRET: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-here'
    }
  }]
};
EOF

# 5. 重启后端服务
echo "🚀 重启后端服务..."
cd /root/RealWeb
pm2 start ecosystem.config.js --env production
pm2 save

# 6. 验证nginx配置
echo "🌐 检查nginx配置..."
nginx -t

# 7. 重载nginx
echo "🔄 重载nginx..."
sudo systemctl reload nginx

# 8. 测试上传目录访问
echo "🧪 测试静态文件访问..."
sleep 3

# 创建测试文件
echo "test" | sudo tee "$UPLOAD_DIR/test.txt" > /dev/null
sudo chown www-data:www-data "$UPLOAD_DIR/test.txt"

# 测试访问
if curl -f -s "https://godaug.fun/uploads/test.txt" > /dev/null; then
    echo "✅ 静态文件访问正常"
    sudo rm "$UPLOAD_DIR/test.txt"
else
    echo "❌ 静态文件访问失败"
    echo "请检查nginx配置和文件权限"
fi

# 9. 显示状态
echo ""
echo "📊 服务状态:"
pm2 status
echo ""
echo "📁 上传目录信息:"
ls -la "$UPLOAD_DIR"
echo ""
echo "🎉 修复完成！"
echo ""
echo "🔍 验证步骤:"
echo "1. 访问网站: https://godaug.fun"
echo "2. 尝试上传头像或图片"
echo "3. 检查图片是否正常显示"
echo ""
echo "📝 如果仍有问题，请检查:"
echo "- pm2 logs website-backend"
echo "- sudo tail -f /var/log/nginx/error.log"
