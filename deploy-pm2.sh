#!/bin/bash

# PM2 部署脚本（无 Docker）
set -e

echo "🚀 开始 PM2 部署..."

# 服务器信息
SERVER="root@67e5a5d-28ec-438f-b8fc-e551c8c65e10"
PROJECT_DIR="~/temp-email-system"

echo "📦 1. 本地构建前端..."
cd frontend
npm install
npm run build
cd ..

echo "📤 2. 传输文件到服务器..."
# 传输所有文件
scp -r . $SERVER:$PROJECT_DIR/

echo "🔧 3. 在服务器上部署..."
ssh $SERVER << 'EOF'
cd ~/temp-email-system

# 安装 Node.js 20 (如果需要)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    echo "📦 安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get install -y nodejs
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install
cd ..

# 停止现有服务
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 启动后端服务
echo "🚀 启动后端服务..."
pm2 start backend/app.js --name "website-backend"

# 使用 nginx 或简单的静态文件服务器提供前端
if command -v nginx &> /dev/null; then
    echo "🌐 配置 Nginx..."
    # 复制前端文件到 nginx 目录
    cp -r frontend/dist/* /var/www/html/ 2>/dev/null || cp -r frontend/dist/* /usr/share/nginx/html/
    systemctl restart nginx 2>/dev/null || service nginx restart
else
    echo "🌐 启动前端服务..."
    pm2 serve frontend/dist 3000 --name "website-frontend"
fi

# 保存 PM2 配置
pm2 save
pm2 startup

echo "✅ 部署完成！"
echo "📊 服务状态："
pm2 status
EOF

echo "🎉 部署完成！"
echo "🌐 前端访问: http://67e5a5d-28ec-438f-b8fc-e551c8c65e10:3000"
echo "🔗 后端访问: http://67e5a5d-28ec-438f-b8fc-e551c8c65e10:8000"
