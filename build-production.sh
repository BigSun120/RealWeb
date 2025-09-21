#!/bin/bash

# 生产环境构建脚本
# 解决图片无法显示问题的统一构建流程

set -e  # 遇到错误立即退出

echo "🚀 开始生产环境构建..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 16+，当前版本: $(node -v)"
    exit 1
fi

# 进入前端目录
cd frontend

# 安装依赖
echo "📦 安装前端依赖..."
npm install

# 设置生产环境变量
echo "🔧 设置生产环境变量..."
export NODE_ENV=production
export VITE_API_BASE_URL=/api

# 构建前端
echo "🔨 构建前端（生产环境）..."
npm run build

# 验证构建结果
if [ ! -d "dist" ]; then
    echo "❌ 构建失败，dist目录不存在"
    exit 1
fi

echo "✅ 前端构建完成"

# 返回根目录
cd ..

# 检查后端依赖
echo "📦 检查后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi
cd ..

echo ""
echo "🎉 生产环境构建完成！"
echo ""
echo "📋 部署说明："
echo "1. 上传前端文件到服务器："
echo "   scp -r frontend/dist/* root@74.48.194.227:/var/www/html/"
echo ""
echo "2. 确保后端服务正确配置："
echo "   - PORT=8000"
echo "   - UPLOAD_PATH=/var/www/uploads"
echo "   - NODE_ENV=production"
echo ""
echo "3. 重启后端服务："
echo "   pm2 restart website-backend"
echo ""
echo "4. 验证部署："
echo "   curl -I https://godaug.fun"
echo "   curl https://godaug.fun/api/health"
